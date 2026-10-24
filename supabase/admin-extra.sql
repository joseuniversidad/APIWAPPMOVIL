-- Herramientas extra del superusuario: anuncio fijado, lenguaje destacado, mensaje de bienvenida,
-- frameworks (agregar, editar, borrar), preguntas propias del quiz, suspender cuentas y registros recientes.
-- Ejecutar DESPUÉS de clases-retos-avisos.sql. Se puede ejecutar varias veces.
--
-- Lo que consume el compañero no cambia: frameworks y languages conservan sus columnas y su
-- política de lectura (el superusuario solo agrega o edita filas).

-- ===========================================================================
-- CONFIGURACIÓN DE LA APP (una sola fila que todos leen y solo el superusuario edita)
-- ===========================================================================
create table if not exists public.configuracion_app (
  id int primary key default 1 check (id = 1),
  anuncio_activo boolean not null default false,
  anuncio_titulo text check (anuncio_titulo is null or char_length(anuncio_titulo) <= 80),
  anuncio_texto text check (anuncio_texto is null or char_length(anuncio_texto) <= 300),
  anuncio_tono text not null default 'info' check (anuncio_tono in ('info', 'exito', 'alerta')),
  anuncio_language_id text references public.languages(id) on delete set null,
  destacado_language_id text references public.languages(id) on delete set null,
  destacado_nota text check (destacado_nota is null or char_length(destacado_nota) <= 160),
  bienvenida_activa boolean not null default true,
  bienvenida_titulo text check (bienvenida_titulo is null or char_length(bienvenida_titulo) <= 80),
  bienvenida_texto text check (bienvenida_texto is null or char_length(bienvenida_texto) <= 500),
  actualizado timestamptz not null default now()
);

insert into public.configuracion_app (id, bienvenida_titulo, bienvenida_texto)
values (
  1,
  '¡Bienvenido a MiApp54!',
  'Explora el catálogo, haz el quiz de cada lenguaje y únete a tu clase con el código que te dé tu profesor.'
)
on conflict (id) do nothing;

grant select, update on public.configuracion_app to authenticated;
alter table public.configuracion_app enable row level security;

drop policy if exists "Todos leen la configuracion" on public.configuracion_app;
create policy "Todos leen la configuracion" on public.configuracion_app
  for select to authenticated using (true);

drop policy if exists "Superusuario edita la configuracion" on public.configuracion_app;
create policy "Superusuario edita la configuracion" on public.configuracion_app
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Realtime: el anuncio y el destacado cambian al instante para todos.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'configuracion_app'
  ) then
    alter publication supabase_realtime add table public.configuracion_app;
  end if;
end $$;

-- ===========================================================================
-- PREGUNTAS PROPIAS DEL QUIZ (las escriben profesores y superusuario)
-- ===========================================================================
create table if not exists public.preguntas_quiz (
  id bigint generated always as identity primary key,
  language_id text not null references public.languages(id) on delete cascade,
  pregunta text not null check (char_length(pregunta) between 5 and 300),
  opciones text[] not null check (cardinality(opciones) between 2 and 6),
  respuesta text not null,
  explicacion text not null default '',
  autor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (respuesta = any (opciones))
);

create index if not exists idx_preguntas_quiz_lenguaje on public.preguntas_quiz(language_id);

grant select, insert, delete on public.preguntas_quiz to authenticated;
alter table public.preguntas_quiz enable row level security;

drop policy if exists "Todos leen preguntas" on public.preguntas_quiz;
create policy "Todos leen preguntas" on public.preguntas_quiz for select to authenticated using (true);

drop policy if exists "Profesores agregan preguntas" on public.preguntas_quiz;
create policy "Profesores agregan preguntas" on public.preguntas_quiz
  for insert to authenticated with check (public.es_profesor() and autor_id = auth.uid());

drop policy if exists "Borrar preguntas propias" on public.preguntas_quiz;
create policy "Borrar preguntas propias" on public.preguntas_quiz
  for delete to authenticated using (autor_id = auth.uid() or public.es_admin());

-- ===========================================================================
-- FRAMEWORKS: agregar o editar (mismo id = editar) y borrar. Solo superusuario.
-- ===========================================================================
create or replace function public.guardar_framework(datos jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.frameworks;
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede guardar frameworks';
  end if;
  r := jsonb_populate_record(null::public.frameworks, datos);
  if coalesce(r.id, '') !~ '^[a-z0-9_-]+$' then
    raise exception 'El id solo puede tener minúsculas, números, guiones y guion bajo';
  end if;
  insert into public.frameworks
  values (r.*)
  on conflict (id) do update set
    name = excluded.name, language_id = excluded.language_id, tagline = excluded.tagline,
    description = excluded.description, year = excluded.year, creator = excluded.creator,
    color = excluded.color, key_features = excluded.key_features, curiosity = excluded.curiosity,
    use_cases = excluded.use_cases, docs_url = excluded.docs_url;
  return r.id;
exception
  when not_null_violation then
    raise exception 'Falta llenar un campo obligatorio';
  when foreign_key_violation then
    raise exception 'El lenguaje elegido no existe';
end;
$$;

create or replace function public.borrar_framework(framework text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede borrar frameworks';
  end if;
  delete from public.frameworks where id = framework;
end;
$$;

-- ===========================================================================
-- SUSPENDER CUENTAS (Supabase no deja entrar a una cuenta suspendida)
-- ===========================================================================
create or replace function public.suspender_usuario(usuario uuid, dias int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede suspender cuentas';
  end if;
  if usuario = auth.uid() then
    raise exception 'No puedes suspender tu propia cuenta';
  end if;
  if exists (select 1 from auth.users where id = usuario and raw_app_meta_data ->> 'role' = 'admin') then
    raise exception 'No se puede suspender a un superusuario';
  end if;
  -- dias = 0 reactiva la cuenta.
  update auth.users
  set banned_until = case when dias > 0 then now() + make_interval(days => dias) else null end
  where id = usuario;
end;
$$;

-- Lista de usuarios con la fecha de suspensión (reemplaza la de cuentas.sql).
drop function if exists public.listar_usuarios();
create or replace function public.listar_usuarios()
returns table (
  id uuid, correo text, nombre text, apodo text, rol text,
  confirmado boolean, creado timestamptz, ultimo_acceso timestamptz, quizzes int, suspendido_hasta timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede ver los usuarios';
  end if;
  return query
    select u.id, u.email::text, p.nombre, p.apodo,
      coalesce(u.raw_app_meta_data ->> 'role', 'estudiante'),
      u.email_confirmed_at is not null, u.created_at, u.last_sign_in_at,
      (select count(*) from public.quiz_scores q where q.user_id = u.id)::int,
      case when u.banned_until > now() then u.banned_until end
    from auth.users u
    left join public.perfiles p on p.user_id = u.id
    where coalesce(u.is_anonymous, false) = false
    order by u.created_at desc;
end;
$$;

-- ===========================================================================
-- REGISTROS RECIENTES (para el resumen del panel)
-- ===========================================================================
create or replace function public.registros_recientes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede ver los registros';
  end if;
  return jsonb_build_object(
    'hoy', (select count(*) from auth.users where not coalesce(is_anonymous, false) and created_at >= date_trunc('day', now())),
    'semana', (select count(*) from auth.users where not coalesce(is_anonymous, false) and created_at > now() - interval '7 days'),
    'ultimos', (
      select coalesce(jsonb_agg(x order by x.creado desc), '[]'::jsonb) from (
        select coalesce(p.nombre, split_part(u.email, '@', 1)) as nombre, u.email as correo, u.created_at as creado
        from auth.users u
        left join public.perfiles p on p.user_id = u.id
        where not coalesce(u.is_anonymous, false)
        order by u.created_at desc
        limit 8
      ) x
    )
  );
end;
$$;

revoke all on function
  public.guardar_framework(jsonb), public.borrar_framework(text), public.suspender_usuario(uuid, int),
  public.listar_usuarios(), public.registros_recientes()
from public, anon;

grant execute on function
  public.guardar_framework(jsonb), public.borrar_framework(text), public.suspender_usuario(uuid, int),
  public.listar_usuarios(), public.registros_recientes()
to authenticated;
