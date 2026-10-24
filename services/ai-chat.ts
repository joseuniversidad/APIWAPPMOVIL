import { FunctionsHttpError } from '@supabase/supabase-js';

import { ensureSupabaseSession, supabase } from '@/services/supabase';
import type { QuizQuestion } from '@/utils/quiz';

// Cliente del asistente de IA. La app nunca llama a Claude directamente:
// envía el historial a la Edge Function de Supabase con el JWT
// de la sesión, y la función (que guarda la API key como secreto) responde.
// Nombre con el que quedó desplegada la función (código en supabase/functions/asistente-ia).
const FUNCTION_NAME = 'swift-worker';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function askAssistant(messages: ChatMessage[], languageName?: string): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado (revisa el archivo .env)');
  await ensureSupabaseSession();

  const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>(FUNCTION_NAME, {
    body: { messages, languageName },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detail = await error.context.json().catch(() => null);
      throw new Error(detail?.error ?? 'El asistente no está disponible en este momento.');
    }
    throw new Error('No se pudo conectar con el asistente. Revisa tu conexión.');
  }
  if (!data?.reply) throw new Error(data?.error ?? 'El asistente no respondió.');
  return data.reply;
}

// Pide a la Edge Function (modo "quiz") preguntas nuevas sobre un lenguaje.
// Requiere volver a desplegar la función con el código actual de supabase/functions/asistente-ia.
export async function generateAiQuiz(languageName: string): Promise<QuizQuestion[]> {
  if (!supabase) throw new Error('Supabase no está configurado (revisa el archivo .env)');
  await ensureSupabaseSession();

  type AiQuestion = { pregunta: string; opciones: string[]; respuesta: string; explicacion: string };
  const { data, error } = await supabase.functions.invoke<{ questions?: AiQuestion[]; error?: string }>(FUNCTION_NAME, {
    body: { mode: 'quiz', languageName },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detail = await error.context.json().catch(() => null);
      throw new Error(detail?.error ?? 'No se pudo generar el quiz con IA.');
    }
    throw new Error('No se pudo conectar con el asistente. Revisa tu conexión.');
  }
  if (!data?.questions?.length) {
    throw new Error(data?.error ?? 'La función aún no soporta quizzes: vuelve a desplegarla con el código nuevo.');
  }
  return data.questions.map((q) => ({
    question: q.pregunta,
    options: q.opciones,
    answer: q.respuesta,
    explanation: q.explicacion,
  }));
}
