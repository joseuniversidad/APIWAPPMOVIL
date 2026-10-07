-- Puntajes del quiz por lenguaje. Pegar en Supabase → SQL Editor → Run.
-- Se puede ejecutar varias veces.

create table if not exists public.quiz_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  language_id text not null references public.languages(id) on delete cascade,
  score int not null check (score >= 0),
  total int not null check (total > 0 and score <= total),
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_scores_user_language on public.quiz_scores(user_id, language_id);

grant select, insert on public.quiz_scores to authenticated;

-- Row Level Security: cada usuario (incluidos los anónimos) solo ve y registra sus propios puntajes.
alter table public.quiz_scores enable row level security;

drop policy if exists "Ver puntajes propios" on public.quiz_scores;
create policy "Ver puntajes propios" on public.quiz_scores
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Registrar puntajes propios" on public.quiz_scores;
create policy "Registrar puntajes propios" on public.quiz_scores
  for insert to authenticated with check (auth.uid() = user_id);
