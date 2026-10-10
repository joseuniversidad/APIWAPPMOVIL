-- Permite agregar lenguajes desde la app (pantalla "Agregar lenguaje").
-- Las tablas siguen siendo de solo lectura para la API pública: la única forma de escribir
-- es la función agregar_lenguaje, que exige la clave de administrador.
--
-- ANTES DE EJECUTAR: cambia 'CAMBIA_ESTA_CLAVE' (abajo) por tu propia clave.
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar varias veces
-- (cada vez que se ejecuta, la clave queda reemplazada por la que pongas).

create extension if not exists pgcrypto with schema extensions;

-- Esquema privado: no se expone en la API, nadie lo puede leer desde la app.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table if not exists privado.admin_config (
  id int primary key default 1 check (id = 1),
  clave_hash text not null
);

-- La clave se guarda cifrada con bcrypt, nunca en texto plano.
insert into privado.admin_config (id, clave_hash)
values (1, extensions.crypt('CAMBIA_ESTA_CLAVE', extensions.gen_salt('bf')))
on conflict (id) do update set clave_hash = excluded.clave_hash;

create or replace function public.agregar_lenguaje(datos jsonb, clave text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  nuevo_id text;
begin
  if not exists (
    select 1 from privado.admin_config
    where clave_hash = extensions.crypt(coalesce(clave, ''), clave_hash)
  ) then
    raise exception 'Clave de administrador incorrecta';
  end if;

  if coalesce(datos->>'id', '') !~ '^[a-z0-9_-]+$' then
    raise exception 'El id solo puede tener minúsculas, números, guiones y guion bajo';
  end if;

  -- Convierte el JSON (columnas en snake_case) en una fila de la tabla languages.
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
