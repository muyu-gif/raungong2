<script setup lang="ts">
import type { PlanContent } from "@/api/types";
import AppIcon from "@/components/AppIcon.vue";

defineProps<{
  data: PlanContent;
  draft: PlanContent;
  editing: boolean;
}>();
</script>

<template>
  <div class="notes">
    <section class="warnings">
      <h3 class="block-label">生成警告</h3>
      <ul v-if="data.warnings?.length" class="warning-list">
        <li v-for="(warning, index) in data.warnings" :key="index">
          <AppIcon name="alert" :size="14" />
          <span>{{ warning }}</span>
        </li>
      </ul>
      <p v-else class="empty">本次生成没有留下警告。</p>
    </section>

    <section class="assumptions">
      <h3 class="block-label">前提假设</h3>
      <ol v-if="data.assumptions?.length" class="assumption-list">
        <li v-for="(item, index) in data.assumptions" :key="index">
          <span class="no">{{ String(index + 1).padStart(2, "0") }}</span>
          <span>{{ item }}</span>
        </li>
      </ol>
      <p v-else class="empty">没有额外的前提假设。</p>
    </section>

    <p class="foot-note">
      以上内容由生成任务写入，暂不支持在此编辑。如需修改，请在对应章节调整正文、预算与清单。
    </p>
  </div>
</template>

<style scoped>
.notes {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.block-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--faint);
}

.warning-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.warning-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-left: 2px solid var(--amber);
  background: rgba(138, 97, 29, 0.06);
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-soft);
}

.warning-list :deep(svg) {
  flex: none;
  margin-top: 3px;
  color: var(--amber);
}

.assumption-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.assumption-list li {
  display: flex;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dotted var(--rule);
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--ink-soft);
}

.assumption-list .no {
  flex: none;
  font-family: var(--font-serif);
  font-size: 10px;
  color: var(--faint);
  padding-top: 2px;
}

.empty {
  margin-top: 10px;
  font-size: 12px;
  color: var(--faint);
}

.foot-note {
  padding-top: 16px;
  border-top: 1px solid var(--rule-soft);
  font-size: 11px;
  line-height: 1.8;
  color: var(--faint);
}
.warning-list li {
  border: 1px solid #f1ddba;
  border-left: 4px solid var(--amber);
  border-radius: 14px;
  background: var(--amber-soft);
}

.assumption-list li {
  border-bottom: 1px dashed var(--rule);
}

.foot-note {
  border-top: 1px dashed var(--rule);
}
.warning-list li {
  border: 1px solid rgba(255, 200, 87, 0.28);
  border-left: 2px solid var(--amber);
  border-radius: 2px;
  background: rgba(255, 200, 87, 0.06);
  color: var(--ink-soft);
}

.assumption-list li {
  border-bottom: 1px solid var(--rule);
  color: var(--ink-soft);
}

.foot-note {
  border-top: 1px solid var(--rule);
  color: var(--faint);
}
</style>
