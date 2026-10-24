// Insignias del perfil. Se calculan con los datos que ya guarda la app;
// no hace falta ninguna tabla nueva.
export type BadgeInput = {
  quizAttempts: number;
  bestByLanguage: Record<string, { score: number; total: number } | null>;
  longestStreak: number;
  completedTutorials: number;
  solvedChallenges: number;
  classes: number;
  completedPaths: number;
  favorites: number;
};

export type Badge = { id: string; emoji: string; title: string; hint: string; earned: boolean };

export function computeBadges(input: BadgeInput): Badge[] {
  const bests = Object.values(input.bestByLanguage).filter((b): b is { score: number; total: number } => Boolean(b));
  const languagesTried = bests.length;
  const perfect = bests.some((b) => b.score === b.total);

  return [
    { id: 'primer-quiz', emoji: '🎯', title: 'Primer quiz', hint: 'Haz tu primer quiz', earned: input.quizAttempts >= 1 },
    { id: 'perfecto', emoji: '💯', title: 'Puntaje perfecto', hint: 'Responde bien todas las preguntas de un quiz', earned: perfect },
    { id: 'racha-3', emoji: '🔥', title: '3 días seguidos', hint: 'Estudia 3 días seguidos', earned: input.longestStreak >= 3 },
    { id: 'racha-7', emoji: '🔥', title: '7 días seguidos', hint: 'Estudia 7 días seguidos', earned: input.longestStreak >= 7 },
    { id: 'explorador', emoji: '🧭', title: '5 lenguajes', hint: 'Haz el quiz de 5 lenguajes distintos', earned: languagesTried >= 5 },
    { id: 'poliglota', emoji: '🌍', title: 'Políglota', hint: 'Haz el quiz de 10 lenguajes distintos', earned: languagesTried >= 10 },
    { id: 'tutorial', emoji: '📘', title: 'Tutorial completo', hint: 'Completa todos los pasos del tutorial de un lenguaje', earned: input.completedTutorials >= 1 },
    { id: 'reto', emoji: '⚔️', title: 'Primer reto', hint: 'Resuelve un reto semanal', earned: input.solvedChallenges >= 1 },
    { id: 'retos-5', emoji: '🏅', title: '5 retos', hint: 'Resuelve 5 retos semanales', earned: input.solvedChallenges >= 5 },
    { id: 'clase', emoji: '🏫', title: 'En clase', hint: 'Únete a una clase con su código', earned: input.classes >= 1 },
    { id: 'ruta', emoji: '🏆', title: 'Ruta completa', hint: 'Termina una ruta de aprendizaje', earned: input.completedPaths >= 1 },
    { id: 'favoritos', emoji: '💖', title: 'Coleccionista', hint: 'Marca 5 lenguajes como favoritos', earned: input.favorites >= 5 },
  ];
}
