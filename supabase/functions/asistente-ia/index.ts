// Edge Function de Supabase (Deno): asistente de IA sobre lenguajes de programación.
// La API key de Anthropic vive solo aquí, como secreto de Supabase (ANTHROPIC_API_KEY);
// la app nunca la conoce. Cada petición debe traer el JWT de Supabase del usuario.
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-opus-5-5';
const MAX_HISTORY = 20; // mensajes que se reenvían como contexto
const MAX_CHARS = 2000; // por mensaje del usuario
const DAILY_LIMIT = 30; // mensajes por usuario por día (control de costos)

const SYSTEM_PROMPT = `Eres el asistente de MiApp54, un catálogo educativo de lenguajes de programación y sus frameworks.
Ayudas a estudiantes que están empezando a programar.

Cómo responder:
- Responde siempre en español, con un tono amable y claro.
- Sé breve: entre 2 y 6 oraciones, o una lista corta. Amplía solo si el usuario lo pide.
- Cuando muestres código, usa ejemplos cortos y explica qué hace cada parte.
- Si te preguntan algo que no tiene relación con programación, tecnología o el aprendizaje de lenguajes, indícalo con amabilidad y sugiere una pregunta relacionada.
- Si no estás seguro de un dato (por ejemplo, una fecha o una versión), dilo en lugar de inventarlo.
- No uses encabezados de Markdown; usa texto plano con listas simples si hace falta.

Latency-sensitive; begin your visible answer immediately.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') return null;
    const content = item.content.trim().slice(0, MAX_CHARS);
    if (content) messages.push({ role: item.role, content });
  }
  // Se conserva solo el historial reciente y debe empezar y terminar con el usuario.
  let recent = messages.slice(-MAX_HISTORY);
  while (recent.length && recent[0].role !== 'user') recent = recent.slice(1);
  if (!recent.length || recent[recent.length - 1].role !== 'user') return null;
  return recent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  // 1. Verificar el JWT del usuario (incluye usuarios anónimos de la app).
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Falta el token de sesión' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Sesión inválida o expirada' }, 401);

  // 2. Validar el cuerpo de la petición.
  let body: { messages?: unknown; languageName?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'El cuerpo debe ser JSON' }, 400);
  }
  const messages = parseMessages(body.messages);
  if (!messages) return json({ error: 'El historial de mensajes no es válido' }, 400);

  // Contexto opcional: el lenguaje que el usuario está viendo en la app.
  if (typeof body.languageName === 'string' && body.languageName.trim()) {
    const last = messages[messages.length - 1];
    last.content = `[El usuario está viendo el lenguaje ${body.languageName.trim().slice(0, 40)} en la app]\n${last.content}`;
  }

  // 3. Límite diario por usuario (la tabla ai_chat_usage tiene RLS: cada usuario ve solo sus filas).
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('ai_chat_usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfDay.toISOString());
  if (countError) return json({ error: 'No se pudo verificar el límite de uso' }, 500);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: `Alcanzaste el límite de ${DAILY_LIMIT} mensajes por día. Vuelve mañana.` }, 429);
  }

  // 4. Llamar a Claude.
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages,
    });

    if (response.stop_reason === 'refusal') {
      return json({ reply: 'No puedo ayudarte con esa pregunta. ¿Quieres preguntarme algo sobre programación?' });
    }

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    await supabase.from('ai_chat_usage').insert({
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });

    return json({ reply: reply || 'No obtuve una respuesta. Intenta reformular tu pregunta.' });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: 'El asistente está recibiendo muchas preguntas. Intenta en un minuto.' }, 429);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('ANTHROPIC_API_KEY inválida o ausente');
      return json({ error: 'El asistente no está configurado correctamente.' }, 500);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Error de la API de Claude ${error.status}: ${error.message}`);
      return json({ error: 'El asistente no está disponible en este momento.' }, 502);
    }
    console.error(error);
    return json({ error: 'Error inesperado del asistente.' }, 500);
  }
});
