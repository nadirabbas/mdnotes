<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main area -->
    <div class="app-main">
      <template v-if="auth.user?.is_verified">
        <NoteEditor v-if="notes.activeNote" @share="showShare = true" />
        <div v-else class="app-empty">
          <div class="empty-content">
            <span class="empty-icon">✨</span>
            <h2>Select a note to begin</h2>
            <p>Or create a new one from the sidebar</p>
            <button class="btn btn-primary" @click="notes.createNote()">+ New Note</button>
          </div>
        </div>
      </template>
      
      <!-- Verification Block -->
      <div v-else class="verify-block">
        <div class="verify-content">
          <span class="verify-icon">✉️</span>
          <h2>Verify your email</h2>
          <p>Please verify your email address to start using mdnotes. We've sent a link to <strong>{{ auth.user?.email }}</strong>.</p>
          <div class="verify-actions">
            <button class="btn btn-primary" @click="resendVerification" :disabled="resending">
              {{ resending ? 'Sending...' : 'Resend Verification Link' }}
            </button>
            <button class="btn btn-ghost" @click="auth.logout()">Logout</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Share modal -->
    <transition name="fade">
      <ShareModal v-if="showShare && notes.activeNote?.permission === 'owner'" @close="showShare = false" />
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useNotesStore } from '@/stores/notes.js'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast.js'
import { api } from '@/lib/api.js'
import AppSidebar from '@/components/app/AppSidebar.vue'
import NoteEditor from '@/components/editor/NoteEditor.vue'
import ShareModal from '@/components/app/ShareModal.vue'

const notes = useNotesStore()
const auth = useAuthStore()
const toast = useToastStore()
const showShare = ref(false)
const resending = ref(false)

onMounted(async () => {
  if (auth.user?.is_verified) {
    await notes.fetchNotes()
    if (notes.notes.length && !notes.activeNoteId) {
      notes.activeNoteId = notes.notes[0].id
    }
  }
})

async function resendVerification() {
  resending.value = true
  try {
    await api.post('/auth/forgot-password', { email: auth.user.email }) // Reusing forgot-password logic for simplicity
    toast.success('Verification link sent!')
  } catch (e) {
    toast.error(e.message)
  } finally {
    resending.value = false
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base);
}
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.app-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.empty-icon { font-size: 52px; }
.empty-content h2 { font-size: 20px; font-weight: 700; }
.empty-content p { color: var(--text-secondary); font-size: 14px; }

/* Verification Block */
.verify-block { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px; }
.verify-content { text-align: center; max-width: 400px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.verify-icon { font-size: 64px; }
.verify-content h2 { font-size: 24px; font-weight: 800; }
.verify-content p { color: var(--text-secondary); font-size: 15px; line-height: 1.6; }
.verify-actions { display: flex; flex-direction: column; gap: 12px; width: 100%; margin-top: 12px; }
</style>
