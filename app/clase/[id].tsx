import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { MaterialForm, MaterialList } from '@/components/materials';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useUserData } from '@/contexts/user-data-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  deleteClass,
  getClassMaterials,
  getClassProgress,
  getMyClasses,
  leaveClass,
  type ClassRoom,
  type Material,
  type StudentProgress,
} from '@/services/classes';

const DANGER = '#d9534f';
const SUCCESS = '#2e9e5b';
const INACTIVE_DAYS = 7;

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

function lastSeen(iso: string | null) {
  if (!iso) return { text: 'sin actividad', days: Infinity };
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return { text: days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} d`, days };
}

// Clase: el profesor (y el superusuario) ven el código, el progreso de cada alumno y los materiales;
// el alumno ve los materiales y puede salir de la clase.
export default function ClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { getLanguageById } = useCatalog();
  const { refreshCommunity } = useUserData();

  const [classRoom, setClassRoom] = useState<ClassRoom | null | undefined>(undefined);
  const [students, setStudents] = useState<StudentProgress[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'alumnos' | 'materiales'>('alumnos');
  const [selected, setSelected] = useState<StudentProgress | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const room = (await getMyClasses()).find((c) => c.id === id) ?? null;
        if (!active) return;
        setClassRoom(room);
        if (!room) return;
        const [nextMaterials, nextStudents] = await Promise.all([
          getClassMaterials(id),
          room.soy_profesor ? getClassProgress(id) : Promise.resolve(null),
        ]);
        if (!active) return;
        setMaterials(nextMaterials);
        setStudents(nextStudents);
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar la clase');
      } finally {
        if (active) setRefreshing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, version]);

  // Primero quien más necesita ayuda: inactivos y con menor promedio.
  const sortedStudents = useMemo(
    () =>
      [...(students ?? [])].sort((a, b) => {
        const inactiveA = lastSeen(a.ultima_actividad).days >= INACTIVE_DAYS ? 0 : 1;
        const inactiveB = lastSeen(b.ultima_actividad).days >= INACTIVE_DAYS ? 0 : 1;
        return inactiveA - inactiveB || (a.promedio ?? -1) - (b.promedio ?? -1);
      }),
    [students]
  );

  const shareCode = async () => {
    if (!classRoom?.codigo) return;
    haptic();
    try {
      await Share.share({
        message: `Únete a mi clase "${classRoom.nombre}" en MiApp54: abre la pestaña Aprender y escribe el código ${classRoom.codigo}`,
      });
    } catch {
      // Compartir no disponible en este navegador.
    }
  };

  const exitOrDelete = async () => {
    if (!classRoom) return;
    try {
      if (classRoom.soy_profesor) await deleteClass(classRoom.id);
      else await leaveClass(classRoom.id);
      refreshCommunity();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar');
    }
  };

  if (classRoom === undefined && !error) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.tint} />
      </SafeAreaView>
    );
  }

  if (!classRoom) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <BackButton fallbackHref="/aprender" />
        <ThemedText type="subtitle">{error ?? 'No perteneces a esta clase'}</ThemedText>
      </SafeAreaView>
    );
  }

  const teacher = classRoom.soy_profesor;
  const currentTab = teacher ? tab : 'materiales';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              reload();
            }}
            tintColor={palette.tint}
          />
        }
        contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}>
        <BackButton fallbackHref="/aprender" label="Aprender" />
        <View style={styles.padded}>
          <ThemedText type="title" style={{ fontSize: 26, lineHeight: 32 }}>
            {classRoom.nombre}
          </ThemedText>
          <ThemedText style={styles.muted}>
            {teacher ? `${classRoom.alumnos} alumnos` : `Prof. ${classRoom.profesor}`} · {classRoom.materiales} materiales
          </ThemedText>
        </View>

        {error && <ThemedText style={[styles.padded, { color: DANGER }]}>{error}</ThemedText>}

        {teacher && classRoom.codigo && (
          <ThemedView style={[styles.codeCard, { borderColor: border }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.eyebrow}>CÓDIGO DE INVITACIÓN</ThemedText>
              <ThemedText selectable style={styles.code}>
                {classRoom.codigo}
              </ThemedText>
            </View>
            <Pressable onPress={shareCode} style={({ pressed }) => [styles.shareButton, { backgroundColor: palette.tint }, pressed && { opacity: 0.7 }]}>
              <Ionicons name="share-social-outline" size={18} color={palette.background} />
              <ThemedText type="defaultSemiBold" style={{ color: palette.background, fontSize: 14 }}>
                Compartir
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {teacher && (
          <View style={[styles.segment, { backgroundColor: colorScheme === 'dark' ? '#1d2022' : '#f1f3f5' }]}>
            {(['alumnos', 'materiales'] as const).map((option) => {
              const active = tab === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    haptic();
                    setTab(option);
                  }}
                  style={[styles.segmentItem, active && { backgroundColor: palette.background }]}>
                  <ThemedText type={active ? 'defaultSemiBold' : 'default'} style={{ fontSize: 14, color: active ? palette.tint : palette.icon }}>
                    {option === 'alumnos' ? `Alumnos ${students?.length ?? ''}` : `Materiales ${materials?.length ?? ''}`}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}

        {currentTab === 'alumnos' ? (
          <View style={styles.padded}>
            {!students ? (
              <ActivityIndicator color={palette.tint} />
            ) : sortedStudents.length === 0 ? (
              <ThemedText style={styles.muted}>Aún no hay alumnos. Comparte el código para que se unan.</ThemedText>
            ) : (
              sortedStudents.map((student, index) => {
                const seen = lastSeen(student.ultima_actividad);
                const inactive = seen.days >= INACTIVE_DAYS;
                const average = student.promedio ?? 0;
                const color = inactive || average < 40 ? DANGER : average >= 70 ? SUCCESS : palette.tint;
                return (
                  <Pressable
                    key={student.user_id}
                    onPress={() => {
                      haptic();
                      setSelected(student);
                    }}
                    style={({ pressed }) => [
                      styles.studentRow,
                      index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border },
                      pressed && { opacity: 0.6 },
                    ]}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {student.nombre}
                      </ThemedText>
                      <View style={[styles.track, { backgroundColor: border }]}>
                        <View style={[styles.fill, { width: `${Math.max(2, average)}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
                      <ThemedText type="defaultSemiBold" style={[styles.num, { color }]}>
                        {student.promedio === null ? '—' : `${student.promedio}%`}
                      </ThemedText>
                      <ThemedText style={[styles.meta, inactive && { color: DANGER, opacity: 1 }]}>{seen.text}</ThemedText>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.padded}>
            {teacher && (
              <Pressable
                onPress={() => setShowForm(true)}
                style={({ pressed }) => [styles.addButton, { borderColor: palette.tint }, pressed && { opacity: 0.6 }]}>
                <Ionicons name="add" size={20} color={palette.tint} />
                <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                  Agregar material
                </ThemedText>
              </Pressable>
            )}
            {!materials ? (
              <ActivityIndicator color={palette.tint} />
            ) : (
              <MaterialList
                materials={materials}
                onChanged={reload}
                emptyText={teacher ? 'Sube un video, un enlace o una nota para tu clase.' : 'Tu profesor todavía no ha publicado materiales.'}
              />
            )}
          </View>
        )}

        <View style={[styles.padded, { marginTop: 12 }]}>
          {confirmExit ? (
            <View style={[styles.confirm, { borderColor: `${DANGER}66` }]}>
              <ThemedText style={{ flex: 1 }}>
                {teacher ? 'Se borrará la clase con sus materiales. ¿Continuar?' : '¿Salir de esta clase?'}
              </ThemedText>
              <Pressable onPress={() => setConfirmExit(false)} hitSlop={8}>
                <ThemedText>Cancelar</ThemedText>
              </Pressable>
              <Pressable onPress={exitOrDelete} hitSlop={8}>
                <ThemedText type="defaultSemiBold" style={{ color: DANGER }}>
                  {teacher ? 'Borrar' : 'Salir'}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmExit(true)} style={styles.exitLink}>
              <Ionicons name={teacher ? 'trash-outline' : 'exit-outline'} size={16} color={DANGER} />
              <ThemedText style={{ color: DANGER }}>{teacher ? 'Borrar clase' : 'Salir de la clase'}</ThemedText>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <MaterialForm visible={showForm} onClose={() => setShowForm(false)} onSaved={reload} grupoId={classRoom.id} />

      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          {selected && (
            <Pressable style={[styles.sheet, { backgroundColor: palette.background }]} onPress={() => {}}>
              <View style={[styles.grab, { backgroundColor: border }]} />
              <ThemedText type="subtitle">{selected.nombre}</ThemedText>
              <ThemedText style={styles.muted}>{selected.correo}</ThemedText>
              <View style={styles.statsRow}>
                <Stat label="Quizzes" value={String(selected.quizzes)} border={border} />
                <Stat label="Pasos" value={String(selected.pasos)} border={border} />
                <Stat label="Retos" value={String(selected.retos)} border={border} />
              </View>
              <ThemedText type="defaultSemiBold">Mejor puntaje por lenguaje</ThemedText>
              {selected.mejores.length === 0 ? (
                <ThemedText style={styles.muted}>Todavía no hace ningún quiz.</ThemedText>
              ) : (
                <View style={styles.bestWrap}>
                  {selected.mejores.map((best) => (
                    <View key={best.lenguaje} style={[styles.bestChip, { borderColor: border }]}>
                      <ThemedText style={{ fontSize: 13 }}>
                        {getLanguageById(best.lenguaje)?.name ?? best.lenguaje} {best.puntaje}/{best.total}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
              <ThemedText style={styles.meta}>Última actividad: {lastSeen(selected.ultima_actividad).text}</ThemedText>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value, border }: { label: string; value: string; border: string }) {
  return (
    <View style={[styles.stat, { borderColor: border }]}>
      <ThemedText type="subtitle" style={styles.num}>
        {value}
      </ThemedText>
      <ThemedText style={styles.meta}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  content: {
    paddingBottom: 40,
    gap: 14,
  },
  padded: {
    paddingHorizontal: 16,
  },
  muted: {
    opacity: 0.65,
  },
  meta: {
    fontSize: 12,
    opacity: 0.6,
  },
  num: {
    fontVariant: ['tabular-nums'],
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
    opacity: 0.6,
  },
  codeCard: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  code: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 12,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 3,
    borderRadius: 12,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: 9,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 6,
  },
  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  exitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    padding: 8,
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
    gap: 10,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bestWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bestChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
