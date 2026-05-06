<template>
  <div class="auth-layout">
    <div class="auth-card text-center">
      <div v-if="loading" class="verify-status">
        <span class="spinner" style="width:40px;height:40px;border-width:3px"></span>
        <h1 class="auth-title mt-4">Verifying your email...</h1>
      </div>
      <div v-else-if="success" class="verify-status">
        <span class="auth-logo">🎉</span>
        <h1 class="auth-title">Email Verified!</h1>
        <p class="auth-sub">{{ message }}</p>
        <button class="btn btn-primary w-full mt-6" @click="goHome">Go to Dashboard</button>
      </div>
      <div v-else class="verify-status">
        <span class="auth-logo">❌</span>
        <h1 class="auth-title">Verification Failed</h1>
        <p class="auth-sub">{{ error }}</p>
        <button class="btn btn-ghost w-full mt-6" @click="goHome">Back to Login</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api.js'
import { useAuthStore } from '@/stores/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const success = ref(false)
const error = ref('')
const message = ref('')

onMounted(async () => {
  const token = route.query.token
  if (!token) {
    error.value = 'Missing verification token.'
    loading.value = false
    return
  }

  try {
    const res = await api.get(`/auth/verify-email?token=${token}`)
    success.value = true
    message.value = res.message
    // Refresh user data
    if (auth.isAuthenticated) {
      await auth.fetchMe()
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.auth-layout { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); }
.auth-card { width: 100%; max-width: 400px; padding: 40px; }
.text-center { text-align: center; }
.verify-status { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.mt-4 { margin-top: 16px; }
.mt-6 { margin-top: 24px; }
.auth-title { font-size: 24px; font-weight: 800; }
.auth-sub { color: var(--text-secondary); margin-top: 8px; }
.auth-logo { font-size: 48px; }
</style>
