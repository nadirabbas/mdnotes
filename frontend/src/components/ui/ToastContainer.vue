<template>
  <teleport to="body">
    <div class="toast-container">
      <transition-group name="toast-anim">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="['toast', `toast-${t.type}`]"
        >
          <span class="toast-icon">{{ icons[t.type] }}</span>
          <span class="toast-message">{{ t.message }}</span>
          <button class="toast-close" @click="toastStore.remove(t.id)">✕</button>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useToastStore } from '@/stores/toast.js'
const toastStore = useToastStore()
const toasts = computed(() => toastStore.toasts)
const icons = { success: '✓', error: '✕', info: 'ℹ' }
</script>


<style scoped>
.toast-anim-enter-active { animation: toastIn 0.3s ease; }
.toast-anim-leave-active { animation: toastIn 0.2s ease reverse; }
@keyframes toastIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
.toast-icon { font-size: 14px; font-weight: 700; }
</style>
