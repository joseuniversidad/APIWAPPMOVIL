import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useUserData } from '@/contexts/user-data-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { askAssistant, type ChatMessage } from '@/services/ai-chat';
import { isSupabaseConfigured } from '@/services/supabase';

const FOLLOW_UPS = ['Explícalo más simple', 'Dame otro ejemplo', 'Hazme una pregunta de práctica'];

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

// Separa el texto de los bloques de código (```lenguaje ... ```) para mostrarlos en monoespaciada.
function splitCode(content: string): { code: boolean; text: string }[] {
  return content
    .split(/```[\w+#-]*\n?/)
    .map((text, index) => ({ code: index % 2 === 1, text: index % 2 === 1 ? text.replace(/\n$/, '') : text.trim() }))
    .filter((part) => part.text);
}

const GENERAL_SUGGESTIONS = [
  '¿Qué lenguaje me recomiendas para empezar?',
  '¿Cuál es la diferencia entre JavaScript y TypeScript?',
  '¿Qué es un framework?',
  '¿Para qué sirve Python?',
];

export default function AssistantScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { contentMaxWidth } = useResponsive();
  const { lenguaje } = useLocalSearchParams<{ lenguaje?: string }>();
  const { getLanguageById } = useCatalog();
  const language = getLanguageById(lenguaje);
  const { recordActivity } = useUserData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const suggestions = language
    ? [
        `¿Por qué debería aprender ${language.name}?`,
        `Dame un ejemplo sencillo en ${language.name}`,
        `¿Qué puedo construir con ${language.name}?`,
      ]
    : GENERAL_SUGGESTIONS;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();

    const history: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(history);
    setInput('');
    setError(null);
    setSending(true);
    try {
      const reply = await askAssistant(history, language?.name);
      setMessages([...history, { role: 'assistant', content: reply }]);
      recordActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al consultar el asistente');
    } finally {
      setSending(false);
    }
  };

  const clear = () => {
    setMessages([]);
    setError(null);
  };

  const bubbleBorder = colorScheme === 'dark' ? '#2a2d2e' : '#e5e7eb';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}>
          <View style={[styles.header, { borderColor: bubbleBorder }]}>
            <View style={[styles.headerIcon, { backgroundColor: `${palette.tint}1F` }]}>
              <Ionicons name="sparkles" size={18} color={palette.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                Asistente IA
              </ThemedText>
              <ThemedText style={[styles.muted, { fontSize: 13 }]} numberOfLines={1}>
                {language ? `Contexto: ${language.name}` : 'Dudas sobre lenguajes y programación'}
              </ThemedText>
            </View>
            {messages.length > 0 && (
              <Pressable onPress={clear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Nueva conversación">
                <Ionicons name="trash-outline" size={22} color={palette.icon} />
              </Pressable>
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.messages}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {!isSupabaseConfigured() && (
              <ThemedText style={styles.error}>Falta configurar Supabase en el archivo .env.</ThemedText>
            )}

            {messages.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="sparkles-outline" size={40} color={palette.tint} />
                <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
                  ¡Hola! Soy el asistente de MiApp54.
                </ThemedText>
                <ThemedText style={[styles.muted, { textAlign: 'center' }]}>
                  Pregúntame sobre lenguajes, frameworks o cómo empezar a programar. Prueba con:
                </ThemedText>
                <View style={styles.suggestions}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => send(s)}
                      style={({ pressed }) => [styles.suggestion, { borderColor: `${palette.tint}66` }, pressed && { opacity: 0.6 }]}>
                      <ThemedText style={{ color: palette.tint, fontSize: 14 }}>{s}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {messages.map((message, index) => {
              const mine = message.role === 'user';
              return (
                <Animated.View
                  key={index}
                  entering={FadeInUp.duration(200)}
                  style={[
                    styles.bubble,
                    mine
                      ? [styles.mine, { backgroundColor: palette.tint }]
                      : [styles.theirs, { borderColor: bubbleBorder, backgroundColor: colorScheme === 'dark' ? '#1f2223' : '#f3f4f6' }],
                  ]}>
                  {!mine && (
                    <View style={styles.botLabel}>
                      <Ionicons name="sparkles" size={12} color={palette.tint} />
                      <ThemedText style={[styles.muted, { fontSize: 12 }]}>Asistente</ThemedText>
                    </View>
                  )}
                  {mine ? (
                    <ThemedText selectable style={{ color: palette.background }}>
                      {message.content}
                    </ThemedText>
                  ) : (
                    splitCode(message.content).map((part, partIndex) =>
                      part.code ? (
                        <View key={partIndex} style={styles.codeBlock}>
                          <ThemedText selectable style={styles.codeText} lightColor="#e6edf3" darkColor="#e6edf3">
                            {part.text}
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText key={partIndex} selectable>
                          {part.text}
                        </ThemedText>
                      )
                    )
                  )}
                </Animated.View>
              );
            })}

            {sending && (
              <View style={[styles.bubble, styles.theirs, styles.typing, { borderColor: bubbleBorder }]}>
                <ActivityIndicator size="small" color={palette.tint} />
                <ThemedText style={styles.muted}>Pensando…</ThemedText>
              </View>
            )}
            {error && <ThemedText style={styles.error}>{error}</ThemedText>}
          </ScrollView>

          {messages.length > 0 && !sending && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.followUps}>
              {FOLLOW_UPS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  style={({ pressed }) => [styles.followUp, { borderColor: `${palette.tint}66` }, pressed && { opacity: 0.6 }]}>
                  <ThemedText style={{ color: palette.tint, fontSize: 13 }}>{s}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={[styles.inputRow, { borderColor: bubbleBorder }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Escribe tu pregunta…"
              placeholderTextColor={palette.icon}
              multiline
              maxLength={2000}
              style={[styles.input, { color: palette.text, borderColor: bubbleBorder }]}
              onSubmitEditing={() => send(input)}
              blurOnSubmit={Platform.OS === 'web'}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={sending || !input.trim()}
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              style={[styles.sendButton, { backgroundColor: palette.tint, opacity: sending || !input.trim() ? 0.4 : 1 }]}>
              <Ionicons name="send" size={18} color={palette.background} />
            </Pressable>
          </View>
          <ThemedText style={styles.disclaimer}>Las respuestas las genera una IA y pueden contener errores.</ThemedText>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBlock: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 10,
    marginVertical: 2,
  },
  codeText: {
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 19,
  },
  followUps: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  followUp: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  muted: {
    opacity: 0.7,
  },
  messages: {
    padding: 16,
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  suggestions: {
    gap: 8,
    alignSelf: 'stretch',
  },
  suggestion: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  mine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  botLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  error: {
    color: '#d9534f',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    fontSize: 11,
    opacity: 0.5,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
