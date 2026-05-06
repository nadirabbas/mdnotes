<template>
  <aside :class="['sidebar', { collapsed: !open }]">
    <!-- Toggle -->
    <button class="sidebar-toggle" @click="open = !open" :title="open ? 'Collapse sidebar' : 'Expand sidebar'">
      <svg class="toggle-icon" :class="{ flipped: !open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7"/></svg>
    </button>

    <div v-show="open" class="sidebar-inner">
      <!-- Header -->
      <div class="sidebar-header">
        <div class="brand">
          <span class="brand-logo">✨</span>
          <span class="brand-name">mdnotes</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-icon btn-ghost header-btn" @click="notes.createNote()" title="New note">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <router-link to="/profile" class="btn btn-icon btn-ghost header-btn" title="Profile">
            <UserAvatar :name="auth.user?.name" :color="auth.user?.avatar_color" :size="18" />
          </router-link>
        </div>
      </div>

      <!-- Search -->
      <div class="sidebar-search">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input v-model="notes.searchQuery" placeholder="Search notes..." class="search-input" />
        <button v-if="notes.searchQuery" class="search-clear" @click="notes.searchQuery = ''">✕</button>
      </div>

      <!-- Notes list -->
      <div class="sidebar-list custom-scroll">
        <div
          v-for="note in notes.filteredNotes"
          :key="note.id"
          :class="['note-item', { active: notes.activeNoteId === note.id }]"
          @click="notes.activeNoteId = note.id"
        >
          <div class="note-item-header">
            <span class="note-title">{{ note.title || 'Untitled' }}</span>
            <div class="note-actions">
              <span v-if="note.permission !== 'owner'" class="badge badge-indigo" style="font-size:9px;padding:1px 5px">{{ note.permission }}</span>
              <button
                v-if="note.permission === 'owner'"
                class="note-delete-btn"
                @click.stop="handleDelete(note.id)"
                title="Delete note"
              >✕</button>
            </div>
          </div>
          <div class="note-meta">
            <span>{{ formatDate(note.updated_at) }}</span>
            <span v-if="note.permission !== 'owner'" class="note-owner">by {{ note.owner_name }}</span>
          </div>
          <p class="note-preview">{{ getPreview(note.content) }}</p>
        </div>

        <div v-if="!notes.filteredNotes.length" class="sidebar-empty">
          <span v-if="notes.searchQuery">No notes match "{{ notes.searchQuery }}"</span>
          <span v-else>No notes yet. Create one!</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="sidebar-footer">
        <button class="btn btn-ghost btn-sm w-full" @click="auth.logout()" style="justify-content:center">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sign out
        </button>
      </div>
    </div>

    <!-- Collapsed icon -->
    <div v-show="!open" class="sidebar-collapsed-icons">
      <button class="btn btn-icon btn-ghost" @click="notes.createNote(); open = true" title="New note">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
      </button>
      <router-link to="/profile" class="btn btn-icon btn-ghost">
        <UserAvatar :name="auth.user?.name" :color="auth.user?.avatar_color" :size="26" />
      </router-link>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { useNotesStore } from '@/stores/notes.js'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast.js'
import { formatDate } from '@/lib/utils.js'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const notes = useNotesStore()
const auth = useAuthStore()
const toast = useToastStore()
const open = ref(true)

function getPreview(content) {
  if (!content) return ''
  return content.replace(/[#*`>\[\]]/g, '').slice(0, 80).trim()
}

async function handleDelete(id) {
  if (!confirm('Delete this note?')) return
  try {
    await notes.deleteNote(id)
    toast.success('Note deleted')
  } catch (e) {
    toast.error(e.message)
  }
}
</script>

<style scoped>
.sidebar {
  width: 280px; min-width: 280px; height: 100vh; overflow: hidden;
  background: var(--bg-surface); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; transition: width 0.3s ease, min-width 0.3s ease;
  position: relative;
}
.sidebar.collapsed { width: 52px; min-width: 52px; }

.sidebar-toggle {
  position: absolute; right: -12px; top: 20px; z-index: 100;
  width: 24px; height: 24px; border-radius: 50%; background: var(--bg-surface);
  border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; color: var(--text-secondary);
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
}
.sidebar-toggle:hover { background: var(--bg-elevated); color: var(--accent); border-color: var(--accent); }
.toggle-icon { width: 12px; height: 12px; transition: transform 0.3s; }
.toggle-icon.flipped { transform: rotate(180deg); }


.sidebar-inner { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.brand { display: flex; align-items: center; gap: 8px; }
.brand-logo { font-size: 18px; }
.brand-name { font-weight: 800; font-size: 15px; letter-spacing: -0.03em; }
.header-actions { display: flex; align-items: center; gap: 6px; }
.header-btn { width: 32px !important; height: 32px !important; display: flex; align-items: center; justify-content: center; }


.sidebar-search {
  position: relative; display: flex; align-items: center;
  padding: 10px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.search-icon { position: absolute; left: 22px; width: 14px; height: 14px; color: var(--text-muted); flex-shrink: 0; }
.search-input {
  width: 100%; background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 7px 28px 7px 32px; font-size: 13px;
  color: var(--text-primary); outline: none; transition: border-color 0.2s;
}
.search-input:focus { border-color: var(--border-focus); }
.search-input::placeholder { color: var(--text-muted); }
.search-clear { position: absolute; right: 20px; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 11px; }
.search-clear:hover { color: var(--text-primary); }

.sidebar-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
.custom-scroll::-webkit-scrollbar { width: 3px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }

.note-item {
  padding: 10px 12px; border-radius: var(--radius); cursor: pointer;
  border: 1px solid transparent; transition: all 0.15s;
}
.note-item:hover { background: var(--bg-hover); border-color: var(--border); }
.note-item.active { background: var(--bg-active); border-color: var(--border-light); }

.note-item-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.note-title { font-size: 13px; font-weight: 600; color: var(--text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.note-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.note-delete-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 11px; opacity: 0; transition: opacity 0.15s, color 0.15s; padding: 2px 4px; }
.note-item:hover .note-delete-btn { opacity: 1; }
.note-delete-btn:hover { color: var(--danger); }

.note-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 3px; }
.note-meta span { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); letter-spacing: 0.02em; }
.note-owner { font-style: italic; }
.note-preview { font-size: 11px; color: var(--text-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sidebar-empty { padding: 24px 12px; text-align: center; font-size: 12px; color: var(--text-muted); }

.sidebar-footer { padding: 10px 12px; border-top: 1px solid var(--border); flex-shrink: 0; }
.w-full { width: 100%; }

.sidebar-collapsed-icons { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 60px 0 16px; }
</style>
