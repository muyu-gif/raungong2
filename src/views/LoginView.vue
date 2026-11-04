<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { useServiceStatus } from "@/composables/useServiceStatus";
import { getErrorMessage } from "@/api/errors";
import { safeRedirect } from "@/utils/navigation";
import BrandMark from "@/components/BrandMark.vue";
import MikuMascot from "@/components/MikuMascot.vue";
import MikuMark from "@/components/MikuMark.vue";
import AppIcon from "@/components/AppIcon.vue";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { status } = useServiceStatus();

const mode = ref<"login" | "register">("login");
const loading = ref(false);
const serverError = ref("");
const form = reactive({
  username: "",
  password: "",
  confirm: "",
  displayName: "",
});
const errors = reactive<Record<string, string>>({});
const showPassword = ref(false);

const isRegister = computed(() => mode.value === "register");
const sessionExpired = computed(() => route.query.expired === "1");
const submitText = computed(() => (isRegister.value ? "注册并进入工作台" : "登录工作台"));
const statusText = computed(() => {
  if (status.value === "online") return "后端服务已连接";
  if (status.value === "offline") return "后端服务未连接";
  return "正在检查服务";
});

function switchMode(next: "login" | "register") {
  if (mode.value === next) return;
  mode.value = next;
  serverError.value = "";
  Object.keys(errors).forEach((key) => delete errors[key]);
  form.password = "";
  form.confirm = "";
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);

  const username = form.username.trim();
  if (!username) {
    errors.username = "请输入用户名";
  } else if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
    errors.username = "用户名需为 3 ～ 32 位字母、数字或下划线";
  }

  if (!form.password) {
    errors.password = "请输入密码";
  } else if (form.password.length < 8 || form.password.length > 64) {
    errors.password = "密码需为 8 ～ 64 位";
  }

  if (isRegister.value) {
    const name = form.displayName.trim();
    if (!name) errors.displayName = "请填写显示名称";
    else if (name.length > 50) errors.displayName = "显示名称最多 50 个字";

    if (!form.confirm) errors.confirm = "请再次输入密码";
    else if (form.confirm !== form.password) errors.confirm = "两次输入的密码不一致";
  }

  return Object.keys(errors).length === 0;
}

async function submit() {
  if (loading.value) return;
  serverError.value = "";
  if (!validate()) return;

  loading.value = true;
  try {
    if (isRegister.value) {
      await auth.register({
        username: form.username.trim(),
        password: form.password,
        display_name: form.displayName.trim(),
      });
      ElMessage({ message: "注册成功，已为你登录", type: "success" });
    } else {
      await auth.login({ username: form.username.trim(), password: form.password });
      ElMessage({ message: "欢迎回来", type: "success" });
    }

    await router.replace(safeRedirect(route.query.redirect));
  } catch (error) {
    serverError.value = getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <section class="login-art">
      <div class="art-frame">
        <span class="art-watermark" aria-hidden="true">01</span>
        <div class="art-top">
          <BrandMark />
          <span class="art-badge">DIGITAL STAGE · 活动方案工作台</span>
        </div>

        <div class="art-body">
          <p class="kicker"><span class="idx">01</span><span>PLAN · BUDGET · CREW</span></p>
          <h1 class="art-title">把每场活动，<br /><span class="accent">调成一段现场</span>。</h1>
          <p class="art-lede">
            写下主题、人数、预算与日期，剩下的交给活动智囊。策划、流程、预算、物资、分工、宣传与风险，一次成稿。
          </p>

          <ol class="art-list">
            <li>
              <span class="no">01</span>
              <span class="what">策划</span>
              <span class="how">把主题、目标与限制，读成一份可执行的方案。</span>
            </li>
            <li>
              <span class="no">02</span>
              <span class="what">预算</span>
              <span class="how">明细与预备金同步生成，改数量即时重算。</span>
            </li>
            <li>
              <span class="no">03</span>
              <span class="what">分工</span>
              <span class="how">按筹备阶段拆任务，责任人与验收标准一并落纸。</span>
            </li>
          </ol>
        </div>

        <div class="art-mascot" aria-hidden="true">
          <span class="mascot-tag">MIKU // 01</span>
          <MikuMascot />
        </div>

        <footer class="art-foot">
          <span>ACTIVITY MIND</span>
          <span class="art-rule" />
          <span>2026 · 校内活动策划</span>
        </footer>
      </div>
    </section>

    <section class="login-panel">
      <div class="panel-status">
        <span class="status" :class="`status--${status}`"><i />{{ statusText }}</span>
      </div>

      <div class="panel-inner">
        <MikuMark class="panel-mark" :size="58" />
        <p class="kicker"><span class="idx">02</span><span>ACCOUNT</span></p>
        <h2 class="panel-title">{{ isRegister ? "建立你的账号" : "回到工作台" }}</h2>
        <p class="panel-sub">
          {{ isRegister ? "注册后自动登录，无需再次输入密码。" : "使用用户名与密码登录，登录状态保留 7 天。" }}
        </p>

        <p v-if="sessionExpired" class="expired-note">登录状态已失效，请重新登录后继续。</p>

        <div class="mode-tabs" role="tablist" aria-label="登录或注册">
          <button
            type="button"
            role="tab"
            :aria-selected="!isRegister"
            class="mode-tab"
            :class="{ 'is-active': !isRegister }"
            @click="switchMode('login')"
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="isRegister"
            class="mode-tab"
            :class="{ 'is-active': isRegister }"
            @click="switchMode('register')"
          >
            注册
          </button>
        </div>

        <form class="login-form" novalidate @submit.prevent="submit">
          <div class="field">
            <label class="field-label" for="username">
              <span>用户名</span>
              <span v-if="isRegister" class="count">3–32 位字母 / 数字 / 下划线</span>
            </label>
            <input
              id="username"
              v-model="form.username"
              class="input"
              :class="{ 'is-invalid': errors.username }"
              type="text"
              autocomplete="username"
              spellcheck="false"
              placeholder="例如 demo"
              @input="delete errors.username"
            />
            <p v-if="errors.username" class="field-error">{{ errors.username }}</p>
          </div>

          <div v-if="isRegister" class="field">
            <label class="field-label" for="displayName"><span>显示名称</span><span class="count">会展示在侧栏</span></label>
            <input
              id="displayName"
              v-model="form.displayName"
              class="input"
              :class="{ 'is-invalid': errors.displayName }"
              type="text"
              autocomplete="nickname"
              placeholder="例如 演示用户"
              @input="delete errors.displayName"
            />
            <p v-if="errors.displayName" class="field-error">{{ errors.displayName }}</p>
          </div>

          <div class="field">
            <label class="field-label" for="password"><span>密码</span><span class="count">8–64 位</span></label>
            <div class="password-wrap">
              <input
                id="password"
                v-model="form.password"
                class="input"
                :class="{ 'is-invalid': errors.password }"
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                placeholder="请输入密码"
                @input="delete errors.password"
              />
              <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                {{ showPassword ? "隐藏" : "显示" }}
              </button>
            </div>
            <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
          </div>

          <div v-if="isRegister" class="field">
            <label class="field-label" for="confirm"><span>确认密码</span></label>
            <input
              id="confirm"
              v-model="form.confirm"
              class="input"
              :class="{ 'is-invalid': errors.confirm }"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="再次输入密码"
              @input="delete errors.confirm"
            />
            <p v-if="errors.confirm" class="field-error">{{ errors.confirm }}</p>
          </div>

          <p v-if="serverError" class="server-error" role="alert">{{ serverError }}</p>

          <button type="submit" class="btn btn--primary btn--lg btn--block submit" :disabled="loading">
            <span>{{ loading ? "请稍候…" : submitText }}</span>
            <AppIcon v-if="!loading" name="arrow-right" class="arrow" :size="17" />
          </button>

          <p class="form-note">
            {{ isRegister ? "已有账号？" : "还没有账号？" }}
            <button type="button" class="link-btn" @click="switchMode(isRegister ? 'login' : 'register')">
              {{ isRegister ? "直接登录" : "注册一个" }}
            </button>
          </p>
        </form>
      </div>

      <footer class="panel-foot">
        <span>无刷新令牌 · Token 有效期 7 天</span>
        <span class="mono">/api/v1</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(420px, 0.88fr);
  min-height: 100vh;
}

.login-art {
  display: flex;
  padding: 22px;
  background: var(--paper-2);
}

.art-frame {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: clamp(26px, 4vw, 52px);
  border: 1px solid var(--rule-strong);
  background: linear-gradient(160deg, rgba(255, 253, 248, 0.4), rgba(235, 228, 214, 0) 55%);
}

.art-frame::after {
  content: "";
  position: absolute;
  inset: 5px;
  border: 1px solid rgba(189, 179, 160, 0.35);
  pointer-events: none;
}

.art-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.art-badge {
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--faint);
}

.art-body {
  margin: auto 0;
  max-width: 560px;
  padding: 44px 0;
}

.art-title {
  margin-top: 22px;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: clamp(36px, 4.6vw, 58px);
  line-height: 1.32;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.art-lede {
  margin-top: 24px;
  max-width: 470px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.95;
}

.art-list {
  margin-top: 46px;
  border-top: 1px solid var(--rule);
}

.art-list li {
  display: grid;
  grid-template-columns: 40px 44px minmax(0, 1fr);
  align-items: baseline;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--rule-soft);
}

.art-list .no {
  font-family: var(--font-serif);
  font-size: 11px;
  color: var(--accent);
  letter-spacing: 0.08em;
}

.art-list .what {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.art-list .how {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.art-foot {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--faint);
}

.art-rule {
  flex: 1;
  height: 1px;
  background: var(--rule);
}

.login-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 30px clamp(26px, 4vw, 60px) 24px;
  background: var(--paper-1);
}

.panel-status {
  display: flex;
  justify-content: flex-end;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--faint);
}

.status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--faint);
}

.status--online i {
  background: var(--green);
}

.status--offline i {
  background: var(--danger);
}

.status--checking i {
  background: var(--amber);
}

.panel-inner {
  width: 100%;
  max-width: 384px;
  margin: auto;
  padding: 24px 0;
}

.panel-title {
  margin-top: 16px;
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.panel-sub {
  margin-top: 10px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.8;
}

.expired-note {
  margin-top: 14px;
  padding: 9px 12px;
  border-left: 2px solid var(--amber);
  background: rgba(138, 97, 29, 0.06);
  color: var(--amber);
  font-size: 11.5px;
  line-height: 1.7;
}

.mode-tabs {
  display: flex;
  gap: 26px;
  margin-top: 30px;
  border-bottom: 1px solid var(--rule);
}

.mode-tab {
  position: relative;
  padding: 0 0 11px;
  font-size: 13px;
  color: var(--faint);
  letter-spacing: 0.06em;
  transition: color 0.18s var(--ease);
}

.mode-tab::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: transparent;
  transition: background 0.18s var(--ease);
}

.mode-tab:hover {
  color: var(--ink);
}

.mode-tab.is-active {
  color: var(--ink);
}

.mode-tab.is-active::after {
  background: var(--accent);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 24px;
}

.password-wrap {
  position: relative;
}

.password-wrap .input {
  padding-right: 58px;
}

.password-toggle {
  position: absolute;
  top: 0;
  right: 6px;
  height: 44px;
  padding: 0 10px;
  font-size: 11px;
  color: var(--faint);
  letter-spacing: 0.04em;
}

.password-toggle:hover {
  color: var(--ink);
}

.server-error {
  padding: 10px 12px;
  border-left: 2px solid var(--danger);
  background: rgba(163, 49, 31, 0.06);
  color: var(--danger);
  font-size: 12.5px;
  line-height: 1.65;
}

.submit {
  margin-top: 4px;
}

.form-note {
  font-size: 12px;
  color: var(--faint);
  text-align: center;
}

.link-btn {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-size: 12px;
}

.panel-foot {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 10px;
  color: var(--faint);
  letter-spacing: 0.04em;
}

.panel-foot .mono {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
}

@media (max-width: 960px) {
  .login {
    display: block;
  }

  .login-art {
    padding: 0;
    border-bottom: 1px solid var(--rule);
  }

  .art-frame {
    padding: 22px 20px;
    border: none;
  }

  .art-frame::after {
    display: none;
  }

  .art-badge,
  .art-list,
  .art-foot {
    display: none;
  }

  .art-body {
    margin: 18px 0 6px;
    padding: 0;
  }

  .art-title {
    margin-top: 14px;
    font-size: 30px;
    line-height: 1.35;
  }

  .art-lede {
    margin-top: 12px;
    font-size: 12.5px;
    line-height: 1.8;
  }

  .login-panel {
    min-height: calc(100vh - 250px);
    padding: 22px 20px 20px;
  }

  .panel-status {
    display: none;
  }

  .panel-inner {
    padding: 8px 0 28px;
  }

  .panel-title {
    font-size: 26px;
  }
}
/* —— 草莓牛奶主题覆盖 —— */
.login {
  grid-template-columns: minmax(0, 1.05fr) minmax(430px, 0.95fr);
  background: var(--paper-1);
}

.login-art {
  padding: 18px;
  background-color: var(--paper-2);
  background-image:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.5) 0 12px, transparent 12px 24px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0 12px, transparent 12px 24px);
}

.art-frame {
  position: relative;
  padding: clamp(24px, 3.6vw, 44px);
  border: 2px solid #fff;
  border-radius: 32px;
  background: rgba(255, 253, 252, 0.74);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.art-frame::after {
  display: none;
}

.art-badge {
  padding: 5px 11px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.8);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.art-body {
  position: relative;
  z-index: 2;
  max-width: 68%;
  padding: 28px 0 24px;
}

.art-title {
  margin-top: 18px;
  font-size: clamp(32px, 3.4vw, 46px);
  font-weight: 400;
  line-height: 1.45;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.art-title .accent {
  color: var(--accent);
}

.art-lede {
  margin-top: 18px;
  max-width: 420px;
  font-size: 12.5px;
  line-height: 1.95;
  color: var(--muted);
}

.art-list {
  margin-top: 26px;
  border-top: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.art-list li {
  grid-template-columns: 24px 48px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 13px;
  border: 1px solid var(--rule);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.74);
}

.art-list li:last-child {
  border-bottom: 1px solid var(--rule);
}

.art-list .no {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-soft);
  font-family: var(--font-sans);
  font-size: 8.5px;
  color: var(--accent-deep);
  letter-spacing: 0;
}

.art-list .what {
  font-size: 14px;
  font-weight: 400;
  color: var(--accent-deep);
}

.art-list .how {
  font-size: 11.5px;
  color: var(--muted);
}

.art-foot {
  position: relative;
  z-index: 2;
  font-size: 8px;
  letter-spacing: 0.18em;
  color: var(--muted);
}

.art-rule {
  background: var(--rule-strong);
}

.art-kitty {
  position: absolute;
  right: 4px;
  bottom: 54px;
  z-index: 1;
  width: clamp(160px, 17vw, 230px);
  transform: rotate(-2deg);
  filter: drop-shadow(0 16px 22px rgba(201, 84, 122, 0.16));
  pointer-events: none;
}

.art-kitty img {
  width: 100%;
  height: auto;
}

.kitty-bubble {
  position: absolute;
  top: -16px;
  left: -8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1.5px solid var(--rule-strong);
  border-radius: var(--radius-pill);
  background: #fff;
  color: var(--accent-deep);
  font-size: 9.5px;
  white-space: nowrap;
  box-shadow: var(--shadow-soft);
}

.login-panel {
  padding: 26px clamp(20px, 3.6vw, 54px) 20px;
  background: transparent;
}

.panel-status {
  margin-bottom: 0;
}

.status {
  padding: 5px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.72);
  font-size: 9.5px;
  color: var(--muted);
}

.panel-inner {
  position: relative;
  width: 100%;
  max-width: 424px;
  padding: 34px 30px 30px;
  border: 2px solid #fff;
  border-radius: 30px;
  background: var(--paper-0);
  box-shadow: var(--shadow-card);
}

.panel-kitty {
  position: absolute;
  top: -30px;
  right: 18px;
  width: 78px;
  height: auto;
  transform: rotate(-4deg);
  filter: drop-shadow(0 8px 10px rgba(201, 84, 122, 0.16));
  pointer-events: none;
}

.panel-title {
  font-weight: 400;
  font-size: 29px;
}

.panel-sub {
  font-size: 12px;
}

.mode-tabs {
  gap: 4px;
  margin-top: 24px;
  padding: 4px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-pill);
  background: var(--pink-soft);
}

.mode-tab {
  flex: 1;
  padding: 9px 0;
  border-radius: var(--radius-pill);
  text-align: center;
  font-size: 12.5px;
  color: var(--muted);
}

.mode-tab::after {
  display: none;
}

.mode-tab.is-active {
  background: #fff;
  color: var(--accent-deep);
  box-shadow: 0 3px 9px rgba(201, 84, 122, 0.14);
}

.login-form {
  gap: 16px;
  margin-top: 20px;
}

.server-error {
  padding: 10px 12px;
  border: 1px solid #f2c3cc;
  border-left: 1px solid #f2c3cc;
  border-radius: 12px;
  background: #fff2f4;
}

.expired-note {
  padding: 9px 12px;
  border: 1px solid #f1ddba;
  border-left: 1px solid #f1ddba;
  border-radius: 12px;
  background: var(--amber-soft);
  color: #a87520;
}

.form-note {
  margin-top: 2px;
  color: var(--muted);
}

.link-btn {
  color: var(--accent-deep);
}

.panel-foot {
  font-size: 9.5px;
  color: var(--muted);
}

@media (max-width: 1400px) {
  .art-body {
    max-width: 58%;
  }

  .art-kitty {
    width: 180px;
  }
}

@media (max-width: 1080px) {
  .art-body {
    max-width: 100%;
  }

  .art-kitty {
    width: 140px;
    bottom: 40px;
    opacity: 0.9;
  }

  .kitty-bubble {
    display: none;
  }

  .art-title {
    font-size: 36px;
  }
}

@media (max-width: 960px) {
  .login {
    display: block;
  }

  .login-art {
    padding: 0;
    border-bottom: none;
    border-radius: 0 0 30px 30px;
  }

  .art-frame {
    padding: 20px 18px 0;
    border: none;
    border-radius: 0 0 30px 30px;
    background: transparent;
    box-shadow: none;
    overflow: visible;
  }

  .art-top {
    align-items: flex-start;
  }

  .art-badge,
  .art-list,
  .art-foot {
    display: none;
  }

  .art-body {
    margin: 0;
    padding: 18px 0 4px;
    max-width: 100%;
  }

  .art-title {
    font-size: 30px;
    line-height: 1.4;
  }

  .art-lede {
    margin-top: 12px;
    font-size: 12px;
    line-height: 1.8;
    max-width: 100%;
  }

  .art-kitty {
    position: relative;
    right: auto;
    bottom: auto;
    width: 136px;
    margin: -4px auto 0;
    display: block;
    transform: rotate(0);
    opacity: 1;
    filter: drop-shadow(0 8px 12px rgba(201, 84, 122, 0.14));
  }

  .login-panel {
    min-height: 0;
    padding: 12px 14px 20px;
  }

  .panel-status {
    display: none;
  }

  .panel-inner {
    max-width: 100%;
    padding: 26px 20px 22px;
    border-radius: 24px;
  }

  .panel-kitty {
    width: 60px;
    top: -24px;
    right: 14px;
  }

  .panel-title {
    font-size: 26px;
  }
}
/* ==================== 初音未来 · 电子舞台 ==================== */
.login {
  grid-template-columns: minmax(0, 1.06fr) minmax(430px, 0.94fr);
  background: #040f15;
}

.login-art {
  padding: 18px;
  background-color: #040f15;
  background-image:
    radial-gradient(700px 520px at 76% 18%, rgba(57, 197, 187, 0.14), transparent 64%),
    linear-gradient(rgba(57, 197, 187, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57, 197, 187, 0.06) 1px, transparent 1px);
  background-size: auto, 38px 38px, 38px 38px;
}

.art-frame {
  padding: clamp(24px, 3.4vw, 42px);
  border: 1px solid var(--rule-strong);
  border-radius: 4px;
  background:
    linear-gradient(135deg, rgba(57, 197, 187, 0.08), transparent 42%),
    rgba(4, 15, 21, 0.74);
  box-shadow: inset 0 0 80px rgba(57, 197, 187, 0.04), 0 24px 60px rgba(0, 0, 0, 0.42);
  overflow: hidden;
  clip-path: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%);
}

.art-frame::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 64px;
  height: 1px;
  background: var(--magenta);
  box-shadow: 0 0 12px rgba(255, 61, 129, 0.7);
  transform: rotate(45deg) translate(20px, -8px);
  transform-origin: right top;
}

.art-watermark {
  position: absolute;
  top: 52px;
  right: 18px;
  font-family: "Bahnschrift Condensed", var(--font-sans);
  font-size: clamp(150px, 19vw, 270px);
  font-weight: 700;
  line-height: 0.8;
  letter-spacing: -0.04em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(57, 197, 187, 0.13);
  pointer-events: none;
  user-select: none;
}

.art-badge {
  padding: 5px 10px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: rgba(57, 197, 187, 0.06);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.art-body {
  position: relative;
  z-index: 2;
  max-width: 64%;
  padding: 26px 0 22px;
}

.art-title {
  margin-top: 16px;
  font-size: clamp(33px, 3.4vw, 47px);
  font-weight: 700;
  line-height: 1.34;
  letter-spacing: 0.04em;
  color: var(--ink);
}

.art-title .accent {
  background: linear-gradient(100deg, var(--accent), var(--cyan) 60%, var(--magenta));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.art-lede {
  max-width: 430px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.95;
}

.art-list {
  margin-top: 24px;
  gap: 7px;
}

.art-list li {
  grid-template-columns: 26px 46px minmax(0, 1fr);
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--rule);
  border-left: 2px solid rgba(57, 197, 187, 0.45);
  border-radius: 2px;
  background: rgba(7, 27, 35, 0.72);
}

.art-list li:last-child {
  border-bottom: 1px solid var(--rule);
}

.art-list .no {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: transparent;
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 8px;
}

.art-list .what {
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.art-list .how {
  color: var(--muted);
  font-size: 11px;
}

.art-mascot {
  position: absolute;
  right: 0;
  bottom: 64px;
  z-index: 1;
  width: clamp(165px, 16vw, 225px);
  filter: drop-shadow(0 0 30px rgba(57, 197, 187, 0.25)) drop-shadow(0 18px 26px rgba(0, 0, 0, 0.4));
  pointer-events: none;
}

.mascot-tag {
  position: absolute;
  top: 6px;
  left: -14px;
  padding: 4px 8px;
  border: 1px solid var(--magenta);
  background: rgba(4, 15, 21, 0.85);
  color: #ff8bb2;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  transform: skewX(-8deg);
  white-space: nowrap;
}

.art-foot {
  z-index: 2;
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.16em;
}

.art-rule {
  background: var(--rule-strong);
}

.login-panel {
  padding: 24px clamp(20px, 3.6vw, 54px) 20px;
  background: transparent;
}

.status {
  padding: 5px 10px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: rgba(7, 27, 35, 0.7);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.04em;
}

.panel-inner {
  position: relative;
  width: 100%;
  max-width: 424px;
  padding: 32px 30px 28px;
  border: 1px solid var(--rule-strong);
  border-radius: 4px;
  background:
    linear-gradient(150deg, rgba(57, 197, 187, 0.08), transparent 46%),
    var(--paper-0);
  box-shadow: var(--shadow-card);
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%);
}

.panel-mark {
  position: absolute;
  top: 16px;
  right: 16px;
  color: var(--accent);
  opacity: 0.6;
}

.panel-title {
  margin-top: 14px;
  font-family: var(--font-sans);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--ink);
}

.panel-sub {
  color: var(--muted);
  font-size: 11.5px;
}

.mode-tabs {
  gap: 2px;
  margin-top: 22px;
  padding: 3px;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: rgba(4, 15, 21, 0.66);
}

.mode-tab {
  padding: 8px 0;
  border-radius: 2px;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.mode-tab::after {
  display: none;
}

.mode-tab.is-active {
  background: linear-gradient(100deg, var(--accent), var(--cyan));
  color: #03151a;
  font-weight: 700;
  box-shadow: 0 0 18px rgba(57, 197, 187, 0.25);
}

.login-form {
  margin-top: 18px;
  gap: 15px;
}

.password-toggle {
  color: var(--faint);
}

.server-error,
.expired-note {
  padding: 9px 11px;
  border: 1px solid rgba(255, 92, 122, 0.32);
  border-left: 2px solid var(--danger);
  border-radius: 2px;
  background: rgba(255, 92, 122, 0.08);
  color: #ff9aae;
  font-size: 11px;
}

.expired-note {
  border-color: rgba(255, 200, 87, 0.32);
  border-left-color: var(--amber);
  background: rgba(255, 200, 87, 0.07);
  color: #ffd98a;
}

.form-note {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.link-btn {
  color: var(--cyan);
}

.panel-foot {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

@media (max-width: 1400px) {
  .art-body {
    max-width: 60%;
  }

  .art-mascot {
    width: 195px;
  }
}

@media (max-width: 1080px) {
  .art-body {
    max-width: 100%;
  }

  .art-mascot {
    width: 150px;
    bottom: 34px;
    opacity: 0.82;
  }

  .art-watermark {
    font-size: 170px;
    opacity: 0.7;
  }

  .mascot-tag {
    display: none;
  }
}

@media (max-width: 960px) {
  .login {
    display: block;
    background: #040f15;
  }

  .login-art {
    padding: 0;
    border-bottom: 1px solid var(--rule);
    border-radius: 0;
  }

  .art-frame {
    padding: 18px 18px 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    clip-path: none;
    overflow: visible;
  }

  .art-frame::before {
    display: none;
  }

  .art-watermark {
    display: none;
  }

  .art-badge,
  .art-list,
  .art-foot {
    display: none;
  }

  .art-body {
    margin: 0;
    padding: 16px 0 4px;
    max-width: 100%;
  }

  .art-title {
    font-size: 29px;
    line-height: 1.42;
  }

  .art-lede {
    margin-top: 10px;
    font-size: 11.5px;
    line-height: 1.8;
    max-width: 100%;
  }

  .art-mascot {
    position: relative;
    right: auto;
    bottom: auto;
    width: 126px;
    margin: -2px auto 0;
    display: block;
    opacity: 1;
  }

  .login-panel {
    padding: 10px 14px 18px;
  }

  .panel-status {
    display: none;
  }

  .panel-inner {
    max-width: 100%;
    padding: 24px 18px 20px;
    border-radius: 4px;
    clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
  }

  .panel-mark {
    width: 44px;
    height: 44px;
    top: 12px;
    right: 12px;
  }

  .panel-title {
    font-size: 24px;
  }
}
</style>
