<script setup lang="ts">
import { RouterLink } from "vue-router";

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });
</script>

<template>
  <RouterLink to="/" class="brand" :class="{ 'brand--compact': compact }" aria-label="活动智囊 · 返回工作台">
    <span class="seal" aria-hidden="true">
      <span class="seal-code">01</span>
      <span class="seal-line" />
    </span>
    <span class="brand-text">
      <strong>活动智囊</strong>
      <small>HATSUNE MIKU · ACTIVITY MIND</small>
    </span>
  </RouterLink>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.seal {
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: none;
  border: 1px solid var(--accent);
  border-radius: 3px;
  background:
    linear-gradient(135deg, rgba(57, 197, 187, 0.18), rgba(57, 197, 187, 0.02)),
    var(--paper-0);
  color: var(--cyan);
  box-shadow: 0 0 18px rgba(57, 197, 187, 0.18);
  clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%);
}

.seal::after {
  content: "";
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(57, 197, 187, 0.2);
  pointer-events: none;
}

.seal-code {
  font-family: "Bahnschrift", var(--font-sans);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1;
  transform: skewX(-6deg);
}

.seal-line {
  position: absolute;
  right: -7px;
  bottom: 8px;
  width: 18px;
  height: 3px;
  background: var(--magenta);
  box-shadow: 0 0 10px rgba(255, 61, 129, 0.5);
  transform: skewX(-30deg);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.brand-text strong {
  font-family: var(--font-sans);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1;
  color: var(--ink);
  white-space: nowrap;
}

.brand-text small {
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.12em;
  color: var(--faint);
  white-space: nowrap;
}

.brand--compact .seal {
  width: 34px;
  height: 34px;
}

.brand--compact .seal-code {
  font-size: 14px;
}

.brand--compact .brand-text strong {
  font-size: 15px;
}

.brand--compact .brand-text small {
  display: none;
}
</style>
