<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "@/components/AppIcon.vue";

const props = defineProps<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (event: "update:page", value: number): void;
  (event: "update:pageSize", value: number): void;
}>();

const canPrev = computed(() => props.page > 1 && !props.disabled);
const canNext = computed(() => props.page < Math.max(1, props.totalPages) && !props.disabled);

function go(delta: number) {
  const next = props.page + delta;
  if (next < 1 || next > Math.max(1, props.totalPages)) return;
  emit("update:page", next);
}

function changeSize(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value);
  if (Number.isFinite(value) && value > 0) emit("update:pageSize", value);
}
</script>

<template>
  <div class="pager">
    <p class="pager-meta">
      共 <strong>{{ total }}</strong> 份 · 第 {{ page }} / {{ Math.max(1, totalPages) }} 页
    </p>

    <div class="pager-controls">
      <label class="size">
        <span>每页</span>
        <select class="select select--sm" :value="pageSize" :disabled="disabled" @change="changeSize">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </label>

      <div class="steps">
        <button type="button" class="step" :disabled="!canPrev" aria-label="上一页" @click="go(-1)">
          <AppIcon name="chevron-left" :size="15" />
        </button>
        <span class="step-page tabular">{{ page }}</span>
        <button type="button" class="step" :disabled="!canNext" aria-label="下一页" @click="go(1)">
          <AppIcon name="chevron-right" :size="15" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 22px;
  margin-top: 4px;
  border-top: 1px solid var(--rule);
}

.pager-meta {
  font-size: 11.5px;
  letter-spacing: 0.03em;
  color: var(--faint);
}

.pager-meta strong {
  color: var(--ink-soft);
  font-weight: 500;
}

.pager-controls {
  display: flex;
  align-items: center;
  gap: 18px;
}

.size {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: var(--faint);
}

.select--sm {
  width: auto;
  height: 30px;
  padding: 0 6px;
  font-size: 11.5px;
  background: transparent;
  border-color: var(--rule);
}

.steps {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.step {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--rule);
  color: var(--muted);
  transition: all 0.16s var(--ease);
}

.step:hover:not(:disabled) {
  border-color: var(--ink);
  color: var(--ink);
  background: var(--paper-0);
}

.step:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.step-page {
  min-width: 34px;
  text-align: center;
  font-family: var(--font-serif);
  font-size: 13px;
  color: var(--ink);
}

@media (max-width: 640px) {
  .pager {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .pager-controls {
    width: 100%;
    justify-content: space-between;
  }
}
.pager {
  border-top: 2px dashed var(--rule-strong);
}

.pager-meta {
  color: var(--muted);
}

.select--sm {
  height: 32px;
  padding: 0 8px;
  border-radius: var(--radius-pill);
  background: #fff;
}

.step {
  width: 34px;
  height: 34px;
  border: 1.5px solid var(--rule);
  border-radius: 50%;
  background: #fff;
  color: var(--accent-deep);
}

.step:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

.step-page {
  min-width: 34px;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-deep);
}
.pager {
  border-top: 1px solid var(--rule);
}

.pager-meta {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 9px;
}

.pager-meta strong {
  color: var(--cyan);
}

.select--sm {
  height: 30px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: rgba(4, 15, 21, 0.7);
  color: var(--ink-soft);
  font-family: var(--font-mono);
}

.step {
  width: 32px;
  height: 32px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: transparent;
  color: var(--muted);
}

.step:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--cyan);
}

.step-page {
  min-width: 32px;
  color: var(--cyan);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
}
</style>
