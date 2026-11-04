<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from "vue";
import { RouterLink, onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { exportPlanMarkdown, getPlan, updateSection } from "@/api/plans";
import { getBlobErrorMessage, getErrorMessage, isNotReady, isVersionConflict } from "@/api/errors";
import type { EditableSectionKey, PlanDetail, PlanStatus } from "@/api/types";
import { activityLabel } from "@/constants/activity";
import { PLAN_STATUS_META } from "@/constants/plan";
import { formatDateTime, formatDuration, formatInteger, formatMoney, formatRelative } from "@/utils/format";
import { normalizeSection } from "@/utils/sectionDraft";
import { downloadBlob, parseFilename } from "@/utils/download";
import { readTaskId, stashCreateDraft } from "@/utils/session";
import StatusMark from "@/components/StatusMark.vue";
import AppIcon from "@/components/AppIcon.vue";
import OverviewSection from "@/components/detail/OverviewSection.vue";
import PhasesSection from "@/components/detail/PhasesSection.vue";
import RundownSection from "@/components/detail/RundownSection.vue";
import BudgetSection from "@/components/detail/BudgetSection.vue";
import MaterialsSection from "@/components/detail/MaterialsSection.vue";
import TasksSection from "@/components/detail/TasksSection.vue";
import PromotionSection from "@/components/detail/PromotionSection.vue";
import RisksSection from "@/components/detail/RisksSection.vue";
import ReviewSection from "@/components/detail/ReviewSection.vue";
import WarningsSection from "@/components/detail/WarningsSection.vue";

type SectionKey =
  | "overview"
  | "phases"
  | "rundown"
  | "budget"
  | "materials"
  | "tasks"
  | "promotion"
  | "risks"
  | "review"
  | "warnings";

interface SectionMeta {
  key: SectionKey;
  no: string;
  en: string;
  label: string;
  desc: string;
  editKey: EditableSectionKey | null;
  component: Component;
}

const SECTIONS: SectionMeta[] = [
  {
    key: "overview",
    no: "01",
    en: "OVERVIEW",
    label: "活动概览",
    desc: "一页看清这场活动的背景、目标与成功标准。",
    editKey: "plan",
    component: OverviewSection,
  },
  {
    key: "phases",
    no: "02",
    en: "PREPARATION",
    label: "筹备阶段",
    desc: "从立项到现场，按阶段拆开筹备动作。",
    editKey: null,
    component: PhasesSection,
  },
  {
    key: "rundown",
    no: "03",
    en: "RUNDOWN",
    label: "当晚流程",
    desc: "活动当天的环节、时间与责任人。",
    editKey: null,
    component: RundownSection,
  },
  {
    key: "budget",
    no: "04",
    en: "BUDGET",
    label: "预算",
    desc: "明细、预备金与经费来源；保存后由服务端重算金额。",
    editKey: "plan",
    component: BudgetSection,
  },
  {
    key: "materials",
    no: "05",
    en: "MATERIALS",
    label: "物资",
    desc: "需要采购、借调与提前到位的清单。",
    editKey: "materials",
    component: MaterialsSection,
  },
  {
    key: "tasks",
    no: "06",
    en: "CREW",
    label: "分工",
    desc: "按筹备阶段拆分的任务、责任人与验收标准。",
    editKey: "tasks",
    component: TasksSection,
  },
  {
    key: "promotion",
    no: "07",
    en: "PROMOTION",
    label: "宣传",
    desc: "口号、核心信息、朋友圈文案与渠道安排。",
    editKey: "promotion",
    component: PromotionSection,
  },
  {
    key: "risks",
    no: "08",
    en: "RISKS",
    label: "风险",
    desc: "可能出问题的环节，以及缓解与应急方案。",
    editKey: "risks",
    component: RisksSection,
  },
  {
    key: "review",
    no: "09",
    en: "REVIEW",
    label: "复盘",
    desc: "成效指标、复盘问题与可直接套用的模板。",
    editKey: "review",
    component: ReviewSection,
  },
  {
    key: "warnings",
    no: "10",
    en: "NOTES",
    label: "警告与假设",
    desc: "生成时留下的提醒与前提假设。",
    editKey: null,
    component: WarningsSection,
  },
];

const route = useRoute();
const router = useRouter();
const planId = computed(() => String(route.params.id ?? ""));

const plan = ref<PlanDetail | null>(null);
const loading = ref(true);
const fatalError = ref("");
const activeSection = ref<SectionKey>("overview");
const editKey = ref<EditableSectionKey | null>(null);
const draft = ref<unknown>(null);
const saving = ref(false);
const exporting = ref(false);
const saveError = ref("");

const currentSection = computed<SectionMeta>(() => {
  return SECTIONS.find((section) => section.key === activeSection.value) ?? SECTIONS[0]!;
});

const editing = computed(() => editKey.value !== null);

const sectionData = computed<unknown>(() => {
  const content = plan.value?.content;
  if (!content) return null;
  switch (activeSection.value) {
    case "overview":
    case "phases":
    case "rundown":
    case "budget":
      return content.plan;
    case "materials":
      return content.materials;
    case "tasks":
      return content.tasks;
    case "promotion":
      return content.promotion;
    case "risks":
      return content.risks;
    case "review":
      return content.review;
    case "warnings":
      return content;
    default:
      return null;
  }
});

const draftForView = computed(() => draft.value ?? sectionData.value);

const dirty = computed(() => {
  if (!editKey.value || !plan.value?.content) return false;
  const original = (plan.value.content as unknown as Record<string, unknown>)[editKey.value];
  try {
    return JSON.stringify(draft.value) !== JSON.stringify(original);
  } catch {
    return true;
  }
});

const statusMeta = computed(() => {
  const status = (plan.value?.status ?? "draft") as PlanStatus;
  return PLAN_STATUS_META[status] ?? { label: status, tone: "muted" as const };
});

const durationMinutes = computed(() => {
  return plan.value?.input?.duration_minutes ?? plan.value?.content?.meta?.duration_minutes ?? 0;
});

const warningsCount = computed(() => plan.value?.content?.warnings?.length ?? 0);
const hasTask = computed(() => (plan.value ? Boolean(readTaskId(plan.value.id)) : false));

function navCount(key: SectionKey): string {
  const content = plan.value?.content;
  if (!content) return "";
  switch (key) {
    case "phases":
      return String(content.plan?.phases?.length ?? 0);
    case "rundown":
      return String(content.plan?.rundown?.length ?? 0);
    case "budget":
      return String(content.plan?.budget?.items?.length ?? 0);
    case "materials":
      return String(content.materials?.items?.length ?? 0);
    case "tasks":
      return String(content.tasks?.items?.length ?? 0);
    case "promotion":
      return String(content.promotion?.channels?.length ?? 0);
    case "risks":
      return String(content.risks?.items?.length ?? 0);
    case "review":
      return String(content.review?.checklist?.length ?? 0);
    case "warnings":
      return String(content.warnings?.length ?? 0);
    default:
      return "";
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resetEdit() {
  editKey.value = null;
  draft.value = null;
  saveError.value = "";
}

async function loadPlan(silent = false) {
  if (!silent) loading.value = true;
  fatalError.value = "";
  try {
    const data = await getPlan(planId.value);
    plan.value = data;
    document.title = `${data.title} · 活动智囊`;
  } catch (error) {
    fatalError.value = getErrorMessage(error);
    if (!silent) plan.value = null;
  } finally {
    if (!silent) loading.value = false;
  }
}

function startEdit() {
  const key = currentSection.value.editKey;
  if (!key || !plan.value?.content) return;
  editKey.value = key;
  draft.value = clone((plan.value.content as unknown as Record<string, unknown>)[key]);
  saveError.value = "";
}

async function cancelEdit() {
  if (dirty.value) {
    try {
      await ElMessageBox.confirm("放弃本节未保存的修改？", "放弃修改", {
        confirmButtonText: "放弃修改",
        cancelButtonText: "继续编辑",
        customClass: "paper-dialog",
      });
    } catch {
      return;
    }
  }
  resetEdit();
}

async function selectSection(key: SectionKey) {
  if (key === activeSection.value) return;

  if (editKey.value && dirty.value) {
    try {
      await ElMessageBox.confirm("当前节有未保存的修改，切换后将丢失。", "切换章节", {
        confirmButtonText: "放弃并切换",
        cancelButtonText: "继续编辑",
        customClass: "paper-dialog",
      });
    } catch {
      return;
    }
  }

  resetEdit();
  activeSection.value = key;
}

async function saveSection() {
  if (!editKey.value || !plan.value || saving.value) return;

  const key = editKey.value;
  const sectionInstance = SECTIONS.find((section) => section.editKey === key && section.key === activeSection.value);
  const label = sectionInstance?.label ?? "本节";

  saving.value = true;
  saveError.value = "";
  try {
    const payload = normalizeSection(key, draft.value);
    const response = await updateSection(plan.value.id, key, payload, plan.value.version);
    plan.value.version = response.version;
    plan.value.updated_at = response.updated_at;
    (plan.value.content as unknown as Record<string, unknown>)[key] = response.data;
    if (key === "plan") {
      const summary = (response.data as { summary?: string }).summary;
      if (typeof summary === "string") plan.value.summary = summary;
    }
    resetEdit();
    ElMessage({ message: `${label}已保存 · 版本 v${response.version}`, type: "success" });
  } catch (error) {
    if (isVersionConflict(error)) {
      const detail = (error as { response?: { data?: { detail?: { current_version?: number } } } }).response?.data
        ?.detail;
      editKey.value = null;
      draft.value = null;
      try {
        await ElMessageBox.alert(
          `方案已在其他页面被修改，当前版本为 v${detail?.current_version ?? "未知"}。将为你载入最新内容。`,
          "版本冲突",
          { confirmButtonText: "载入最新版本", customClass: "paper-dialog", showClose: false },
        );
      } catch {
        /* 忽略关闭 */
      }
      await loadPlan(true);
    } else if (isNotReady(error)) {
      saveError.value = "方案尚未生成完成，暂时不能保存。";
      ElMessage({ message: saveError.value, type: "error" });
    } else {
      saveError.value = getErrorMessage(error);
      ElMessage({ message: saveError.value, type: "error" });
    }
  } finally {
    saving.value = false;
  }
}

async function downloadMarkdown() {
  if (!plan.value || exporting.value) return;
  exporting.value = true;
  try {
    const response = await exportPlanMarkdown(plan.value.id);
    const disposition = response.headers["content-disposition"] as string | undefined;
    const filename = parseFilename(disposition) ?? `${plan.value.title || "活动方案"}.md`;
    downloadBlob(response.data, filename);
    ElMessage({ message: "Markdown 已开始下载", type: "success" });
  } catch (error) {
    ElMessage({ message: await getBlobErrorMessage(error), type: "error" });
  } finally {
    exporting.value = false;
  }
}

function openPrint() {
  if (!plan.value) return;
  const target = router.resolve({ name: "plan-print", params: { id: plan.value.id } });
  const opened = window.open(target.href, "_blank");
  if (!opened) window.location.assign(target.href);
}

function goGenerating() {
  if (!plan.value) return;
  void router.push({ name: "plan-generating", params: { id: plan.value.id } });
}

function retryWithInput() {
  if (plan.value?.input) stashCreateDraft(plan.value.input);
  void router.push({ name: "plan-new" });
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}

watch(planId, () => {
  resetEdit();
  activeSection.value = "overview";
  plan.value = null;
  void loadPlan();
});

onMounted(() => {
  window.scrollTo({ top: 0 });
  window.addEventListener("beforeunload", handleBeforeUnload);
  void loadPlan();
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm("离开后，本节未保存的修改将丢失。", "离开方案？", {
      confirmButtonText: "离开",
      cancelButtonText: "留在本页",
      customClass: "paper-dialog",
    });
    return true;
  } catch {
    return false;
  }
});
</script>

<template>
  <section class="detail">
    <div class="crumbs">
      <RouterLink to="/" class="crumb-link">方案档案</RouterLink>
      <span class="crumb-sep">/</span>
      <span class="crumb-current">{{ plan?.title ?? "方案详情" }}</span>
    </div>

    <div v-if="loading" class="detail-skeleton" aria-busy="true">
      <div class="skeleton-line" style="width: 120px; height: 10px" />
      <div class="skeleton-line" style="width: 56%; height: 38px; margin-top: 22px" />
      <div class="skeleton-line" style="width: 38%; height: 14px; margin-top: 16px" />
      <div class="skeleton-line" style="width: 100%; height: 72px; margin-top: 30px" />
    </div>

    <div v-else-if="fatalError" class="content-state">
      <p class="kicker"><span class="idx">!</span><span>ERROR</span></p>
      <h1 class="state-title">这份方案打不开</h1>
      <p class="state-text">{{ fatalError }}</p>
      <div class="state-actions">
        <button type="button" class="btn" @click="loadPlan()">
          <AppIcon name="refresh" :size="15" />
          <span>重新读取</span>
        </button>
        <RouterLink to="/" class="btn btn--quiet">返回方案档案</RouterLink>
      </div>
    </div>

    <template v-else-if="plan">
      <header class="dossier-head">
        <div class="dossier-top">
          <p class="kicker"><span class="idx">04</span><span>DOSSIER · 方案详情</span></p>
          <div class="head-tools">
            <span class="version">v{{ plan.version }}</span>
            <StatusMark :label="statusMeta.label" :tone="statusMeta.tone" />
            <span class="tool-divider" aria-hidden="true" />
            <button type="button" class="btn btn--sm" :disabled="exporting" @click="downloadMarkdown">
              <AppIcon name="download" :size="14" />
              <span>{{ exporting ? "导出中…" : "Markdown" }}</span>
            </button>
            <button type="button" class="btn btn--sm" @click="openPrint">
              <AppIcon name="printer" :size="14" />
              <span>打印</span>
            </button>
          </div>
        </div>

        <h1 class="plan-title">{{ plan.title }}</h1>
        <p v-if="plan.summary" class="plan-lede">{{ plan.summary }}</p>

        <dl class="meta-strip">
          <div>
            <dt>活动类型</dt>
            <dd>{{ activityLabel(plan.activity_type) }}</dd>
          </div>
          <div>
            <dt>开始时间</dt>
            <dd>{{ formatDateTime(plan.starts_at) }}</dd>
          </div>
          <div>
            <dt>时长</dt>
            <dd>{{ formatDuration(durationMinutes) }}</dd>
          </div>
          <div>
            <dt>地点</dt>
            <dd>{{ plan.location }}</dd>
          </div>
          <div>
            <dt>规模</dt>
            <dd>{{ formatInteger(plan.participants) }} 人</dd>
          </div>
          <div>
            <dt>预算</dt>
            <dd>{{ formatMoney(plan.budget_yuan) }}</dd>
          </div>
        </dl>

        <div v-if="plan.degraded" class="degraded-note">
          <AppIcon name="info" :size="14" />
          <span>本次生成使用了降级策略，部分内容可能为占位或简化版本，请在保存前核对。</span>
        </div>
      </header>

      <div v-if="plan.content" class="workspace">
        <nav class="section-nav" aria-label="方案章节">
          <p class="nav-label">SECTIONS · 章节</p>
          <button
            v-for="section in SECTIONS"
            :key="section.key"
            type="button"
            class="nav-item"
            :class="{
              'is-active': activeSection === section.key,
              'has-alert': section.key === 'warnings' && warningsCount > 0,
            }"
            @click="selectSection(section.key)"
          >
            <span class="nav-no">{{ section.no }}</span>
            <span class="nav-text">{{ section.label }}</span>
            <span v-if="navCount(section.key)" class="nav-count">{{ navCount(section.key) }}</span>
          </button>

          <div class="nav-foot">
            <p>最后更新</p>
            <span>{{ formatRelative(plan.updated_at) }}</span>
          </div>
        </nav>

        <div class="panel">
          <header class="panel-head">
            <div class="panel-title-wrap">
              <p class="kicker"><span class="idx">{{ currentSection.no }}</span><span>{{ currentSection.en }}</span></p>
              <h2 class="panel-title">{{ currentSection.label }}</h2>
              <p class="panel-desc">{{ currentSection.desc }}</p>
            </div>

            <div v-if="currentSection.editKey" class="panel-actions">
              <template v-if="!editing">
                <button type="button" class="btn btn--sm" @click="startEdit">
                  <AppIcon name="edit" :size="13" />
                  <span>编辑本节</span>
                </button>
              </template>
              <template v-else>
                <span class="dirty-flag" :class="{ 'is-dirty': dirty }">{{ dirty ? "有未保存的修改" : "尚未修改" }}</span>
                <button type="button" class="btn btn--sm" :disabled="saving" @click="cancelEdit">取消</button>
                <button
                  type="button"
                  class="btn btn--sm btn--primary"
                  :disabled="saving || !dirty"
                  @click="saveSection"
                >
                  {{ saving ? "保存中…" : "保存本节" }}
                </button>
              </template>
            </div>
          </header>

          <p v-if="saveError" class="save-error">{{ saveError }}</p>

          <div v-if="sectionData" class="panel-body">
            <component
              :is="currentSection.component"
              :data="sectionData"
              :draft="draftForView"
              :editing="editing"
            />
          </div>

          <p v-if="editing" class="edit-hint">
            编辑内容会以整节替换的方式提交；保存成功后版本号会自增，请勿在其它页面同时编辑。
          </p>
        </div>
      </div>

      <div v-else class="content-state">
        <p class="kicker"><span class="idx">·</span><span>NO CONTENT</span></p>
        <h2 class="state-title">
          {{ plan.status === "generating" ? "方案正在生成中" : plan.status === "failed" ? "这次生成没有完成" : "方案内容为空" }}
        </h2>
        <p class="state-text">
          <template v-if="plan.status === 'generating'">生成任务仍在进行，稍后刷新即可查看完整方案。</template>
          <template v-else-if="plan.status === 'failed'">可以重新填写活动信息再生成一份新方案。</template>
          <template v-else>当前方案还没有写入内容，请重新生成或稍后刷新。</template>
        </p>
        <div class="state-actions">
          <button v-if="plan.status === 'generating' && hasTask" type="button" class="btn btn--primary" @click="goGenerating">
            查看生成进度
          </button>
          <button v-if="plan.status === 'generating'" type="button" class="btn" @click="loadPlan()">
            <AppIcon name="refresh" :size="15" />
            <span>刷新方案</span>
          </button>
          <button v-if="plan.status === 'failed'" type="button" class="btn btn--primary" @click="retryWithInput">
            重新填写并生成
          </button>
          <RouterLink to="/" class="btn btn--quiet">返回方案档案</RouterLink>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.detail {
  padding-top: 4px;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  color: var(--faint);
  letter-spacing: 0.02em;
}

.crumb-link:hover {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.crumb-sep {
  color: var(--rule-strong);
}

.crumb-current {
  max-width: 46ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
}

.dossier-head {
  padding-top: 24px;
}

.dossier-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.head-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version {
  padding: 2px 7px;
  border: 1px solid var(--rule);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--faint);
}

.tool-divider {
  width: 1px;
  height: 16px;
  background: var(--rule);
  margin: 0 2px;
}

.plan-title {
  margin-top: 18px;
  font-family: var(--font-serif);
  font-size: clamp(30px, 3.4vw, 42px);
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  max-width: 26ch;
}

.plan-lede {
  margin-top: 14px;
  max-width: 74ch;
  font-size: 13px;
  line-height: 1.95;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0;
  margin-top: 26px;
  border-top: 1px solid var(--rule-strong);
  border-bottom: 1px solid var(--rule);
}

.meta-strip > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 13px 16px 13px 0;
  border-right: 1px solid var(--rule-soft);
  min-width: 0;
}

.meta-strip > div:not(:first-child) {
  padding-left: 16px;
}

.meta-strip > div:last-child {
  border-right: none;
}

.meta-strip dt {
  font-size: 9px;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.meta-strip dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-soft);
  word-break: break-word;
}

.degraded-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 14px;
  padding: 9px 13px;
  border-left: 2px solid var(--amber);
  background: rgba(138, 97, 29, 0.06);
  font-size: 11.5px;
  color: var(--amber);
}

.workspace {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: clamp(24px, 3.4vw, 44px);
  margin-top: 32px;
  align-items: start;
}

.section-nav {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-label {
  padding: 0 10px 10px;
  font-size: 8.5px;
  letter-spacing: 0.2em;
  color: var(--faint);
}

.nav-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 8px;
  padding: 8px 10px;
  border-left: 2px solid transparent;
  color: var(--muted);
  text-align: left;
  transition: all 0.16s var(--ease);
}

.nav-item:hover {
  color: var(--ink);
  background: rgba(251, 248, 242, 0.7);
}

.nav-item.is-active {
  border-left-color: var(--accent);
  background: var(--paper-0);
  color: var(--ink);
}

.nav-no {
  font-family: var(--font-serif);
  font-size: 9.5px;
  color: var(--faint);
  letter-spacing: 0.02em;
}

.nav-item.is-active .nav-no {
  color: var(--accent);
}

.nav-text {
  font-size: 12px;
  letter-spacing: 0.02em;
}

.nav-count {
  font-family: var(--font-serif);
  font-size: 9.5px;
  color: var(--faint);
}

.has-alert .nav-count {
  color: var(--amber);
}

.nav-foot {
  margin-top: 18px;
  padding: 12px 10px 0;
  border-top: 1px solid var(--rule-soft);
}

.nav-foot p {
  font-size: 8.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.nav-foot span {
  display: block;
  margin-top: 4px;
  font-size: 10.5px;
  color: var(--muted);
}

.panel {
  min-width: 0;
  border: 1px solid var(--rule);
  background: var(--paper-0);
  padding: 26px clamp(18px, 2.6vw, 34px) 30px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--rule);
}

.panel-title {
  margin-top: 10px;
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.panel-desc {
  margin-top: 7px;
  font-size: 11.5px;
  color: var(--faint);
  line-height: 1.7;
}

.panel-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: none;
}

.dirty-flag {
  font-size: 10.5px;
  color: var(--faint);
  margin-right: 2px;
}

.dirty-flag.is-dirty {
  color: var(--amber);
}

.save-error {
  margin-top: 14px;
  padding: 9px 12px;
  border-left: 2px solid var(--danger);
  background: rgba(163, 49, 31, 0.06);
  color: var(--danger);
  font-size: 11.5px;
  line-height: 1.7;
}

.panel-body {
  padding-top: 24px;
}

.edit-hint {
  margin-top: 26px;
  padding-top: 14px;
  border-top: 1px solid var(--rule-soft);
  font-size: 10.5px;
  line-height: 1.8;
  color: var(--faint);
}

.detail-skeleton {
  padding: 34px 0;
}

.content-state {
  margin-top: 26px;
  padding: 52px 24px;
  border-top: 1px solid var(--rule-strong);
  border-bottom: 1px solid var(--rule);
}

.state-title {
  margin-top: 14px;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
}

.state-text {
  margin-top: 10px;
  max-width: 560px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.9;
}

.state-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 1080px) {
  .meta-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .meta-strip > div:nth-child(3n) {
    border-right: none;
  }

  .meta-strip > div:nth-child(-n + 3) {
    border-bottom: 1px solid var(--rule-soft);
  }
}

@media (max-width: 1240px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }

  .section-nav {
    position: static;
    flex-direction: row;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .nav-label,
  .nav-foot {
    display: none;
  }

  .nav-item {
    flex: none;
    border-left: none;
    border: 1px solid var(--rule);
    padding: 7px 11px;
    background: transparent;
  }

  .nav-item.is-active {
    border-color: var(--ink);
    box-shadow: none;
    background: var(--paper-0);
  }

  .nav-item {
    grid-template-columns: auto auto;
  }

  .nav-count {
    display: none;
  }

  .panel {
    padding: 22px 18px 24px;
  }
}

@media (max-width: 760px) {
  .dossier-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .head-tools {
    flex-wrap: wrap;
  }

  .plan-title {
    font-size: 28px;
    max-width: none;
  }

  .meta-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .meta-strip > div:nth-child(3n) {
    border-right: 1px solid var(--rule-soft);
  }

  .meta-strip > div:nth-child(2n) {
    border-right: none;
  }

  .meta-strip > div:nth-child(-n + 4) {
    border-bottom: 1px solid var(--rule-soft);
  }

  .panel-head {
    flex-direction: column;
    gap: 14px;
  }

  .panel-actions {
    width: 100%;
  }

  .panel-actions .btn {
    flex: 1 1 auto;
  }
}
/* —— 草莓牛奶主题覆盖 —— */
.crumbs {
  color: var(--muted);
}

.crumb-link:hover {
  color: var(--accent-deep);
}

.dossier-top .kicker {
  color: var(--muted);
}

.version {
  padding: 3px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-pill);
  background: #fff;
  font-family: var(--font-sans);
  font-size: 9.5px;
  color: var(--accent-deep);
}

.tool-divider {
  background: var(--rule-strong);
}

.plan-title {
  font-weight: 400;
  letter-spacing: 0.03em;
}

.plan-lede {
  color: var(--muted);
}

.meta-strip {
  margin-top: 22px;
  padding: 6px 10px;
  border: 1.5px solid var(--rule);
  border-radius: 20px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
}

.meta-strip > div {
  padding: 10px 14px;
  border-right: 1px dashed var(--rule);
}

.meta-strip > div:not(:first-child) {
  padding-left: 14px;
}

.meta-strip dt {
  color: var(--muted);
}

.meta-strip dd {
  color: var(--ink-soft);
  font-size: 12.5px;
}

.degraded-note {
  border: 1px solid #f1ddba;
  border-left: 1px solid #f1ddba;
  border-radius: 14px;
  background: var(--amber-soft);
}

.workspace {
  margin-top: 26px;
}

.section-nav {
  padding: 12px 10px;
  border: 1.5px solid var(--rule);
  border-radius: 22px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
}

.nav-label {
  color: var(--muted);
}

.nav-item {
  grid-template-columns: 22px minmax(0, 1fr) auto;
  padding: 9px 12px;
  border-left: none;
  border-radius: var(--radius-pill);
  color: var(--ink-soft);
}

.nav-item:hover {
  background: var(--pink-soft);
  color: var(--ink);
}

.nav-item.is-active {
  border-left-color: transparent;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 7px 15px rgba(234, 92, 139, 0.24);
}

.nav-no {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--pink-soft);
  color: var(--accent-deep);
  font-family: var(--font-sans);
  font-size: 8.5px;
  letter-spacing: 0;
}

.nav-item.is-active .nav-no {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.nav-item.is-active .nav-text {
  color: #fff;
}

.nav-count {
  color: var(--muted);
  font-family: var(--font-sans);
  font-size: 9px;
}

.nav-item.is-active .nav-count {
  color: rgba(255, 255, 255, 0.85);
}

.has-alert .nav-count {
  color: var(--amber);
}

.nav-item.is-active.has-alert .nav-count {
  color: #fff3d9;
}

.nav-foot {
  margin-top: 12px;
  padding: 12px 8px 2px;
  border-top: 1px dashed var(--rule-strong);
}

.nav-foot p {
  color: var(--muted);
}

.panel {
  padding: 26px clamp(18px, 2.6vw, 34px) 30px;
  border: 1.5px solid var(--rule);
  border-radius: 26px;
  background: var(--paper-0);
  box-shadow: var(--shadow-card);
}

.panel-head {
  border-bottom: 1px dashed var(--rule-strong);
}

.panel-title {
  font-weight: 400;
}

.panel-desc {
  color: var(--muted);
}

.dirty-flag.is-dirty {
  color: var(--amber);
}

.save-error {
  border: 1px solid #f2c3cc;
  border-left: 1px solid #f2c3cc;
  border-radius: 12px;
  background: #fff2f4;
}

.edit-hint {
  color: var(--muted);
  border-top: 1px dashed var(--rule-soft);
}

.detail-skeleton .skeleton-line {
  background: linear-gradient(90deg, var(--paper-2) 0%, #fff 45%, var(--paper-2) 90%);
}

.content-state {
  margin-top: 20px;
  padding: 40px 26px;
  border: 1.5px dashed var(--rule-strong);
  border-radius: 26px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
}

.state-title {
  font-weight: 400;
}

.state-text {
  color: var(--muted);
}

@media (max-width: 1240px) {
  .section-nav {
    padding: 8px;
    border-radius: 18px;
  }

  .nav-item {
    border: 1.5px solid var(--rule);
    border-radius: var(--radius-pill);
    padding: 7px 12px;
  }

  .nav-item.is-active {
    border-color: var(--accent);
    background: var(--accent);
  }

  .nav-item.is-active .nav-no {
    background: rgba(255, 255, 255, 0.22);
  }

  .nav-count {
    display: none;
  }

  .panel {
    padding: 22px 18px 24px;
    border-radius: 22px;
  }
}

@media (max-width: 760px) {
  .meta-strip {
    padding: 4px 6px;
    border-radius: 16px;
  }

  .meta-strip > div {
    padding: 9px 10px;
  }

  .meta-strip > div:not(:first-child) {
    padding-left: 10px;
  }

  .plan-title {
    font-size: 28px;
  }

  .content-state {
    padding: 28px 18px;
    border-radius: 20px;
  }
}
/* ==================== 初音未来 · 电子舞台 ==================== */
.crumbs {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
}

.crumb-link:hover {
  color: var(--cyan);
}

.version {
  padding: 3px 9px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: rgba(57, 197, 187, 0.06);
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 9px;
}

.tool-divider {
  background: var(--rule-strong);
}

.plan-title {
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.plan-lede {
  color: var(--muted);
  font-size: 12.5px;
}

.meta-strip {
  margin-top: 20px;
  padding: 0;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: rgba(7, 27, 35, 0.68);
  box-shadow: none;
}

.meta-strip > div {
  padding: 11px 14px;
  border-right: 1px solid var(--rule);
}

.meta-strip > div:not(:first-child) {
  padding-left: 14px;
}

.meta-strip dt {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.meta-strip dd {
  color: var(--ink-soft);
  font-size: 11.5px;
}

.degraded-note {
  border: 1px solid rgba(255, 200, 87, 0.3);
  border-left: 2px solid var(--amber);
  border-radius: 2px;
  background: rgba(255, 200, 87, 0.07);
  color: #ffd98a;
}

.workspace {
  margin-top: 22px;
}

.section-nav {
  padding: 8px;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: rgba(7, 27, 35, 0.74);
  box-shadow: none;
}

.nav-label {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
}

.nav-item {
  grid-template-columns: 24px minmax(0, 1fr) auto;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 2px;
  color: var(--muted);
}

.nav-item:hover {
  border-color: var(--rule);
  background: rgba(57, 197, 187, 0.06);
  color: var(--ink);
}

.nav-item.is-active {
  border-color: var(--accent);
  background: linear-gradient(100deg, var(--accent), var(--cyan));
  color: #03151a;
  box-shadow: 0 0 20px rgba(57, 197, 187, 0.18);
}

.nav-no {
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

.nav-item.is-active .nav-no {
  border-color: rgba(3, 21, 26, 0.3);
  background: rgba(3, 21, 26, 0.1);
  color: #03151a;
}

.nav-text {
  color: inherit;
  font-size: 11.5px;
  letter-spacing: 0.04em;
}

.nav-count {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.nav-item.is-active .nav-count {
  color: rgba(3, 21, 26, 0.6);
}

.has-alert .nav-count {
  color: var(--amber);
}

.nav-item.is-active.has-alert .nav-count {
  color: rgba(3, 21, 26, 0.6);
}

.nav-foot {
  border-top: 1px solid var(--rule);
}

.nav-foot p {
  color: var(--faint);
  font-family: var(--font-mono);
}

.nav-foot span {
  color: var(--muted);
  font-size: 9.5px;
}

.panel {
  padding: 24px clamp(18px, 2.6vw, 32px) 28px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background:
    linear-gradient(135deg, rgba(57, 197, 187, 0.04), transparent 44%),
    rgba(7, 27, 35, 0.88);
  box-shadow: var(--shadow-soft);
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
}

.panel-head {
  border-bottom: 1px solid var(--rule);
}

.panel-title {
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.panel-desc {
  color: var(--muted);
  font-size: 10.5px;
}

.dirty-flag {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

.dirty-flag.is-dirty {
  color: var(--amber);
}

.save-error {
  border: 1px solid rgba(255, 92, 122, 0.32);
  border-left: 2px solid var(--danger);
  border-radius: 2px;
  background: rgba(255, 92, 122, 0.08);
  color: #ff9aae;
}

.edit-hint {
  border-top: 1px solid var(--rule);
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

.detail-skeleton .skeleton-line {
  background: linear-gradient(90deg, rgba(57, 197, 187, 0.06) 0%, rgba(110, 247, 234, 0.16) 45%, rgba(57, 197, 187, 0.06) 90%);
}

.content-state {
  margin-top: 18px;
  padding: 34px 24px;
  border: 1px dashed var(--rule-strong);
  border-radius: 4px;
  background: rgba(7, 27, 35, 0.7);
  box-shadow: none;
}

.state-title {
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.state-text {
  color: var(--muted);
}

@media (max-width: 1240px) {
  .section-nav {
    padding: 6px;
    border-radius: 3px;
  }

  .nav-item {
    padding: 7px 10px;
    border: 1px solid var(--rule);
    border-radius: 2px;
  }

  .nav-item.is-active {
    border-color: var(--accent);
    background: var(--accent);
  }

  .nav-item.is-active .nav-no {
    border-color: transparent;
    background: rgba(3, 21, 26, 0.12);
  }

  .panel {
    padding: 20px 16px 22px;
    border-radius: 3px;
    clip-path: none;
  }
}

@media (max-width: 760px) {
  .meta-strip {
    padding: 0;
    border-radius: 3px;
  }

  .meta-strip > div {
    padding: 9px 10px;
  }

  .plan-title {
    font-size: 27px;
  }

  .content-state {
    padding: 26px 16px;
    border-radius: 3px;
  }
}
</style>
