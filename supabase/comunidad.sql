-- Favoritos, apodos y ranking del quiz. Pegar en Supabase → SQL Editor → Run.
-- Ejecutar después de schema-y-datos.sql y quiz-scores.sql. Se puede ejecutar varias veces.

-- Favoritos: cada usuario (incluidos los anónimos) marca sus lenguajes favoritos.
create table if not exists public.favoritos (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  language_id text not null references public.languages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, language_id)
);

grant select, insert, delete on public.favoritos to authenticated;
alter table public.favoritos enable row level security;

drop policy if exists "Ver favoritos propios" on public.favoritos;
create policy "Ver favoritos propios" on public.favoritos
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Agregar favoritos propios" on public.favoritos;
create policy "Agregar favoritos propios" on public.favoritos
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Quitar favoritos propios" on public.favoritos;
create policy "Quitar favoritos propios" on public.favoritos
  for delete to authenticated using (auth.uid() = user_id);

-- Perfiles: el apodo con el que aparece cada usuario en el ranking.
create table if not exists public.perfiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  apodo text not null check (char_length(apodo) between 2 and 24),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.perfiles to authenticated;
alter table public.perfiles enable row level security;

drop policy if exists "Ver perfil propio" on public.perfiles;
create policy "Ver perfil propio" on public.perfiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Crear perfil propio" on public.perfiles;
create policy "Crear perfil propio" on public.perfiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Editar perfil propio" on public.perfiles;
create policy "Editar perfil propio" on public.perfiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ranking: los 10 mejores puntajes de un lenguaje (el mejor intento de cada usuario).
-- Es security definer para poder leer los puntajes de todos, pero solo expone apodo y puntaje,
-- nunca el id ni el correo de nadie.
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
    coalesce(p.apodo, 'Jugador ' || upper(left(m.user_id::text, 4))),
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
