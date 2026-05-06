<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal share-modal">
      <div class="modal-header">
        <h2 class="modal-title">Share Note</h2>
        <button class="btn btn-icon btn-ghost" @click="$emit('close')">✕</button>
      </div>

      <!-- Current shares -->
      <div class="share-section">
        <h3 class="section-label">People with access</h3>
        <div class="share-list">
          <div class="share-item owner">
            <UserAvatar :name="auth.user?.name" :color="auth.user?.avatar_color" :size="28" />
            <div class="share-info">
              <span class="share-name">{{ auth.user?.name }} (you)</span>
              <span class="share-email">{{ auth.user?.email }}</span>
            </div>
            <span class="badge badge-indigo">Owner</span>
          </div>

          <div v-for="s in shares" :key="s.id" class="share-item">
            <UserAvatar :name="s.name" :color="s.avatar_color" :size="28" />
            <div class="share-info">
              <span class="share-name">{{ s.name }}</span>
              <span class="share-email">{{ s.email }}</span>
            </div>
            <select
              :value="s.permission"
              class="perm-select"
              @change="updatePerm(s.user_id, $event.target.value)"
            >
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
            <button class="btn btn-danger btn-sm btn-icon" @click="removeShare(s.user_id)" title="Remove">✕</button>
          </div>

          <div v-if="!shares.length" class="share-empty">Only you have access.</div>
        </div>
      </div>

      <!-- Add user -->
      <div class="share-section">
        <h3 class="section-label">Invite someone</h3>
        <div class="invite-row">
          <div class="search-wrap">
            <input
              v-model="searchQ"
              class="input"
              placeholder="Search by name or email…"
              @input="onSearch"
            />
            <div v-if="searchResults.length" class="search-dropdown">
              <div
                v-for="u in searchResults"
                :key="u.id"
                class="search-result"
                @click="selectUser(u)"
              >
                <UserAvatar :name="u.name" :color="u.avatar_color" :size="24" />
                <div>
                  <div class="sr-name">{{ u.name }}</div>
                  <div class="sr-email">{{ u.email }}</div>
                </div>
              </div>
            </div>
          </div>

          <select v-model="newPerm" class="perm-select">
            <option value="view">View</option>
            <option value="edit">Edit</option>
          </select>
        </div>

        <div v-if="selectedUser" class="selected-user">
          <UserAvatar :name="selectedUser.name" :color="selectedUser.avatar_color" :size="24" />
          <span>{{ selectedUser.name }} ({{ selectedUser.email }})</span>
          <button class="btn btn-icon btn-ghost btn-sm" @click="selectedUser = null; searchQ = ''">✕</button>
        </div>

        <p v-if="shareError" class="form-error">{{ shareError }}</p>

        <button
          class="btn btn-primary"
          :disabled="!selectedUser || adding"
          @click="addShare"
          style="margin-top: 10px;"
        >
          <span v-if="adding" class="spinner" style="width:12px;height:12px;border-width:2px" />
          Invite
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useNotesStore } from '@/stores/notes.js'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast.js'
import { api } from '@/lib/api.js'
import { debounce } from '@/lib/utils.js'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const emit = defineEmits(['close'])

const notesStore = useNotesStore()
const auth = useAuthStore()
const toast = useToastStore()

const shares = ref([])
const searchQ = ref('')
const searchResults = ref([])
const selectedUser = ref(null)
const newPerm = ref('view')
const adding = ref(false)
const shareError = ref('')

const noteId = notesStore.activeNoteId

onMounted(loadShares)

async function loadShares() {
  try {
    const data = await api.get(`/shares/${noteId}`)
    shares.value = data.shares
  } catch { /* ignore */ }
}

const onSearch = debounce(async () => {
  if (searchQ.value.length < 2) { searchResults.value = []; return }
  try {
    const data = await api.get(`/users/search?q=${encodeURIComponent(searchQ.value)}`)
    // Filter out already shared users
    const sharedIds = new Set(shares.value.map(s => s.user_id))
    searchResults.value = data.users.filter(u => !sharedIds.has(u.id))
  } catch { searchResults.value = [] }
}, 300)

function selectUser(u) {
  selectedUser.value = u
  searchQ.value = ''
  searchResults.value = []
}

async function addShare() {
  if (!selectedUser.value) return
  shareError.value = ''
  adding.value = true
  try {
    await api.post(`/shares/${noteId}`, { userId: selectedUser.value.id, permission: newPerm.value })
    toast.success(`Shared with ${selectedUser.value.name}`)
    selectedUser.value = null
    await loadShares()
  } catch (e) {
    shareError.value = e.message
  } finally {
    adding.value = false
  }
}

async function updatePerm(userId, permission) {
  try {
    await api.patch(`/shares/${noteId}/${userId}`, { permission })
    toast.success('Permission updated')
    await loadShares()
  } catch (e) {
    toast.error(e.message)
  }
}

async function removeShare(userId) {
  if (!confirm('Remove this person\'s access?')) return
  try {
    await api.delete(`/shares/${noteId}/${userId}`)
    toast.success('Access removed')
    await loadShares()
  } catch (e) {
    toast.error(e.message)
  }
}
</script>

<style scoped>
.share-modal { max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.modal-title { font-size: 17px; font-weight: 700; }

.share-section { margin-bottom: 20px; }
.section-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
.share-list { display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
.share-item { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: var(--radius); }
.share-item.owner { background: var(--bg-elevated); }
.share-info { flex: 1; min-width: 0; }
.share-name { font-size: 13px; font-weight: 500; display: block; }
.share-email { font-size: 11px; color: var(--text-muted); display: block; }
.share-empty { font-size: 12px; color: var(--text-muted); padding: 8px 0; }

.perm-select {
  background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--text-primary); padding: 0 12px; font-size: 13px; outline: none; cursor: pointer;
  height: 38px; /* Matching .input */
}


.invite-row { display: flex; gap: 8px; align-items: flex-start; }
.search-wrap { position: relative; flex: 1; }
.search-dropdown {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
  background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius);
  box-shadow: var(--shadow-lg); margin-top: 4px; max-height: 180px; overflow-y: auto;
}
.search-result { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; transition: background 0.15s; }
.search-result:hover { background: var(--bg-hover); }
.sr-name { font-size: 13px; font-weight: 500; }
.sr-email { font-size: 11px; color: var(--text-muted); }

.selected-user { display: flex; align-items: center; gap: 8px; margin-top: 8px; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: var(--radius); padding: 8px 10px; font-size: 13px; }
</style>
