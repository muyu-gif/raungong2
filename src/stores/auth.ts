import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { fetchCurrentUser, login as loginApi, register as registerApi } from "@/api/auth";
import type { AuthResponse, LoginRequest, RegisterRequest, User } from "@/api/types";

const TOKEN_KEY = "token";

function readToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref(readToken());
  const user = ref<User | null>(null);
  const restoring = ref(false);
  const displayName = computed(() => user.value?.display_name || user.value?.username || "访客");
  const initial = computed(() => displayName.value.trim().slice(0, 1) || "访");

  function setToken(value: string) {
    token.value = value;
    try {
      localStorage.setItem(TOKEN_KEY, value);
    } catch {
      /* 忽略隐私模式下的存储异常 */
    }
  }

  function applyAuth(payload: AuthResponse) {
    setToken(payload.access_token);
    user.value = payload.user;
  }

  function clear() {
    token.value = "";
    user.value = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* noop */
    }
  }

  async function login(payload: LoginRequest) {
    const data = await loginApi(payload);
    applyAuth(data);
    return data;
  }

  async function register(payload: RegisterRequest) {
    const data = await registerApi(payload);
    applyAuth(data);
    return data;
  }

  async function fetchMe() {
    if (!token.value) return null;
    restoring.value = true;
    try {
      const data = await fetchCurrentUser();
      user.value = data;
      return data;
    } finally {
      restoring.value = false;
    }
  }

  function logout() {
    clear();
  }

  window.addEventListener("auth:expired", () => {
    token.value = "";
    user.value = null;
  });

  return {
    token,
    user,
    restoring,
    displayName,
    initial,
    setToken,
    applyAuth,
    clear,
    login,
    register,
    fetchMe,
    logout,
  };
});
