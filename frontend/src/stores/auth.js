import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api.js'
import router from '@/router/index.js'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('mdnotes_token') || null)
  const user = ref(JSON.parse(localStorage.getItem('mdnotes_user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  function setAuth(newToken, newUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('mdnotes_token', newToken)
    localStorage.setItem('mdnotes_user', JSON.stringify(newUser))
  }

  function updateUser(updatedUser) {
    user.value = { ...user.value, ...updatedUser }
    localStorage.setItem('mdnotes_user', JSON.stringify(user.value))
  }

  async function login(email, password, recaptchaToken) {
    const data = await api.post('/auth/login', { email, password, recaptchaToken })
    setAuth(data.token, data.user)
    return data
  }

  async function register(name, email, password, recaptchaToken) {
    const data = await api.post('/auth/register', { name, email, password, recaptchaToken })
    setAuth(data.token, data.user)
    return data
  }

  async function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('mdnotes_token')
    localStorage.removeItem('mdnotes_user')
    router.push({ name: 'Login' })
  }

  async function fetchMe() {
    try {
      if (!token.value) return
      const data = await api.get('/auth/me')
      user.value = data.user
      localStorage.setItem('mdnotes_user', JSON.stringify(data.user))
    } catch {
      await logout()
    }
  }

  return { token, user, isAuthenticated, login, register, logout, fetchMe, updateUser, setAuth }
})
