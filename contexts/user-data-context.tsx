import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { PASSING_PERCENT } from '@/data/rutas';
import { getMySolvedCount } from '@/services/challenges';
import { getMyClasses } from '@/services/classes';
import { getFavorites, setFavorite } from '@/services/favorites';
import { getNickname, saveNickname } from '@/services/profile';
import {
  currentStreak,
  dayKey,
  fetchCloudSteps,
  loadProgress,
  longestStreak,
  saveDays,
  saveLastLanguage,
  saveSteps,
  syncStepsToCloud,
  type StepsProgress,
} from '@/services/progress';
import { getQuizStats, type QuizStats } from '@/services/quiz-scores';
import { applyReminder, getReminderPrefs } from '@/services/reminders';

// Datos personales del usuario: favoritos, progreso del tutorial, racha de estudio,
// estadísticas del quiz, retos, clases y apodo. Se comparten entre todas las pantallas.
type UserDataContextValue = {
  favorites: string[];
  isFavorite: (languageId: string) => boolean;
  toggleFavorite: (languageId: string) => void;
  steps: StepsProgress;
  toggleStep: (languageId: string, index: number) => void;
  // Un lenguaje cuenta como hecho al completar su tutorial o sacar 60% o más en su quiz.
  isLanguageDone: (languageId: string) => boolean;
  lastLanguageId: string | null;
  setLastLanguage: (languageId: string) => void;
  streak: number;
  bestStreak: number;
  activeDays: number;
  recordActivity: () => void;
  quizStats: QuizStats;
  refreshQuizStats: () => void;
  solvedChallenges: number;
  classesCount: number;
  refreshCommunity: () => void;
  nickname: string | null;
  updateNickname: (nickname: string) => Promise<void>;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

const EMPTY_STATS: QuizStats = { best: {}, attempts: 0, averagePercent: null };

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { getLanguageById } = useCatalog();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [steps, setSteps] = useState<StepsProgress>({});
  const [days, setDays] = useState<string[]>([]);
  const [lastLanguageId, setLastLanguageId] = useState<string | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStats>(EMPTY_STATS);
  const [statsVersion, setStatsVersion] = useState(0);
  const [communityVersion, setCommunityVersion] = useState(0);
  const [solvedChallenges, setSolvedChallenges] = useState(0);
  const [classesCount, setClassesCount] = useState(0);
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    loadProgress().then((saved) => {
      setSteps(saved.steps);
      setDays(saved.days);
      setLastLanguageId(saved.lastLanguage);
    });
  }, []);

  // Al iniciar sesión se juntan los pasos del dispositivo con los de la nube y se sube lo que falte.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.all([loadProgress(), fetchCloudSteps()]).then(([local, cloud]) => {
      if (!active) return;
      const merged: StepsProgress = { ...cloud };
      for (const [languageId, done] of Object.entries(local.steps)) {
        const union = [...new Set([...(cloud[languageId] ?? []), ...done])].sort((a, b) => a - b);
        merged[languageId] = union;
        if (union.length !== (cloud[languageId]?.length ?? 0)) syncStepsToCloud(languageId, union).catch(() => {});
      }
      setSteps(merged);
      saveSteps(merged);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // Cada cuenta tiene sus propios favoritos y apodo.
  useEffect(() => {
    let active = true;
    getFavorites().then((ids) => active && setFavorites(ids));
    getNickname().then((value) => active && setNickname(value));
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    getQuizStats()
      .then((stats) => active && setQuizStats(stats))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, statsVersion]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getMySolvedCount().then((count) => active && setSolvedChallenges(count));
    getMyClasses()
      .then((classes) => active && setClassesCount(classes.length))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, communityVersion]);

  const streak = currentStreak(days);
  const lastLanguageName = getLanguageById(lastLanguageId ?? undefined)?.name;

  // Si el recordatorio diario está activo, se reprograma con la racha y el lenguaje actuales.
  useEffect(() => {
    getReminderPrefs()
      .then((prefs) => (prefs.enabled ? applyReminder(prefs, { languageName: lastLanguageName, streak }) : null))
      .catch(() => {});
  }, [lastLanguageName, streak]);

  const recordActivity = useCallback(() => {
    const today = dayKey();
    setDays((current) => {
      if (current.includes(today)) return current;
      // Se guardan los últimos 400 días como máximo.
      const next = [...current, today].slice(-400);
      saveDays(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(
    (languageId: string) => {
      const favorite = !favorites.includes(languageId);
      setFavorites((current) => (favorite ? [...new Set([...current, languageId])] : current.filter((id) => id !== languageId)));
      setFavorite(languageId, favorite);
    },
    [favorites]
  );

  const toggleStep = useCallback(
    (languageId: string, index: number) => {
      const done = new Set(steps[languageId] ?? []);
      if (done.has(index)) done.delete(index);
      else done.add(index);
      const list = [...done].sort((a, b) => a - b);
      const next = { ...steps, [languageId]: list };
      setSteps(next);
      saveSteps(next);
      syncStepsToCloud(languageId, list).catch(() => {});
      recordActivity();
    },
    [steps, recordActivity]
  );

  const isLanguageDone = useCallback(
    (languageId: string) => {
      const language = getLanguageById(languageId);
      const tutorialDone = Boolean(language && language.steps.length > 0 && (steps[languageId]?.length ?? 0) >= language.steps.length);
      const best = quizStats.best[languageId];
      const quizPassed = Boolean(best && (best.score / best.total) * 100 >= PASSING_PERCENT);
      return tutorialDone || quizPassed;
    },
    [getLanguageById, steps, quizStats]
  );

  const setLastLanguage = useCallback((languageId: string) => {
    setLastLanguageId(languageId);
    saveLastLanguage(languageId);
  }, []);

  const refreshQuizStats = useCallback(() => setStatsVersion((v) => v + 1), []);
  const refreshCommunity = useCallback(() => setCommunityVersion((v) => v + 1), []);

  const updateNickname = useCallback(async (value: string) => {
    await saveNickname(value);
    setNickname(value.trim());
  }, []);

  const value = useMemo<UserDataContextValue>(
    () => ({
      favorites,
      isFavorite: (languageId) => favorites.includes(languageId),
      toggleFavorite,
      steps,
      toggleStep,
      isLanguageDone,
      lastLanguageId,
      setLastLanguage,
      streak,
      bestStreak: longestStreak(days),
      activeDays: days.length,
      recordActivity,
      quizStats,
      refreshQuizStats,
      solvedChallenges,
      classesCount,
      refreshCommunity,
      nickname,
      updateNickname,
    }),
    [
      favorites, toggleFavorite, steps, toggleStep, isLanguageDone, lastLanguageId, setLastLanguage, streak, days,
      recordActivity, quizStats, refreshQuizStats, solvedChallenges, classesCount, refreshCommunity, nickname, updateNickname,
    ]
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataContextValue {
  const context = useContext(UserDataContext);
  if (!context) throw new Error('useUserData debe usarse dentro de <UserDataProvider>');
  return context;
}
