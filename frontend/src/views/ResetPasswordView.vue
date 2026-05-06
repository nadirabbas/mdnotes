<template>
  <div class="auth-layout">
    <div class="auth-glow" />
    <div class="auth-card">
      <div class="auth-brand">
        <span class="auth-logo">🔒</span>
        <h1 class="auth-title">Reset password</h1>
        <p class="auth-sub">Choose a new password</p>
      </div>

      <div v-if="success" class="success-box">
        <p>✅ Password reset successfully!</p>
        <router-link to="/login" class="btn btn-primary w-full" style="margin-top:16px;justify-content:center">Sign In</router-link>
      </div>

      <div v-else-if="!token" class="error-box">
        <p>⚠️ Invalid or missing reset token.</p>
        <router-link to="/forgot-password" class="btn btn-ghost w-full" style="margin-top:16px;justify-content:center">Request new link</router-link>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label class="form-label">New Password</label>
          <div class="input-pw-wrap">
            <input id="password" v-model="password" :type="showPw ? 'text' : 'password'" class="input" placeholder="Min. 8 characters" required minlength="8" />
            <button type="button" class="pw-toggle" @click="showPw = !showPw">{{ showPw ? '🙈' : '👁' }}</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input id="confirm" v-model="confirm" :type="showPw ? 'text' : 'password'" class="input" placeholder="Repeat new password" required />
          <p v-if="confirm && password !== confirm" class="form-error">Passwords do not match</p>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="btn btn-primary w-full" :disabled="loading || password !== confirm">
          <span v-if="loading" class="spinner" style="width:14px;height:14px;border-width:2px" />
          Reset Password
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/lib/api.js'

const route = useRoute()
const token = ref('')
const password = ref('')
const confirm = ref('')
const showPw = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref(false)

onMounted(() => {
  token.value = route.query.token || ''
})

async function handleSubmit() {
  if (password.value !== confirm.value) return
  error.value = ''
  loading.value = true
  try {
    await api.post('/auth/reset-password', { token: token.value, password: password.value })
    success.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-layout { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); padding: 24px; position: relative; overflow: hidden; }
.auth-glow { position: absolute; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
.auth-card { width: 100%; max-width: 420px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 40px; box-shadow: var(--shadow-lg); }
.auth-brand { text-align: center; margin-bottom: 32px; }
.auth-logo { font-size: 40px; display: block; margin-bottom: 8px; }
.auth-title { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; }
.auth-sub { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.input-pw-wrap { position: relative; }
.input-pw-wrap .input { padding-right: 40px; }
.pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; }
.w-full { width: 100%; }
.success-box { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: var(--radius); padding: 16px; color: var(--success); font-size: 14px; }
.error-box { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: var(--radius); padding: 16px; color: var(--danger); font-size: 14px; }
</style>
