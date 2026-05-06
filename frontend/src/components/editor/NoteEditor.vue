<template>
  <div class="editor-wrapper" @mousemove="onMouseMove" ref="editorWrapper">
    <!-- Remote mouse pointers -->
    <RemotePointer
      v-for="p in remotePointers"
      :key="p.socketId"
      :name="p.name"
      :color="p.color"
      :x="p.x"
      :y="p.y"
    />

    <!-- Toolbar -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <input
          v-model="localTitle"
          class="title-input"
          placeholder="Note Title"
          @input="onTitleChange"
          :readonly="isReadOnly"
        />
        <button
          v-if="!isReadOnly && localContent.length > 10"
          class="btn btn-ghost btn-sm ai-btn"
          @click="generateTitle"
          :disabled="generatingTitle"
          title="Auto-generate title with Gemini"
        >
          <span v-if="generatingTitle" class="spinner" style="width:10px;height:10px;border-width:1.5px" />
          <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
          AI Title
        </button>
        <!-- Active collaborators -->
        <div class="collaborators" v-if="activeUsers.length > 1">
          <UserAvatar
            v-for="u in activeUsers.slice(0, 5)"
            :key="u.socketId"
            :name="u.name"
            :color="u.color"
            :size="24"
            :title="u.name"
            class="collab-avatar"
          />
          <span v-if="activeUsers.length > 5" class="collab-more">+{{ activeUsers.length - 5 }}</span>
        </div>
      </div>

      <div class="toolbar-right">
        <span v-if="saving" class="saving-indicator">
          <span class="spinner" style="width:12px;height:12px;border-width:2px;" />
          Saving…
        </span>
        <span v-else-if="lastSaved" class="saved-indicator">✓ Saved</span>

        <button
          v-if="note.permission === 'owner'"
          class="btn btn-ghost btn-sm"
          @click="$emit('share')"
          title="Share this note"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>

        <button
          class="btn btn-ghost btn-sm"
          :class="{ active: showChat }"
          @click="showChat = !showChat"
          title="Toggle chat"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat
          <span v-if="unreadCount > 0" class="chat-badge">{{ unreadCount }}</span>
        </button>

        <button class="btn btn-ghost btn-sm" @click="previewMode = !previewMode">
          {{ previewMode ? 'Edit' : 'Preview' }}
        </button>
      </div>
    </div>

    <!-- Editor + Preview + Chat -->
    <div class="editor-body">
      <!-- Editor pane -->
      <div
        v-show="!previewMode"
        class="editor-pane-container"
        :style="{ width: editorWidth + 'px' }"
      >
        <div class="editor-scroll-container custom-scrollbar">
          <div class="line-numbers" ref="lineNumbersRef" style="overflow:hidden">
            <div v-for="n in lineCount" :key="n" class="line-no">{{ n }}</div>
          </div>

          <textarea
            ref="textareaRef"
            v-model="localContent"
            class="editor-textarea"
            placeholder="Write markdown here…"
            @input="onContentChange"
            @scroll="syncScroll"
            @keyup="onCursorMove"
            @click="onCursorMove"
            @select="onCursorMove"
            :readonly="isReadOnly"
            spellcheck="false"
          />
        </div>
      </div>

      <!-- Resize handle -->
      <div v-show="!previewMode" class="resizer" @mousedown="startResize" />

      <!-- Preview pane -->
      <div
        class="preview-pane prose custom-scrollbar"
        :style="previewMode ? { flex: 1 } : { flex: 1 }"
        ref="previewRef"
        v-html="renderedMarkdown"
      />

      <!-- Chat panel -->
      <transition name="slide-up">
        <ChatPanel
          v-if="showChat"
          :note-id="note.id"
          @close="showChat = false"
          @new-message="onNewChatMessage"
          style="width: 300px; flex-shrink: 0;"
        />
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useNotesStore } from '@/stores/notes.js'
import { useAuthStore } from '@/stores/auth.js'
import { useToastStore } from '@/stores/toast.js'
import { api } from '@/lib/api.js'
import { renderMarkdown, debounce } from '@/lib/utils.js'
import { getSocket } from '@/lib/socket.js'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import ChatPanel from '@/components/editor/ChatPanel.vue'
import RemotePointer from '@/components/editor/RemotePointer.vue'

const emit = defineEmits(['share'])

const notesStore = useNotesStore()
const auth = useAuthStore()
const toast = useToastStore()

const note = computed(() => notesStore.activeNote)
const isReadOnly = computed(() => note.value?.permission === 'view')

const localTitle = ref('')
const localContent = ref('')
const saving = ref(false)
const lastSaved = ref(false)
const previewMode = ref(false)
const showChat = ref(false)
const unreadCount = ref(0)
const editorWidth = ref(window.innerWidth / 2 - 100)
const textareaRef = ref(null)
const lineNumbersRef = ref(null)
const previewRef = ref(null)
const editorWrapper = ref(null)
const generatingTitle = ref(false)

// ... (other refs)

function syncScroll() {
  if (textareaRef.value && lineNumbersRef.value) {
    lineNumbersRef.value.scrollTop = textareaRef.value.scrollTop
  }
}


// Collaborators
const activeUsers = ref([])
const remotePointers = ref([])

// Markdown preview
const renderedMarkdown = computed(() => renderMarkdown(localContent.value))
const lineCount = computed(() => (localContent.value.split('\n').length) || 1)

// Socket setup
const socket = getSocket()

// Sync with store when active note changes
watch(() => note.value?.id, (newId, oldId) => {
  if (oldId) leaveNote(oldId)
  if (newId) {
    localTitle.value = note.value.title || ''
    localContent.value = note.value.content || ''
    lastSaved.value = false
    activeUsers.value = []
    remotePointers.value = []
    joinNote(newId)
  }
}, { immediate: true })

onMounted(() => {
  socket.on('note:updated', onRemoteUpdate)
  socket.on('note:users', (users) => { activeUsers.value = users })
  socket.on('cursor:updated', onRemoteCursor)
  socket.on('pointer:updated', onRemotePointer)
  socket.on('pointer:left', ({ socketId }) => {
    remotePointers.value = remotePointers.value.filter(p => p.socketId !== socketId)
  })
})

onUnmounted(() => {
  if (note.value) leaveNote(note.value.id)
  socket.off('note:updated', onRemoteUpdate)
  socket.off('note:users')
  socket.off('cursor:updated', onRemoteCursor)
  socket.off('pointer:updated', onRemotePointer)
  socket.off('pointer:left')
})

function joinNote(noteId) {
  socket?.emit('join:note', { noteId })
}

function leaveNote(noteId) {
  socket?.emit('leave:note', { noteId })
}

function onRemoteUpdate({ noteId, content, title, userId }) {
  if (userId === auth.user?.id) return
  if (noteId !== note.value?.id) return
  if (content !== undefined) localContent.value = content
  if (title !== undefined) localTitle.value = title
  notesStore.applyRemoteUpdate(noteId, { content, title })
}

function onRemoteCursor(data) {
  // Could render cursor position in textarea — simplified here
}

function onRemotePointer(data) {
  const idx = remotePointers.value.findIndex(p => p.socketId === data.socketId)
  if (idx !== -1) remotePointers.value[idx] = data
  else remotePointers.value.push(data)
}

// Debounced save to DB
const debouncedSave = debounce(async () => {
  if (!note.value || isReadOnly.value) return
  saving.value = true
  try {
    await notesStore.updateNote(note.value.id, {
      title: localTitle.value,
      content: localContent.value,
    })
    lastSaved.value = true
    setTimeout(() => { lastSaved.value = false }, 2000)
  } catch (e) {
    toast.error('Failed to save: ' + e.message)
  } finally {
    saving.value = false
  }
}, 800)

async function generateTitle() {
  if (!note.value || generatingTitle.value) return
  generatingTitle.value = true
  try {
    const data = await api.post(`/notes/${note.value.id}/gen-title`, { content: localContent.value })
    localTitle.value = data.title
    onTitleChange()
    toast.success('Title generated!')
  } catch (e) {
    toast.error(e.message)
  } finally {
    generatingTitle.value = false
  }
}

function onContentChange() {
  if (isReadOnly.value) return
  socket?.emit('note:update', {
    noteId: note.value.id,
    content: localContent.value,
  })
  notesStore.applyRemoteUpdate(note.value.id, { content: localContent.value })
  debouncedSave()
  // Inject copy buttons after render
  nextTick(injectCopyButtons)
}

function onTitleChange() {
  if (isReadOnly.value) return
  socket?.emit('note:update', {
    noteId: note.value.id,
    title: localTitle.value,
  })
  notesStore.applyRemoteUpdate(note.value.id, { title: localTitle.value })
  debouncedSave()
}

function onCursorMove() {
  if (!textareaRef.value || !note.value) return
  socket?.emit('cursor:update', {
    noteId: note.value.id,
    position: textareaRef.value.selectionStart,
  })
}

// Mouse pointer tracking (throttled)
let lastPointerEmit = 0
function onMouseMove(e) {
  if (!note.value || !editorWrapper.value) return
  const now = Date.now()
  if (now - lastPointerEmit < 50) return
  lastPointerEmit = now
  const rect = editorWrapper.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  socket?.emit('pointer:update', { noteId: note.value.id, x, y })
}

function onNewChatMessage() {
  if (!showChat.value) unreadCount.value++
}

watch(showChat, (v) => { if (v) unreadCount.value = 0 })

// Resize handle
function startResize(e) {
  const startX = e.clientX
  const startW = editorWidth.value
  const onMove = (me) => {
    editorWidth.value = Math.max(200, Math.min(startW + (me.clientX - startX), window.innerWidth - 300))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Inject copy buttons into code blocks in preview
function injectCopyButtons() {
  if (!previewRef.value) return
  previewRef.value.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-btn')) return
    const btn = document.createElement('button')
    btn.className = 'copy-btn'
    btn.innerText = 'COPY'
    btn.onclick = () => {
      const code = pre.querySelector('code')?.innerText || ''
      navigator.clipboard.writeText(code)
      btn.innerText = 'COPIED!'
      setTimeout(() => { btn.innerText = 'COPY' }, 2000)
    }
    pre.style.position = 'relative'
    pre.appendChild(btn)
  })
}

watch(renderedMarkdown, () => nextTick(injectCopyButtons))
</script>

<style scoped>
.editor-wrapper {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;
}

.editor-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0;
  background: var(--bg-surface);
}
.toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.toolbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.title-input {
  background: transparent; border: none; outline: none; font-size: 16px; font-weight: 700;
  color: var(--text-primary); flex: 1; min-width: 0;
}
.title-input::placeholder { color: var(--text-muted); font-weight: 400; }
.title-input:read-only { cursor: default; }

.collaborators { display: flex; align-items: center; gap: -4px; }
.collab-avatar { border: 2px solid var(--bg-base); margin-left: -6px; }
.collab-avatar:first-child { margin-left: 0; }
.collab-more { font-size: 11px; color: var(--text-secondary); margin-left: 6px; }

.saving-indicator { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
.saved-indicator { font-size: 11px; color: var(--success); font-family: var(--font-mono); }

.btn.active { background: var(--bg-active); color: var(--text-primary); }
.chat-badge { background: var(--accent); color: #fff; border-radius: 10px; padding: 0 5px; font-size: 10px; font-weight: 700; min-width: 16px; text-align: center; }

.editor-body {
  flex: 1; display: flex; overflow: hidden;
}

.editor-pane-container { display: flex; flex-direction: column; border-right: 1px solid var(--border); }
.editor-textarea {
  flex: 1; padding: 24px; background: var(--bg-base); color: var(--text-primary);
  border: none; outline: none; resize: none; font-family: var(--font-mono); font-size: 14px;
  line-height: 1.7; tab-size: 2; overflow-y: auto; width: 100%;
}
.editor-textarea::-webkit-scrollbar { width: 4px; }
.editor-textarea::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }

.resizer { width: 4px; background: transparent; cursor: col-resize; transition: background 0.2s; flex-shrink: 0; }
.resizer:hover { background: var(--accent); }

.preview-pane {
  flex: 1; padding: 24px 32px; overflow-y: auto; background: var(--bg-base);
  min-width: 0;
}
.preview-pane::-webkit-scrollbar { width: 4px; }
.preview-pane::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
</style>
