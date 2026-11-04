<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { listPlans } from "@/api/plans";
import type { PlanListItem } from "@/api/types";
import { getErrorMessage } from "@/api/errors";
import { activityLabel } from "@/constants/activity";
import { PLAN_STATUS_META } from "@/constants/plan";
import { formatDate, formatInteger, formatMoney, formatRelative, formatTime, parseServerDate } from "@/utils/format";
import StatusMark from "@/components/StatusMark.vue";
import PaginationBar from "@/components/PaginationBar.vue";
import AppIcon from "@/components/AppIcon.vue";
import MikuMascot from "@/components/MikuMascot.vue";
import MikuMark from "@/components/MikuMark.vue";

const plans = ref<PlanListItem[]>([]);
const loading = ref(true);
const error = ref("");
const keyword = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const totalPages = ref(0);

let searchTimer: number | undefined;
let requestId = 0;

const latestUpdate = computed(() => {
  if (!plans.value.length) return "—";
  const latest = plans.value.reduce((current, plan) => {
    const currentTime = parseServerDate(current.updated_at)?.getTime() ?? 0;
    const planTime = parseServerDate(plan.updated_at)?.getTime() ?? 0;
    return planTime > currentTime ? plan : current;
  });
  return formatRelative(latest.updated_at);
});
const isSearching = computed(() => keyword.value.trim().length > 0);

async function load() {
  const current = ++requestId;
  loading.value = true;
  error.value = "";
  try {
    const data = await listPlans({
      page: page.value,
      page_size: pageSize.value,
      keyword: keyword.value.trim() || undefined,
    });
    if (current !== requestId) return;
    plans.value = data.items;
    total.value = data.pagination.total;
    totalPages.value = data.pagination.total_pages;
    if (data.pagination.total_pages > 0 && page.value > data.pagination.total_pages) {
      page.value = data.pagination.total_pages;
      void load();
    }
  } catch (err) {
    if (current !== requestId) return;
    error.value = getErrorMessage(err);
    plans.value = [];
    total.value = 0;
    totalPages.value = 0;
  } finally {
    if (current === requestId) loading.value = false;
  }
}

function changePage(next: number) {
  if (next === page.value) return;
  page.value = next;
  void load();
}

function changePageSize(next: number) {
  pageSize.value = next;
  page.value = 1;
  void load();
}

function clearKeyword() {
  keyword.value = "";
}

watch(keyword, () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    page.value = 1;
    void load();
  }, 360);
});

onMounted(() => void load());
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div class="head-copy">
        <p class="kicker"><span class="idx">01</span><span>WORKBENCH · 方案档案</span></p>
        <h1 class="page-title">把想法归档，<br class="br-mobile" />随时继续推进。</h1>
        <p class="page-sub">
          <template v-if="total > 0">共 {{ total }} 份方案 · 最近更新 {{ latestUpdate }}</template>
          <template v-else-if="loading">正在读取方案档案…</template>
          <template v-else-if="isSearching">没有匹配「{{ keyword.trim() }}」的方案</template>
          <template v-else>尚无记录 · 从第一份活动方案开始。</template>
        </p>
      </div>

      <RouterLink to="/plans/new" class="btn btn--primary">
        <AppIcon name="plus" :size="16" />
        <span>新建方案</span>
      </RouterLink>
    </header>

    <div class="toolbar">
      <div class="search">
        <AppIcon name="search" :size="15" class="search-icon" />
        <input
          v-model="keyword"
          class="search-input"
          type="search"
          maxlength="50"
          placeholder="搜索方案标题或主题"
          aria-label="搜索方案标题或主题"
          @keydown.esc="clearKeyword"
        />
        <button v-if="isSearching" type="button" class="search-clear" aria-label="清除搜索" @click="clearKeyword">
          <AppIcon name="close" :size="13" />
        </button>
      </div>
      <p class="toolbar-note">
        <template v-if="isSearching">关键词匹配标题与主题 · 最多 50 字</template>
        <template v-else>按创建时间倒序排列</template>
      </p>
    </div>

    <div v-if="loading" class="plan-list" aria-busy="true" aria-live="polite">
      <div v-for="index in 4" :key="index" class="plan-card plan-card--skeleton">
        <span class="plan-index skeleton-line" style="width: 42px; height: 42px" />
        <span class="plan-main">
          <span class="skeleton-line" style="width: 42%; height: 16px" />
          <span class="skeleton-line" style="width: 26%; height: 10px; margin-top: 9px" />
          <span class="skeleton-chips">
            <span class="skeleton-line" style="width: 74px; height: 22px" />
            <span class="skeleton-line" style="width: 106px; height: 22px" />
            <span class="skeleton-line" style="width: 58px; height: 22px" />
          </span>
        </span>
        <span class="skeleton-line" style="width: 66px; height: 24px" />
      </div>
    </div>

    <div v-else-if="error" class="state-block">
      <MikuMark class="state-mark" :size="84" />
      <p class="state-kicker">ERROR · 读取失败</p>
      <h2 class="state-title">方案档案暂时打不开</h2>
      <p class="state-text">{{ error }}</p>
      <div class="state-actions">
        <button type="button" class="btn" @click="load">
          <AppIcon name="refresh" :size="15" />
          <span>重新读取</span>
        </button>
        <RouterLink to="/plans/new" class="btn btn--quiet">先写一份新方案</RouterLink>
      </div>
    </div>

    <div v-else-if="!plans.length" class="state-block">
      <MikuMark v-if="isSearching" class="state-mark" :size="92" />
      <MikuMascot v-else class="state-mascot" />
      <p class="state-kicker">{{ isSearching ? "NO MATCH · 无匹配" : "EMPTY · 空档案" }}</p>
      <h2 class="state-title">{{ isSearching ? "没有找到相关方案" : "还没写下第一场活动" }}</h2>
      <p class="state-text">
        {{
          isSearching
            ? `没有标题或主题包含「${keyword.trim()}」的方案，换一个关键词试试。`
            : "填写活动主题、人数、预算与时间，约 3 秒即可得到策划、预算、物资、分工、宣传与风险六部分内容。"
        }}
      </p>
      <div class="state-actions">
        <button v-if="isSearching" type="button" class="btn" @click="clearKeyword">清除关键词</button>
        <RouterLink to="/plans/new" class="btn btn--primary">
          <span>新建方案</span>
          <AppIcon name="arrow-right" :size="15" class="arrow" />
        </RouterLink>
      </div>
    </div>

    <div v-else class="plan-list">
      <RouterLink
        v-for="(plan, index) in plans"
        :key="plan.id"
        :to="{ name: 'plan-detail', params: { id: plan.id } }"
        class="plan-card"
      >
        <span class="plan-index">{{ String((page - 1) * pageSize + index + 1).padStart(2, "0") }}</span>

        <span class="plan-main">
          <span class="plan-title">{{ plan.title }}</span>
          <span class="plan-sub">
            {{ plan.theme }}<span class="dot-sep">·</span>更新于 {{ formatRelative(plan.updated_at) }}
          </span>
          <span class="plan-chips">
            <span class="chip chip--type">{{ activityLabel(plan.activity_type) }}</span>
            <span class="chip">{{ formatDate(plan.starts_at) }} {{ formatTime(plan.starts_at) }}</span>
            <span class="chip">{{ formatInteger(plan.participants) }} 人</span>
            <span class="chip chip--money">{{ formatMoney(plan.budget_yuan) }}</span>
          </span>
        </span>

        <span class="plan-side">
          <StatusMark
            :label="PLAN_STATUS_META[plan.status]?.label ?? plan.status"
            :tone="PLAN_STATUS_META[plan.status]?.tone ?? 'muted'"
          />
          <span class="plan-arrow"><AppIcon name="arrow-right" :size="15" /></span>
        </span>
      </RouterLink>
    </div>

    <PaginationBar
      v-if="!loading && !error && plans.length"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :total-pages="totalPages"
      :disabled="loading"
      @update:page="changePage"
      @update:page-size="changePageSize"
    />
  </section>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--rule);
}

.page-title {
  margin-top: 16px;
}

.page-sub {
  margin-top: 11px;
  font-size: 12.5px;
  color: var(--muted);
  letter-spacing: 0.02em;
}

.br-mobile {
  display: none;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 0 16px;
}

.search {
  position: relative;
  width: min(420px, 100%);
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 13px;
  transform: translateY(-50%);
  color: var(--faint);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 42px;
  padding: 0 38px 0 38px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--paper-0);
  font-size: 13px;
  color: var(--ink);
  transition:
    border-color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);
}

.search-input::placeholder {
  color: var(--faint);
}

.search-input:hover {
  border-color: var(--rule-strong);
}

.search-input:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(29, 27, 23, 0.045);
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-clear {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--faint);
}

.search-clear:hover {
  color: var(--ink);
}

.toolbar-note {
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--faint);
  white-space: nowrap;
}

.dossier {
  border-top: 1px solid var(--rule-strong);
}

.dossier-head,
.dossier-row {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 104px 140px 64px 118px 92px 30px;
  column-gap: 20px;
  align-items: center;
}

.dossier-head {
  padding: 12px 7px 10px;
  border-bottom: 1px solid var(--rule);
  font-size: 9.5px;
  letter-spacing: 0.16em;
  color: var(--faint);
}

.dossier-head .num {
  text-align: right;
}

.dossier-row {
  position: relative;
  padding: 18px 7px;
  border-bottom: 1px solid var(--rule-soft);
  transition: background 0.16s var(--ease);
}

.dossier-row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: var(--accent);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.22s var(--ease);
}

.dossier-row:hover {
  background: rgba(251, 248, 242, 0.72);
}

.dossier-row:hover::before {
  transform: scaleY(1);
}

.dossier-row:hover .row-title {
  color: var(--accent);
}

.dossier-row:hover .col-arrow {
  color: var(--accent);
  transform: translateX(3px);
}

.col-idx {
  font-family: var(--font-serif);
  font-size: 11px;
  color: var(--faint);
  letter-spacing: 0.06em;
}

.col-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
}

.row-title {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--ink);
  transition: color 0.16s var(--ease);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.row-sub {
  font-size: 11.5px;
  color: var(--faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  display: none;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.6;
}

.dot-sep {
  padding: 0 5px;
  color: var(--rule-strong);
}

.col-type {
  font-size: 12px;
  color: var(--ink-soft);
}

.col-date {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-variant-numeric: tabular-nums;
}

.date-main {
  font-size: 12.5px;
  color: var(--ink-soft);
}

.date-sub {
  font-size: 11px;
  color: var(--faint);
}

.col-people,
.col-budget {
  font-size: 12.5px;
  color: var(--ink-soft);
}

.col-people {
  color: var(--muted);
}

.col-arrow {
  display: flex;
  justify-content: flex-end;
  color: var(--faint);
  transition:
    color 0.18s var(--ease),
    transform 0.22s var(--ease);
}

.is-skeleton {
  opacity: 0.75;
}

.is-skeleton:hover {
  background: transparent;
}

.is-skeleton:hover::before {
  transform: scaleY(0);
}

.state-block {
  padding: 68px 24px 64px;
  border-top: 1px solid var(--rule-strong);
  border-bottom: 1px solid var(--rule);
  text-align: center;
}

.state-kicker {
  font-size: 9.5px;
  letter-spacing: 0.24em;
  color: var(--accent);
}

.state-title {
  margin-top: 14px;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
}

.state-text {
  max-width: 520px;
  margin: 12px auto 0;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.9;
}

.state-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 26px;
}

@media (max-width: 1080px) {
  .dossier-head,
  .dossier-row {
    grid-template-columns: 40px minmax(0, 1fr) 136px 60px 112px 88px 26px;
  }

  .c-type {
    display: none;
  }
}

@media (max-width: 760px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    padding-bottom: 22px;
  }

  .page-head .btn {
    width: 100%;
  }

  .page-title {
    font-size: 28px;
  }

  .br-mobile {
    display: inline;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 18px 0 14px;
  }

  .toolbar-note {
    display: none;
  }

  .dossier-head {
    display: none;
  }

  .dossier {
    border-top: 1px solid var(--rule-strong);
  }

  .dossier-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "main status"
      "meta arrow";
    row-gap: 6px;
    column-gap: 12px;
    padding: 16px 4px;
  }

  .col-idx,
  .col-type,
  .col-date,
  .col-people,
  .col-budget {
    display: none;
  }

  .col-main {
    grid-area: main;
  }

  .col-status {
    grid-area: status;
    align-self: start;
    justify-self: end;
  }

  .row-meta {
    display: block;
    grid-area: meta;
    color: var(--faint);
  }

  .col-arrow {
    display: none;
  }

  .row-title {
    font-size: 16px;
    -webkit-line-clamp: 2;
  }

  .state-block {
    padding: 48px 18px;
  }

  .state-title {
    font-size: 22px;
  }
}
/* —— 草莓牛奶主题覆盖 —— */
.page-head {
  border-bottom: 2px dashed var(--rule-strong);
}

.page-sub {
  color: var(--muted);
}

.toolbar {
  padding: 20px 0 14px;
}

.search-input {
  height: 46px;
  padding: 0 42px;
  border: 1.5px solid var(--rule);
  border-radius: var(--radius-pill);
  background: #fff;
  font-size: 13px;
}

.search-input:hover {
  border-color: var(--rule-strong);
}

.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(234, 92, 139, 0.12);
}

.search-icon {
  left: 16px;
  color: var(--accent);
}

.search-clear {
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--pink-soft);
  color: var(--accent-deep);
}

.search-clear:hover {
  background: var(--accent);
  color: #fff;
}

.toolbar-note {
  color: var(--muted);
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-card {
  position: relative;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
  border: 1.5px solid var(--rule);
  border-radius: 22px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  transition:
    transform 0.2s var(--ease),
    border-color 0.2s var(--ease),
    box-shadow 0.2s var(--ease);
}

.plan-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: transparent;
  transition: background 0.2s var(--ease);
}

.plan-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--shadow-card);
}

.plan-card:hover::before {
  background: var(--accent);
}

.plan-card:hover .plan-title {
  color: var(--accent-deep);
}

.plan-card:hover .plan-arrow {
  background: var(--accent);
  color: #fff;
  transform: translateX(2px);
}

.plan-index {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1.5px dashed var(--rule-strong);
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent-deep);
  font-family: var(--font-sans);
  font-size: 10.5px;
  letter-spacing: 0.02em;
}

.plan-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.plan-title {
  font-family: var(--font-serif);
  font-size: 19px;
  line-height: 1.45;
  color: var(--ink);
  transition: color 0.18s var(--ease);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.plan-sub {
  font-size: 11px;
  color: var(--faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dot-sep {
  padding: 0 6px;
  color: var(--rule-strong);
}

.plan-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 5px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: var(--pink-soft);
  color: var(--muted);
  font-size: 10.5px;
  white-space: nowrap;
}

.chip--type {
  border-color: var(--pink);
  background: var(--accent-soft);
  color: var(--accent-deep);
}

.chip--money {
  border-color: var(--rule);
  background: #fff;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.plan-side {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-self: end;
}

.plan-arrow {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  background: var(--pink-soft);
  color: var(--accent-deep);
  transition:
    background 0.18s var(--ease),
    color 0.18s var(--ease),
    transform 0.18s var(--ease);
}

.plan-card--skeleton {
  pointer-events: none;
}

.skeleton-chips {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.state-block {
  padding: 40px 24px 44px;
  border: 2px dashed var(--rule-strong);
  border-radius: 26px;
  background: var(--paper-0);
  box-shadow: var(--shadow-soft);
}

.state-kitty {
  display: block;
  width: 160px;
  height: auto;
  margin: 0 auto 14px;
  filter: drop-shadow(0 12px 16px rgba(201, 84, 122, 0.14));
}

.state-kitty--face {
  width: 128px;
  margin-bottom: 18px;
}

.state-kicker {
  color: var(--accent);
}

.state-title {
  font-weight: 400;
  font-size: 26px;
}

.state-text {
  color: var(--muted);
}

.state-actions {
  gap: 10px;
}

@media (max-width: 760px) {
  .plan-card {
    grid-template-columns: 42px minmax(0, 1fr) auto;
    gap: 12px;
    padding: 15px 16px;
    border-radius: 18px;
  }

  .plan-index {
    width: 38px;
    height: 38px;
    font-size: 9.5px;
  }

  .plan-title {
    font-size: 16.5px;
    -webkit-line-clamp: 2;
  }

  .plan-side {
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .plan-arrow {
    display: none;
  }

  .plan-chips {
    gap: 4px;
  }

  .chip {
    padding: 2px 7px;
    font-size: 9.5px;
  }

  .state-block {
    padding: 30px 16px 34px;
  }

  .state-kitty {
    width: 120px;
  }

  .state-kitty--face {
    width: 104px;
  }

  .state-title {
    font-size: 22px;
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
  letter-spacing: 0.04em;
}

.toolbar-note {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

.search-input {
  height: 44px;
  padding: 0 42px;
  border: 1px solid var(--rule-strong);
  border-radius: 3px;
  background: rgba(4, 15, 21, 0.72);
  color: var(--ink);
  font-size: 12.5px;
}

.search-input:focus {
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px rgba(57, 197, 187, 0.1), 0 0 20px rgba(57, 197, 187, 0.12);
}

.search-icon {
  color: var(--cyan);
}

.search-clear {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--accent-soft);
  color: var(--cyan);
}

.search-clear:hover {
  border-color: var(--accent);
  background: var(--accent);
  color: #03151a;
}

.plan-list {
  gap: 10px;
}

.plan-card {
  grid-template-columns: 46px minmax(0, 1fr) auto;
  gap: 18px;
  padding: 17px 20px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background:
    linear-gradient(100deg, rgba(57, 197, 187, 0.06), transparent 38%),
    var(--paper-0);
  box-shadow: none;
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
}

.plan-card::before {
  width: 2px;
  background: transparent;
}

.plan-card:hover {
  border-color: var(--rule-strong);
  background:
    linear-gradient(100deg, rgba(57, 197, 187, 0.12), transparent 46%),
    var(--paper-0);
  box-shadow: 0 0 24px rgba(57, 197, 187, 0.12), 0 18px 34px rgba(0, 0, 0, 0.28);
  transform: translateX(2px);
}

.plan-card:hover::before {
  background: var(--cyan);
  box-shadow: 0 0 14px rgba(110, 247, 234, 0.7);
}

.plan-index {
  width: 44px;
  height: 44px;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: rgba(57, 197, 187, 0.08);
  color: var(--cyan);
  font-family: "Bahnschrift", var(--font-sans);
  font-size: 13px;
  letter-spacing: 0.04em;
}

.plan-title {
  font-family: var(--font-sans);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink);
}

.plan-card:hover .plan-title {
  color: var(--cyan);
}

.plan-sub {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.03em;
}

.dot-sep {
  color: var(--rule-strong);
}

.chip {
  padding: 2px 8px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: rgba(57, 197, 187, 0.05);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9.5px;
}

.chip--type {
  border-color: rgba(57, 197, 187, 0.32);
  background: var(--accent-soft);
  color: var(--cyan);
}

.chip--money {
  border-color: var(--rule);
  background: transparent;
  color: var(--ink-soft);
}

.plan-arrow {
  width: 32px;
  height: 32px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: transparent;
  color: var(--muted);
}

.plan-card:hover .plan-arrow {
  border-color: var(--accent);
  background: var(--accent);
  color: #03151a;
  transform: none;
}

.state-block {
  padding: 36px 24px 40px;
  border: 1px dashed var(--rule-strong);
  border-radius: 4px;
  background: rgba(7, 27, 35, 0.72);
  box-shadow: none;
}

.state-mascot {
  width: 150px;
  margin: 0 auto 10px;
  filter: drop-shadow(0 0 28px rgba(57, 197, 187, 0.25));
}

.state-mark {
  margin: 0 auto 14px;
  color: var(--accent);
  filter: drop-shadow(0 0 18px rgba(57, 197, 187, 0.28));
}

.state-kicker {
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
}

.state-title {
  font-family: var(--font-sans);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.state-text {
  color: var(--muted);
}

@media (max-width: 760px) {
  .plan-card {
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 14px;
    border-radius: 3px;
  }

  .plan-index {
    width: 36px;
    height: 36px;
    font-size: 11px;
  }

  .plan-title {
    font-size: 15.5px;
  }

  .plan-sub {
    font-size: 8.5px;
  }

  .chip {
    padding: 2px 6px;
    font-size: 8.5px;
  }

  .state-mascot {
    width: 116px;
  }
}
</style>
