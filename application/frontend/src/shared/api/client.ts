export const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3005';

export class ApiError extends Error {
  code:    string;
  status:  number;
  details?: any;
  constructor(code: string, message: string, status: number, details?: any) {
    super(message);
    this.code    = code;
    this.status  = status;
    this.details = details;
  }
}

function redirectToLogin() {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 204) return undefined as T;

  if (res.status === 401) {
    throw new ApiError('UNAUTHORIZED', 'Session expired', 401);
  }

  const json = await res.json();

  if (!res.ok) {
    const err = json as { error?: any };

    // Handle Zod validation errors
    if (err.error?.name === 'ZodError' && err.error.issues?.length > 0) {
      throw new ApiError(
        'VALIDATION_ERROR',
        err.error.issues[0].message,
        res.status,
        { error: err.error }
      );
    }

    throw new ApiError(
      err.error?.code ?? 'UNKNOWN',
      err.error?.message ?? 'Request failed',
      res.status,
      err.error?.details,
    );
  }

  return json as T;
}

/** Call once on app boot. Redirects to /login at midnight when the token expires. */
export function scheduleMidnightLogout() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  setTimeout(redirectToLogin, msUntilMidnight);
}
