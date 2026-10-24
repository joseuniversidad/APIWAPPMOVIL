-- Cuentas de MiApp54: registro con correo y contraseña, nombre de cada persona, roles
-- (estudiante, profesor, admin), administración de usuarios y de lenguajes.
-- Ejecutar DESPUÉS de comunidad.sql y ANTES de superusuario.sql. Se puede ejecutar varias veces.
--
-- Lo que consume el compañero NO cambia: su usuario sigue igual y las tablas languages y frameworks
-- conservan sus columnas y su política de lectura.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Registro con cualquier correo. Si se ejecutó una versión anterior que solo
--    aceptaba Gmail, aquí se quita esa regla.
-- ---------------------------------------------------------------------------
drop trigger if exists validar_correo_gmail on auth.users;
drop function if exists privado.validar_correo_gmail();

grant usage on schema privado to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- 2. Perfil con el nombre del registro (el apodo del ranking pasa a ser opcional).
-- ---------------------------------------------------------------------------
alter table public.perfiles alter column apodo drop not null;
alter table public.perfiles add column if not exists nombre text check (nombre is null or char_length(nombre) between 2 and 80);

create or replace function privado.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.email, '') <> '' then
    insert into public.perfiles (user_id, nombre)
    values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
    on conflict (user_id) do update set nombre = coalesce(public.perfiles.nombre, excluded.nombre);
  end if;
  return new;
end;
$$;

grant execute on function privado.crear_perfil() to supabase_auth_admin;

drop trigger if exists crear_perfil on auth.users;
create trigger crear_perfil
  after insert on auth.users
  for each row execute function privado.crear_perfil();

-- Usuarios que ya existían: se les crea el perfil con el nombre que tengan.
insert into public.perfiles (user_id, nombre)
select u.id, nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')
from auth.users u
where coalesce(u.email, '') <> ''
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Roles. Se leen de la base (no del token) para que el cambio aplique al instante.
-- ---------------------------------------------------------------------------
create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.raw_app_meta_data ->> 'role' from auth.users u where u.id = auth.uid()), 'estudiante');
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.mi_rol() = 'admin';
$$;

create or replace function public.es_profesor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.mi_rol() in ('profesor', 'admin');
$$;

grant execute on function public.mi_rol(), public.es_admin(), public.es_profesor() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Administración de usuarios (solo superusuario).
-- ---------------------------------------------------------------------------
create or replace function public.listar_usuarios()
returns table (
  id uuid, correo text, nombre text, apodo text, rol text,
  confirmado boolean, creado timestamptz, ultimo_acceso timestamptz, quizzes int
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
      (select count(*) from public.quiz_scores q where q.user_id = u.id)::int
    from auth.users u
    left join public.perfiles p on p.user_id = u.id
    where coalesce(u.is_anonymous, false) = false
    order by u.created_at desc;
end;
$$;

create or replace function public.asignar_rol(usuario uuid, nuevo_rol text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede cambiar roles';
  end if;
  if nuevo_rol not in ('estudiante', 'profesor') then
    raise exception 'Rol no válido';
  end if;
  if exists (select 1 from auth.users where id = usuario and raw_app_meta_data ->> 'role' = 'admin') then
    raise exception 'No se puede cambiar el rol de un superusuario desde la app';
  end if;
  update auth.users
  set raw_app_meta_data = case
    when nuevo_rol = 'estudiante' then coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
    else coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', nuevo_rol)
  end
  where id = usuario;
end;
$$;

-- Quita un apodo ofensivo: el usuario vuelve a aparecer con su nombre en el ranking.
create or replace function public.moderar_apodo(usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede moderar apodos';
  end if;
  update public.perfiles set apodo = null, updated_at = now() where user_id = usuario;
end;
$$;

revoke all on function public.listar_usuarios(), public.asignar_rol(uuid, text), public.moderar_apodo(uuid) from public, anon;
grant execute on function public.listar_usuarios(), public.asignar_rol(uuid, text), public.moderar_apodo(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Editar y borrar lenguajes (solo superusuario). Realtime avisa a todos del cambio.
-- ---------------------------------------------------------------------------
create or replace function public.editar_lenguaje(datos jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.languages;
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede editar lenguajes';
  end if;
  r := jsonb_populate_record(null::public.languages, datos);
  update public.languages set
    name = r.name, tagline = r.tagline, color = r.color, year = r.year, founders = r.founders,
    paradigm = r.paradigm, history = r.history, key_features = r.key_features, curiosity = r.curiosity,
    use_cases = r.use_cases, variables_example = r.variables_example,
    conditionals_example = r.conditionals_example, loops_example = r.loops_example,
    steps = r.steps, courses = r.courses
  where id = r.id;
  if not found then
    raise exception 'No existe el lenguaje "%"', r.id;
  end if;
  return r.id;
exception
  when not_null_violation then
    raise exception 'Falta llenar un campo obligatorio';
end;
$$;

-- Borra el lenguaje y, en cascada, sus frameworks, puntajes y favoritos.
create or replace function public.borrar_lenguaje(lenguaje text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el superusuario puede borrar lenguajes';
  end if;
  delete from public.languages where id = lenguaje;
end;
$$;

revoke all on function public.editar_lenguaje(jsonb), public.borrar_lenguaje(text) from public, anon;
grant execute on function public.editar_lenguaje(jsonb), public.borrar_lenguaje(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Progreso del tutorial en la nube (para que el profesor lo vea).
-- ---------------------------------------------------------------------------
create table if not exists public.progreso_tutorial (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  language_id text not null references public.languages(id) on delete cascade,
  pasos int[] not null default '{}',
  actualizado timestamptz not null default now(),
  primary key (user_id, language_id)
);

grant select, insert, update on public.progreso_tutorial to authenticated;
alter table public.progreso_tutorial enable row level security;

drop policy if exists "Ver progreso propio" on public.progreso_tutorial;
create policy "Ver progreso propio" on public.progreso_tutorial
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Guardar progreso propio" on public.progreso_tutorial;
create policy "Guardar progreso propio" on public.progreso_tutorial
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Actualizar progreso propio" on public.progreso_tutorial;
create policy "Actualizar progreso propio" on public.progreso_tutorial
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. Ranking: si no hay apodo se muestra el primer nombre del registro.
-- ---------------------------------------------------------------------------
create or replace function public.ranking_quiz(lenguaje text)
returns table (posicion int, apodo text, puntaje int, total int, porcentaje int, intentos int, soy_yo boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with mejores as (
    select distinct on (q.user_id) q.user_id, q.score, q.total, q.created_at
    from public.quiz_scores q
    where q.language_id = lenguaje
    order by q.user_id, (q.score::numeric / q.total) desc, q.created_at asc
  ),
  conteo as (
    select q.user_id, count(*)::int as n
    from public.quiz_scores q
    where q.language_id = lenguaje
    group by q.user_id
  )
  select
    (row_number() over (order by m.score::numeric / m.total desc, m.created_at asc))::int,
    coalesce(p.apodo, nullif(split_part(p.nombre, ' ', 1), ''), 'Jugador ' || upper(left(m.user_id::text, 4))),
    m.score,
    m.total,
    round(m.score::numeric * 100 / m.total)::int,
    c.n,
    m.user_id = auth.uid()
  from mejores m
  join conteo c on c.user_id = m.user_id
  left join public.perfiles p on p.user_id = m.user_id
  order by 1
  limit 10;
$$;

revoke all on function public.ranking_quiz(text) from public, anon;
grant execute on function public.ranking_quiz(text) to authenticated;
