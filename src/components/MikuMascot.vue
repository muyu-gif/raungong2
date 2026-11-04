<script setup lang="ts">
withDefaults(defineProps<{ title?: string }>(), { title: "初音未来风格吉祥物" });
</script>

<template>
  <svg class="miku-mascot" viewBox="0 0 260 320" role="img" :aria-label="title">
    <defs>
      <linearGradient id="miku-hair" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8ffff5" />
        <stop offset="0.45" stop-color="#39c5bb" />
        <stop offset="1" stop-color="#1a8b86" />
      </linearGradient>
      <linearGradient id="miku-skin" x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0" stop-color="#fff0e7" />
        <stop offset="1" stop-color="#ffd8c8" />
      </linearGradient>
      <linearGradient id="miku-outfit" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#23353e" />
        <stop offset="1" stop-color="#0a161c" />
      </linearGradient>
    </defs>

    <!-- 双马尾 -->
    <path
      d="M88 92C54 118 30 180 22 256c-6 28 18 42 36 24 22-24 22-88 46-138Z"
      fill="url(#miku-hair)"
      stroke="#06232b"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M172 92c34 26 58 88 66 164 6 28-18 42-36 24-22-24-22-88-46-138Z"
      fill="url(#miku-hair)"
      stroke="#06232b"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path d="M74 126c-24 44-34 94-34 132" fill="none" stroke="#8ffff5" stroke-width="4" stroke-linecap="round" opacity="0.35" />
    <path d="M186 126c24 44 34 94 34 132" fill="none" stroke="#8ffff5" stroke-width="4" stroke-linecap="round" opacity="0.35" />

    <!-- 发饰 -->
    <g transform="rotate(-18 78 104)">
      <rect x="62" y="94" width="32" height="18" rx="4" fill="#ff3d81" stroke="#06232b" stroke-width="2.5" />
      <rect x="68" y="99" width="20" height="8" rx="2" fill="#ff8bb2" opacity="0.8" />
    </g>
    <g transform="rotate(18 182 104)">
      <rect x="166" y="94" width="32" height="18" rx="4" fill="#ff3d81" stroke="#06232b" stroke-width="2.5" />
      <rect x="172" y="99" width="20" height="8" rx="2" fill="#ff8bb2" opacity="0.8" />
    </g>

    <!-- 身体 -->
    <path
      d="M72 238c8-24 32-36 58-36s50 12 58 36l12 82H60Z"
      fill="url(#miku-outfit)"
      stroke="#06232b"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path d="M112 206 130 228 148 206" fill="none" stroke="#39c5bb" stroke-width="4" stroke-linejoin="round" />
    <path d="M124 224h12l6 38-12 10-12-10Z" fill="#39c5bb" stroke="#06232b" stroke-width="2.5" stroke-linejoin="round" />
    <path d="M118 262h24" stroke="#0c4b4b" stroke-width="2" opacity="0.8" />

    <!-- 袖子 -->
    <path
      d="M72 244c-16 10-22 30-18 48l16 28 22-12-10-46Z"
      fill="#13232b"
      stroke="#06232b"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M188 244c16 10 22 30 18 48l-16 28-22-12 10-46Z"
      fill="#13232b"
      stroke="#06232b"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <text x="68" y="286" font-family="Bahnschrift, sans-serif" font-size="15" font-weight="600" fill="#ff3d81" transform="rotate(-8 68 286)">01</text>
    <path d="M58 290l18 22M202 290l-18 22" stroke="#39c5bb" stroke-width="2" opacity="0.65" />

    <!-- 脖子 -->
    <rect x="116" y="182" width="28" height="28" rx="7" fill="url(#miku-skin)" stroke="#06232b" stroke-width="3" />

    <!-- 脸 -->
    <ellipse cx="130" cy="134" rx="64" ry="58" fill="url(#miku-skin)" stroke="#06232b" stroke-width="3" />

    <!-- 刘海 -->
    <path
      d="M64 124C62 74 92 48 130 48s68 26 66 76c-12-34-32-42-42-22-8-24-20-28-24-4-4-24-16-20-24 4-10-20-30-12-42 22Z"
      fill="url(#miku-hair)"
      stroke="#06232b"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path d="M78 112c-6 22-6 44 0 60-2-22 4-42 12-56Z" fill="url(#miku-hair)" stroke="#06232b" stroke-width="3" />
    <path d="M182 112c6 22 6 44 0 60 2-22-4-42-12-56Z" fill="url(#miku-hair)" stroke="#06232b" stroke-width="3" />

    <!-- 耳机 -->
    <path d="M64 120C64 50 196 50 196 120" fill="none" stroke="#0a1a20" stroke-width="12" stroke-linecap="round" />
    <path d="M70 112c4-48 116-48 120 0" fill="none" stroke="#39c5bb" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
    <rect x="46" y="112" width="28" height="48" rx="9" fill="#0b171d" stroke="#06232b" stroke-width="3" />
    <rect x="186" y="112" width="28" height="48" rx="9" fill="#0b171d" stroke="#06232b" stroke-width="3" />
    <circle cx="60" cy="136" r="8" fill="#39c5bb" stroke="#06232b" stroke-width="2" />
    <circle cx="200" cy="136" r="8" fill="#39c5bb" stroke="#06232b" stroke-width="2" />
    <circle cx="60" cy="136" r="3" fill="#ff3d81" />
    <circle cx="200" cy="136" r="3" fill="#ff3d81" />
    <path d="M204 152c-14 8-22 22-24 38" fill="none" stroke="#0a1a20" stroke-width="3" />
    <circle cx="179" cy="191" r="3.5" fill="#39c5bb" stroke="#06232b" stroke-width="1.5" />

    <!-- 五官 -->
    <path d="M92 126c6-4 14-4 20 0M148 126c6-4 14-4 20 0" fill="none" stroke="#0a3c3c" stroke-width="3" stroke-linecap="round" opacity="0.55" />
    <ellipse cx="106" cy="146" rx="12" ry="15" fill="#06232b" />
    <ellipse cx="154" cy="146" rx="12" ry="15" fill="#06232b" />
    <ellipse cx="106" cy="147" rx="8.5" ry="12" fill="#39c5bb" />
    <ellipse cx="154" cy="147" rx="8.5" ry="12" fill="#39c5bb" />
    <circle cx="102.5" cy="140" r="3.6" fill="#e9fffc" />
    <circle cx="150.5" cy="140" r="3.6" fill="#e9fffc" />
    <circle cx="109" cy="151" r="1.8" fill="#8ffff5" />
    <circle cx="157" cy="151" r="1.8" fill="#8ffff5" />
    <path d="M119 170c3 2 7 2 10 0" fill="none" stroke="#b34c66" stroke-width="2.2" stroke-linecap="round" />
    <ellipse cx="90" cy="162" rx="9" ry="5" fill="#ff8fa3" opacity="0.35" />
    <ellipse cx="170" cy="162" rx="9" ry="5" fill="#ff8fa3" opacity="0.35" />
  </svg>
</template>

<style scoped>
.miku-mascot {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
</style>
