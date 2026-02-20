const TOKEN_KEY = "pos_jwt";
const USER_KEY = "pos_user";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: { name: string };
}

export function saveAuth(jwt: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, jwt);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Also set cookie for middleware route protection
  document.cookie = `${TOKEN_KEY}=${jwt}; path=/; max-age=${60 * 60 * 8}`; // 8 hours
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export class ForbiddenError extends Error {
  constructor() {
    super("403");
    this.name = "ForbiddenError";
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 403) throw new ForbiddenError();

  return res;
}
