<template>
  <div class="remote-elements">
    <!-- Selection Overlay -->
    <div
      v-for="(rect, idx) in selectionRects"
      :key="'sel-' + idx"
      v-if="permission !== 'view'"
      class="remote-selection"
      :style="{
        left: rect.left + 'px',
        top: rect.top + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        background: color,
        opacity: 0.3
      }"
    />

    <!-- Text Cursor (Blinking) -->
    <div
      v-if="cursorPos && permission !== 'view'"
      class="remote-cursor"
      :style="{
        left: cursorPos.left + 'px',
        top: cursorPos.top + 'px',
        height: cursorPos.height + 'px',
        borderColor: color
      }"
    >
      <div class="cursor-label" :style="{ background: color }">{{ name }}</div>
    </div>

    <!-- Mouse Pointer -->
    <div class="remote-pointer" :style="pointerStyle">
      <svg class="pointer-cursor" viewBox="0 0 16 24" width="16" height="24" :fill="color">
        <path d="M0 0 L0 20 L5 15 L8 22 L10 21 L7 14 L13 14 Z" :stroke="color" stroke-width="1" />
      </svg>
      <span class="pointer-label" :style="{ background: color }">{{ name }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  color: { type: String, required: true },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  cursorPos: { type: Object, default: null }, // { left, top, height }
  selectionRects: { type: Array, default: () => [] }, // [{ left, top, width, height }]
  permission: { type: String, default: 'view' }
})

const pointerStyle = computed(() => ({
  left: props.x + '%',
  top: props.y + '%',
}))
</script>

<style scoped>
.remote-elements {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100;
}

.remote-pointer {
  position: absolute; pointer-events: none;
  transform: translate(0, 0); transition: left 0.1s linear, top 0.1s linear;
  display: flex; align-items: flex-start; gap: 4px;
}
.pointer-cursor { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5)); }
.pointer-label {
  font-size: 10px; font-weight: 600; color: #fff; padding: 2px 6px; border-radius: 4px;
  white-space: nowrap; margin-top: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
}

.remote-cursor {
  position: absolute; border-left: 2px solid; pointer-events: none;
  animation: blink 1s step-end infinite;
  transition: left 0.1s ease, top 0.1s ease;
}

@keyframes blink {
  from, to { border-color: transparent; }
  50% { border-color: inherit; }
}

.cursor-label {
  position: absolute; top: -16px; left: -2px; font-size: 10px; font-weight: 600;
  color: #fff; padding: 1px 4px; border-radius: 2px; white-space: nowrap;
}

.remote-selection {
  position: absolute; pointer-events: none;
  mix-blend-mode: plus-lighter;
}
</style>
