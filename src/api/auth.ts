import { api } from "@/api/client";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@/api/types";

export async function login(payload: LoginRequest) {
  const { data } = await api.post<AuthResponse>("/api/v1/auth/login", payload);
  return data;
}

export async function register(payload: RegisterRequest) {
  const { data } = await api.post<AuthResponse>("/api/v1/auth/register", payload);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get<User>("/api/v1/auth/me");
  return data;
}

export async function checkHealth() {
  const { data } = await api.get<{ status: string; service: string }>("/healthz", { timeout: 4000 });
  return data;
}
