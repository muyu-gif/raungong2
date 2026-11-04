<script setup lang="ts">
import type { PlanSection } from "@/api/types";

defineProps<{
  data: PlanSection;
  draft: PlanSection;
  editing: boolean;
}>();
</script>

<template>
  <div v-if="data.rundown?.length" class="rundown">
    <table class="data-table stack-table">
      <thead>
        <tr>
          <th style="width: 36px">序</th>
          <th style="width: 112px">时间</th>
          <th style="width: 104px">环节</th>
          <th>内容</th>
          <th style="width: 94px">负责人</th>
          <th style="width: 100px">地点</th>
          <th style="width: 120px">备注</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in data.rundown" :key="item.seq">
          <td class="faint tabular" data-label="序">{{ String(item.seq).padStart(2, "0") }}</td>
          <td class="nowrap" data-label="时间">
            <span class="time">{{ item.start_time }}<span class="sep">–</span>{{ item.end_time }}</span>
            <span class="cell-sub">{{ item.duration_minutes }} 分钟</span>
          </td>
          <td class="cell-strong" data-label="环节">{{ item.segment }}</td>
          <td data-label="内容">{{ item.content }}</td>
          <td data-label="负责人">{{ item.owner }}</td>
          <td class="muted" data-label="地点">{{ item.location }}</td>
          <td class="muted notes" data-label="备注">{{ item.notes || "—" }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <p v-else class="empty">这份方案还没有现场流程。</p>
</template>

<style scoped>
.rundown {
  overflow-x: auto;
}

.time {
  font-family: var(--font-serif);
  font-size: 12.5px;
  letter-spacing: 0.02em;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.sep {
  padding: 0 4px;
  color: var(--rule-strong);
}

.notes {
  font-size: 12px;
}

.empty {
  color: var(--faint);
  font-size: 12.5px;
}
</style>
