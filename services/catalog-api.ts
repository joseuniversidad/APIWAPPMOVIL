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

// Avisa cada vez que alguien agrega, edita o borra un lenguaje o framework en Supabase,
// para que todos los que tengan la app abierta vean el cambio sin recargar.
// Requiere haber ejecutado supabase/realtime.sql. Devuelve la función para desuscribirse.
export function subscribeToCatalogChanges(onChange: () => void): () => void {
  const client = supabase;
  if (!client) return () => {};

  let channel: ReturnType<typeof client.channel> | null = null;
  let cancelled = false;

  // El canal se abre después de la sesión para que Realtime respete las políticas RLS.
  ensureSupabaseSession()
    .then(() => {
      if (cancelled) return;
      channel = client
        .channel('catalogo')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'languages' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'frameworks' }, onChange)
        .subscribe();
    })
    .catch(() => {});

  return () => {
    cancelled = true;
    if (channel) client.removeChannel(channel);
  };
}

// Datos para crear un lenguaje. Los ejemplos de código son opcionales:
// si se dejan vacíos la pantalla "Aprende" simplemente no los muestra.
export type NewLanguage = Omit<ProgrammingLanguage, 'variablesExample' | 'conditionalsExample' | 'loopsExample'> & {
  variablesExample: ProgrammingLanguage['variablesExample'] | null;
  conditionalsExample: ProgrammingLanguage['conditionalsExample'] | null;
  loopsExample: ProgrammingLanguage['loopsExample'] | null;
};

// Convierte el lenguaje del formulario a las columnas de la tabla languages (snake_case).
export function languageToRow(language: NewLanguage) {
  return {
    id: language.id,
    name: language.name,
    tagline: language.tagline,
    color: language.color,
    year: language.year,
    founders: language.founders,
    paradigm: language.paradigm,
    history: language.history,
    key_features: language.keyFeatures,
    curiosity: language.curiosity,
    use_cases: language.useCases,
    variables_example: language.variablesExample,
    conditionals_example: language.conditionalsExample,
    loops_example: language.loopsExample,
    steps: language.steps,
    courses: language.courses,
  };
}

// Guarda el lenguaje con la función agregar_lenguaje (ver supabase/superusuario.sql).
// Si quien llama es el superusuario no se necesita la clave. Devuelve el id del lenguaje creado.
export async function addLanguage(language: NewLanguage, adminKey: string): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado');
  await ensureSupabaseSession();

  const row = languageToRow(language);

  const { data, error } = await supabase.rpc('agregar_lenguaje', { datos: row, clave: adminKey });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Falta ejecutar supabase/agregar-lenguaje.sql en Supabase');
    if (!adminKey && error.message.includes('Clave de administrador')) {
      throw new Error('Supabase no reconoce tu cuenta como administrador: ejecuta supabase/superusuario.sql y vuelve a iniciar sesión');
    }
    throw new Error(error.message);
  }
  return data as string;
}
