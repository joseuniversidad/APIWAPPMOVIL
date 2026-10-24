-- Superusuario (administrador) de MiApp54: ve los reportes de toda la app y agrega lenguajes sin clave.
-- Los lenguajes que agrega llegan al instante a todos los usuarios gracias a realtime.sql.
--
-- Ejecutar DESPUÉS de: schema-y-datos.sql, quiz-scores.sql, ai-chat.sql, agregar-lenguaje.sql,
-- comunidad.sql y cuentas.sql.
--
-- PASO 1: regístrate en la app con tu correo ("Crear cuenta").
-- PASO 2: cambia 'CORREO_DEL_SUPERUSUARIO' (abajo) por ese correo y ejecuta este archivo
--   en SQL Editor → Run. Se puede ejecutar varias veces y con varios correos.
--
-- El rol se guarda en app_metadata, que solo se puede cambiar desde el servidor:
-- nadie puede convertirse en administrador desde la app.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = lower('CORREO_DEL_SUPERUSUARIO');

-- true si quien llama es superusuario. Lee el rol de la base (mi_rol, definida en cuentas.sql)
-- para que el cambio aplique sin esperar a que se renueve el token.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.mi_rol() = 'admin';
$$;

grant execute on function public.es_admin() to authenticated;

-- Misma función de agregar-lenguaje.sql, pero el administrador no necesita la clave.
create or replace function public.agregar_lenguaje(datos jsonb, clave text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  nuevo_id text;
begin
  if not public.es_admin() and not exists (
    select 1 from privado.admin_config
    where clave_hash = extensions.crypt(coalesce(clave, ''), clave_hash)
  ) then
    raise exception 'Clave de administrador incorrecta';
  end if;

  if coalesce(datos->>'id', '') !~ '^[a-z0-9_-]+$' then
    raise exception 'El id solo puede tener minúsculas, números, guiones y guion bajo';
  end if;

  insert into public.languages
  select (jsonb_populate_record(null::public.languages, datos)).*
  returning id into nuevo_id;

  return nuevo_id;
exception
  when unique_violation then
    raise exception 'Ya existe un lenguaje con el id "%"', datos->>'id';
  when not_null_violation then
    raise exception 'Falta llenar un campo obligatorio';
end;
$$;

revoke all on function public.agregar_lenguaje(jsonb, text) from public, anon;
grant execute on function public.agregar_lenguaje(jsonb, text) to authenticated;

-- El administrador puede leer los puntajes y el uso de IA de todos (las políticas se suman a las existentes).
drop policy if exists "Admin ve todos los puntajes" on public.quiz_scores;
create policy "Admin ve todos los puntajes" on public.quiz_scores
  for select to authenticated using (public.es_admin());

drop policy if exists "Admin ve todo el uso de IA" on public.ai_chat_usage;
create policy "Admin ve todo el uso de IA" on public.ai_chat_usage
  for select to authenticated using (public.es_admin());

-- Reporte general para el panel de administración.
create or replace function public.reporte_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resultado jsonb;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede ver este reporte';
  end if;

  select jsonb_build_object(
    'usuarios', (select count(*) from auth.users),
    'usuarios_anonimos', (select count(*) from auth.users where is_anonymous),
    'activos_7_dias', (
      select count(distinct x.user_id) from (
        select user_id from public.quiz_scores where created_at > now() - interval '7 days'
        union
        select user_id from public.ai_chat_usage where created_at > now() - interval '7 days'
      ) x
    ),
    'lenguajes', (select count(*) from public.languages),
    'frameworks', (select count(*) from public.frameworks),
    'intentos_quiz', (select count(*) from public.quiz_scores),
    'promedio_quiz', (select coalesce(round(avg(score::numeric / total) * 100), 0) from public.quiz_scores),
    'mensajes_ia', (select count(*) from public.ai_chat_usage),
    'mensajes_ia_hoy', (select count(*) from public.ai_chat_usage where created_at >= date_trunc('day', now())),
    'tokens_ia', (select coalesce(sum(input_tokens + output_tokens), 0) from public.ai_chat_usage),
    'favoritos', (select count(*) from public.favoritos),
    'actividad', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dia', d::date,
        'quiz', (select count(*) from public.quiz_scores q where q.created_at::date = d::date),
        'ia', (select count(*) from public.ai_chat_usage a where a.created_at::date = d::date)
      ) order by d), '[]'::jsonb)
      from generate_series(current_date - 6, current_date, interval '1 day') d
    ),
    'por_lenguaje', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'nombre', l.name, 'color', l.color,
        'intentos', s.intentos, 'promedio', s.promedio, 'favoritos', coalesce(f.n, 0)
      ) order by s.intentos desc), '[]'::jsonb)
      from public.languages l
      join (
        select language_id, count(*) as intentos, round(avg(score::numeric / total) * 100) as promedio
        from public.quiz_scores group by language_id
      ) s on s.language_id = l.id
      left join (select language_id, count(*) as n from public.favoritos group by language_id) f on f.language_id = l.id
    ),
    'ultimos_intentos', (
      select coalesce(jsonb_agg(x order by x.fecha desc), '[]'::jsonb) from (
        select
          q.language_id as lenguaje,
          q.score as puntaje,
          q.total,
          q.created_at as fecha,
          coalesce(p.apodo, 'Jugador ' || upper(left(q.user_id::text, 4))) as usuario
        from public.quiz_scores q
        left join public.perfiles p on p.user_id = q.user_id
        order by q.created_at desc
        limit 10
      ) x
    )
  ) into resultado;

  return resultado;
end;
$$;

revoke all on function public.reporte_admin() from public, anon;
grant execute on function public.reporte_admin() to authenticated;

-- Realtime de puntajes: el panel del administrador se actualiza solo cuando alguien termina un quiz.
-- (Realtime respeta RLS: cada usuario normal solo recibiría sus propias filas.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quiz_scores'
  ) then
    alter publication supabase_realtime add table public.quiz_scores;
  end if;
end $$;
