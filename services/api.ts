// Cliente de la API REST del compañero: login con POST /login y
// token enviado como "Authorization: Bearer {token}" en cada petición.
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export function isApiConfigured(): boolean {
  return Boolean(API_URL);
}

export class ApiError extends Error {
  status: number;
  // Errores de validación de Laravel (422): { campo: ['mensaje', ...] }
  fieldErrors: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type LoginResult = {
  token: string;
  // Milisegundos Unix; null si la API no informa la expiración.
  expiresAt: number | null;
  user: Record<string, unknown> | null;
};

export async function apiRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  if (!API_URL) throw new ApiError('Falta EXPO_PUBLIC_API_URL en el archivo .env', 0);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(options.token && { Authorization: `Bearer ${options.token}` }),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con la API (¿el servidor o túnel está apagado?)', 0);
  }

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Respuesta que no es JSON (p. ej. página de error del túnel).
  }

  if (!response.ok) {
    const message =
      (json as { message?: string } | null)?.message ??
      (response.status === 401 ? 'Sesión expirada o credenciales inválidas' : `La API respondió ${response.status}`);
    throw new ApiError(message, response.status, (json as { errors?: Record<string, string[]> } | null)?.errors);
  }

  return json as T;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const json = await apiRequest<Record<string, any>>('/login', {
    method: 'POST',
    body: { email: email.trim(), password },
  });

  // Se aceptan los formatos de respuesta más comunes (Laravel Sanctum, JWT, etc.).
  const source = json?.data && typeof json.data === 'object' ? { ...json, ...json.data } : json;
  const token: unknown = source?.token ?? source?.access_token ?? source?.plainTextToken;
  if (typeof token !== 'string' || !token) {
    throw new ApiError('La API no devolvió un token', 0);
  }

  return {
    token,
    expiresAt: readExpiration(source, token),
    user: ((source?.user ?? source?.usuario) as Record<string, unknown>) ?? null,
  };
}

function readExpiration(source: Record<string, any>, token: string): number | null {
  const expiresAt = source?.expires_at ?? source?.expiresAt;
  if (expiresAt) {
    const date = typeof expiresAt === 'number' ? expiresAt * (expiresAt < 1e12 ? 1000 : 1) : Date.parse(expiresAt);
    if (!Number.isNaN(date)) return date;
  }
  const expiresIn = Number(source?.expires_in);
  if (expiresIn > 0) return Date.now() + expiresIn * 1000;
  return readJwtExpiration(token);
}

// Si el token es un JWT, su fecha de expiración viene en el claim "exp".
function readJwtExpiration(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
