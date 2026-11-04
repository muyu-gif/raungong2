<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { getPlan, getTask } from "@/api/plans";
import { getErrorMessage } from "@/api/errors";
import type { GenerationTask, TaskStatus } from "@/api/types";
import { GENERATION_STEPS, stageText } from "@/constants/plan";
import { formatDateTime, formatElapsed } from "@/utils/format";
import {
  clearGenerationDraft,
  clearTaskId,
  readGenerationDraft,
  readTaskId,
  stashCreateDraft,
} from "@/utils/session";
import AppIcon from "@/components/AppIcon.vue";
import MikuMascot from "@/components/MikuMascot.vue";

type ViewState = "resolving" | "polling" | "success" | "failed" | "timeout" | "missing";

const route = useRoute();
const router = useRouter();
const planId = computed(() => String(route.params.id ?? ""));
const draft = readGenerationDraft(planId.value);

const view = ref<ViewState>("resolving");
const taskId = ref("");
const taskStatus = ref<TaskStatus>("queued");
const stage = ref<string | null>(null);
const progress = ref(0);
const message = ref("任务已排队");
const elapsed = ref(0);
const errorText = ref("");
const errorCode = ref("");
const retryable = ref(false);
const detailNote = ref("");

let pollTimer: number | undefined;
let tickTimer: number | undefined;
let redirectTimer: number | undefined;
let stopped = false;
let startedAt = Date.now();
let consecutiveErrors = 0;

const headline = computed(() => {
  switch (view.value) {
    case "success":
      return "这场活动，已经成稿。";
    case "missing":
      return "这一步的进度丢失了。";
    case "timeout":
      return "生成得比预期久。";
    case "failed":
      return "这次生成没有完成。";
    case "resolving":
      return "正在确认生成状态。";
    default:
      return "正在写下这场活动。";
  }
});

const draftSummary = computed(() => {
  if (!draft) return `方案编号 ${planId.value.slice(0, 8)}`;
  const parts = [
    draft.theme,
    draft.starts_at ? formatDateTime(draft.starts_at) : "",
    draft.location,
  ].filter(Boolean);
  return parts.join(" · ");
});

const progressLabel = computed(() => String(Math.round(progress.value)).padStart(2, "0"));

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function stepState(index: number): "done" | "active" | "pending" | "error" {
  if (view.value === "success") return "done";
  if (view.value === "failed" || view.value === "timeout") return index === 0 ? "error" : "pending";
  if (taskStatus.value === "queued") return index === 0 ? "active" : "pending";
  if (taskStatus.value === "running") {
    if (index === 0) return "done";
    if (index === 1) return "active";
    return "pending";
  }
  return "pending";
}

function stopTimers() {
  stopped = true;
  if (pollTimer) window.clearTimeout(pollTimer);
  if (tickTimer) window.clearInterval(tickTimer);
  pollTimer = undefined;
  tickTimer = undefined;
}

function schedule(delay: number) {
  if (stopped) return;
  pollTimer = window.setTimeout(() => void poll(), delay);
}

function applyTask(task: GenerationTask) {
  taskStatus.value = task.status;
  stage.value = task.stage;
  progress.value = task.status === "succeeded" ? 100 : clampProgress(task.progress);
  message.value = task.message || stageText(task.stage, task.status);
}

async function poll() {
  if (stopped) return;
  try {
    const task = await getTask(taskId.value);
    if (stopped) return;
    consecutiveErrors = 0;
    applyTask(task);

    if (task.status === "succeeded") {
      finishSuccess(task);
      return;
    }
    if (task.status === "failed" || task.status === "canceled") {
      finishFailed(task);
      return;
    }
    schedule(1000);
  } catch (error) {
    if (stopped) return;
    consecutiveErrors += 1;
    if (consecutiveErrors <= 3) {
      message.value = "网络波动，正在重试…";
      schedule(1500);
      return;
    }
    view.value = "failed";
    errorText.value = getErrorMessage(error);
    errorCode.value = "POLL_FAILED";
    stopTimers();
  }
}

function finishSuccess(task: GenerationTask) {
  view.value = "success";
  taskStatus.value = "succeeded";
  progress.value = 100;
  message.value = task.message || "生成完成";
  clearTaskId(planId.value);
  clearGenerationDraft(planId.value);
  stopTimers();
  redirectTimer = window.setTimeout(() => {
    void router.replace({ name: "plan-detail", params: { id: planId.value } });
  }, 900);
}

function finishFailed(task: GenerationTask) {
  view.value = "failed";
  taskStatus.value = task.status;
  errorText.value = task.error?.message || task.message || "生成失败，请稍后重试";
  errorCode.value = task.error?.code ?? "";
  retryable.value = Boolean(task.error?.retryable);
  stopTimers();
}

function onTick() {
  elapsed.value = Math.floor((Date.now() - startedAt) / 1000);
  if (view.value === "polling" && elapsed.value >= 180) {
    view.value = "timeout";
    stopTimers();
  }
}

function goRetry() {
  const saved = readGenerationDraft(planId.value) ?? draft;
  if (saved) stashCreateDraft(saved);
  void router.push({ name: "plan-new" });
}

function openExisting() {
  void router.push({ name: "plan-detail", params: { id: planId.value } });
}

async function resolveWithoutTask() {
  try {
    const plan = await getPlan(planId.value);
    if (plan.status === "ready" && plan.content) {
      await router.replace({ name: "plan-detail", params: { id: planId.value } });
      return;
    }
    detailNote.value =
      plan.status === "generating"
        ? "方案仍在生成中，但当前浏览器没有本次任务的编号，无法继续显示进度。"
        : "当前浏览器没有本次任务的编号，无法继续显示进度。";
  } catch (error) {
    detailNote.value = getErrorMessage(error);
  }
  view.value = "missing";
}

onMounted(() => {
  window.scrollTo({ top: 0 });
  const savedTask = readTaskId(planId.value);
  if (!savedTask) {
    void resolveWithoutTask();
    return;
  }

  taskId.value = savedTask;
  view.value = "polling";
  startedAt = Date.now();
  tickTimer = window.setInterval(onTick, 1000);
  void poll();
});

onBeforeUnmount(() => {
  stopTimers();
  if (redirectTimer) window.clearTimeout(redirectTimer);
});
</script>

<template>
  <section class="gen">
    <header class="gen-head">
      <p class="kicker"><span class="idx">03</span><span>GENERATING · 生成任务</span></p>
      <h1 class="gen-title">{{ headline }}</h1>
      <p class="gen-sub">{{ draftSummary }}</p>
    </header>

    <div v-if="view === 'resolving'" class="runner runner--loading" aria-busy="true">
      <div class="runner-main">
        <div class="skeleton-line" style="width: 160px; height: 64px" />
        <div class="skeleton-line" style="width: 100%; height: 2px; margin-top: 26px" />
        <div class="skeleton-line" style="width: 46%; height: 12px; margin-top: 22px" />
      </div>
    </div>

    <div v-else-if="view === 'polling' || view === 'success'" class="runner" :class="{ 'is-done': view === 'success' }">
      <div class="runner-main">
        <div class="progress-figure">
          <span class="figure tabular">{{ progressLabel }}</span>
          <span class="pct">%</span>
        </div>

        <div class="track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
          <div class="fill" :style="{ width: `${progress}%` }" />
        </div>

        <p class="stage-message">
          <span v-if="view === 'success'" class="done-mark"><AppIcon name="check" :size="14" /></span>
          {{ view === "success" ? "生成完成，正在打开方案…" : message }}
        </p>

        <div class="runner-meta">
          <span>已用时 {{ formatElapsed(elapsed) }}</span>
          <span class="task-no">TASK · {{ taskId.slice(0, 8) }}</span>
        </div>

        <div class="kitty-cheer">
          <MikuMascot class="cheer-mascot" />
          <span class="kitty-bubble">{{ view === "success" ? "生成完成，正在打开现场…" : "正在调音，马上就好～" }}</span>
        </div>
      </div>

      <ol class="steps" aria-label="生成阶段">
        <li v-for="(step, index) in GENERATION_STEPS" :key="step.key" class="step" :class="`step--${stepState(index)}`">
          <span class="step-dot">
            <AppIcon v-if="stepState(index) === 'done'" name="check" :size="11" :stroke-width="2" />
            <span v-else>{{ String(index + 1).padStart(2, "0") }}</span>
          </span>
          <span class="step-text">
            <strong>{{ step.label }}</strong>
            <small>{{ step.description }}</small>
          </span>
        </li>
      </ol>
    </div>

    <div v-else class="outcome">
      <div class="outcome-mark" :class="`outcome-mark--${view}`">
        <AppIcon :name="view === 'missing' ? 'info' : 'alert'" :size="22" :stroke-width="1.4" />
      </div>

      <div class="outcome-body">
        <p class="kicker kicker--plain">
          <span class="idx">!</span>
          <span>{{ view === "timeout" ? "TIMEOUT" : view === "missing" ? "LOST" : "FAILED" }}</span>
        </p>
        <h2 class="outcome-title">
          {{ view === "timeout" ? "生成时间较长" : view === "missing" ? "无法恢复本次进度" : "生成失败" }}
        </h2>
        <p class="outcome-text">
          <template v-if="view === 'timeout'">生成时间较长，请稍后在方案档案中查看，或重新填写并生成一份。</template>
          <template v-else-if="view === 'missing'">{{ detailNote || "当前浏览器没有保存本次任务的编号。" }}</template>
          <template v-else>{{ errorText || "生成失败，请稍后重试。" }}</template>
        </p>
        <p v-if="errorCode" class="outcome-code">
          {{ errorCode }}<span v-if="retryable"> · 可重试</span>
        </p>
      </div>

      <div class="outcome-actions">
        <button type="button" class="btn" @click="openExisting">查看方案</button>
        <button type="button" class="btn btn--primary" @click="goRetry">
          <span>重新填写并生成</span>
          <AppIcon name="arrow-right" :size="15" class="arrow" />
        </button>
        <RouterLink to="/" class="btn btn--quiet">返回方案档案</RouterLink>
      </div>
    </div>

    <section v-if="['polling', 'success', 'resolving'].includes(view)" class="scope">
      <p class="scope-label">本次生成内容 · SIX SECTIONS</p>
      <ul class="scope-list">
        <li><span class="no">01</span><span class="name">策划与流程</span><span class="desc">背景、目标、筹备阶段与当晚流程</span></li>
        <li><span class="no">02</span><span class="name">预算</span><span class="desc">明细金额、预备金与经费来源</span></li>
        <li><span class="no">03</span><span class="name">物资</span><span class="desc">采购、借调与到位状态</span></li>
        <li><span class="no">04</span><span class="name">分工</span><span class="desc">任务、责任人与验收标准</span></li>
        <li><span class="no">05</span><span class="name">宣传</span><span class="desc">口号、文案、渠道与海报文字</span></li>
        <li><span class="no">06</span><span class="name">风险与复盘</span><span class="desc">风险应对、成效指标与复盘模板</span></li>
      </ul>
    </section>

    <footer class="gen-foot">
      <p v-if="view === 'polling' || view === 'success'">
        离开此页不会中断生成，任务仍会在后台继续。
        <RouterLink to="/">返回方案档案</RouterLink>
      </p>
      <p v-else-if="view === 'resolving'">正在读取方案状态…</p>
      <p v-else>当前后端没有“重新生成”接口，重新填写会创建一份新的方案。</p>
    </footer>
  </section>
</template>

<style scoped>
.gen {
  max-width: 860px;
  margin: 0 auto;
  padding: 26px 0 40px;
}

.gen-head {
  padding-bottom: 30px;
  border-bottom: 1px solid var(--rule);
}

.gen-title {
  margin-top: 18px;
  font-family: var(--font-serif);
  font-size: clamp(30px, 3.6vw, 42px);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
}

.gen-sub {
  margin-top: 12px;
  font-size: 12.5px;
  color: var(--muted);
  letter-spacing: 0.02em;
}

.runner {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
  gap: clamp(30px, 5vw, 64px);
  padding: 46px 0 40px;
}

.runner-main {
  min-width: 0;
}

.progress-figure {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 0.9;
}

.figure {
  font-family: var(--font-serif);
  font-size: clamp(64px, 8vw, 92px);
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.pct {
  margin-top: 8px;
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--faint);
}

.track {
  position: relative;
  height: 2px;
  margin-top: 28px;
  background: var(--rule);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.8s var(--ease);
}

.is-done .fill {
  background: var(--green);
}

.stage-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  font-size: 13.5px;
  color: var(--ink-soft);
  min-height: 22px;
}

.done-mark {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--green);
  color: var(--green);
  border-radius: 50%;
}

.runner-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 30px;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--faint);
}

.task-no {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: 8px;
}

.step {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
  padding-bottom: 26px;
}

.step:last-child {
  padding-bottom: 0;
}

.step::before {
  content: "";
  position: absolute;
  left: 13px;
  top: 30px;
  bottom: 4px;
  width: 1px;
  background: var(--rule);
}

.step:last-child::before {
  display: none;
}

.step-dot {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--rule);
  border-radius: 50%;
  background: var(--paper-1);
  color: var(--faint);
  font-family: var(--font-serif);
  font-size: 9.5px;
  transition: all 0.25s var(--ease);
}

.step-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 3px;
}

.step-text strong {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--faint);
  transition: color 0.25s var(--ease);
}

.step-text small {
  font-size: 10.5px;
  color: var(--faint);
  line-height: 1.6;
}

.step--active .step-dot {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.step--active .step-text strong {
  color: var(--ink);
}

.step--active .step-text small {
  color: var(--muted);
}

.step--done .step-dot {
  border-color: var(--green);
  background: var(--green);
  color: var(--paper-0);
}

.step--done .step-text strong {
  color: var(--ink-soft);
}

.step--error .step-dot {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(163, 49, 31, 0.06);
}

.step--error .step-text strong {
  color: var(--danger);
}

.outcome {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 20px;
  padding: 46px 0 38px;
  border-bottom: 1px solid var(--rule);
}

.outcome-mark {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border: 1px solid var(--rule-strong);
  color: var(--muted);
}

.outcome-mark--failed {
  border-color: var(--danger);
  color: var(--danger);
}

.outcome-mark--missing {
  border-color: var(--amber);
  color: var(--amber);
}

.outcome-body {
  min-width: 0;
}

.outcome-title {
  margin-top: 10px;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
}

.outcome-text {
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.9;
  white-space: pre-wrap;
}

.outcome-code {
  margin-top: 10px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--faint);
}

.outcome-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  grid-column: 2;
  margin-top: 6px;
}

.gen-foot {
  padding-top: 20px;
  font-size: 11px;
  color: var(--faint);
  line-height: 1.8;
}

.scope {
  margin-top: 18px;
  padding-top: 26px;
  border-top: 1px solid var(--rule);
}

.scope-label {
  font-size: 8.5px;
  letter-spacing: 0.22em;
  color: var(--faint);
}

.scope-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 24px;
  margin-top: 14px;
}

.scope-list li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 11px 0;
  border-bottom: 1px solid var(--rule-soft);
  min-width: 0;
}

.scope-list .no {
  flex: none;
  font-family: var(--font-serif);
  font-size: 9.5px;
  color: var(--accent);
  letter-spacing: 0.04em;
}

.scope-list .name {
  flex: none;
  font-size: 12px;
  color: var(--ink-soft);
}

.scope-list .desc {
  margin-left: auto;
  font-size: 10px;
  color: var(--faint);
  text-align: right;
  line-height: 1.6;
}

.gen-foot a {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.gen-foot a:hover {
  color: var(--ink);
}

@media (max-width: 800px) {
  .scope-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .scope-list .desc {
    display: none;
  }

  .runner {
    grid-template-columns: minmax(0, 1fr);
    gap: 36px;
    padding: 34px 0;
  }

  .steps {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .step {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 0;
  }

  .step::before {
    display: none;
  }

  .step-text small {
    display: none;
  }

  .outcome {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    padding: 30px 0;
  }

  .outcome-actions {
    grid-column: 1;
    margin-top: 4px;
  }

  .outcome-actions .btn {
    flex: 1 1 auto;
  }
}
/* —— 草莓牛奶主题覆盖 —— */
.gen {
  padding-top: 18px;
}

.gen-head {
  border-bottom: 2px dashed var(--rule-strong);
}

.gen-title {
  font-weight: 400;
  letter-spacing: 0.03em;
}

.gen-sub {
  color: var(--muted);
}

.figure {
  color: var(--accent-deep);
}

.pct {
  color: var(--accent);
}

.track {
  height: 12px;
  border-radius: var(--radius-pill);
  background: var(--pink-soft);
  border: 1px solid var(--rule);
  overflow: hidden;
}

.fill {
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, #ffa6c2, var(--accent));
}

.stage-message {
  color: var(--ink-soft);
}

.done-mark {
  border-color: var(--green);
  color: var(--green);
  background: var(--green-soft);
}

.runner-meta {
  color: var(--muted);
}

.steps {
  padding: 22px 20px;
  border: 1.5px solid var(--rule);
  border-radius: 24px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
}

.step-dot {
  border: 1.5px solid var(--rule-strong);
  background: #fff;
  color: var(--muted);
}

.step--active .step-dot {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  box-shadow: 0 0 0 4px var(--accent-soft);
}

.step--done .step-dot {
  border-color: var(--green);
  background: var(--green);
  color: #fff;
}

.step--error .step-dot {
  border-color: var(--danger);
  background: #fff2f4;
  color: var(--danger);
}

.step::before {
  background: var(--rule);
}

.step--done::before {
  background: #bfe3d5;
}

.kitty-cheer {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.kitty-cheer img {
  width: 64px;
  height: auto;
  flex: none;
  filter: drop-shadow(0 6px 8px rgba(201, 84, 122, 0.14));
}

.kitty-bubble {
  position: relative;
  display: inline-block;
  padding: 8px 13px;
  border: 1.5px solid var(--rule-strong);
  border-radius: 16px 16px 16px 4px;
  background: #fff;
  color: var(--accent-deep);
  font-size: 11px;
  line-height: 1.5;
  box-shadow: var(--shadow-soft);
}

.outcome {
  margin-top: 10px;
  padding: 26px;
  border: 1.5px solid var(--rule);
  border-radius: 26px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
}

.outcome-mark {
  border-radius: 20px;
  background: var(--pink-soft);
}

.outcome-mark--failed {
  border-color: #f2c3cc;
  background: #fff2f4;
}

.outcome-mark--missing {
  border-color: #f1ddba;
  background: var(--amber-soft);
}

.outcome-title {
  font-weight: 400;
}

.outcome-actions {
  grid-column: 2;
}

.scope {
  margin-top: 22px;
  padding: 22px 24px;
  border: 1.5px solid var(--rule);
  border-radius: 24px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
}

.scope-label {
  color: var(--muted);
}

.scope-list {
  gap: 8px 12px;
}

.scope-list li {
  padding: 10px 12px;
  border: 1px solid var(--rule);
  border-radius: 14px;
  background: var(--pink-soft);
}

.scope-list .no {
  color: var(--accent-deep);
}

.scope-list .desc {
  color: var(--muted);
}

.gen-foot {
  color: var(--muted);
}

.gen-foot a {
  color: var(--accent-deep);
}

.runner--loading .skeleton-line {
  background: linear-gradient(90deg, var(--paper-2) 0%, #fff 45%, var(--paper-2) 90%);
}

@media (max-width: 800px) {
  .steps {
    padding: 16px;
    border-radius: 20px;
  }

  .outcome {
    padding: 20px 16px;
    border-radius: 22px;
  }

  .scope {
    padding: 18px 16px;
    border-radius: 20px;
  }

  .scope-list {
    gap: 8px;
  }

  .scope-list li {
    padding: 8px 10px;
  }
}
/* ==================== 初音未来 · 电子舞台 ==================== */
.gen {
  padding-top: 14px;
}

.gen-head {
  border-bottom: 1px solid var(--rule-strong);
}

.gen-title {
  font-family: var(--font-sans);
  font-size: clamp(29px, 3.4vw, 40px);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.gen-sub {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.03em;
}

.figure {
  font-family: "Bahnschrift", var(--font-sans);
  font-size: clamp(64px, 8vw, 92px);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: transparent;
  background: linear-gradient(100deg, var(--cyan), var(--accent) 60%, var(--magenta));
  -webkit-background-clip: text;
  background-clip: text;
  text-shadow: none;
}

.pct {
  color: var(--muted);
  font-family: var(--font-mono);
}

.track {
  height: 6px;
  border: none;
  border-radius: 1px;
  background: rgba(57, 197, 187, 0.12);
  overflow: hidden;
}

.fill {
  border-radius: 1px;
  background: linear-gradient(90deg, var(--accent), var(--cyan));
  box-shadow: 0 0 16px rgba(57, 197, 187, 0.5);
}

.stage-message {
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.03em;
}

.done-mark {
  border-color: var(--green);
  background: var(--green-soft);
  color: var(--green);
}

.runner-meta {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

.task-no {
  color: var(--faint);
}

.steps {
  padding: 20px 18px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background:
    linear-gradient(150deg, rgba(57, 197, 187, 0.06), transparent 52%),
    rgba(7, 27, 35, 0.72);
  box-shadow: none;
}

.step-dot {
  width: 26px;
  height: 26px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: transparent;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.step--active .step-dot {
  border-color: var(--accent);
  background: var(--accent);
  color: #03151a;
  box-shadow: 0 0 18px rgba(57, 197, 187, 0.35);
}

.step--done .step-dot {
  border-color: var(--green);
  background: var(--green);
  color: #03151a;
}

.step--error .step-dot {
  border-color: var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
}

.step-text strong {
  color: var(--ink);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.step-text small {
  color: var(--muted);
  font-size: 9.5px;
}

.step--active .step-text strong,
.step--done .step-text strong {
  color: var(--ink);
}

.step::before {
  left: 12px;
  top: 28px;
  background: var(--rule);
}

.step--done::before {
  background: rgba(92, 225, 185, 0.4);
}

.kitty-cheer {
  gap: 12px;
  margin-top: 22px;
}

.cheer-mascot {
  width: 66px;
  flex: none;
  filter: drop-shadow(0 0 18px rgba(57, 197, 187, 0.25));
}

.kitty-bubble {
  padding: 7px 11px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: rgba(7, 27, 35, 0.9);
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 9.5px;
  line-height: 1.6;
  box-shadow: none;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
}

.outcome {
  padding: 24px;
  border: 1px solid var(--rule-strong);
  border-radius: 4px;
  background: rgba(7, 27, 35, 0.78);
  box-shadow: none;
}

.outcome-mark {
  width: 50px;
  height: 50px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: var(--accent-soft);
  color: var(--cyan);
}

.outcome-mark--failed {
  border-color: rgba(255, 92, 122, 0.4);
  background: var(--danger-soft);
  color: var(--danger);
}

.outcome-mark--missing {
  border-color: rgba(255, 200, 87, 0.4);
  background: var(--amber-soft);
  color: var(--amber);
}

.outcome-title {
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.outcome-text {
  color: var(--muted);
}

.outcome-code {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

.scope {
  margin-top: 18px;
  padding: 20px 22px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background: rgba(7, 27, 35, 0.68);
  box-shadow: none;
}

.scope-label {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.16em;
}

.scope-list {
  gap: 6px 8px;
}

.scope-list li {
  padding: 9px 10px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: rgba(57, 197, 187, 0.04);
}

.scope-list .no {
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 8px;
}

.scope-list .name {
  color: var(--ink);
  font-size: 11px;
}

.scope-list .desc {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.gen-foot {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
}

.gen-foot a {
  color: var(--cyan);
}

.runner--loading .skeleton-line {
  background: linear-gradient(90deg, rgba(57, 197, 187, 0.06) 0%, rgba(110, 247, 234, 0.16) 45%, rgba(57, 197, 187, 0.06) 90%);
}

@media (max-width: 800px) {
  .steps {
    padding: 14px;
    border-radius: 3px;
  }

  .outcome {
    padding: 18px 14px;
    border-radius: 3px;
  }

  .scope {
    padding: 16px 14px;
    border-radius: 3px;
  }

  .cheer-mascot {
    width: 54px;
  }
}
</style>
