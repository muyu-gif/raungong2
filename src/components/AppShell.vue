<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { useServiceStatus } from "@/composables/useServiceStatus";
import BrandMark from "@/components/BrandMark.vue";
import MikuMascot from "@/components/MikuMascot.vue";
import AppIcon from "@/components/AppIcon.vue";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { status, check } = useServiceStatus();

const onWorkbench = computed(() => ["plans", "plan-detail"].includes(String(route.name)));
const onCreate = computed(() => ["plan-new", "plan-generating"].includes(String(route.name)));

const statusText = computed(() => {
  if (status.value === "online") return "服务在线";
  if (status.value === "offline") return "服务未连接";
  return "正在连接";
});

function logout() {
  auth.logout();
  ElMessage({ message: "已退出登录", type: "success" });
  void router.replace({ name: "login" });
}
</script>

<template>
  <div class="shell">
    <aside class="app-sidebar">
      <div class="sidebar-head">
        <BrandMark />
      </div>

      <nav class="nav" aria-label="主导航">
        <p class="nav-label"><span class="nav-line" /> NAV · 导航</p>
        <RouterLink to="/" class="nav-item" :class="{ 'is-active': onWorkbench }">
          <span class="idx">01</span>
          <span class="nav-text">方案档案</span>
          <span class="nav-hint">工作台</span>
        </RouterLink>
        <RouterLink to="/plans/new" class="nav-item" :class="{ 'is-active': onCreate }">
          <span class="idx">02</span>
          <span class="nav-text">新建方案</span>
          <span class="nav-hint">撰写</span>
        </RouterLink>
      </nav>

      <div class="sidebar-fill" />

      <button
        type="button"
        class="service"
        :class="`service--${status}`"
        :title="status === 'offline' ? '点击重试连接后端服务' : '后端健康检查 /healthz'"
        @click="check"
      >
        <span class="dot" />
        <span class="service-text">{{ statusText }}</span>
        <span class="service-meta">/healthz</span>
      </button>

      <div class="user">
        <span class="avatar" aria-hidden="true">{{ auth.initial }}</span>
        <span class="user-text">
          <strong>{{ auth.displayName }}</strong>
          <small>@{{ auth.user?.username ?? "—" }}</small>
        </span>
        <button type="button" class="logout" title="退出登录" @click="logout">
          <AppIcon name="logout" :size="15" />
        </button>
      </div>

      <p class="colophon">LOCAL · API v1 · TOKEN 7D</p>
    </aside>

    <header class="mobile-bar">
      <BrandMark compact />
      <nav class="mobile-nav" aria-label="主导航">
        <RouterLink to="/" class="mobile-link" :class="{ 'is-active': onWorkbench }">档案</RouterLink>
        <RouterLink to="/plans/new" class="mobile-link" :class="{ 'is-active': onCreate }">新建</RouterLink>
      </nav>
      <button type="button" class="mobile-user" :title="`${auth.displayName} · 退出登录`" @click="logout">
        {{ auth.initial }}
      </button>
    </header>

    <main class="main">
      <div class="main-inner">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </div>
      <MikuMascot class="corner-mascot" />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--nav-w) minmax(0, 1fr);
  min-height: 100vh;
}

.app-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 26px 18px 20px;
  border-right: 2px dashed var(--rule-strong);
  background-color: var(--paper-2);
  background-image:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.5) 0 10px, transparent 10px 20px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0 10px, transparent 10px 20px);
}

.sidebar-head {
  padding: 0 4px 22px;
  border-bottom: 1px dashed var(--rule-strong);
}

.nav {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 10px;
  font-size: 8.5px;
  letter-spacing: 0.18em;
  color: var(--muted);
}

.nav-label :deep(svg) {
  color: var(--accent);
  opacity: 0.75;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-pill);
  color: var(--ink-soft);
  transition:
    background 0.18s var(--ease),
    color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);
}

.nav-item .idx {
  width: 22px;
  height: 22px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  font-family: var(--font-sans);
  font-size: 9px;
  color: var(--accent-deep);
  letter-spacing: 0;
}

.nav-item .nav-text {
  font-size: 13px;
  letter-spacing: 0.03em;
}

.nav-item .nav-hint {
  margin-left: auto;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--faint);
  opacity: 0;
  transition: opacity 0.18s var(--ease);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
}

.nav-item:hover .nav-hint {
  opacity: 1;
}

.nav-item.is-active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 8px 18px rgba(234, 92, 139, 0.28);
}

.nav-item.is-active .idx {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.nav-item.is-active .nav-hint {
  opacity: 0.85;
  color: rgba(255, 255, 255, 0.9);
}

.sidebar-fill {
  flex: 1;
  min-height: 16px;
}

.service {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 6px;
  padding: 9px 12px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.78);
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0.03em;
  text-align: left;
  transition:
    color 0.18s var(--ease),
    border-color 0.18s var(--ease);
}

.service:hover {
  color: var(--ink);
  border-color: var(--rule-strong);
}

.service .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--faint);
  flex: none;
}

.service--online .dot {
  background: var(--green);
  box-shadow: 0 0 0 3px rgba(79, 157, 132, 0.15);
}

.service--offline .dot {
  background: var(--danger);
  box-shadow: 0 0 0 3px rgba(217, 72, 95, 0.13);
}

.service--checking .dot {
  background: var(--amber);
  animation: pulse 1.4s ease infinite;
}

.service-meta {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 8.5px;
  color: var(--faint);
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 6px 0;
  border-top: 1px dashed var(--rule-strong);
}

.avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--pink);
  color: var(--accent-deep);
  font-family: var(--font-serif);
  font-size: 15px;
  box-shadow: 0 3px 0 var(--accent-soft);
}

.user-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.user-text strong {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-text small {
  font-size: 10px;
  color: var(--faint);
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: var(--muted);
  border: 1px solid transparent;
  transition: all 0.18s var(--ease);
}

.logout:hover {
  color: var(--accent-deep);
  border-color: var(--rule);
  background: #fff;
}

.colophon {
  margin-top: 12px;
  text-align: center;
  font-size: 8px;
  letter-spacing: 0.1em;
  color: var(--faint);
}

.main {
  position: relative;
  min-width: 0;
  padding: 40px clamp(22px, 4.4vw, 68px) 240px;
}

.main-inner {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
}

.corner-kitty {
  position: absolute;
  right: clamp(8px, 2vw, 26px);
  bottom: 18px;
  width: clamp(104px, 10vw, 148px);
  height: auto;
  pointer-events: none;
  opacity: 0.96;
  transform: rotate(3deg);
  filter: drop-shadow(0 14px 18px rgba(201, 84, 122, 0.18));
  z-index: 1;
}

.mobile-bar {
  display: none;
}

@media (max-width: 900px) {
  .shell {
    display: block;
  }

  .app-sidebar {
    display: none;
  }

  .mobile-bar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 16px;
    height: 60px;
    padding: 0 16px;
    border-bottom: 1px dashed var(--rule-strong);
    background-color: var(--paper-2);
    background-image:
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.45) 0 10px, transparent 10px 20px),
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.45) 0 10px, transparent 10px 20px);
  }

  .mobile-nav {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  .mobile-link {
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    color: var(--ink-soft);
  }

  .mobile-link.is-active {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 5px 12px rgba(234, 92, 139, 0.25);
  }

  .mobile-user {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 2px solid #fff;
    border-radius: 50%;
    color: var(--accent-deep);
    font-family: var(--font-serif);
    font-size: 13px;
    background: var(--pink);
    box-shadow: 0 3px 0 var(--accent-soft);
  }

  .main {
    padding: 26px 18px 60px;
  }

  .corner-kitty {
    display: none;
  }
}
/* ==================== 初音未来 · 电子舞台 ==================== */
.app-sidebar {
  padding: 24px 18px 18px;
  border-right: 1px solid var(--rule);
  background-color: #040f15;
  background-image:
    linear-gradient(rgba(57, 197, 187, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57, 197, 187, 0.05) 1px, transparent 1px);
  background-size: 28px 28px;
}

.sidebar-head {
  padding: 0 4px 20px;
  border-bottom: 1px solid var(--rule);
}

.nav {
  margin-top: 20px;
  gap: 6px;
}

.nav-label {
  gap: 8px;
  padding: 0 10px 10px;
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.16em;
}

.nav-line {
  width: 18px;
  height: 1px;
  background: var(--accent);
  box-shadow: 0 0 8px rgba(57, 197, 187, 0.7);
}

.nav-item {
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--muted);
}

.nav-item .idx {
  width: 24px;
  height: 24px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: transparent;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.nav-item .nav-text {
  font-size: 12.5px;
  letter-spacing: 0.06em;
}

.nav-item .nav-hint {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.08em;
}

.nav-item:hover {
  border-color: var(--rule);
  background: rgba(57, 197, 187, 0.06);
  color: var(--ink);
}

.nav-item.is-active {
  border-color: var(--accent);
  background: linear-gradient(100deg, rgba(57, 197, 187, 0.9), rgba(110, 247, 234, 0.9));
  color: #03151a;
  box-shadow: 0 0 24px rgba(57, 197, 187, 0.22);
}

.nav-item.is-active .idx {
  border-color: rgba(3, 21, 26, 0.35);
  background: rgba(3, 21, 26, 0.12);
  color: #03151a;
}

.nav-item.is-active .nav-hint {
  color: rgba(3, 21, 26, 0.65);
  opacity: 1;
}

.service {
  margin-bottom: 8px;
  padding: 9px 11px;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: rgba(4, 15, 21, 0.7);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
}

.service:hover {
  border-color: var(--rule-strong);
  color: var(--ink);
}

.service-meta {
  color: var(--faint);
  font-size: 8px;
}

.user {
  padding: 14px 2px 0;
  border-top: 1px solid var(--rule);
}

.avatar {
  width: 36px;
  height: 36px;
  border: 1px solid var(--accent);
  border-radius: 3px;
  background: rgba(57, 197, 187, 0.1);
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 13px;
  box-shadow: none;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
}

.user-text strong {
  color: var(--ink);
  letter-spacing: 0.04em;
}

.user-text small {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

.logout {
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--muted);
}

.logout:hover {
  border-color: var(--rule-strong);
  background: var(--accent-soft);
  color: var(--cyan);
}

.colophon {
  margin-top: 12px;
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.1em;
}

.main {
  padding-bottom: 250px;
}

.corner-mascot {
  position: absolute;
  right: clamp(8px, 2vw, 24px);
  bottom: 22px;
  width: clamp(110px, 10vw, 150px);
  pointer-events: none;
  opacity: 0.92;
  filter: drop-shadow(0 0 26px rgba(57, 197, 187, 0.28)) drop-shadow(0 18px 24px rgba(0, 0, 0, 0.4));
  z-index: 1;
}

.mobile-bar {
  border-bottom: 1px solid var(--rule);
  background-color: #040f15;
  background-image:
    linear-gradient(rgba(57, 197, 187, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57, 197, 187, 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
}

.mobile-link {
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
}

.mobile-link.is-active {
  border-color: var(--accent);
  background: var(--accent);
  color: #03151a;
  box-shadow: 0 0 16px rgba(57, 197, 187, 0.24);
}

.mobile-user {
  border: 1px solid var(--accent);
  border-radius: 3px;
  background: var(--accent-soft);
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 11px;
  box-shadow: none;
  clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%);
}

@media (max-width: 900px) {
  .corner-mascot {
    display: none;
  }

  .main {
    padding: 26px 18px 60px;
  }
}
</style>
