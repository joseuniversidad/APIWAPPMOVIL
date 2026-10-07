import type { Framework } from '@/data/frameworks';
import type { ProgrammingLanguage } from '@/data/languages';

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

const OPTIONS_PER_QUESTION = 4;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Arma las opciones: la respuesta correcta más distractores distintos tomados de otros lenguajes.
function withDistractors(answer: string, candidates: string[]): string[] | null {
  const distractors = shuffle([...new Set(candidates.filter((c) => c && c !== answer))]).slice(0, OPTIONS_PER_QUESTION - 1);
  if (distractors.length < OPTIONS_PER_QUESTION - 1) return null;
  return shuffle([answer, ...distractors]);
}

// Genera las preguntas a partir de los datos del catálogo, así cada lenguaje
// (incluidos los que se agreguen en Supabase) tiene su quiz sin escribirlo a mano.
export function buildQuiz(
  language: ProgrammingLanguage,
  languages: ProgrammingLanguage[],
  frameworks: Framework[]
): QuizQuestion[] {
  const others = languages.filter((l) => l.id !== language.id);
  const questions: (QuizQuestion | null)[] = [];

  const add = (question: string, answer: string, candidates: string[], explanation: string) => {
    const options = withDistractors(answer, candidates);
    questions.push(options ? { question, options, answer, explanation } : null);
  };

  add(
    `¿En qué año se creó ${language.name}?`,
    String(language.year),
    others.map((l) => String(l.year)),
    `${language.name} apareció en ${language.year}.`
  );
  add(
    `¿Quién creó ${language.name}?`,
    language.founders.join(', '),
    others.map((l) => l.founders.join(', ')),
    `${language.name} fue creado por ${language.founders.join(', ')}.`
  );
  add(
    `¿Cuál es el paradigma principal de ${language.name}?`,
    language.paradigm,
    others.map((l) => l.paradigm),
    `${language.name} se clasifica como: ${language.paradigm}.`
  );
  add(
    `¿Qué frase describe mejor a ${language.name}?`,
    language.tagline,
    others.map((l) => l.tagline),
    `El lema de ${language.name} es "${language.tagline}".`
  );

  const ownFrameworks = frameworks.filter((f) => f.languageId === language.id);
  if (ownFrameworks.length > 0) {
    const correct = shuffle(ownFrameworks)[0];
    add(
      `¿Cuál de estos frameworks se programa con ${language.name}?`,
      correct.name,
      frameworks.filter((f) => f.languageId !== language.id).map((f) => f.name),
      `${correct.name} está construido sobre ${language.name}: ${correct.tagline}.`
    );
  } else if (language.keyFeatures.length > 0) {
    const feature = shuffle(language.keyFeatures)[0];
    add(
      `¿Cuál de estas es una característica de ${language.name}?`,
      feature,
      others.flatMap((l) => l.keyFeatures),
      `Una de las características de ${language.name} es: ${feature}.`
    );
  }

  return questions.filter((q): q is QuizQuestion => q !== null);
}

export function quizMessage(score: number, total: number): string {
  const ratio = total ? score / total : 0;
  if (ratio === 1) return '¡Perfecto! Dominas este lenguaje.';
  if (ratio >= 0.6) return '¡Muy bien! Conoces lo esencial.';
  if (ratio >= 0.4) return 'Vas por buen camino. Repasa la historia y vuelve a intentarlo.';
  return 'Te recomendamos revisar la sección de historia y la de "Aprende".';
}
