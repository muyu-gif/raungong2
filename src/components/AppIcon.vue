<script setup lang="ts">
withDefaults(
  defineProps<{
    name: keyof typeof icons;
    size?: number | string;
    strokeWidth?: number;
  }>(),
  { size: 16, strokeWidth: 1.5 },
);

const icons = {
  "arrow-right": ["M4 12h15", "M13 6l6 6-6 6"],
  "arrow-left": ["M20 12H5", "M11 18l-6-6 6-6"],
  plus: ["M12 5v14", "M5 12h14"],
  search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14", "M16.5 16.5 21 21"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  download: ["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"],
  printer: [
    "M7 8V4h10v4",
    "M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2",
    "M7 14h10v6H7z",
  ],
  check: ["M4 12l5 5L20 6"],
  alert: ["M12 4 3 20h18L12 4z", "M12 10v4", "M12 17h.01"],
  refresh: ["M20 12a8 8 0 1 1-2.3-5.6", "M20 4v5h-5"],
  "chevron-left": ["M14 6l-6 6 6 6"],
  "chevron-right": ["M10 6l6 6-6 6"],
  copy: ["M9 9h9v11H9z", "M6 15H4V4h11v2"],
  edit: ["M4 20h4L20 8l-4-4L4 16v4z", "M14 6l4 4"],
  logout: ["M15 4h4v16h-4", "M10 8l-4 4 4 4", "M6 12h9"],
  info: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18", "M12 11v6", "M12 7h.01"],
  clock: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18", "M12 7v5l4 2"],
  location: ["M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z", "M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6"],
  users: ["M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7", "M2 20c0-3.3 2.7-5 6-5s6 1.7 6 5", "M16 4.5a3.5 3.5 0 0 1 0 7", "M17 15.4c3 .5 5 2.2 5 4.6"],
  wallet: ["M3 7h18v12H3z", "M3 7l2-3h14l2 3", "M16 13h2"],
} as const;
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, index) in icons[name]" :key="index" :d="d" />
  </svg>
</template>
