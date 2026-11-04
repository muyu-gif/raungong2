<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { generatePlan } from "@/api/plans";
import { getErrorMessage, isNetworkError } from "@/api/errors";
import { ACTIVITY_TYPES, TONES } from "@/constants/activity";
import {
  buildPayload,
  emptyForm,
  formFromPayload,
  perPersonBudget,
  validateForm,
  type FormErrors,
  type FormState,
} from "@/utils/form";
import { takeCreateDraft } from "@/utils/session";
import { formatDateTime, formatDuration, formatMoney } from "@/utils/format";
import { createId } from "@/utils/uuid";
import { saveGenerationDraft, saveTaskId } from "@/utils/session";
import AppIcon from "@/components/AppIcon.vue";
import MikuMark from "@/components/MikuMark.vue";

const router = useRouter();
const prefill = takeCreateDraft();
const form = reactive<FormState>(prefill ? formFromPayload(prefill) : emptyForm());
const errors = ref<FormErrors>({});
const attempted = ref(false);
const submitting = ref(false);
const submitError = ref("");

const typeLabel = computed(() => ACTIVITY_TYPES.find((item) => item.value === form.activityType)?.label ?? "");
const toneLabel = computed(() => TONES.find((item) => item.value === form.tone)?.label ?? "轻松活泼");
const perPerson = computed(() => perPersonBudget(form));
const startsLabel = computed(() =>
  form.startsAt ? formatDateTime(form.startsAt.toISOString()) : "待选择",
);
const durationLabel = computed(() => {
  const minutes = Number(form.duration);
  return Number.isFinite(minutes) && minutes > 0 ? formatDuration(minutes) : "待填写";
});

const goalCount = computed(() => form.goals.filter((goal) => goal.trim()).length);

watch(
  form,
  () => {
    if (attempted.value) errors.value = validateForm(form);
  },
  { deep: true },
);

function addGoal() {
  if (form.goals.length >= 5) return;
  form.goals.push("");
}

function removeGoal(index: number) {
  form.goals.splice(index, 1);
  if (!form.goals.length) form.goals.push("");
}

function disabledDate(date: Date) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return date.getTime() < startOfToday.getTime();
}

function validate(): boolean {
  attempted.value = true;
  errors.value = validateForm(form);
  const valid = Object.keys(errors.value).length === 0;
  if (!valid) {
    void nextTick(() => {
      document.querySelector(".is-invalid")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  return valid;
}

async function submit() {
  if (submitting.value) return;
  submitError.value = "";
  if (!validate()) {
    ElMessage({ message: "还有几处需要补充或修正", type: "warning" });
    return;
  }

  const payload = buildPayload(form);
  const idempotencyKey = createId();
  submitting.value = true;

  try {
    let accepted;
    try {
      accepted = await generatePlan(payload, idempotencyKey);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      // 网络超时重试时复用同一个 Idempotency-Key。
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      accepted = await generatePlan(payload, idempotencyKey);
    }

    saveTaskId(accepted.plan_id, accepted.task_id);
    saveGenerationDraft(accepted.plan_id, payload);
    ElMessage({
      message: accepted.reused ? "已复用同一生成任务" : "已开始生成，约需几秒",
      type: "success",
    });
    await router.push({ name: "plan-generating", params: { id: accepted.plan_id } });
  } catch (error) {
    submitError.value = getErrorMessage(error);
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  window.scrollTo({ top: 0 });
});
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div>
        <p class="kicker"><span class="idx">02</span><span>NEW PLAN · 新建方案</span></p>
        <h1 class="page-title">写下活动的基本盘。</h1>
        <p class="page-sub">填好必要信息，余下的策划、预算、物资、分工、宣传与风险交给智能体。</p>
      </div>
      <RouterLink to="/" class="back-link">
        <AppIcon name="arrow-left" :size="14" />
        <span>返回档案</span>
      </RouterLink>
    </header>

    <div class="create-layout">
      <form id="create-form" class="sheet" novalidate @submit.prevent="submit">
        <section class="block">
          <header class="block-head">
            <span class="block-no">01</span>
            <div>
              <h2>活动是什么</h2>
              <p>主题与类型决定后续内容的口吻与结构。</p>
            </div>
          </header>

          <div class="block-body">
            <div class="field">
              <label class="field-label" for="theme">
                <span>活动主题 <i class="req">*</i></span>
                <span class="count">{{ form.theme.length }}/60</span>
              </label>
              <input
                id="theme"
                v-model="form.theme"
                class="input"
                :class="{ 'is-invalid': errors.theme }"
                type="text"
                maxlength="60"
                placeholder="例如：2026 级迎新晚会"
              />
              <p v-if="errors.theme" class="field-error">{{ errors.theme }}</p>
              <p v-else class="field-help">2 ～ 60 个字，会作为方案标题的基础。</p>
            </div>

            <div class="field type-field">
              <span class="field-label"><span>活动类型 <i class="req">*</i></span><span class="count">固定枚举</span></span>
              <div class="type-grid" role="radiogroup" aria-label="活动类型">
                <button
                  v-for="item in ACTIVITY_TYPES"
                  :key="item.value"
                  type="button"
                  role="radio"
                  :aria-checked="form.activityType === item.value"
                  class="type-option"
                  :class="{ 'is-selected': form.activityType === item.value }"
                  @click="form.activityType = item.value"
                >
                  <span class="type-label">{{ item.label }}</span>
                  <span class="type-en">{{ item.en }}</span>
                </button>
              </div>
              <p v-if="errors.activityType" class="field-error">{{ errors.activityType }}</p>
            </div>

            <div class="field-grid field-grid--2">
              <div class="field">
                <label class="field-label" for="location">
                  <span>活动地点 <i class="req">*</i></span>
                  <span class="count">{{ form.location.length }}/120</span>
                </label>
                <input
                  id="location"
                  v-model="form.location"
                  class="input"
                  :class="{ 'is-invalid': errors.location }"
                  type="text"
                  maxlength="120"
                  placeholder="例如：学校礼堂"
                />
                <p v-if="errors.location" class="field-error">{{ errors.location }}</p>
              </div>

              <div class="field">
                <label class="field-label" for="audience">
                  <span>目标人群</span>
                  <span class="count">{{ form.targetAudience.length }}/120</span>
                </label>
                <input
                  id="audience"
                  v-model="form.targetAudience"
                  class="input"
                  :class="{ 'is-invalid': errors.targetAudience }"
                  type="text"
                  maxlength="120"
                  placeholder="例如：2026 级新生与社团成员"
                />
                <p v-if="errors.targetAudience" class="field-error">{{ errors.targetAudience }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="block">
          <header class="block-head">
            <span class="block-no">02</span>
            <div>
              <h2>何时、多少人、多少钱</h2>
              <p>这四项会直接写进预算与流程的时间轴。</p>
            </div>
          </header>

          <div class="block-body">
            <div class="field-grid field-grid--2">
              <div class="field">
                <span class="field-label"><span>开始时间 <i class="req">*</i></span><span class="count">需晚于当前时间</span></span>
                <el-date-picker
                  v-model="form.startsAt"
                  type="datetime"
                  placeholder="选择开始时间"
                  format="YYYY.MM.DD HH:mm"
                  :clearable="false"
                  :disabled-date="disabledDate"
                  popper-class="paper-popper"
                  :class="{ 'is-invalid': errors.startsAt }"
                />
                <p v-if="errors.startsAt" class="field-error">{{ errors.startsAt }}</p>
              </div>

              <div class="field">
                <label class="field-label" for="duration">
                  <span>活动时长 <i class="req">*</i></span>
                  <span class="count">30 ～ 480 分钟</span>
                </label>
                <div class="affix">
                  <input
                    id="duration"
                    v-model="form.duration"
                    class="input input--num input--affix"
                    :class="{ 'is-invalid': errors.duration }"
                    type="text"
                    inputmode="numeric"
                    placeholder="120"
                  />
                  <span class="affix-suffix">分钟</span>
                </div>
                <p v-if="errors.duration" class="field-error">{{ errors.duration }}</p>
              </div>
            </div>

            <div class="field-grid field-grid--2">
              <div class="field">
                <label class="field-label" for="participants">
                  <span>预计人数 <i class="req">*</i></span>
                  <span class="count">10 ～ 2000 人</span>
                </label>
                <div class="affix">
                  <input
                    id="participants"
                    v-model="form.participants"
                    class="input input--num input--affix"
                    :class="{ 'is-invalid': errors.participants }"
                    type="text"
                    inputmode="numeric"
                    placeholder="100"
                  />
                  <span class="affix-suffix">人</span>
                </div>
                <p v-if="errors.participants" class="field-error">{{ errors.participants }}</p>
              </div>

              <div class="field">
                <label class="field-label" for="budget">
                  <span>活动预算 <i class="req">*</i></span>
                  <span class="count">最多两位小数</span>
                </label>
                <div class="affix affix--prefix">
                  <span class="affix-prefix">¥</span>
                  <input
                    id="budget"
                    v-model="form.budget"
                    class="input input--num input--affix is-prefixed"
                    :class="{ 'is-invalid': errors.budget }"
                    type="text"
                    inputmode="decimal"
                    placeholder="2000.00"
                  />
                </div>
                <p v-if="errors.budget" class="field-error">{{ errors.budget }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="block">
          <header class="block-head">
            <span class="block-no">03</span>
            <div>
              <h2>希望它成为什么样子</h2>
              <p>目标、限制和基调会影响文案语气与流程取舍。</p>
            </div>
          </header>

          <div class="block-body">
            <div class="field">
              <span class="field-label">
                <span>活动目标</span>
                <span class="count">{{ goalCount }}/5 条</span>
              </span>
              <div class="goal-list">
                <div v-for="index in form.goals.length" :key="index" class="goal-row">
                  <span class="goal-no">{{ String(index).padStart(2, "0") }}</span>
                  <input
                    v-model="form.goals[index - 1]"
                    class="input"
                    type="text"
                    maxlength="60"
                    :placeholder="index === 1 ? '例如：帮助新生快速融入校园' : '再补充一条目标'"
                  />
                  <button
                    v-if="form.goals.length > 1"
                    type="button"
                    class="goal-remove"
                    aria-label="删除这条目标"
                    @click="removeGoal(index - 1)"
                  >
                    <AppIcon name="close" :size="13" />
                  </button>
                </div>
              </div>
              <div class="goal-foot">
                <button v-if="form.goals.length < 5" type="button" class="add-goal" @click="addGoal">
                  <AppIcon name="plus" :size="13" />
                  <span>添加一条目标</span>
                </button>
                <p v-if="errors.goals" class="field-error">{{ errors.goals }}</p>
              </div>
            </div>

            <div class="field">
              <span class="field-label"><span>方案基调</span><span class="count">默认轻松活泼</span></span>
              <div class="tone-grid" role="radiogroup" aria-label="方案基调">
                <button
                  v-for="item in TONES"
                  :key="item.value"
                  type="button"
                  role="radio"
                  :aria-checked="form.tone === item.value"
                  class="tone-option"
                  :class="{ 'is-selected': form.tone === item.value }"
                  @click="form.tone = item.value"
                >
                  <span class="tone-mark" />
                  <span class="tone-text">
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.hint }}</small>
                  </span>
                </button>
              </div>
            </div>

            <div class="field-grid field-grid--2">
              <div class="field">
                <label class="field-label" for="constraints">
                  <span>限制条件</span>
                  <span class="count">{{ form.constraints.length }}/500</span>
                </label>
                <textarea
                  id="constraints"
                  v-model="form.constraints"
                  class="textarea"
                  :class="{ 'is-invalid': errors.constraints }"
                  maxlength="500"
                  rows="4"
                  placeholder="例如：室内礼堂，禁止明火；音响由场地提供"
                />
                <p v-if="errors.constraints" class="field-error">{{ errors.constraints }}</p>
              </div>

              <div class="field">
                <label class="field-label" for="notes">
                  <span>补充说明</span>
                  <span class="count">{{ form.extraNotes.length }}/500</span>
                </label>
                <textarea
                  id="notes"
                  v-model="form.extraNotes"
                  class="textarea"
                  :class="{ 'is-invalid': errors.extraNotes }"
                  maxlength="500"
                  rows="4"
                  placeholder="例如：希望安排一次抽奖互动；需要为嘉宾准备伴手礼"
                />
                <p v-if="errors.extraNotes" class="field-error">{{ errors.extraNotes }}</p>
              </div>
            </div>
          </div>
        </section>

        <footer class="sheet-foot">
          <p>提交后将创建生成任务，返回 202 即表示进入队列。</p>
          <button type="submit" class="btn btn--primary btn--lg" :disabled="submitting">
            <span>{{ submitting ? "正在提交…" : "开始生成" }}</span>
            <AppIcon v-if="!submitting" name="arrow-right" :size="16" class="arrow" />
          </button>
        </footer>
      </form>

      <aside class="aside">
        <div class="aside-card">
          <MikuMark class="aside-mark" :size="58" />
          <p class="kicker kicker--plain"><span class="idx">03</span><span>REVIEW · 核对</span></p>

          <div class="per-person">
            <span class="pp-label">人均预算</span>
            <span class="pp-value tabular">{{ formatMoney(perPerson) }}</span>
            <span class="pp-note">按 {{ form.participants || "—" }} 人估算，实际以预算明细为准</span>
          </div>

          <dl class="summary-list">
            <div>
              <dt>活动类型</dt>
              <dd>{{ typeLabel || "待选择" }}</dd>
            </div>
            <div>
              <dt>开始时间</dt>
              <dd>{{ startsLabel }}</dd>
            </div>
            <div>
              <dt>时长</dt>
              <dd>{{ durationLabel }}</dd>
            </div>
            <div>
              <dt>活动地点</dt>
              <dd>{{ form.location.trim() || "待填写" }}</dd>
            </div>
            <div>
              <dt>目标人群</dt>
              <dd>{{ form.targetAudience.trim() || "未填写" }}</dd>
            </div>
            <div>
              <dt>方案基调</dt>
              <dd>{{ toneLabel }}</dd>
            </div>
          </dl>

          <p v-if="submitError" class="submit-error">{{ submitError }}</p>

          <div class="aside-actions">
            <button type="submit" form="create-form" class="btn btn--primary btn--lg btn--block" :disabled="submitting">
              <span>{{ submitting ? "正在提交…" : "开始生成" }}</span>
              <AppIcon v-if="!submitting" name="arrow-right" :size="16" class="arrow" />
            </button>
            <RouterLink to="/" class="btn btn--quiet btn--block">取消并返回</RouterLink>
          </div>

          <p class="aside-note">生成约需 3 秒；离开进度页也不会中断任务，可稍后在方案档案中查看。</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--rule);
}

.page-title {
  margin-top: 16px;
}

.page-sub {
  margin-top: 10px;
  color: var(--muted);
  font-size: 12.5px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding-bottom: 4px;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
  transition: color 0.16s var(--ease);
}

.back-link:hover {
  color: var(--ink);
}

.create-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 312px;
  gap: clamp(32px, 5vw, 76px);
  align-items: start;
  padding-top: 34px;
}

.sheet {
  min-width: 0;
}

.block {
  padding-bottom: 34px;
  margin-bottom: 34px;
  border-bottom: 1px solid var(--rule);
}

.block:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.block-head {
  display: flex;
  gap: 15px;
  margin-bottom: 26px;
}

.block-no {
  padding-top: 3px;
  font-family: var(--font-serif);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.block-head h2 {
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.block-head p {
  margin-top: 5px;
  font-size: 12px;
  color: var(--faint);
}

.block-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.type-option {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
  padding: 14px 12px 12px;
  border: 1px solid var(--rule);
  background: rgba(253, 251, 246, 0.5);
  text-align: left;
  transition: all 0.16s var(--ease);
}

.type-option:hover {
  border-color: var(--rule-strong);
  background: var(--paper-0);
}

.type-option.is-selected {
  border-color: var(--ink);
  background: var(--paper-0);
}

.type-option.is-selected::after {
  content: "";
  position: absolute;
  top: -1px;
  right: -1px;
  width: 7px;
  height: 7px;
  background: var(--accent);
}

.type-label {
  font-family: var(--font-serif);
  font-size: 14px;
  color: var(--ink);
}

.type-en {
  font-size: 7.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
  line-height: 1.4;
}

.tone-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.tone-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid var(--rule);
  background: rgba(253, 251, 246, 0.5);
  text-align: left;
  transition: all 0.16s var(--ease);
}

.tone-option:hover {
  border-color: var(--rule-strong);
  background: var(--paper-0);
}

.tone-option.is-selected {
  border-color: var(--ink);
  background: var(--paper-0);
}

.tone-mark {
  width: 9px;
  height: 9px;
  margin-top: 4px;
  flex: none;
  border: 1px solid var(--rule-strong);
  border-radius: 50%;
  transition: all 0.16s var(--ease);
}

.tone-option.is-selected .tone-mark {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: inset 0 0 0 2px var(--paper-0);
}

.tone-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tone-text strong {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.tone-text small {
  font-size: 10.5px;
  color: var(--faint);
}

.affix {
  position: relative;
}

.input--affix {
  padding-right: 52px;
}

.affix-suffix {
  position: absolute;
  top: 50%;
  right: 13px;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--faint);
  pointer-events: none;
}

.affix--prefix .input--affix.is-prefixed {
  padding-left: 30px;
  padding-right: 13px;
}

.affix-prefix {
  position: absolute;
  top: 50%;
  left: 13px;
  transform: translateY(-50%);
  font-family: var(--font-serif);
  font-size: 13px;
  color: var(--muted);
  pointer-events: none;
}

.field :deep(.el-date-editor) {
  width: 100%;
}

.field :deep(.el-date-editor.is-invalid .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--danger) inset;
}

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goal-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.goal-no {
  width: 20px;
  flex: none;
  font-family: var(--font-serif);
  font-size: 10.5px;
  color: var(--faint);
}

.goal-remove {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  color: var(--faint);
  transition: color 0.16s var(--ease);
}

.goal-remove:hover {
  color: var(--danger);
}

.goal-foot {
  display: flex;
  align-items: center;
  gap: 16px;
}

.add-goal {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 11.5px;
  color: var(--accent);
  transition: color 0.16s var(--ease);
}

.add-goal:hover {
  color: var(--accent-deep);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.sheet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 6px;
}

.sheet-foot p {
  font-size: 11px;
  color: var(--faint);
}

.aside {
  position: sticky;
  top: 36px;
}

.aside-card {
  padding: 24px 22px 22px;
  border: 1px solid var(--rule);
  background: var(--paper-0);
}

.per-person {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--rule);
}

.pp-label {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--faint);
}

.pp-value {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
}

.pp-note {
  font-size: 10px;
  color: var(--faint);
  line-height: 1.6;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 6px 0 20px;
}

.summary-list > div {
  display: flex;
  gap: 14px;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px dotted var(--rule);
}

.summary-list > div:last-child {
  border-bottom: none;
}

.summary-list dt {
  flex: none;
  font-size: 11.5px;
  color: var(--faint);
}

.summary-list dd {
  margin: 0;
  font-size: 11.5px;
  color: var(--ink-soft);
  text-align: right;
  line-height: 1.6;
  word-break: break-word;
}

.submit-error {
  margin-bottom: 14px;
  padding: 9px 11px;
  border-left: 2px solid var(--danger);
  background: rgba(163, 49, 31, 0.06);
  color: var(--danger);
  font-size: 11.5px;
  line-height: 1.65;
}

.aside-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.aside-note {
  margin-top: 16px;
  font-size: 10px;
  line-height: 1.75;
  color: var(--faint);
}

@media (max-width: 1080px) {
  .create-layout {
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 34px;
  }
}

@media (max-width: 1180px) {
  .create-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .aside {
    position: static;
  }

  .aside-actions {
    display: none;
  }
}

@media (max-width: 960px) {
  .aside-card {
    padding: 20px;
  }

  .aside-actions {
    display: none;
  }

  .summary-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 18px;
  }

  .pp-value {
    font-size: 26px;
  }

  .sheet-foot {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 12px;
  }

  .sheet-foot p {
    text-align: center;
  }
}

@media (max-width: 720px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tone-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .summary-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .block-head {
    gap: 10px;
  }
}
/* —— 草莓牛奶主题覆盖 —— */
.page-head {
  border-bottom: 2px dashed var(--rule-strong);
}

.back-link {
  color: var(--accent-deep);
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.block {
  padding: 26px 28px 24px;
  margin-bottom: 0;
  border: 1.5px solid var(--rule);
  border-radius: 24px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
}

.block:last-of-type {
  margin-bottom: 0;
  border: 1.5px solid var(--rule);
}

.block-head {
  gap: 12px;
  margin-bottom: 22px;
}

.block-no {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-family: var(--font-sans);
  font-size: 9.5px;
  letter-spacing: 0;
}

.block-head h2 {
  font-size: 20px;
  font-weight: 400;
}

.block-head p {
  color: var(--muted);
}

.type-grid {
  gap: 10px;
}

.type-option {
  gap: 4px;
  padding: 14px 13px 12px;
  border: 1.5px solid var(--rule);
  border-radius: 16px;
  background: #fff;
}

.type-option:hover {
  border-color: var(--rule-strong);
  background: var(--pink-soft);
  transform: translateY(-1px);
}

.type-option.is-selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 5px 12px rgba(234, 92, 139, 0.14);
}

.type-option.is-selected::after {
  content: "♥";
  top: 9px;
  right: 9px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 9px;
  line-height: 1;
}

.type-label {
  font-size: 14.5px;
  color: var(--ink);
}

.type-en {
  color: var(--muted);
}

.tone-grid {
  gap: 10px;
}

.tone-option {
  padding: 13px 15px;
  border: 1.5px solid var(--rule);
  border-radius: 16px;
  background: #fff;
}

.tone-option:hover {
  border-color: var(--rule-strong);
  background: var(--pink-soft);
}

.tone-option.is-selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.tone-mark {
  width: 10px;
  height: 10px;
  border-color: var(--rule-strong);
}

.tone-option.is-selected .tone-mark {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: inset 0 0 0 2px #fff;
}

.tone-text small {
  color: var(--muted);
}

.goal-list {
  gap: 9px;
}

.goal-no {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  background: var(--pink-soft);
  font-family: var(--font-sans);
  font-size: 8.5px;
  color: var(--accent-deep);
}

.goal-remove {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.goal-remove:hover {
  color: var(--accent-deep);
  background: var(--pink-soft);
}

.add-goal {
  color: var(--accent-deep);
}

.sheet-foot {
  padding: 4px 2px 0;
  border-top: none;
}

@media (min-width: 1181px) {
  .sheet-foot .btn {
    display: none;
  }
}

.sheet-foot p {
  color: var(--muted);
}

.aside {
  position: sticky;
  top: 36px;
}

.aside-card {
  position: relative;
  padding: 26px 22px 22px;
  border: 2px solid #fff;
  border-radius: 26px;
  background: var(--paper-0);
  box-shadow: var(--shadow-card);
}

.aside-kitty {
  position: absolute;
  top: -26px;
  right: 14px;
  width: 78px;
  height: auto;
  transform: rotate(5deg);
  filter: drop-shadow(0 7px 10px rgba(201, 84, 122, 0.15));
  pointer-events: none;
}

.per-person {
  margin-top: 16px;
  padding: 16px 16px 14px;
  border: 1px dashed var(--rule-strong);
  border-radius: 18px;
  background: var(--pink-soft);
}

.pp-value {
  font-size: 32px;
  color: var(--accent-deep);
}

.pp-note {
  color: var(--muted);
}

.summary-list {
  margin: 8px 0 18px;
}

.summary-list > div {
  padding: 9px 0;
  border-bottom: 1px dashed var(--rule);
}

.summary-list dt {
  color: var(--muted);
}

.summary-list dd {
  color: var(--ink-soft);
}

.submit-error {
  border: 1px solid #f2c3cc;
  border-left: 1px solid #f2c3cc;
  border-radius: 12px;
  background: #fff2f4;
}

.aside-note {
  color: var(--muted);
}

@media (max-width: 1180px) {
  .aside {
    margin-top: 8px;
  }

  .aside-card {
    max-width: 680px;
  }
}

@media (max-width: 960px) {
  .block {
    padding: 22px 18px;
    border-radius: 20px;
  }

  .aside-kitty {
    width: 64px;
    top: -22px;
  }
}
/* ==================== 初音未来 · 电子舞台 ==================== */
.page-head {
  border-bottom: 1px solid var(--rule-strong);
}

.page-sub {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 10px;
}

.back-link {
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
}

.block {
  padding: 24px 26px 22px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background:
    linear-gradient(135deg, rgba(57, 197, 187, 0.05), transparent 46%),
    rgba(7, 27, 35, 0.86);
  box-shadow: none;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
}

.block:last-of-type {
  border: 1px solid var(--rule);
}

.block-head {
  gap: 12px;
  margin-bottom: 20px;
}

.block-no {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: var(--accent-soft);
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 9px;
}

.block-head h2 {
  font-family: var(--font-sans);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--ink);
}

.block-head p {
  color: var(--muted);
  font-size: 11px;
}

.field-label {
  color: var(--ink-soft);
}

.field-help {
  color: var(--faint);
}

.type-grid {
  gap: 8px;
}

.type-option {
  padding: 13px 12px 11px;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: rgba(4, 15, 21, 0.6);
}

.type-option:hover {
  border-color: var(--rule-strong);
  background: rgba(57, 197, 187, 0.08);
  transform: none;
}

.type-option.is-selected {
  border-color: var(--accent);
  background: linear-gradient(145deg, rgba(57, 197, 187, 0.18), rgba(57, 197, 187, 0.04));
  box-shadow: 0 0 18px rgba(57, 197, 187, 0.14);
}

.type-option.is-selected::after {
  content: "✓";
  top: 7px;
  right: 7px;
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 1px;
  background: var(--accent);
  color: #03151a;
  font-size: 9px;
  line-height: 1;
}

.type-label {
  font-size: 13.5px;
  color: var(--ink);
}

.type-en {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.1em;
}

.tone-grid {
  gap: 8px;
}

.tone-option {
  padding: 12px 14px;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: rgba(4, 15, 21, 0.6);
}

.tone-option:hover {
  border-color: var(--rule-strong);
  background: rgba(57, 197, 187, 0.07);
}

.tone-option.is-selected {
  border-color: var(--accent);
  background: rgba(57, 197, 187, 0.12);
}

.tone-mark {
  width: 9px;
  height: 9px;
  border-color: var(--rule-strong);
  border-radius: 1px;
}

.tone-option.is-selected .tone-mark {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: 0 0 8px rgba(57, 197, 187, 0.5);
}

.tone-text strong {
  color: var(--ink);
  font-size: 12.5px;
}

.tone-text small {
  color: var(--muted);
}

.goal-list {
  gap: 8px;
}

.goal-no {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: transparent;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8px;
}

.goal-remove {
  color: var(--faint);
}

.goal-remove:hover {
  color: var(--danger);
  background: transparent;
}

.add-goal {
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 10px;
}

.sheet-foot p {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
}

.aside {
  top: 28px;
}

.aside-card {
  padding: 24px 22px 20px;
  border: 1px solid var(--rule-strong);
  border-radius: 4px;
  background:
    linear-gradient(150deg, rgba(57, 197, 187, 0.09), transparent 46%),
    var(--paper-0);
  box-shadow: var(--shadow-card);
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
}

.aside-mark {
  position: absolute;
  top: 16px;
  right: 16px;
  color: var(--accent);
  opacity: 0.55;
}

.per-person {
  margin-top: 14px;
  padding: 14px 15px 12px;
  border: 1px solid var(--rule);
  border-left: 2px solid var(--accent);
  border-radius: 2px;
  background: rgba(57, 197, 187, 0.06);
}

.pp-label {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
}

.pp-value {
  font-family: "Bahnschrift", var(--font-sans);
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--cyan);
  text-shadow: 0 0 20px rgba(57, 197, 187, 0.28);
}

.pp-note {
  color: var(--faint);
  font-size: 9.5px;
}

.summary-list {
  margin: 6px 0 16px;
}

.summary-list > div {
  padding: 8px 0;
  border-bottom: 1px solid var(--rule-soft);
}

.summary-list dt {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
}

.summary-list dd {
  color: var(--ink-soft);
  font-size: 11px;
}

.submit-error {
  border: 1px solid rgba(255, 92, 122, 0.32);
  border-left: 2px solid var(--danger);
  border-radius: 2px;
  background: rgba(255, 92, 122, 0.08);
  color: #ff9aae;
}

.aside-note {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

@media (max-width: 1180px) {
  .aside-card {
    max-width: 680px;
  }
}

@media (max-width: 960px) {
  .block {
    padding: 20px 18px;
    border-radius: 3px;
  }

  .aside-mark {
    width: 44px;
    height: 44px;
    top: 12px;
    right: 12px;
  }
}
</style>
