<template>
  <div class="profile-layout">
    <div class="profile-container">
      <!-- Back button -->
      <router-link to="/" class="btn btn-ghost btn-sm back-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Notes
      </router-link>

      <h1 class="profile-title">Your Profile</h1>

      <div class="profile-card card">
        <!-- Avatar section -->
        <div class="avatar-section">
          <UserAvatar :name="formData.name" :color="formData.avatar_color" :size="80" />
          <div class="avatar-info">
            <h2 class="avatar-name">{{ auth.user?.name }}</h2>
            <p class="avatar-email">{{ auth.user?.email }}</p>
          </div>
        </div>

        <!-- Color picker -->
        <div class="form-group">
          <label class="form-label">Avatar Color</label>
          <div class="color-grid">
            <button
              v-for="c in COLORS"
              :key="c"
              class="color-swatch"
              :class="{ selected: formData.avatar_color === c }"
              :style="{ background: c }"
              @click="formData.avatar_color = c"
            />
          </div>
        </div>

        <div class="divider" />

        <form @submit.prevent="saveProfile" class="profile-form">
          <div class="form-group">
            <label class="form-label" for="prof-name">Display Name</label>
            <input id="prof-name" v-model="formData.name" class="input" placeholder="Your name" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="prof-bio">Bio</label>
            <textarea id="prof-bio" v-model="formData.bio" class="input" rows="3" placeholder="Tell us about yourself…" style="resize:vertical;min-height:80px" />
          </div>
          <p v-if="profileError" class="form-error">{{ profileError }}</p>
          <p v-if="profileSuccess" class="form-success">{{ profileSuccess }}</p>
          <button type="submit" class="btn btn-primary" :disabled="savingProfile">
            <span v-if="savingProfile" class="spinner" style="width:12px;height:12px;border-width:2px" />
            Save Changes
          </button>
        </form>
      </div>

      <!-- Change Password -->
      <div class="profile-card card" style="margin-top: 20px;">
        <h3 class="section-heading">Change Password</h3>
        <form @submit.prevent="changePassword" class="profile-form">
          <div class="form-group">
            <label class="form-label" for="cur-pw">Current Password</label>
            <input id="cur-pw" v-model="pwData.current" type="password" class="input" placeholder="••••••••" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-pw">New Password</label>
            <input id="new-pw" v-model="pwData.newPw" type="password" class="input" placeholder="Min. 8 characters" required minlength="8" />
          </div>
          <div class="form-group">
            <label class="form-label" for="confirm-pw">Confirm New Password</label>
            <input id="confirm-pw" v-model="pwData.confirm" type="password" class="input" placeholder="Repeat new password" required />
            <p v-if="pwData.confirm && pwData.newPw !== pwData.confirm" class="form-error">Passwords do not match</p>
          </div>
          <p v-if="pwError" class="form-error">{{ pwError }}</p>
          <p v-if="pwSuccess" class="form-success">{{ pwSuccess }}</p>
          <button type="submit" class="btn btn-primary" :disabled="savingPw || pwData.newPw !== pwData.confirm">
            <span v-if="savingPw" class="spinner" style="width:12px;height:12px;border-width:2px" />
            Update Password
          </button>
        </form>
      </div>

      <!-- Danger zone -->
      <div class="danger-zone card" style="margin-top: 20px;">
        <h3 class="section-heading danger">Danger Zone</h3>
        <p class="danger-desc">Sign out of all sessions</p>
        <button class="btn btn-danger" @click="auth.logout()">Sign Out</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast.js'
import { api } from '@/lib/api.js'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const auth = useAuthStore()
const toast = useToastStore()

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#84cc16', '#0ea5e9']

const formData = reactive({
  name: auth.user?.name || '',
  bio: auth.user?.bio || '',
  avatar_color: auth.user?.avatar_color || '#6366f1',
})

const pwData = reactive({ current: '', newPw: '', confirm: '' })

const savingProfile = ref(false)
const savingPw = ref(false)
const profileError = ref('')
const profileSuccess = ref('')
const pwError = ref('')
const pwSuccess = ref('')

onMounted(async () => {
  try {
    const data = await api.get('/users/profile')
    Object.assign(formData, {
      name: data.user.name,
      bio: data.user.bio,
      avatar_color: data.user.avatar_color,
    })
  } catch { /* use store values */ }
})

async function saveProfile() {
  profileError.value = ''
  profileSuccess.value = ''
  savingProfile.value = true
  try {
    const data = await api.patch('/users/profile', {
      name: formData.name,
      bio: formData.bio,
      avatar_color: formData.avatar_color,
    })
    auth.updateUser(data.user)
    profileSuccess.value = 'Profile updated!'
    toast.success('Profile saved')
    setTimeout(() => { profileSuccess.value = '' }, 3000)
  } catch (e) {
    profileError.value = e.message
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  if (pwData.newPw !== pwData.confirm) return
  pwError.value = ''
  pwSuccess.value = ''
  savingPw.value = true
  try {
    await api.post('/users/change-password', {
      currentPassword: pwData.current,
      newPassword: pwData.newPw,
    })
    pwSuccess.value = 'Password changed successfully!'
    toast.success('Password updated')
    pwData.current = ''
    pwData.newPw = ''
    pwData.confirm = ''
    setTimeout(() => { pwSuccess.value = '' }, 3000)
  } catch (e) {
    pwError.value = e.message
  } finally {
    savingPw.value = false
  }
}
</script>

<style scoped>
.profile-layout {
  min-height: 100vh; background: var(--bg-base); padding: 32px 20px;
  display: flex; justify-content: center;
}
.profile-container { width: 100%; max-width: 560px; }
.back-btn { margin-bottom: 24px; }
.profile-title { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 20px; }
.profile-card { padding: 24px; }

.avatar-section { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.avatar-name { font-size: 18px; font-weight: 700; }
.avatar-email { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

.color-grid { display: flex; gap: 8px; flex-wrap: wrap; }
.color-swatch {
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  border: 2px solid transparent; transition: all 0.15s;
}
.color-swatch:hover { transform: scale(1.15); }
.color-swatch.selected { border-color: #fff; box-shadow: 0 0 0 3px rgba(255,255,255,0.2); transform: scale(1.1); }

.profile-form { display: flex; flex-direction: column; gap: 16px; }
.form-success { font-size: 12px; color: var(--success); }
.section-heading { font-size: 15px; font-weight: 700; margin-bottom: 16px; }
.section-heading.danger { color: var(--danger); }
.danger-zone { padding: 20px 24px; border-color: rgba(239,68,68,0.2); }
.danger-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
</style>
