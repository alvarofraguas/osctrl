export class AuthError extends Error {
  constructor(msg = 'authentication required') { super(msg); this.name = 'AuthError'; }
}

export class ApiError extends Error {
  constructor(public status: number, msg: string) { super(msg); this.name = 'ApiError'; }
}

export interface FetchOptions extends RequestInit {
  /** Path relative to origin, e.g. '/paginated-json/environment/dev/all'. */
  path: string;
}

export async function apiFetch(opts: FetchOptions): Promise<Response> {
  const { path, ...init } = opts;
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(init.headers || {}) }
  });

  if (res.status === 401 || res.status === 302) {
    // Redirect to legacy login, preserving where we were headed.
    if (typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
    throw new AuthError();
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body || res.statusText);
  }
  return res;
}

export async function apiJSON<T>(opts: FetchOptions): Promise<T> {
  const res = await apiFetch(opts);
  return res.json() as Promise<T>;
}
