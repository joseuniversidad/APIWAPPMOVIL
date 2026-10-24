import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

// Modo profesor: clases con código de invitación, progreso de alumnos y materiales
// (ver supabase/clases-retos-avisos.sql). Las reglas de quién puede hacer qué viven en Supabase.

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function client() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

function rpcError(error: { code?: string; message: string }): Error {
  if (error.code === 'PGRST202' || error.code === '42P01') {
    return new Error('Falta ejecutar supabase/clases-retos-avisos.sql en Supabase');
  }
  return new Error(error.message);
}

export type ClassRoom = {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string | null; // solo lo recibe el profesor de la clase o el superusuario
  profesor: string;
  alumnos: number;
  materiales: number;
  soy_profesor: boolean;
  created_at: string;
};

export async function getMyClasses(): Promise<ClassRoom[]> {
  const { data, error } = await client().rpc('mis_clases');
  if (error) throw rpcError(error);
  return (data ?? []) as ClassRoom[];
}

export async function createClass(nombre: string, descripcion: string): Promise<string> {
  const { data, error } = await client().rpc('crear_clase', { nombre: nombre.trim(), descripcion: descripcion.trim() || null });
  if (error) throw rpcError(error);
  return data as string;
}

export async function joinClass(code: string): Promise<{ id: string; nombre: string }> {
  const { data, error } = await client().rpc('unirse_a_clase', { codigo: code.trim().toUpperCase() });
  if (error) throw rpcError(error);
  const row = (data as { id: string; nombre: string }[] | null)?.[0];
  if (!row) throw new Error('No existe una clase con ese código');
  return row;
}

export async function leaveClass(classId: string): Promise<void> {
  const { error } = await client().rpc('salir_de_clase', { grupo: classId });
  if (error) throw rpcError(error);
}

export async function deleteClass(classId: string): Promise<void> {
  const { error } = await client().rpc('borrar_clase', { grupo: classId });
  if (error) throw rpcError(error);
}

export type StudentProgress = {
  user_id: string;
  nombre: string;
  correo: string;
  quizzes: number;
  promedio: number | null;
  pasos: number;
  retos: number;
  ultima_actividad: string | null;
  mejores: { lenguaje: string; puntaje: number; total: number }[];
};

export async function getClassProgress(classId: string): Promise<StudentProgress[]> {
  const { data, error } = await client().rpc('progreso_clase', { grupo: classId });
  if (error) throw rpcError(error);
  return (data ?? []) as StudentProgress[];
}

export type MaterialType = 'video' | 'enlace' | 'nota';

export type Material = {
  id: number;
  grupo_id: string | null;
  language_id: string | null;
  tipo: MaterialType;
  titulo: string;
  descripcion: string | null;
  url: string | null;
  archivo: string | null;
  autor_id: string;
  created_at: string;
};

const MATERIAL_COLUMNS = 'id, grupo_id, language_id, tipo, titulo, descripcion, url, archivo, autor_id, created_at';

export async function getClassMaterials(classId: string): Promise<Material[]> {
  const { data, error } = await client()
    .from('materiales')
    .select(MATERIAL_COLUMNS)
    .eq('grupo_id', classId)
    .order('created_at', { ascending: false });
  if (error) throw rpcError(error);
  return (data ?? []) as Material[];
}

// Materiales que los profesores publicaron "para todos" dentro de un lenguaje.
export async function getLanguageMaterials(languageId: string): Promise<Material[]> {
  const { data, error } = await client()
    .from('materiales')
    .select(MATERIAL_COLUMNS)
    .is('grupo_id', null)
    .eq('language_id', languageId)
    .order('created_at', { ascending: false });
  if (error) throw rpcError(error);
  return (data ?? []) as Material[];
}

// Sube el video al bucket público "materiales" y devuelve su ruta y URL.
async function uploadFile(asset: DocumentPickerAsset): Promise<{ path: string; url: string }> {
  if (asset.size && asset.size > MAX_UPLOAD_BYTES) throw new Error('El archivo pesa más de 50 MB');
  const storage = client().storage.from('materiales');
  const extension = asset.name.includes('.') ? asset.name.split('.').pop() : 'mp4';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  // En web el selector entrega un File; en el celular se lee el archivo local como ArrayBuffer.
  const body = Platform.OS === 'web' && asset.file ? asset.file : await fetch(asset.uri).then((r) => r.arrayBuffer());
  const { error } = await storage.upload(path, body, { contentType: asset.mimeType ?? 'video/mp4', upsert: false });
  if (error) {
    if (error.message.includes('row-level security')) throw new Error('Solo profesores y el superusuario pueden subir archivos');
    throw new Error(error.message);
  }
  return { path, url: storage.getPublicUrl(path).data.publicUrl };
}

export type NewMaterial = {
  tipo: MaterialType;
  titulo: string;
  descripcion?: string;
  url?: string;
  file?: DocumentPickerAsset | null;
  grupoId?: string | null;
  languageId?: string | null;
};

export async function addMaterial(material: NewMaterial): Promise<void> {
  let url = material.url?.trim() || null;
  let archivo: string | null = null;
  if (material.tipo === 'video' && material.file) {
    const uploaded = await uploadFile(material.file);
    url = uploaded.url;
    archivo = uploaded.path;
  }
  if (material.tipo !== 'nota' && !url) throw new Error('Falta el enlace o el archivo');
  if (url && !/^https?:\/\//.test(url)) throw new Error('El enlace debe empezar con http:// o https://');

  const { error } = await client()
    .from('materiales')
    .insert({
      tipo: material.tipo,
      titulo: material.titulo.trim(),
      descripcion: material.descripcion?.trim() || null,
      url,
      archivo,
      grupo_id: material.grupoId ?? null,
      language_id: material.languageId ?? null,
    });
  if (error) {
    // Si falla el registro, se borra el archivo para no dejarlo huérfano.
    if (archivo) await client().storage.from('materiales').remove([archivo]);
    if (error.code === '42501') throw new Error('Solo profesores y el superusuario pueden publicar materiales');
    throw rpcError(error);
  }
}

export async function deleteMaterial(material: Material): Promise<void> {
  const { error } = await client().from('materiales').delete().eq('id', material.id);
  if (error) throw rpcError(error);
  if (material.archivo) await client().storage.from('materiales').remove([material.archivo]);
}
