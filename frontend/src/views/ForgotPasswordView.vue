<template>
  <div class="auth-layout">
    <div class="auth-glow" />
    <div class="auth-card">
      <div class="auth-brand">
        <span class="auth-logo">🔑</span>
        <h1 class="auth-title">Forgot password?</h1>
        <p class="auth-sub">We'll send you a reset link</p>
      </div>

      <div v-if="sent" class="success-box">
        <p>✅ If that email exists, a reset link has been sent. Check your inbox (and spam folder).</p>
        <router-link to="/login" class="btn btn-ghost w-full" style="margin-top:16px;justify-content:center">Back to sign in</router-link>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input id="email" v-model="email" type="email" class="input" placeholder="you@example.com" autocomplete="email" required />
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
          <span v-if="loading" class="spinner" style="width:14px;height:14px;border-width:2px" />
          Send Reset Link
        </button>

        <router-link to="/login" class="auth-link" style="text-align:center;display:block">← Back to sign in</router-link>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '@/lib/api.js'

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    sent.value = true
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
.auth-link { color: var(--accent-light); font-size: 13px; }
.w-full { width: 100%; }
.success-box { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: var(--radius); padding: 16px; color: var(--success); font-size: 14px; line-height: 1.6; }
</style>
