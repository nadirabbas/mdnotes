import { defineStore } from 'pinia'
import { ref } from 'vue'

let nextId = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function add(message, type = 'info', duration = 3500) {
    const id = ++nextId
    toasts.value.push({ id, message, type })
    setTimeout(() => remove(id), duration)
    return id
  }

  function remove(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const success = (msg, d) => add(msg, 'success', d)
  const error   = (msg, d) => add(msg, 'error',   d)
  const info    = (msg, d) => add(msg, 'info',     d)

  return { toasts, add, remove, success, error, info }
})
