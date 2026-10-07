// Endpoints de la API del compañero (Laravel). Todas las funciones reciben
// `authFetch` de useAuth() para enviar el token Bearer de la sesión.
type AuthFetch = <T = unknown>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>;

export type ReporteMes = {
  periodo: string; // "2026-10"
  total_ingresos: number;
  total_gastos: number;
  saldo_neto: number;
  cantidad_movimientos: number;
};

export const ESTADOS_PRESUPUESTO = ['planificada', 'en_curso', 'finalizada', 'cancelada'] as const;
export type EstadoPresupuesto = (typeof ESTADOS_PRESUPUESTO)[number];

export type PresupuestoCapacitacion = {
  id: number;
  nombre: string;
  descripcion: string | null;
  monto_asignado: string; // Laravel devuelve los decimales como texto
  monto_ejecutado: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: EstadoPresupuesto;
};

export type PresupuestoInput = {
  nombre: string;
  descripcion: string;
  monto_asignado: number;
  fecha_inicio: string; // "YYYY-MM-DD"
  estado: EstadoPresupuesto;
};

export function getReporteMovimientos(authFetch: AuthFetch, anio?: number) {
  return authFetch<ReporteMes[]>(`/reportes/movimientos-por-mes${anio ? `?anio=${anio}` : ''}`);
}

export function listPresupuestos(authFetch: AuthFetch) {
  return authFetch<PresupuestoCapacitacion[]>('/presupuestos-capacitacion');
}

export function createPresupuesto(authFetch: AuthFetch, input: PresupuestoInput) {
  return authFetch<PresupuestoCapacitacion>('/presupuestos-capacitacion', { method: 'POST', body: input });
}

// Se envía el registro completo para no depender de si la API exige todos los campos al editar.
export function updatePresupuesto(authFetch: AuthFetch, presupuesto: PresupuestoCapacitacion, cambios: Partial<PresupuestoInput>) {
  return authFetch<PresupuestoCapacitacion>(`/presupuestos-capacitacion/${presupuesto.id}`, {
    method: 'PUT',
    body: {
      nombre: presupuesto.nombre,
      descripcion: presupuesto.descripcion ?? '',
      monto_asignado: Number(presupuesto.monto_asignado),
      fecha_inicio: presupuesto.fecha_inicio,
      estado: presupuesto.estado,
      ...cambios,
    },
  });
}

export function deletePresupuesto(authFetch: AuthFetch, id: number) {
  return authFetch(`/presupuestos-capacitacion/${id}`, { method: 'DELETE' });
}

export const ESTADO_LABELS: Record<EstadoPresupuesto, string> = {
  planificada: 'Planificada',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

export const ESTADO_COLORS: Record<EstadoPresupuesto, string> = {
  planificada: '#0a7ea4',
  en_curso: '#e0a100',
  finalizada: '#2e9e5b',
  cancelada: '#d9534f',
};

export function formatQuetzales(amount: number | string) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(amount));
}
