<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 40 });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    focusable="false"
    class="miku-mark"
  >
    <path d="M32 4 58 18v28L32 60 6 46V18Z" stroke="currentColor" stroke-width="1.6" />
    <path d="M32 9 53 20v24L32 55 11 44V20Z" stroke="currentColor" stroke-width="0.8" opacity="0.45" />
    <path d="M16 42C9 30 13 18 21 12M48 42c7-12 3-24-5-30" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <text
      x="32"
      y="39"
      text-anchor="middle"
      font-family="Bahnschrift, 'Noto Sans SC', sans-serif"
      font-size="19"
      font-weight="600"
      fill="currentColor"
    >
      01
    </text>
  </svg>
</template>
