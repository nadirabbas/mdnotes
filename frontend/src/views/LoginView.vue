<template>
  <div class="auth-layout">
    <div class="auth-glow" />
    <div class="auth-card">
      <div class="auth-brand">
        <span class="auth-logo">✨</span>
        <h1 class="auth-title">mdnotes</h1>
        <p class="auth-sub">Real-time collaborative markdown notes</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input id="email" v-model="email" type="email" class="input" placeholder="you@example.com" autocomplete="email" required />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <div class="input-pw-wrap">
            <input id="password" v-model="password" :type="showPw ? 'text' : 'password'" class="input" placeholder="••••••••" autocomplete="current-password" required />
            <button type="button" class="pw-toggle" @click="showPw = !showPw">
              <svg v-if="showPw" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
          <span v-if="loading" class="spinner" style="width:14px;height:14px;border-width:2px" />
          Sign In
        </button>

        <div class="auth-links">
          <router-link to="/forgot-password" class="auth-link">Forgot password?</router-link>
          <span class="auth-divider">·</span>
          <router-link to="/register" class="auth-link">Create account</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast.js'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()

const email = ref('')
const password = ref('')
const showPw = ref(false)
const loading = ref(false)
const error = ref('')

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

onMounted(() => {
  if (RECAPTCHA_SITE_KEY) {
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`
    document.head.appendChild(script)
  }
})

async function getRecaptchaToken() {
  if (!RECAPTCHA_SITE_KEY) return 'no-key'
  return new Promise((resolve) => {
    window.grecaptcha.ready(async () => {
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'login' })
      resolve(token)
    })
  })
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const recaptchaToken = await getRecaptchaToken()
    await auth.login(email.value, password.value, recaptchaToken)
    toast.success('Welcome back!')
    const redirect = router.currentRoute.value.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>


<style scoped>
.auth-layout {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg-base); padding: 24px; position: relative; overflow: hidden;
}
.auth-glow {
  position: absolute; width: 600px; height: 600px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
  top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;
}
.auth-card {
  width: 100%; max-width: 420px; background: var(--bg-card);
  border: 1px solid var(--border); border-radius: var(--radius-xl);
  padding: 40px; box-shadow: var(--shadow-lg); position: relative;
}
.auth-brand { text-align: center; margin-bottom: 32px; }
.auth-logo { font-size: 40px; display: block; margin-bottom: 8px; }
.auth-title { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; }
.auth-sub { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
.auth-form { display: flex; flex-direction: column; gap: 16px; }
.input-pw-wrap { position: relative; }
.input-pw-wrap .input { padding-right: 40px; }
.pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; line-height: 1; }
.w-full { width: 100%; }
.auth-links { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; }
.auth-link { color: var(--accent-light); }
.auth-link:hover { color: var(--text-primary); }
.auth-divider { color: var(--text-muted); }
</style>
