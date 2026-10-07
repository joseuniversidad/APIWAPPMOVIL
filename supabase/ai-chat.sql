-- Registro de uso del asistente de IA (límite diario por usuario).
-- Pegar en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create table if not exists public.ai_chat_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_chat_usage_user_date on public.ai_chat_usage(user_id, created_at);

grant select, insert on public.ai_chat_usage to authenticated;

-- Row Level Security: cada usuario solo ve y registra su propio uso.
alter table public.ai_chat_usage enable row level security;

drop policy if exists "Ver uso propio" on public.ai_chat_usage;
create policy "Ver uso propio" on public.ai_chat_usage
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Registrar uso propio" on public.ai_chat_usage;
create policy "Registrar uso propio" on public.ai_chat_usage
  for insert to authenticated with check (auth.uid() = user_id);
