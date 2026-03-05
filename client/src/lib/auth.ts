import { create } from "zustand";

interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const stored = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
const storedUser = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;

export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setAuthData(token: string, user: AuthUser) {
  localStorage.setItem("auth_token", token);
  localStorage.setItem("auth_user", JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: any = { ...options.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
  }
  return res;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

export async function apiPatch<T>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

export async function apiDelete(url: string): Promise<void> {
  const res = await apiFetch(url, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
}
