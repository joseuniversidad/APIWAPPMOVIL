import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BlinkingCursor, readableColor } from '@/components/landing/animations';
import { Fonts } from '@/constants/theme';
import type { ProgrammingLanguage } from '@/data/languages';

const EXTENSIONS: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  php: 'php',
  kotlin: 'kt',
  swift: 'swift',
  go: 'go',
  ruby: 'rb',
  rust: 'rs',
  dart: 'dart',
  perl: 'pl',
  scala: 'scala',
  lua: 'lua',
  elixir: 'ex',
};

const KEYWORDS = new Set(
  (
    'let const var if else elif for while do def fn func function return int float double string bool boolean char true false ' +
    'True False None null nil class public private static void in range print println printf console echo val and or not new ' +
    'import from package use using struct mut end then local puts my foreach of auto main'
  ).split(' ')
);

const TOKEN = /("[^"\n]*"?|'[^'\n]*'?|\/\/[^\n]*|--[^\n]*|\b\d+(?:\.\d+)?\b|[A-Za-z_]\w*|\s+|.)/g;

// Resaltado sencillo: cadenas, números, comentarios y palabras clave.
function highlight(code: string, colors: { keyword: string; string: string; number: string; comment: string; text: string }) {
  return (code.match(TOKEN) ?? []).map((token, i) => {
    let color = colors.text;
    if (token.startsWith('"') || token.startsWith("'")) color = colors.string;
    else if (token.startsWith('//') || token.startsWith('--')) color = colors.comment;
    else if (/^\d/.test(token)) color = colors.number;
    else if (KEYWORDS.has(token)) color = colors.keyword;
    return (
      <Text key={i} style={{ color }}>
        {token}
      </Text>
    );
  });
}

type Snippet = { id: string; name: string; color: string; file: string; code: string };

// Editor falso que escribe un ejemplo de cada lenguaje, letra por letra, y pasa al siguiente.
export function CodeTypewriter({ languages, dark, compact = false }: { languages: ProgrammingLanguage[]; dark: boolean; compact?: boolean }) {
  const snippets = useMemo<Snippet[]>(
    () =>
      languages
        .map((language) => ({
          id: language.id,
          name: language.name ?? language.id,
          color: readableColor(language.color, true),
          file: `ejemplo.${EXTENSIONS[language.id] ?? 'txt'}`,
          code: language.conditionalsExample?.code || language.loopsExample?.code || language.variablesExample?.code || '',
        }))
        .filter((snippet) => snippet.code)
        .slice(0, 8),
    [languages]
  );

  const [current, setCurrent] = useState(0);
  const [typed, setTyped] = useState(0);
  const snippet = snippets[current % Math.max(1, snippets.length)];

  useEffect(() => {
    if (!snippet) return;
    if (typed < snippet.code.length) {
      // Los espacios van más rápido para que la sangría no se sienta lenta.
      const next = snippet.code[typed];
      const timer = setTimeout(() => setTyped((t) => t + 1), next === ' ' ? 8 : 32);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setCurrent((c) => (c + 1) % snippets.length);
      setTyped(0);
    }, 2600);
    return () => clearTimeout(timer);
  }, [typed, snippet, snippets.length]);

  if (!snippet) return null;

  const colors = {
    keyword: '#c792ea',
    string: '#c3e88d',
    number: '#f78c6c',
    comment: '#697098',
    text: '#e6edf3',
  };
  const visible = snippet.code.slice(0, typed);
  const lines = visible.split('\n');

  return (
    <View style={[styles.window, { borderColor: dark ? '#2a2d2e' : '#d5dbe3' }]}>
      <View style={styles.titleBar}>
        <View style={styles.dots}>
          {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
            <View key={color} style={[styles.dot, { backgroundColor: color }]} />
          ))}
        </View>
        <Text style={styles.fileName}>{snippet.file}</Text>
        <View style={[styles.langBadge, { borderColor: snippet.color }]}>
          <View style={[styles.langDot, { backgroundColor: snippet.color }]} />
          <Text style={[styles.langBadgeText, { color: snippet.color }]}>{snippet.name}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {snippets.map((item, i) => {
          const active = i === current;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                setCurrent(i);
                setTyped(0);
              }}
              style={[styles.tab, active && { borderBottomColor: item.color, backgroundColor: '#ffffff0d' }]}>
              <Text style={[styles.tabText, active && { color: '#fff' }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* En celular las líneas largas se deslizan de lado en vez de romper la sangría. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Animated.View key={snippet.id} entering={FadeIn.duration(250)} style={[styles.body, compact && styles.bodyCompact]}>
          {lines.map((line, i) => (
            <View key={i} style={styles.line}>
              <Text style={[styles.lineNumber, compact && styles.small]}>{i + 1}</Text>
              <Text style={[styles.code, compact && styles.small]}>{highlight(line, colors)}</Text>
              {i === lines.length - 1 && <BlinkingCursor color={snippet.color} />}
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {typed < snippet.code.length ? 'Escribiendo…' : '✓ Listo'} · Ln {lines.length}, Col {lines[lines.length - 1].length + 1}
        </Text>
        {!compact && <Text style={styles.statusText}>UTF-8 · {snippet.name}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    backgroundColor: '#0d1117',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.55)',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#161b22',
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fileName: {
    flex: 1,
    color: '#8b949e',
    fontFamily: Fonts?.mono,
    fontSize: 13,
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  langDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#11161d',
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    color: '#8b949e',
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    padding: 18,
    minHeight: 260,
  },
  bodyCompact: {
    padding: 14,
    minHeight: 220,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  lineNumber: {
    width: 30,
    color: '#484f58',
    fontFamily: Fonts?.mono,
    fontSize: 14,
  },
  code: {
    color: '#e6edf3',
    fontFamily: Fonts?.mono,
    fontSize: 15,
    lineHeight: 24,
    ...Platform.select({ web: { whiteSpace: 'pre' } as object }),
  },
  small: {
    fontSize: 13,
    lineHeight: 21,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#1f6feb',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
