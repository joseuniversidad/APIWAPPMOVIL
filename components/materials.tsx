import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addMaterial, deleteMaterial, MAX_UPLOAD_BYTES, type Material, type MaterialType } from '@/services/classes';

const DANGER = '#d9534f';

const TYPE_INFO: Record<MaterialType, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  video: { icon: 'play', label: 'Video', color: '#e5484d' },
  enlace: { icon: 'link', label: 'Enlace', color: '#0a7ea4' },
  nota: { icon: 'document-text-outline', label: 'Nota', color: '#8a6d1f' },
};

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 60) return minutes <= 1 ? 'ahora' : `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

function useColors() {
  const colorScheme = useColorScheme() ?? 'light';
  return {
    palette: Colors[colorScheme],
    border: colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea',
    surface: colorScheme === 'dark' ? '#1d2022' : '#f4f6f8',
  };
}

// Lista de materiales. Tocar abre el video o el enlace; las notas se despliegan.
export function MaterialList({ materials, onChanged, emptyText }: { materials: Material[]; onChanged: () => void; emptyText: string }) {
  const { palette, border } = useColors();
  const { user, isAdmin } = useAuth();
  const [openNote, setOpenNote] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (materials.length === 0) return <ThemedText style={{ opacity: 0.65 }}>{emptyText}</ThemedText>;

  const open = async (material: Material) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    if (material.tipo === 'nota' || !material.url) setOpenNote(openNote === material.id ? null : material.id);
    else await WebBrowser.openBrowserAsync(material.url);
  };

  const remove = async (material: Material) => {
    setError(null);
    try {
      await deleteMaterial(material);
      setConfirming(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar');
    }
  };

  return (
    <View>
      {error && <ThemedText style={{ color: DANGER, fontSize: 14 }}>{error}</ThemedText>}
      {materials.map((material, index) => {
        const info = TYPE_INFO[material.tipo];
        const canDelete = material.autor_id === user?.id || isAdmin;
        return (
          <View key={material.id} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border }]}>
            <Pressable onPress={() => open(material)} style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.6 }]}>
              <View style={[styles.typeIcon, { backgroundColor: `${info.color}22` }]}>
                <Ionicons name={info.icon} size={18} color={info.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="defaultSemiBold" numberOfLines={2}>
                  {material.titulo}
                </ThemedText>
                <ThemedText style={styles.meta}>
                  {material.archivo ? 'Video subido' : material.url?.includes('youtu') ? 'YouTube' : info.label} · {timeAgo(material.created_at)}
                </ThemedText>
                {(openNote === material.id || (material.tipo !== 'nota' && material.descripcion)) && material.descripcion && (
                  <ThemedText style={{ fontSize: 14, opacity: 0.85 }}>{material.descripcion}</ThemedText>
                )}
              </View>
              <Ionicons
                name={material.tipo === 'nota' ? (openNote === material.id ? 'chevron-up' : 'chevron-down') : 'open-outline'}
                size={18}
                color={palette.icon}
              />
            </Pressable>
            {canDelete &&
              (confirming === material.id ? (
                <View style={styles.confirmRow}>
                  <ThemedText style={{ fontSize: 13, flex: 1 }}>¿Borrar este material?</ThemedText>
                  <Pressable onPress={() => setConfirming(null)} hitSlop={8}>
                    <ThemedText style={{ fontSize: 13 }}>No</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => remove(material)} hitSlop={8}>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 13, color: DANGER }}>
                      Sí, borrar
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setConfirming(material.id)} hitSlop={8} style={styles.deleteLink}>
                  <ThemedText style={{ fontSize: 13, color: DANGER }}>Borrar</ThemedText>
                </Pressable>
              ))}
          </View>
        );
      })}
    </View>
  );
}

// Hoja para publicar un material. Con grupoId se puede elegir entre "esta clase" o
// "todos" (sección Cursos de un lenguaje); sin grupoId se publica para todos en defaultLanguageId.
export function MaterialForm({
  visible,
  onClose,
  onSaved,
  grupoId,
  defaultLanguageId,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  grupoId?: string;
  defaultLanguageId?: string;
}) {
  const { palette, border, surface } = useColors();
  const { languages } = useCatalog();
  const [tipo, setTipo] = useState<MaterialType>('video');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [forEveryone, setForEveryone] = useState(!grupoId);
  const [languageId, setLanguageId] = useState(defaultLanguageId ?? languages[0]?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitulo('');
    setDescripcion('');
    setUrl('');
    setFile(null);
    setError(null);
  };

  const pickVideo = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true, base64: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_UPLOAD_BYTES) {
      setError('El video pesa más de 50 MB. Súbelo a YouTube y pega el enlace.');
      return;
    }
    setFile(asset);
    if (!titulo) setTitulo(asset.name.replace(/\.[^.]+$/, ''));
  };

  const save = async () => {
    if (titulo.trim().length < 2) return setError('Escribe un título');
    if (tipo === 'video' && !file && !url.trim()) return setError('Elige un video o pega un enlace de YouTube');
    if (tipo === 'enlace' && !url.trim()) return setError('Pega el enlace');
    if (tipo === 'nota' && !descripcion.trim()) return setError('Escribe la nota');
    setSaving(true);
    setError(null);
    try {
      await addMaterial({
        tipo,
        titulo,
        descripcion,
        url: tipo === 'nota' ? undefined : url,
        file: tipo === 'video' ? file : null,
        grupoId: forEveryone ? null : grupoId,
        languageId: forEveryone ? languageId : null,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { color: palette.text, borderColor: border, backgroundColor: surface }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <View style={styles.modalHeader}>
          <ThemedText type="subtitle">Agregar material</ThemedText>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={palette.icon} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View style={[styles.segment, { backgroundColor: surface }]}>
            {(['video', 'enlace', 'nota'] as const).map((option) => {
              const selected = tipo === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setTipo(option)}
                  style={[styles.segmentItem, selected && { backgroundColor: palette.background }]}>
                  <Ionicons name={TYPE_INFO[option].icon} size={15} color={selected ? palette.tint : palette.icon} />
                  <ThemedText style={{ fontSize: 14, color: selected ? palette.tint : palette.icon, fontWeight: selected ? '700' : '400' }}>
                    {option === 'video' ? 'Video' : option === 'enlace' ? 'Enlace' : 'Nota'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <TextInput value={titulo} onChangeText={setTitulo} placeholder="Título" placeholderTextColor={palette.icon} maxLength={120} style={inputStyle} />

          {tipo === 'video' && (
            <>
              <Pressable
                onPress={pickVideo}
                style={({ pressed }) => [styles.dropZone, { borderColor: file ? palette.tint : border }, pressed && { opacity: 0.6 }]}>
                <Ionicons name={file ? 'checkmark-circle' : 'cloud-upload-outline'} size={26} color={file ? palette.tint : palette.icon} />
                <ThemedText style={{ textAlign: 'center' }}>
                  {file ? `${file.name} · ${((file.size ?? 0) / 1048576).toFixed(1)} MB` : 'Elegir video del celular (máx. 50 MB)'}
                </ThemedText>
              </Pressable>
              <ThemedText style={styles.meta}>o pega un enlace de YouTube:</ThemedText>
              <TextInput
                value={url}
                onChangeText={(text) => {
                  setUrl(text);
                  if (text) setFile(null);
                }}
                placeholder="https://youtu.be/…"
                placeholderTextColor={palette.icon}
                autoCapitalize="none"
                keyboardType="url"
                style={inputStyle}
              />
            </>
          )}
          {tipo === 'enlace' && (
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://…"
              placeholderTextColor={palette.icon}
              autoCapitalize="none"
              keyboardType="url"
              style={inputStyle}
            />
          )}
          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder={tipo === 'nota' ? 'Escribe la nota (tarea, aviso, explicación…)' : 'Descripción (opcional)'}
            placeholderTextColor={palette.icon}
            multiline
            textAlignVertical="top"
            style={[inputStyle, { minHeight: tipo === 'nota' ? 140 : 80 }]}
          />

          {grupoId && (
            <View style={{ gap: 8 }}>
              <ThemedText style={styles.meta}>Visible para</ThemedText>
              <View style={styles.inline}>
                {[false, true].map((everyone) => {
                  const selected = forEveryone === everyone;
                  return (
                    <Pressable
                      key={String(everyone)}
                      onPress={() => setForEveryone(everyone)}
                      style={[styles.chip, { borderColor: selected ? palette.tint : border }, selected && { backgroundColor: `${palette.tint}1F` }]}>
                      <ThemedText style={{ fontSize: 14, color: selected ? palette.tint : palette.text }}>
                        {everyone ? 'Todos (en un lenguaje)' : 'Solo esta clase'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
          {forEveryone && (
            <View style={{ gap: 8 }}>
              <ThemedText style={styles.meta}>Aparecerá en la sección Cursos de:</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {languages.map((language) => {
                  const selected = languageId === language.id;
                  return (
                    <Pressable
                      key={language.id}
                      onPress={() => setLanguageId(language.id)}
                      style={[styles.chip, { borderColor: selected ? language.color : border }, selected && { backgroundColor: `${language.color}33` }]}>
                      <ThemedText style={{ fontSize: 14 }}>{language.name}</ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {error && <ThemedText style={{ color: DANGER }}>{error}</ThemedText>}
          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [styles.button, { backgroundColor: palette.tint }, (pressed || saving) && { opacity: 0.6 }]}>
            {saving ? (
              <>
                <ActivityIndicator color={palette.background} />
                <ThemedText style={{ color: palette.background }}>{file ? 'Subiendo video…' : 'Publicando…'}</ThemedText>
              </>
            ) : (
              <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
                Publicar
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    gap: 6,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    fontSize: 13,
    opacity: 0.6,
  },
  deleteLink: {
    alignSelf: 'flex-end',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  form: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 9,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46,
    fontSize: 16,
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 17,
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    marginTop: 4,
  },
});
