import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAppConfig } from '@/contexts/app-config-context';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteLanguage, listUsers, resetNickname, setUserRole, suspendUser, type AppUser } from '@/services/admin';
import type { AppConfig, NoticeTone } from '@/services/app-config';
import { sendNotice } from '@/services/notices';

const DANGER = '#d9534f';
const SUCCESS = '#2e9e5b';

const ROLE_LABEL: Record<AppUser['rol'], string> = { estudiante: 'Estudiante', profesor: 'Profesor', admin: 'Superusuario' };

function useColors() {
  const colorScheme = useColorScheme() ?? 'light';
  return {
    palette: Colors[colorScheme],
    border: colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea',
    surface: colorScheme === 'dark' ? '#1d2022' : '#f4f6f8',
  };
}

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

function initials(user: AppUser) {
  const source = user.nombre ?? user.correo;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

type Filter = 'todos' | 'profesores' | 'sin-confirmar';

// Usuarios: quién es quién, nombrar profesores y moderar apodos.
export function UsersSection({ version, onLoaded }: { version: number; onLoaded: () => void }) {
  const { palette, border, surface } = useColors();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [localVersion, setLocalVersion] = useState(0);

  useEffect(() => {
    let active = true;
    listUsers()
      .then((list) => {
        if (!active) return;
        setUsers(list);
        setError(null);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => active && onLoaded());
    return () => {
      active = false;
    };
  }, [version, localVersion, onLoaded]);

  const counts = useMemo(
    () => ({
      todos: users?.length ?? 0,
      profesores: users?.filter((u) => u.rol === 'profesor').length ?? 0,
      'sin-confirmar': users?.filter((u) => !u.confirmado).length ?? 0,
    }),
    [users]
  );

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (filter === 'profesores' && u.rol !== 'profesor') return false;
      if (filter === 'sin-confirmar' && u.confirmado) return false;
      if (!normalized) return true;
      return [u.nombre, u.correo, u.apodo].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [users, query, filter]);

  const run = async (action: () => Promise<void>, update: Partial<AppUser>) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await action();
      haptic();
      const next = { ...selected, ...update };
      setSelected(next);
      setUsers((current) => current?.map((u) => (u.id === next.id ? next : u)) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.search, { borderColor: border, backgroundColor: surface }]}>
        <Ionicons name="search" size={18} color={palette.icon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre o correo…"
          placeholderTextColor={palette.icon}
          autoCapitalize="none"
          style={[styles.searchInput, { color: palette.text }]}
        />
      </View>
      <View style={styles.chips}>
        {(['todos', 'profesores', 'sin-confirmar'] as const).map((option) => {
          const active = filter === option;
          return (
            <Pressable
              key={option}
              onPress={() => setFilter(option)}
              style={[styles.chip, { borderColor: active ? palette.tint : border }, active && { backgroundColor: palette.tint }]}>
              <ThemedText style={{ fontSize: 13, color: active ? palette.background : palette.text }}>
                {option === 'todos' ? 'Todos' : option === 'profesores' ? 'Profesores' : 'Sin confirmar'} {counts[option]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {error && <ThemedText style={{ color: DANGER }}>{error}</ThemedText>}
      {!users && !error ? (
        <ActivityIndicator color={palette.tint} />
      ) : visible.length === 0 ? (
        <ThemedText style={styles.muted}>No hay usuarios con ese filtro.</ThemedText>
      ) : (
        visible.map((u, index) => (
          <Pressable
            key={u.id}
            onPress={() => {
              haptic();
              setSelected(u);
            }}
            style={({ pressed }) => [styles.userRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border }, pressed && { opacity: 0.6 }]}>
            <View style={[styles.avatar, { backgroundColor: u.rol === 'estudiante' ? surface : `${palette.tint}26` }]}>
              <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>{initials(u)}</ThemedText>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText type="defaultSemiBold" numberOfLines={1}>
                {u.nombre ?? u.correo.split('@')[0]}
              </ThemedText>
              <ThemedText style={styles.meta} numberOfLines={1}>
                {u.correo} · {u.quizzes} quizzes{u.apodo ? ` · "${u.apodo}"` : ''}
              </ThemedText>
            </View>
            <View
              style={[
                styles.rolePill,
                { borderColor: !u.confirmado ? '#e0a100' : u.rol === 'estudiante' ? border : u.rol === 'admin' ? palette.tint : SUCCESS },
              ]}>
              <ThemedText
                style={{ fontSize: 11, fontWeight: '700', color: !u.confirmado ? '#e0a100' : u.rol === 'estudiante' ? palette.icon : u.rol === 'admin' ? palette.tint : SUCCESS }}>
                {u.suspendido_hasta ? 'Suspendido' : u.confirmado ? ROLE_LABEL[u.rol] : 'Sin confirmar'}
              </ThemedText>
            </View>
          </Pressable>
        ))
      )}

      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          {selected && (
            <Pressable style={[styles.sheet, { backgroundColor: palette.background }]} onPress={() => {}}>
              <View style={[styles.grab, { backgroundColor: border }]} />
              <ThemedText type="subtitle">{selected.nombre ?? selected.correo}</ThemedText>
              <ThemedText style={styles.muted}>{selected.correo}</ThemedText>
              <ThemedText style={styles.meta}>
                Registrado el {new Date(selected.creado).toLocaleDateString('es-GT')} ·{' '}
                {selected.ultimo_acceso ? `último acceso ${new Date(selected.ultimo_acceso).toLocaleDateString('es-GT')}` : 'sin acceso'}
              </ThemedText>

              <ThemedText type="defaultSemiBold" style={{ marginTop: 6 }}>
                Rol
              </ThemedText>
              {selected.rol === 'admin' || selected.id === me?.id ? (
                <ThemedText style={styles.muted}>Superusuario: su rol solo se cambia desde Supabase.</ThemedText>
              ) : (
                <View style={[styles.segment, { backgroundColor: surface }]}>
                  {(['estudiante', 'profesor'] as const).map((role) => {
                    const active = selected.rol === role;
                    return (
                      <Pressable
                        key={role}
                        disabled={saving || active}
                        onPress={() => run(() => setUserRole(selected.id, role), { rol: role })}
                        style={[styles.segmentItem, active && { backgroundColor: palette.background }]}>
                        <ThemedText type={active ? 'defaultSemiBold' : 'default'} style={{ fontSize: 14, color: active ? palette.tint : palette.icon }}>
                          {ROLE_LABEL[role]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {selected.rol !== 'admin' && selected.id !== me?.id && (
                <View style={{ gap: 8, marginTop: 6 }}>
                  <ThemedText type="defaultSemiBold">Acceso a la app</ThemedText>
                  {selected.suspendido_hasta ? (
                    <>
                      <ThemedText style={{ color: DANGER }}>
                        {new Date(selected.suspendido_hasta).getFullYear() > 2100
                          ? 'Cuenta suspendida sin fecha de regreso'
                          : `Cuenta suspendida hasta el ${new Date(selected.suspendido_hasta).toLocaleDateString('es-GT')}`}
                      </ThemedText>
                      <Pressable
                        disabled={saving}
                        onPress={() => run(() => suspendUser(selected.id, 0), { suspendido_hasta: null })}
                        style={({ pressed }) => [styles.outlineButton, { borderColor: SUCCESS }, pressed && { opacity: 0.6 }]}>
                        <ThemedText style={{ color: SUCCESS }}>Reactivar cuenta</ThemedText>
                      </Pressable>
                    </>
                  ) : (
                    <View style={styles.actions}>
                      {SUSPENSIONS.map((option) => (
                        <Pressable
                          key={option.days}
                          disabled={saving}
                          onPress={() =>
                            run(() => suspendUser(selected.id, option.days), {
                              suspendido_hasta: new Date(Date.now() + option.days * 86_400_000).toISOString(),
                            })
                          }
                          style={({ pressed }) => [styles.small, { borderColor: DANGER }, pressed && { opacity: 0.6 }]}>
                          <ThemedText style={{ color: DANGER, fontSize: 13 }}>{option.label}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {selected.apodo && (
                <Pressable
                  disabled={saving}
                  onPress={() => run(() => resetNickname(selected.id), { apodo: null })}
                  style={({ pressed }) => [styles.outlineButton, { borderColor: DANGER }, pressed && { opacity: 0.6 }]}>
                  <ThemedText style={{ color: DANGER }}>{`Restablecer apodo "${selected.apodo}"`}</ThemedText>
                </Pressable>
              )}
              {saving && <ActivityIndicator color={palette.tint} />}
              {error && <ThemedText style={{ color: DANGER }}>{error}</ThemedText>}
              <Pressable onPress={() => setSelected(null)} style={[styles.outlineButton, { borderColor: border }]}>
                <ThemedText>Cerrar</ThemedText>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      <Pressable onPress={() => setLocalVersion((v) => v + 1)} style={{ alignSelf: 'center', padding: 8 }}>
        <ThemedText style={{ color: palette.tint, fontSize: 14 }}>Actualizar lista</ThemedText>
      </Pressable>
    </View>
  );
}

// Contenido: lenguajes (agregar, editar, borrar), retos y avisos para todos.
export function ContentSection({ onLoaded }: { version: number; onLoaded: () => void }) {
  const { palette, border, surface } = useColors();
  const router = useRouter();
  const { languages, frameworks, getLanguageById, reload } = useCatalog();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  const send = async () => {
    if (title.trim().length < 2 || body.trim().length < 2) {
      setNoticeMessage({ text: 'Escribe el título y el mensaje', ok: false });
      return;
    }
    setSending(true);
    setNoticeMessage(null);
    try {
      await sendNotice(title, body);
      setTitle('');
      setBody('');
      haptic();
      setNoticeMessage({ text: 'Aviso enviado a todos', ok: true });
    } catch (e) {
      setNoticeMessage({ text: e instanceof Error ? e.message : 'No se pudo enviar', ok: false });
    } finally {
      setSending(false);
    }
  };

  const remove = async (languageId: string) => {
    setDeleting(true);
    setError(null);
    try {
      await deleteLanguage(languageId);
      setConfirming(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar');
    } finally {
      setDeleting(false);
    }
  };

  const input = [styles.input, { color: palette.text, borderColor: border, backgroundColor: surface }];

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push('/agregar-lenguaje')}
          style={({ pressed }) => [styles.primary, { backgroundColor: palette.tint }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="add-circle-outline" size={18} color={palette.background} />
          <ThemedText type="defaultSemiBold" style={{ color: palette.background, fontSize: 14 }}>
            Lenguaje
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/nuevo-reto')}
          style={({ pressed }) => [styles.primary, { borderWidth: 1.5, borderColor: palette.tint }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="trophy-outline" size={18} color={palette.tint} />
          <ThemedText type="defaultSemiBold" style={{ color: palette.tint, fontSize: 14 }}>
            Reto semanal
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push('/framework-form')}
          style={({ pressed }) => [styles.primary, { borderWidth: 1.5, borderColor: palette.tint }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="construct-outline" size={18} color={palette.tint} />
          <ThemedText type="defaultSemiBold" style={{ color: palette.tint, fontSize: 14 }}>
            Framework
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push('/preguntas')}
          style={({ pressed }) => [styles.primary, { borderWidth: 1.5, borderColor: palette.tint }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="help-circle-outline" size={18} color={palette.tint} />
          <ThemedText type="defaultSemiBold" style={{ color: palette.tint, fontSize: 14 }}>
            Preguntas quiz
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView style={[styles.card, { borderColor: border }]}>
        <ThemedText type="defaultSemiBold">📣 Enviar aviso a todos</ThemedText>
        <TextInput value={title} onChangeText={setTitle} placeholder="Título" placeholderTextColor={palette.icon} maxLength={80} style={input} />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Mensaje"
          placeholderTextColor={palette.icon}
          maxLength={300}
          multiline
          textAlignVertical="top"
          style={[input, { minHeight: 80 }]}
        />
        {noticeMessage && <ThemedText style={{ color: noticeMessage.ok ? SUCCESS : DANGER, fontSize: 14 }}>{noticeMessage.text}</ThemedText>}
        <Pressable
          onPress={send}
          disabled={sending}
          style={({ pressed }) => [styles.primary, { backgroundColor: palette.tint }, (pressed || sending) && { opacity: 0.6 }]}>
          {sending ? (
            <ActivityIndicator color={palette.background} />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
              Enviar
            </ThemedText>
          )}
        </Pressable>
        <ThemedText style={styles.meta}>Llega como notificación. Al agregar un lenguaje o publicar un reto, el aviso sale solo.</ThemedText>
      </ThemedView>

      <ThemedText style={styles.eyebrow}>LENGUAJES ({languages.length})</ThemedText>
      {error && <ThemedText style={{ color: DANGER }}>{error}</ThemedText>}
      {languages.map((language, index) => (
        <View key={language.id} style={[styles.langRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border }]}>
          {confirming === language.id ? (
            <View style={{ flex: 1, gap: 8 }}>
              <ThemedText style={{ fontSize: 14 }}>
                ¿Borrar {language.name}? También se borran sus frameworks, puntajes y favoritos. No se puede deshacer.
              </ThemedText>
              <View style={styles.actions}>
                <Pressable onPress={() => setConfirming(null)} style={[styles.small, { borderColor: border }]}>
                  <ThemedText style={{ fontSize: 14 }}>Cancelar</ThemedText>
                </Pressable>
                <Pressable onPress={() => remove(language.id)} disabled={deleting} style={[styles.small, { borderColor: DANGER, backgroundColor: `${DANGER}1A` }]}>
                  {deleting ? <ActivityIndicator color={DANGER} /> : <ThemedText style={{ fontSize: 14, color: DANGER, fontWeight: '700' }}>Sí, borrar</ThemedText>}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={[styles.dot, { backgroundColor: language.color }]} />
              <ThemedText style={{ flex: 1 }}>{language.name}</ThemedText>
              <Pressable
                onPress={() => router.push({ pathname: '/agregar-lenguaje', params: { editar: language.id } })}
                hitSlop={8}
                style={styles.iconAction}
                accessibilityLabel={`Editar ${language.name}`}>
                <Ionicons name="create-outline" size={20} color={palette.tint} />
              </Pressable>
              <Pressable onPress={() => setConfirming(language.id)} hitSlop={8} style={styles.iconAction} accessibilityLabel={`Borrar ${language.name}`}>
                <Ionicons name="trash-outline" size={20} color={DANGER} />
              </Pressable>
            </>
          )}
        </View>
      ))}

      <ThemedText style={[styles.eyebrow, { marginTop: 8 }]}>FRAMEWORKS ({frameworks.length})</ThemedText>
      {frameworks.map((framework, index) => (
        <Pressable
          key={framework.id}
          onPress={() => router.push({ pathname: '/framework-form', params: { editar: framework.id } })}
          style={({ pressed }) => [styles.langRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border }, pressed && { opacity: 0.6 }]}>
          <View style={[styles.dot, { backgroundColor: framework.color }]} />
          <ThemedText style={{ flex: 1 }}>
            {framework.name}
            <ThemedText style={styles.meta}> · {getLanguageById(framework.languageId)?.name ?? framework.languageId}</ThemedText>
          </ThemedText>
          <Ionicons name="create-outline" size={20} color={palette.tint} />
        </Pressable>
      ))}
    </View>
  );
}

const TONES: { id: NoticeTone; label: string; color: string }[] = [
  { id: 'info', label: 'Información', color: '#0a7ea4' },
  { id: 'exito', label: 'Buena noticia', color: '#2e9e5b' },
  { id: 'alerta', label: 'Importante', color: '#d9822b' },
];

// La app: lo que ven todos al entrar. Anuncio fijado, lenguaje destacado y bienvenida.
export function AppSection({ onLoaded }: { onLoaded: () => void }) {
  const { palette } = useColors();
  const { config } = useAppConfig();

  useEffect(() => {
    onLoaded();
  }, [onLoaded]);

  if (!config) {
    return (
      <View style={{ gap: 8, alignItems: 'center', paddingVertical: 24 }}>
        <ActivityIndicator color={palette.tint} />
        <ThemedText style={styles.muted}>Si no carga, falta ejecutar supabase/admin-extra.sql en Supabase.</ThemedText>
      </View>
    );
  }
  // key: cuando cambia la configuración (también desde otro celular) el formulario se vuelve a llenar.
  return <AppForms key={config.actualizado} config={config} />;
}

function AppForms({ config }: { config: AppConfig }) {
  const { palette, border, surface } = useColors();
  const { save } = useAppConfig();
  const { languages } = useCatalog();

  const [anuncioActivo, setAnuncioActivo] = useState(config.anuncio_activo);
  const [anuncioTitulo, setAnuncioTitulo] = useState(config.anuncio_titulo ?? '');
  const [anuncioTexto, setAnuncioTexto] = useState(config.anuncio_texto ?? '');
  const [tono, setTono] = useState<NoticeTone>(config.anuncio_tono);
  const [anuncioLenguaje, setAnuncioLenguaje] = useState<string | null>(config.anuncio_language_id);
  const [destacado, setDestacado] = useState<string | null>(config.destacado_language_id);
  const [destacadoNota, setDestacadoNota] = useState(config.destacado_nota ?? '');
  const [bienvenidaActiva, setBienvenidaActiva] = useState(config.bienvenida_activa);
  const [bienvenidaTitulo, setBienvenidaTitulo] = useState(config.bienvenida_titulo ?? '');
  const [bienvenidaTexto, setBienvenidaTexto] = useState(config.bienvenida_texto ?? '');
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ part: string; text: string; ok: boolean } | null>(null);

  const persist = async (part: string, changes: Partial<Omit<AppConfig, 'actualizado'>>) => {
    setSaving(part);
    setMessage(null);
    try {
      await save(changes);
      haptic();
      setMessage({ part, text: 'Guardado. Ya lo ven todos.', ok: true });
    } catch (e) {
      setMessage({ part, text: e instanceof Error ? e.message : 'No se pudo guardar', ok: false });
    } finally {
      setSaving(null);
    }
  };

  const input = [styles.input, { color: palette.text, borderColor: border, backgroundColor: surface }];

  const languageChips = (value: string | null, onChange: (id: string | null) => void, noneLabel: string) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {[{ id: null as string | null, name: noneLabel, color: palette.icon }, ...languages].map((l) => {
        const selected = value === l.id;
        return (
          <Pressable
            key={l.id ?? 'ninguno'}
            onPress={() => onChange(l.id)}
            style={[styles.chip, { borderColor: selected ? l.color : border }, selected && { backgroundColor: `${l.color}33` }]}>
            <ThemedText style={{ fontSize: 13 }}>{l.name}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const feedback = (part: string) =>
    message?.part === part ? <ThemedText style={{ color: message.ok ? SUCCESS : DANGER, fontSize: 14 }}>{message.text}</ThemedText> : null;

  const saveButton = (part: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={saving !== null}
      style={({ pressed }) => [styles.primary, { backgroundColor: palette.tint }, (pressed || saving === part) && { opacity: 0.6 }]}>
      {saving === part ? (
        <ActivityIndicator color={palette.background} />
      ) : (
        <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
          Guardar
        </ThemedText>
      )}
    </Pressable>
  );

  const toneColor = TONES.find((t) => t.id === tono)?.color ?? palette.tint;

  return (
    <View style={{ gap: 14 }}>
      <ThemedView style={[styles.card, { borderColor: border }]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">📌 Anuncio fijado</ThemedText>
            <ThemedText style={styles.meta}>Aparece arriba del catálogo para todos.</ThemedText>
          </View>
          <Switch value={anuncioActivo} onValueChange={setAnuncioActivo} trackColor={{ true: palette.tint }} />
        </View>
        <TextInput value={anuncioTitulo} onChangeText={setAnuncioTitulo} placeholder="Título (ej. ¡Semana de Python!)" placeholderTextColor={palette.icon} maxLength={80} style={input} />
        <TextInput
          value={anuncioTexto}
          onChangeText={setAnuncioTexto}
          placeholder="Mensaje"
          placeholderTextColor={palette.icon}
          maxLength={300}
          multiline
          textAlignVertical="top"
          style={[input, { minHeight: 70 }]}
        />
        <View style={styles.chips}>
          {TONES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTono(t.id)}
              style={[styles.chip, { borderColor: tono === t.id ? t.color : border }, tono === t.id && { backgroundColor: `${t.color}26` }]}>
              <ThemedText style={{ fontSize: 13 }}>{t.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        <ThemedText style={styles.meta}>Al tocarlo abre:</ThemedText>
        {languageChips(anuncioLenguaje, setAnuncioLenguaje, 'Nada')}
        {anuncioActivo && anuncioTitulo.trim().length > 0 && (
          <View style={[styles.preview, { borderColor: toneColor, backgroundColor: `${toneColor}1A` }]}>
            <ThemedText type="defaultSemiBold" style={{ color: toneColor }}>
              {anuncioTitulo}
            </ThemedText>
            {anuncioTexto.trim().length > 0 && <ThemedText style={{ fontSize: 14 }}>{anuncioTexto}</ThemedText>}
          </View>
        )}
        {feedback('anuncio')}
        {saveButton('anuncio', () => {
          if (anuncioActivo && anuncioTitulo.trim().length < 2) {
            setMessage({ part: 'anuncio', text: 'Escribe el título del anuncio', ok: false });
            return;
          }
          persist('anuncio', {
            anuncio_activo: anuncioActivo,
            anuncio_titulo: anuncioTitulo.trim() || null,
            anuncio_texto: anuncioTexto.trim() || null,
            anuncio_tono: tono,
            anuncio_language_id: anuncioLenguaje,
          });
        })}
      </ThemedView>

      <ThemedView style={[styles.card, { borderColor: border }]}>
        <ThemedText type="defaultSemiBold">⭐ Lenguaje destacado de la semana</ThemedText>
        <ThemedText style={styles.meta}>Se muestra como tarjeta especial en el catálogo.</ThemedText>
        {languageChips(destacado, setDestacado, 'Ninguno')}
        <TextInput
          value={destacadoNota}
          onChangeText={setDestacadoNota}
          placeholder="Nota (ej. Ideal para empezar a programar)"
          placeholderTextColor={palette.icon}
          maxLength={160}
          style={input}
        />
        {feedback('destacado')}
        {saveButton('destacado', () => persist('destacado', { destacado_language_id: destacado, destacado_nota: destacadoNota.trim() || null }))}
      </ThemedView>

      <ThemedView style={[styles.card, { borderColor: border }]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">👋 Mensaje de bienvenida</ThemedText>
            <ThemedText style={styles.meta}>Lo ve una vez cada persona la primera vez que entra.</ThemedText>
          </View>
          <Switch value={bienvenidaActiva} onValueChange={setBienvenidaActiva} trackColor={{ true: palette.tint }} />
        </View>
        <TextInput value={bienvenidaTitulo} onChangeText={setBienvenidaTitulo} placeholder="Título" placeholderTextColor={palette.icon} maxLength={80} style={input} />
        <TextInput
          value={bienvenidaTexto}
          onChangeText={setBienvenidaTexto}
          placeholder="Mensaje para los nuevos usuarios"
          placeholderTextColor={palette.icon}
          maxLength={500}
          multiline
          textAlignVertical="top"
          style={[input, { minHeight: 90 }]}
        />
        {feedback('bienvenida')}
        {saveButton('bienvenida', () =>
          persist('bienvenida', {
            bienvenida_activa: bienvenidaActiva,
            bienvenida_titulo: bienvenidaTitulo.trim() || null,
            bienvenida_texto: bienvenidaTexto.trim() || null,
          })
        )}
      </ThemedView>
    </View>
  );
}

const SUSPENSIONS = [
  { days: 1, label: '1 día' },
  { days: 7, label: '7 días' },
  { days: 36500, label: 'Indefinido' },
];

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  muted: {
    opacity: 0.65,
  },
  meta: {
    fontSize: 12,
    opacity: 0.6,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
    opacity: 0.6,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePill: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 9,
  },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderRadius: 12,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 16,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingVertical: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  iconAction: {
    padding: 6,
  },
  small: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
});
