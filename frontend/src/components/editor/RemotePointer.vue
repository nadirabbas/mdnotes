<template>
  <div class="remote-pointer" :style="style">
    <svg class="pointer-cursor" viewBox="0 0 16 24" width="16" height="24" :fill="color">
      <path d="M0 0 L0 20 L5 15 L8 22 L10 21 L7 14 L13 14 Z" :stroke="color" stroke-width="1" />
    </svg>
    <span class="pointer-label" :style="{ background: color }">{{ name }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name:  { type: String, required: true },
  color: { type: String, required: true },
  x:     { type: Number, required: true },
  y:     { type: Number, required: true },
})

const style = computed(() => ({
  left: props.x + '%',
  top:  props.y + '%',
}))
</script>

<style scoped>
.remote-pointer {
  position: absolute; pointer-events: none; z-index: 100;
  transform: translate(0, 0); transition: left 0.08s linear, top 0.08s linear;
  display: flex; align-items: flex-start; gap: 4px;
}
.pointer-cursor { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5)); }
.pointer-label {
  font-size: 10px; font-weight: 600; color: #fff; padding: 2px 6px; border-radius: 4px;
  white-space: nowrap; margin-top: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
}
</style>
