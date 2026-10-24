import { supabase } from '@/services/supabase';
import type { QuizQuestion } from '@/utils/quiz';

// Preguntas que escriben los profesores y el superusuario (tabla preguntas_quiz de admin-extra.sql).
// Se mezclan con las que la app genera a partir del catálogo.
export type CustomQuestion = {
  id: number;
  language_id: string;
  pregunta: string;
  opciones: string[];
  respuesta: string;
  explicacion: string;
  autor_id: string;
  created_at: string;
};

export async function getCustomQuestions(languageId: string): Promise<CustomQuestion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('preguntas_quiz')
    .select('id, language_id, pregunta, opciones, respuesta, explicacion, autor_id, created_at')
    .eq('language_id', languageId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as CustomQuestion[];
}

export function toQuizQuestion(question: CustomQuestion): QuizQuestion {
  // Las opciones se mezclan para que la respuesta no quede siempre en el mismo lugar.
  const options = [...question.opciones].sort(() => Math.random() - 0.5);
  return { question: question.pregunta, options, answer: question.respuesta, explanation: question.explicacion };
}

export async function addCustomQuestion(input: {
  languageId: string;
  pregunta: string;
  opciones: string[];
  respuesta: string;
  explicacion: string;
}): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { error } = await supabase.from('preguntas_quiz').insert({
    language_id: input.languageId,
    pregunta: input.pregunta.trim(),
    opciones: input.opciones.map((o) => o.trim()),
    respuesta: input.respuesta.trim(),
    explicacion: input.explicacion.trim(),
  });
  if (error) {
    if (error.code === '42501') throw new Error('Solo profesores y el superusuario pueden agregar preguntas');
    if (error.code === '42P01' || error.code === 'PGRST205') throw new Error('Falta ejecutar supabase/admin-extra.sql en Supabase');
    throw new Error(error.message);
  }
}

export async function deleteCustomQuestion(id: number): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { error } = await supabase.from('preguntas_quiz').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
