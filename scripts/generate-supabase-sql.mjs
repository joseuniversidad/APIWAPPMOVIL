// Genera supabase/schema-y-datos.sql a partir de data/languages.ts y data/frameworks.ts.
// Uso: node --experimental-strip-types scripts/generate-supabase-sql.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

import { FRAMEWORKS } from '../data/frameworks.ts';
import { LANGUAGES } from '../data/languages.ts';

const text = (value) => (value == null ? 'null' : `'${String(value).replace(/'/g, "''")}'`);
const textArray = (values) => `array[${values.map(text).join(', ')}]::text[]`;
const json = (value) => (value == null ? 'null' : `${text(JSON.stringify(value))}::jsonb`);

const languageRows = LANGUAGES.map((l) =>
  [
    text(l.id),
    text(l.name),
    text(l.tagline),
    text(l.color),
    l.year,
    textArray(l.founders),
    text(l.paradigm),
    text(l.history),
    textArray(l.keyFeatures),
    text(l.curiosity),
    textArray(l.useCases),
    json(l.variablesExample),
    json(l.conditionalsExample),
    json(l.loopsExample),
    json(l.steps),
    json(l.courses),
  ].join(', ')
);

const frameworkRows = FRAMEWORKS.map((f) =>
  [
    text(f.id),
    text(f.name),
    text(f.languageId),
    text(f.tagline),
    text(f.description),
    f.year,
    text(f.creator),
    text(f.color),
    textArray(f.keyFeatures),
    text(f.curiosity),
    textArray(f.useCases),
    text(f.docsUrl),
  ].join(', ')
);

const sql = `-- Generado por scripts/generate-supabase-sql.mjs. No editar a mano.
-- Pegar completo en Supabase → SQL Editor → Run. Se puede ejecutar varias veces.

create table if not exists public.languages (
  id text primary key,
  name text not null,
  tagline text not null,
  color text not null,
  year int not null,
  founders text[] not null default '{}',
  paradigm text not null,
  history text not null,
  key_features text[] not null default '{}',
  curiosity text not null,
  use_cases text[] not null default '{}',
  variables_example jsonb,
  conditionals_example jsonb,
  loops_example jsonb,
  steps jsonb not null default '[]',
  courses jsonb not null default '[]'
);

create table if not exists public.frameworks (
  id text primary key,
  name text not null,
  language_id text not null references public.languages(id) on delete cascade,
  tagline text not null,
  description text not null,
  year int not null,
  creator text not null,
  color text not null,
  key_features text[] not null default '{}',
  curiosity text not null,
  use_cases text[] not null default '{}',
  docs_url text not null
);

create index if not exists idx_frameworks_language on public.frameworks(language_id);

-- Row Level Security: solo usuarios autenticados (con token válido) pueden leer.
-- Nadie puede escribir desde la API pública; los datos se administran desde el panel.
grant select on public.languages, public.frameworks to authenticated;

alter table public.languages enable row level security;
alter table public.frameworks enable row level security;

drop policy if exists "Autenticados leen lenguajes" on public.languages;
create policy "Autenticados leen lenguajes" on public.languages
  for select to authenticated using (true);

drop policy if exists "Autenticados leen frameworks" on public.frameworks;
create policy "Autenticados leen frameworks" on public.frameworks
  for select to authenticated using (true);

insert into public.languages (id, name, tagline, color, year, founders, paradigm, history, key_features, curiosity, use_cases, variables_example, conditionals_example, loops_example, steps, courses) values
${languageRows.map((row) => `  (${row})`).join(',\n')}
on conflict (id) do update set
  name = excluded.name, tagline = excluded.tagline, color = excluded.color, year = excluded.year,
  founders = excluded.founders, paradigm = excluded.paradigm, history = excluded.history,
  key_features = excluded.key_features, curiosity = excluded.curiosity, use_cases = excluded.use_cases,
  variables_example = excluded.variables_example, conditionals_example = excluded.conditionals_example,
  loops_example = excluded.loops_example, steps = excluded.steps, courses = excluded.courses;

insert into public.frameworks (id, name, language_id, tagline, description, year, creator, color, key_features, curiosity, use_cases, docs_url) values
${frameworkRows.map((row) => `  (${row})`).join(',\n')}
on conflict (id) do update set
  name = excluded.name, language_id = excluded.language_id, tagline = excluded.tagline,
  description = excluded.description, year = excluded.year, creator = excluded.creator, color = excluded.color,
  key_features = excluded.key_features, curiosity = excluded.curiosity, use_cases = excluded.use_cases,
  docs_url = excluded.docs_url;
`;

mkdirSync('supabase', { recursive: true });
writeFileSync('supabase/schema-y-datos.sql', sql);
console.log(`OK: ${LANGUAGES.length} lenguajes y ${FRAMEWORKS.length} frameworks → supabase/schema-y-datos.sql`);
