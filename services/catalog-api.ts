import type { Framework } from '@/data/frameworks';
import type { ProgrammingLanguage } from '@/data/languages';
import { ensureSupabaseSession, supabase } from '@/services/supabase';

// Filas tal como las devuelve Supabase (columnas en snake_case, ver supabase/schema-y-datos.sql).
type LanguageRow = {
  id: string;
  name: string;
  tagline: string;
  color: string;
  year: number;
  founders: string[];
  paradigm: string;
  history: string;
  key_features: string[];
  curiosity: string;
  use_cases: string[];
  variables_example: ProgrammingLanguage['variablesExample'];
  conditionals_example: ProgrammingLanguage['conditionalsExample'];
  loops_example: ProgrammingLanguage['loopsExample'];
  steps: ProgrammingLanguage['steps'];
  courses: ProgrammingLanguage['courses'];
};

type FrameworkRow = {
  id: string;
  name: string;
  language_id: string;
  tagline: string;
  description: string;
  year: number;
  creator: string;
  color: string;
  key_features: string[];
  curiosity: string;
  use_cases: string[];
  docs_url: string;
};

const toLanguage = (row: LanguageRow): ProgrammingLanguage => ({
  id: row.id,
  name: row.name,
  tagline: row.tagline,
  color: row.color,
  year: row.year,
  founders: row.founders,
  paradigm: row.paradigm,
  history: row.history,
  keyFeatures: row.key_features,
  curiosity: row.curiosity,
  useCases: row.use_cases,
  variablesExample: row.variables_example,
  conditionalsExample: row.conditionals_example,
  loopsExample: row.loops_example,
  steps: row.steps,
  courses: row.courses,
});

const toFramework = (row: FrameworkRow): Framework => ({
  id: row.id,
  name: row.name,
  languageId: row.language_id,
  tagline: row.tagline,
  description: row.description,
  year: row.year,
  creator: row.creator,
  color: row.color,
  keyFeatures: row.key_features,
  curiosity: row.curiosity,
  useCases: row.use_cases,
  docsUrl: row.docs_url,
});

export async function fetchCatalog(): Promise<{ languages: ProgrammingLanguage[]; frameworks: Framework[] }> {
  if (!supabase) throw new Error('Supabase no está configurado');
  await ensureSupabaseSession();

  const [languages, frameworks] = await Promise.all([
    supabase.from('languages').select('*').order('name'),
    supabase.from('frameworks').select('*').order('name'),
  ]);
  const error = languages.error ?? frameworks.error;
  if (error) throw new Error(error.message);
  if (!languages.data?.length) throw new Error('Supabase no devolvió lenguajes');

  return {
    languages: (languages.data as LanguageRow[]).map(toLanguage),
    frameworks: ((frameworks.data ?? []) as FrameworkRow[]).map(toFramework),
  };
}
