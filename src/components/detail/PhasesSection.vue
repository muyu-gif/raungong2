<script setup lang="ts">
import type { PlanSection } from "@/api/types";
import { formatDateRange } from "@/utils/format";

defineProps<{
  data: PlanSection;
  draft: PlanSection;
  editing: boolean;
}>();
</script>

<template>
  <ol v-if="data.phases?.length" class="timeline">
    <li v-for="(phase, index) in data.phases" :key="phase.id || index" class="phase">
      <div class="rail" aria-hidden="true">
        <span class="dot">{{ String(index + 1).padStart(2, "0") }}</span>
        <span class="line" />
      </div>

      <div class="phase-content">
        <div class="phase-top">
          <span class="range tabular">{{ formatDateRange(phase.start_date, phase.end_date) }}</span>
          <span class="owner">负责人 · {{ phase.owner || "待定" }}</span>
        </div>

        <h3>{{ phase.name }}</h3>
        <p class="goal">{{ phase.goal }}</p>

        <div class="phase-cols">
          <div>
            <h4>关键动作</h4>
            <ul class="dash-list">
              <li v-for="(action, actionIndex) in phase.key_actions" :key="actionIndex">{{ action }}</li>
            </ul>
          </div>
          <div>
            <h4>交付物</h4>
            <ul class="dash-list">
              <li v-for="(item, itemIndex) in phase.deliverables" :key="itemIndex">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </li>
  </ol>

  <p v-else class="empty">这份方案还没有筹备阶段。</p>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
}

.phase {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 18px;
  padding-bottom: 30px;
}

.phase:last-child {
  padding-bottom: 0;
}

.rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2px;
}

.dot {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid var(--rule-strong);
  border-radius: 50%;
  background: var(--paper-0);
  font-family: var(--font-serif);
  font-size: 9px;
  color: var(--accent);
  letter-spacing: 0.02em;
}

.line {
  flex: 1;
  width: 1px;
  margin: 6px 0 -2px;
  background: var(--rule);
}

.phase-content {
  min-width: 0;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--rule-soft);
}

.phase:last-child .phase-content {
  padding-bottom: 0;
  border-bottom: none;
}

.phase-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.range {
  font-family: var(--font-serif);
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.owner {
  font-size: 10.5px;
  color: var(--faint);
}

.phase-content h3 {
  margin-top: 6px;
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.goal {
  margin-top: 7px;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--ink-soft);
}

.phase-cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 34px;
  margin-top: 16px;
}

.phase-cols h4 {
  font-size: 9.5px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--faint);
}

.dash-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.dash-list li {
  position: relative;
  padding-left: 14px;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--muted);
}

.dash-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.78em;
  width: 7px;
  height: 1px;
  background: var(--rule-strong);
}

.empty {
  color: var(--faint);
  font-size: 12.5px;
}

@media (max-width: 700px) {
  .phase-cols {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .phase-top {
    flex-direction: column;
    gap: 4px;
  }
}
.dot {
  border: 1.5px solid var(--rule-strong);
  background: var(--pink-soft);
  color: var(--accent-deep);
}

.line {
  background: var(--rule);
}

.phase-content {
  padding-bottom: 22px;
  border-bottom: 1px dashed var(--rule);
}

.range {
  color: var(--muted);
}

.phase-content h3 {
  color: var(--ink);
}

.phase-cols h4 {
  color: var(--muted);
}

.dash-list li::before {
  background: var(--rule-strong);
}
</style>
