-- Modo profesor (clases, alumnos, materiales), retos semanales y avisos con notificación push.
-- Ejecutar DESPUÉS de cuentas.sql y superusuario.sql. Se puede ejecutar varias veces.

-- ===========================================================================
-- CLASES
-- ===========================================================================
create table if not exists public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 60),
  descripcion text,
  codigo text not null unique default upper(substr(md5(random()::text), 1, 6)),
  profesor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.grupo_miembros (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unido timestamptz not null default now(),
  primary key (grupo_id, user_id)
);

-- Las clases se manejan con funciones (abajo); desde la API no se lee ni escribe directo.
alter table public.grupos enable row level security;
alter table public.grupo_miembros enable row level security;

-- Ayudantes sin RLS (security definer) para evitar políticas que se llamen entre sí.
create or replace function public.es_profesor_de(grupo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.grupos g where g.id = grupo and g.profesor_id = auth.uid());
$$;

create or replace function public.es_miembro_de(grupo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.grupo_miembros m where m.grupo_id = grupo and m.user_id = auth.uid());
$$;

grant execute on function public.es_profesor_de(uuid), public.es_miembro_de(uuid) to authenticated;

-- Solo cuentas registradas (no anónimas) pueden usar las clases.
create or replace function privado.exigir_cuenta()
returns void language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Necesitas iniciar sesión con tu cuenta';
  end if;
end;
$$;

create or replace function public.crear_clase(nombre text, descripcion text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  nuevo uuid;
begin
  if not public.es_profesor() then
    raise exception 'Solo profesores y el superusuario pueden crear clases';
  end if;
  insert into public.grupos (nombre, descripcion, profesor_id)
  values (trim(nombre), nullif(trim(coalesce(descripcion, '')), ''), auth.uid())
  returning id into nuevo;
  return nuevo;
end;
$$;

create or replace function public.unirse_a_clase(codigo text)
returns table (id uuid, nombre text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupos;
begin
  perform privado.exigir_cuenta();
  select * into g from public.grupos where public.grupos.codigo = upper(trim(unirse_a_clase.codigo));
  if g.id is null then
    raise exception 'No existe una clase con ese código';
  end if;
  insert into public.grupo_miembros (grupo_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return query select g.id, g.nombre;
end;
$$;

create or replace function public.salir_de_clase(grupo uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.grupo_miembros where grupo_id = grupo and user_id = auth.uid();
end;
$$;

create or replace function public.borrar_clase(grupo uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (public.es_profesor_de(grupo) or public.es_admin()) then
    raise exception 'Solo el profesor de la clase o el superusuario pueden borrarla';
  end if;
  delete from public.grupos where id = grupo;
end;
$$;

-- ===========================================================================
-- MATERIALES (de una clase, o públicos dentro de un lenguaje)
-- ===========================================================================
create table if not exists public.materiales (
  id bigint generated always as identity primary key,
  grupo_id uuid references public.grupos(id) on delete cascade,
  language_id text references public.languages(id) on delete cascade,
  tipo text not null check (tipo in ('video', 'enlace', 'nota')),
  titulo text not null check (char_length(titulo) between 2 and 120),
  descripcion text,
  url text,
  archivo text, -- ruta dentro del bucket "materiales" si el video se subió desde el celular
  autor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (grupo_id is not null or language_id is not null)
);

create index if not exists idx_materiales_grupo on public.materiales(grupo_id);
create index if not exists idx_materiales_lenguaje on public.materiales(language_id);

grant select, insert, delete on public.materiales to authenticated;
alter table public.materiales enable row level security;

drop policy if exists "Ver materiales" on public.materiales;
create policy "Ver materiales" on public.materiales
  for select to authenticated using (
    grupo_id is null or public.es_miembro_de(grupo_id) or public.es_profesor_de(grupo_id) or public.es_admin()
  );

drop policy if exists "Profesores publican materiales" on public.materiales;
create policy "Profesores publican materiales" on public.materiales
  for insert to authenticated with check (
    public.es_profesor() and autor_id = auth.uid()
    and (grupo_id is null or public.es_profesor_de(grupo_id) or public.es_admin())
  );

drop policy if exists "Borrar materiales propios" on public.materiales;
create policy "Borrar materiales propios" on public.materiales
  for delete to authenticated using (autor_id = auth.uid() or public.es_admin());

-- Videos subidos desde el celular (máx. 50 MB, límite del plan gratuito).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materiales', 'materiales', true, 52428800, array['video/*', 'image/*', 'application/pdf'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profesores suben materiales" on storage.objects;
create policy "Profesores suben materiales" on storage.objects
  for insert to authenticated with check (bucket_id = 'materiales' and public.es_profesor());

drop policy if exists "Borrar archivos propios" on storage.objects;
create policy "Borrar archivos propios" on storage.objects
  for delete to authenticated using (bucket_id = 'materiales' and (owner_id = auth.uid()::text or public.es_admin()));

-- Clases del usuario: las que enseña, a las que pertenece y, si es superusuario, todas.
create or replace function public.mis_clases()
returns table (
  id uuid, nombre text, descripcion text, codigo text, profesor text,
  alumnos int, materiales int, soy_profesor boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.nombre, g.descripcion,
    case when g.profesor_id = auth.uid() or public.es_admin() then g.codigo end,
    coalesce(p.nombre, split_part(u.email, '@', 1)),
    (select count(*) from public.grupo_miembros m where m.grupo_id = g.id)::int,
    (select count(*) from public.materiales x where x.grupo_id = g.id)::int,
    g.profesor_id = auth.uid() or public.es_admin(),
    g.created_at
  from public.grupos g
  join auth.users u on u.id = g.profesor_id
  left join public.perfiles p on p.user_id = g.profesor_id
  where g.profesor_id = auth.uid() or public.es_miembro_de(g.id) or public.es_admin()
  order by g.created_at desc;
$$;

-- ===========================================================================
-- PROGRESO DE LOS ALUMNOS (para el profesor de la clase y el superusuario)
-- ===========================================================================
create or replace function public.progreso_clase(grupo uuid)
returns table (
  user_id uuid, nombre text, correo text, quizzes int, promedio int, pasos int, retos int,
  ultima_actividad timestamptz, mejores jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.es_profesor_de(grupo) or public.es_admin()) then
    raise exception 'Solo el profesor de la clase o el superusuario pueden ver el progreso';
  end if;
  return query
    select m.user_id,
      coalesce(p.nombre, split_part(u.email, '@', 1)),
      u.email::text,
      (select count(*) from public.quiz_scores q where q.user_id = m.user_id)::int,
      (select round(avg(q.score::numeric / q.total) * 100) from public.quiz_scores q where q.user_id = m.user_id)::int,
      (select coalesce(sum(cardinality(t.pasos)), 0) from public.progreso_tutorial t where t.user_id = m.user_id)::int,
      (select count(*) from public.retos_resueltos r where r.user_id = m.user_id)::int,
      greatest(
        (select max(q.created_at) from public.quiz_scores q where q.user_id = m.user_id),
        (select max(t.actualizado) from public.progreso_tutorial t where t.user_id = m.user_id),
        (select max(r.resuelto) from public.retos_resueltos r where r.user_id = m.user_id)
      ),
      (
        select coalesce(jsonb_agg(jsonb_build_object('lenguaje', b.language_id, 'puntaje', b.score, 'total', b.total)), '[]'::jsonb)
        from (
          select distinct on (q.language_id) q.language_id, q.score, q.total
          from public.quiz_scores q where q.user_id = m.user_id
          order by q.language_id, (q.score::numeric / q.total) desc
        ) b
      )
    from public.grupo_miembros m
    join auth.users u on u.id = m.user_id
    left join public.perfiles p on p.user_id = m.user_id
    where m.grupo_id = grupo;
end;
$$;

-- ===========================================================================
-- RETOS SEMANALES
-- ===========================================================================
create table if not exists public.retos (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(titulo) between 4 and 120),
  enunciado text not null,
  language_id text not null references public.languages(id) on delete cascade,
  codigo_inicial text,
  salida_esperada text not null,
  inicia date not null default current_date,
  termina date not null default current_date + 7,
  autor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (termina >= inicia)
);

create table if not exists public.retos_resueltos (
  reto_id bigint not null references public.retos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  codigo text,
  resuelto timestamptz not null default now(),
  primary key (reto_id, user_id)
);

-- La salida esperada nunca se envía al celular: la lista sale de retos_publicos()
-- y la comparación la hace verificar_reto() en el servidor.
alter table public.retos enable row level security;
alter table public.retos_resueltos enable row level security;

grant insert on public.retos to authenticated;

drop policy if exists "Profesores publican retos" on public.retos;
create policy "Profesores publican retos" on public.retos
  for insert to authenticated with check (public.es_profesor() and autor_id = auth.uid());

create or replace function public.retos_publicos()
returns table (
  id bigint, titulo text, enunciado text, language_id text, codigo_inicial text,
  inicia date, termina date, resueltos int, lo_resolvi boolean, puedo_borrar boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.titulo, r.enunciado, r.language_id, r.codigo_inicial, r.inicia, r.termina,
    (select count(*) from public.retos_resueltos x where x.reto_id = r.id)::int,
    exists (select 1 from public.retos_resueltos x where x.reto_id = r.id and x.user_id = auth.uid()),
    r.autor_id = auth.uid() or public.es_admin()
  from public.retos r
  where r.termina >= current_date - 30
  order by (r.termina >= current_date) desc, r.inicia desc;
$$;

-- Normaliza saltos de línea y espacios al final de cada línea antes de comparar.
create or replace function privado.normalizar_salida(texto text)
returns text language sql immutable as $$
  select btrim(regexp_replace(replace(coalesce(texto, ''), E'\r', ''), E'[ \t]+(\n|$)', E'\\1', 'g'), E' \n\t');
$$;

-- Devuelve la posición en que se resolvió (1 = primero) o null si la salida no coincide.
create or replace function public.verificar_reto(reto bigint, salida text, codigo text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  esperada text;
  posicion int;
begin
  perform privado.exigir_cuenta();
  select salida_esperada into esperada from public.retos where id = reto;
  if esperada is null then
    raise exception 'El reto no existe';
  end if;
  if privado.normalizar_salida(salida) <> privado.normalizar_salida(esperada) then
    return null;
  end if;
  insert into public.retos_resueltos (reto_id, user_id, codigo)
  values (reto, auth.uid(), left(codigo, 20000))
  on conflict (reto_id, user_id) do nothing;
  select count(*) into posicion from public.retos_resueltos
  where reto_id = reto and resuelto <= (select resuelto from public.retos_resueltos where reto_id = reto and user_id = auth.uid());
  return posicion;
end;
$$;

create or replace function public.borrar_reto(reto bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.retos where id = reto and (autor_id = auth.uid() or public.es_admin());
  if not found then
    raise exception 'Solo quien publicó el reto o el superusuario pueden borrarlo';
  end if;
end;
$$;

create or replace function public.mis_retos_resueltos()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.retos_resueltos where user_id = auth.uid();
$$;

-- ===========================================================================
-- AVISOS y notificaciones push
-- ===========================================================================
create table if not exists public.avisos (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(titulo) between 2 and 80),
  cuerpo text not null check (char_length(cuerpo) between 2 and 300),
  language_id text references public.languages(id) on delete set null,
  reto_id bigint references public.retos(id) on delete set null,
  autor_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

grant select, insert on public.avisos to authenticated;
alter table public.avisos enable row level security;

drop policy if exists "Todos leen avisos" on public.avisos;
create policy "Todos leen avisos" on public.avisos for select to authenticated using (true);

drop policy if exists "Superusuario publica avisos" on public.avisos;
create policy "Superusuario publica avisos" on public.avisos for insert to authenticated with check (public.es_admin());

-- Tokens de Expo de cada celular, para enviar push aunque la app esté cerrada.
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  actualizado timestamptz not null default now()
);

grant select, insert, update, delete on public.push_tokens to authenticated;
alter table public.push_tokens enable row level security;

drop policy if exists "Tokens propios" on public.push_tokens;
create policy "Tokens propios" on public.push_tokens
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Aviso automático cuando se agrega un lenguaje o se publica un reto.
create or replace function privado.aviso_nuevo_lenguaje()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.avisos (titulo, cuerpo, language_id)
  values (left('Nuevo lenguaje: ' || new.name, 80), left(new.tagline, 300), new.id);
  return new;
end;
$$;

drop trigger if exists aviso_nuevo_lenguaje on public.languages;
create trigger aviso_nuevo_lenguaje
  after insert on public.languages
  for each row execute function privado.aviso_nuevo_lenguaje();

create or replace function privado.aviso_nuevo_reto()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.avisos (titulo, cuerpo, language_id, reto_id)
  values ('Nuevo reto semanal', left(new.titulo, 300), new.language_id, new.id);
  return new;
end;
$$;

drop trigger if exists aviso_nuevo_reto on public.retos;
create trigger aviso_nuevo_reto
  after insert on public.retos
  for each row execute function privado.aviso_nuevo_reto();

-- Envía cada aviso por push con el servicio de Expo (lotes de 100 tokens).
-- Necesita la extensión pg_net; si falla, el aviso se guarda igual y llega por Realtime.
create extension if not exists pg_net;

create or replace function privado.enviar_push_aviso()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lote jsonb;
begin
  begin
    for lote in
      select jsonb_agg(jsonb_build_object(
        'to', t.token, 'title', new.titulo, 'body', new.cuerpo, 'sound', 'default',
        'data', jsonb_build_object('aviso', new.id, 'lenguaje', new.language_id, 'reto', new.reto_id)
      ))
      from (select token, (row_number() over (order by token) - 1) / 100 as n from public.push_tokens) t
      group by t.n
    loop
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := lote,
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
    end loop;
  exception when others then
    raise warning 'No se pudo enviar el push del aviso %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists enviar_push_aviso on public.avisos;
create trigger enviar_push_aviso
  after insert on public.avisos
  for each row execute function privado.enviar_push_aviso();

-- Realtime: los avisos llegan al instante a quien tenga la app abierta.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'avisos'
  ) then
    alter publication supabase_realtime add table public.avisos;
  end if;
end $$;

-- ===========================================================================
-- Permisos de las funciones
-- ===========================================================================
revoke all on function
  public.crear_clase(text, text), public.unirse_a_clase(text), public.salir_de_clase(uuid),
  public.borrar_clase(uuid), public.mis_clases(), public.progreso_clase(uuid),
  public.retos_publicos(), public.verificar_reto(bigint, text, text), public.mis_retos_resueltos(), public.borrar_reto(bigint)
from public, anon;

grant execute on function
  public.crear_clase(text, text), public.unirse_a_clase(text), public.salir_de_clase(uuid),
  public.borrar_clase(uuid), public.mis_clases(), public.progreso_clase(uuid),
  public.retos_publicos(), public.verificar_reto(bigint, text, text), public.mis_retos_resueltos(), public.borrar_reto(bigint)
to authenticated;

-- ===========================================================================
-- Reporte del superusuario (reemplaza el de superusuario.sql con usuarios registrados,
-- profesores, retos y el nombre real de cada persona).
-- ===========================================================================
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
    'usuarios', (select count(*) from auth.users where not coalesce(is_anonymous, false)),
    'usuarios_anonimos', (select count(*) from auth.users where is_anonymous),
    'profesores', (select count(*) from auth.users where raw_app_meta_data ->> 'role' = 'profesor'),
    'sin_confirmar', (select count(*) from auth.users where not coalesce(is_anonymous, false) and email_confirmed_at is null),
    'activos_7_dias', (
      select count(distinct x.user_id) from (
        select user_id from public.quiz_scores where created_at > now() - interval '7 days'
        union select user_id from public.ai_chat_usage where created_at > now() - interval '7 days'
        union select user_id from public.retos_resueltos where resuelto > now() - interval '7 days'
      ) x
    ),
    'lenguajes', (select count(*) from public.languages),
    'frameworks', (select count(*) from public.frameworks),
    'clases', (select count(*) from public.grupos),
    'intentos_quiz', (select count(*) from public.quiz_scores),
    'promedio_quiz', (select coalesce(round(avg(score::numeric / total) * 100), 0) from public.quiz_scores),
    'retos_resueltos', (select count(*) from public.retos_resueltos),
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
        select q.language_id as lenguaje, q.score as puntaje, q.total, q.created_at as fecha,
          coalesce(p.nombre, p.apodo, split_part(u.email, '@', 1), 'Visitante ' || upper(left(q.user_id::text, 4))) as usuario
        from public.quiz_scores q
        join auth.users u on u.id = q.user_id
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
