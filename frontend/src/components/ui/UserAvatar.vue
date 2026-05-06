<template>
  <div class="avatar" :style="{ background: color, width: size + 'px', height: size + 'px', fontSize: (size * 0.38) + 'px' }" :title="name">
    {{ initials(name) }}
  </div>
</template>

<script setup>
import { initials } from '@/lib/utils.js'
defineProps({
  name:  { type: String, default: '?' },
  color: { type: String, default: '#6366f1' },
  size:  { type: Number, default: 32 },
})
</script>
