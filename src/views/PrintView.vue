<script setup lang="ts">
import { computed, onMounted, ref, type Component } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { getPlan } from "@/api/plans";
import { getErrorMessage } from "@/api/errors";
import type { PlanDetail } from "@/api/types";
import { activityLabel } from "@/constants/activity";
import { formatDateTime, formatDuration, formatInteger, formatMoney } from "@/utils/format";
import AppIcon from "@/components/AppIcon.vue";
import MikuMark from "@/components/MikuMark.vue";
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

const route = useRoute();
const plan = ref<PlanDetail | null>(null);
const loading = ref(true);
const error = ref("");
const exportingAt = ref("");

const planId = computed(() => String(route.params.id ?? ""));

const blocks = computed<Array<{ no: string; label: string; component: Component; data: unknown }>>(() => {
  const content = plan.value?.content;
  if (!content) return [];
  return [
    { no: "01", label: "活动概览", component: OverviewSection, data: content.plan },
    { no: "02", label: "筹备阶段", component: PhasesSection, data: content.plan },
    { no: "03", label: "当晚流程", component: RundownSection, data: content.plan },
    { no: "04", label: "预算", component: BudgetSection, data: content.plan },
    { no: "05", label: "物资", component: MaterialsSection, data: content.materials },
    { no: "06", label: "分工", component: TasksSection, data: content.tasks },
    { no: "07", label: "宣传", component: PromotionSection, data: content.promotion },
    { no: "08", label: "风险", component: RisksSection, data: content.risks },
    { no: "09", label: "复盘", component: ReviewSection, data: content.review },
    { no: "10", label: "警告与假设", component: WarningsSection, data: content },
  ];
});

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getPlan(planId.value);
    plan.value = data;
    document.title = `${data.title} · 打印预览`;
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function printDocument() {
  window.print();
}

onMounted(() => {
  exportingAt.value = formatDateTime(new Date().toISOString());
  void load();
});
</script>

<template>
  <div class="print-page">
    <header class="print-toolbar no-print">
      <div class="toolbar-left">
        <RouterLink :to="{ name: 'plan-detail', params: { id: planId } }" class="back-link">
          <AppIcon name="arrow-left" :size="14" />
          <span>返回方案</span>
        </RouterLink>
        <span class="toolbar-divider" />
        <span class="toolbar-note">打印预览 · 浏览器可另存为 PDF</span>
      </div>

      <div class="toolbar-right">
        <p class="toolbar-hint">当前后端不提供 PDF 导出，请使用浏览器打印。</p>
        <button type="button" class="btn btn--primary btn--sm" @click="printDocument">
          <AppIcon name="printer" :size="14" />
          <span>打印 / 另存为 PDF</span>
        </button>
      </div>
    </header>

    <div v-if="loading" class="print-loading no-print">正在读取方案…</div>
    <div v-else-if="error" class="print-loading no-print">{{ error }}</div>
    <div v-else-if="plan && !plan.content" class="print-loading no-print">方案内容尚未生成完成，暂时无法打印。</div>

    <article v-else-if="plan && plan.content" class="print-document">
      <header class="doc-cover">
        <MikuMark class="doc-mark" :size="74" />
        <p class="doc-kicker">ACTIVITY MIND · 活动智囊</p>
        <h1 class="doc-title">{{ plan.title }}</h1>
        <p v-if="plan.summary" class="doc-lede">{{ plan.summary }}</p>

        <dl class="doc-meta">
          <div>
            <dt>活动类型</dt>
            <dd>{{ activityLabel(plan.activity_type) }}</dd>
          </div>
          <div>
            <dt>开始时间</dt>
            <dd>{{ formatDateTime(plan.starts_at) }}</dd>
          </div>
          <div>
            <dt>活动时长</dt>
            <dd>{{ formatDuration(plan.input?.duration_minutes ?? plan.content?.meta?.duration_minutes ?? 0) }}</dd>
          </div>
          <div>
            <dt>活动地点</dt>
            <dd>{{ plan.location }}</dd>
          </div>
          <div>
            <dt>预计规模</dt>
            <dd>{{ formatInteger(plan.participants) }} 人</dd>
          </div>
          <div>
            <dt>预算</dt>
            <dd>{{ formatMoney(plan.budget_yuan) }}</dd>
          </div>
        </dl>

        <p class="doc-version">方案版本 v{{ plan.version }} · 内容更新于 {{ formatDateTime(plan.updated_at) }}</p>
      </header>

      <section v-for="block in blocks" :key="block.no" class="doc-section">
        <header class="doc-section-head">
          <span class="doc-no">{{ block.no }}</span>
          <h2>{{ block.label }}</h2>
          <span class="doc-rule" aria-hidden="true" />
        </header>
        <component :is="block.component" :data="block.data" :draft="block.data" :editing="false" />
      </section>

      <footer class="doc-foot">
        <span>活动智囊 · {{ plan.title }}</span>
        <span>打印于 {{ exportingAt }}</span>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.print-page {
  min-height: 100vh;
  background: var(--paper-2);
  padding-bottom: 80px;
}

.print-toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px clamp(20px, 5vw, 56px);
  border-bottom: 1px solid var(--rule);
  background: var(--paper-1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--muted);
}

.back-link:hover {
  color: var(--ink);
}

.toolbar-divider {
  width: 1px;
  height: 14px;
  background: var(--rule);
}

.toolbar-note {
  font-size: 11px;
  color: var(--faint);
  letter-spacing: 0.03em;
}

.toolbar-hint {
  font-size: 10.5px;
  color: var(--faint);
}

.print-loading {
  padding: 80px 24px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.print-document {
  width: min(880px, calc(100% - 40px));
  margin: 34px auto 0;
  padding: 56px clamp(28px, 5vw, 64px) 48px;
  border: 1px solid var(--rule);
  background: #fffdf9;
  box-shadow: 0 20px 50px rgba(29, 27, 23, 0.08);
}

.doc-cover {
  padding-bottom: 30px;
  border-bottom: 1px solid var(--rule);
}

.doc-kicker {
  font-size: 8.5px;
  letter-spacing: 0.24em;
  color: var(--accent);
}

.doc-title {
  margin-top: 16px;
  font-family: var(--font-serif);
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 600;
  line-height: 1.32;
  letter-spacing: 0.01em;
}

.doc-lede {
  margin-top: 14px;
  max-width: 70ch;
  font-size: 12.5px;
  line-height: 1.95;
  color: var(--muted);
}

.doc-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 26px;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule-soft);
}

.doc-meta > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px 10px 0;
  min-width: 0;
}

.doc-meta > div:nth-child(3n + 2),
.doc-meta > div:nth-child(3n) {
  padding-left: 14px;
  border-left: 1px solid var(--rule-soft);
}

.doc-meta dt {
  font-size: 8.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.doc-meta dd {
  margin: 0;
  font-size: 11.5px;
  color: var(--ink-soft);
  line-height: 1.6;
}

.doc-version {
  margin-top: 14px;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: var(--faint);
}

.doc-section {
  padding-top: 34px;
}

.doc-section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
}

.doc-no {
  font-family: var(--font-serif);
  font-size: 10px;
  color: var(--accent);
  letter-spacing: 0.06em;
}

.doc-section-head h2 {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.doc-rule {
  flex: 1;
  height: 1px;
  background: var(--rule);
}

.doc-foot {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 44px;
  padding-top: 14px;
  border-top: 1px solid var(--rule);
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--faint);
}

@media (max-width: 760px) {
  .print-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .toolbar-hint {
    display: none;
  }

  .print-document {
    width: 100%;
    margin: 0;
    padding: 26px 18px 32px;
    border: none;
    box-shadow: none;
  }

  .doc-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .doc-meta > div:nth-child(3n + 2),
  .doc-meta > div:nth-child(3n) {
    padding-left: 0;
    border-left: none;
  }

  .doc-meta > div:nth-child(2n) {
    padding-left: 14px;
    border-left: 1px solid var(--rule-soft);
  }
}
/* —— 草莓牛奶主题覆盖 —— */
.print-page {
  background-color: var(--paper-1);
  background-image:
    radial-gradient(900px 600px at 90% -10%, rgba(255, 205, 224, 0.55), transparent 60%),
    radial-gradient(circle at 2px 2px, rgba(234, 92, 139, 0.1) 1.2px, transparent 1.9px);
  background-size: auto, 28px 28px;
  background-attachment: fixed;
}

.print-toolbar {
  border-bottom: 2px dashed var(--rule-strong);
  background-color: var(--paper-2);
  background-image:
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.42) 0 10px, transparent 10px 20px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.42) 0 10px, transparent 10px 20px);
}

.back-link {
  color: var(--accent-deep);
}

.toolbar-divider {
  background: var(--rule-strong);
}

.toolbar-note,
.toolbar-hint {
  color: var(--muted);
}

.print-document {
  position: relative;
  border: 1.5px solid var(--rule);
  border-radius: 26px;
  background: var(--paper-0);
  box-shadow: var(--shadow-card);
}

.doc-cover {
  position: relative;
  padding-bottom: 26px;
  border-bottom: 1px dashed var(--rule-strong);
}

.doc-kitty {
  position: absolute;
  top: -14px;
  right: 0;
  width: 92px;
  height: auto;
  transform: rotate(4deg);
  filter: drop-shadow(0 6px 8px rgba(201, 84, 122, 0.12));
}

.doc-kicker {
  color: var(--accent);
}

.doc-title {
  margin-top: 14px;
  padding-right: 90px;
  font-weight: 400;
  letter-spacing: 0.03em;
}

.doc-lede {
  color: var(--muted);
}

.doc-meta {
  padding: 4px 10px;
  border: 1.5px solid var(--rule);
  border-radius: 18px;
  background: var(--pink-soft);
}

.doc-meta > div {
  padding: 10px 14px;
}

.doc-meta > div:nth-child(3n + 2),
.doc-meta > div:nth-child(3n) {
  border-left: 1px dashed var(--rule);
}

.doc-meta dt {
  color: var(--muted);
}

.doc-version {
  color: var(--muted);
}

.doc-section {
  padding-top: 30px;
}

.doc-no {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: var(--radius-pill);
  background: var(--accent-soft);
  font-family: var(--font-sans);
  font-size: 8.5px;
  color: var(--accent-deep);
}

.doc-section-head h2 {
  font-weight: 400;
}

.doc-rule {
  background: var(--rule);
}

.doc-foot {
  border-top: 1px dashed var(--rule-strong);
  color: var(--muted);
}

@media (max-width: 760px) {
  .print-document {
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .doc-kitty {
    width: 72px;
    top: -8px;
  }

  .doc-title {
    padding-right: 70px;
    font-size: 27px;
  }

  .doc-meta {
    padding: 2px 6px;
  }
}
/* ==================== 初音未来 · 电子舞台 ==================== */
.print-page {
  background-color: #040f15;
  background-image:
    linear-gradient(rgba(57, 197, 187, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(57, 197, 187, 0.05) 1px, transparent 1px);
  background-size: 38px 38px;
}

.print-toolbar {
  border-bottom: 1px solid var(--rule-strong);
  background-color: #040f15;
  background-image: none;
}

.back-link {
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 10px;
}

.toolbar-divider {
  background: var(--rule-strong);
}

.toolbar-note,
.toolbar-hint {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
}

.print-document {
  --ink: #0b1c22;
  --ink-soft: #274247;
  --muted: #5c757b;
  --faint: #7f9498;
  --rule: #d5e6e6;
  --rule-soft: #e9f3f3;
  --rule-strong: #b9d4d4;
  --paper-0: #ffffff;
  --paper-1: #ffffff;
  --paper-2: #f2fbfa;
  --pink-soft: #f2fbfa;
  --accent: #1f9d94;
  --accent-deep: #157a73;
  --accent-soft: #e2f7f5;
  --cyan: #0f8a82;
  --green: #2b8a6e;
  --green-soft: #e4f6f0;
  --amber: #a87520;
  --amber-soft: #fcf1db;
  --danger: #c43c52;
  --danger-soft: #fbe9ec;
  color: var(--ink);
  position: relative;
  border: 1px solid var(--rule-strong);
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%);
}

.doc-cover {
  position: relative;
  border-bottom: 1px solid var(--rule-strong);
}

.doc-mark {
  position: absolute;
  top: -8px;
  right: 0;
  color: var(--accent);
  opacity: 0.8;
}

.doc-kicker {
  color: var(--accent-deep);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.16em;
}

.doc-title {
  padding-right: 92px;
  margin-top: 14px;
  color: var(--ink);
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.doc-lede {
  color: var(--muted);
}

.doc-meta {
  padding: 0;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: #f7fcfc;
}

.doc-meta > div {
  padding: 9px 12px;
}

.doc-meta > div:nth-child(3n + 2),
.doc-meta > div:nth-child(3n) {
  border-left: 1px solid var(--rule);
}

.doc-meta dt {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 8px;
}

.doc-meta dd {
  color: var(--ink-soft);
}

.doc-version {
  color: var(--faint);
  font-family: var(--font-mono);
}

.doc-no {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: var(--accent-soft);
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--accent-deep);
}

.doc-section-head h2 {
  color: var(--ink);
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.doc-rule {
  background: var(--rule);
}

.doc-foot {
  border-top: 1px solid var(--rule);
  color: var(--faint);
}

@media (max-width: 760px) {
  .print-document {
    border: none;
    border-radius: 0;
    box-shadow: none;
    clip-path: none;
  }

  .doc-mark {
    width: 54px;
  }

  .doc-title {
    padding-right: 64px;
  }
}
</style>
