<template>
  <div class="chat-panel">
    <div class="chat-header">
      <span class="chat-title">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Live Chat
      </span>
      <button class="btn btn-icon btn-ghost btn-sm" @click="$emit('close')">✕</button>
    </div>

    <div class="chat-messages" ref="messagesRef">
      <div v-if="loading" class="chat-loading">
        <span class="spinner" style="width:16px;height:16px;border-width:2px" />
      </div>
      <div v-else-if="!messages.length" class="chat-empty">No messages yet. Say hi! 👋</div>
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['chat-msg', { mine: msg.user_id === auth.user?.id }]"
      >
        <UserAvatar v-if="msg.user_id !== auth.user?.id" :name="msg.name" :color="msg.avatar_color" :size="22" />
        <div class="msg-content-wrap">
          <div v-if="msg.user_id !== auth.user?.id" class="msg-author">{{ msg.name }}</div>
          <div class="msg-bubble">{{ msg.message }}</div>
          <div class="msg-time">{{ formatTime(msg.created_at) }}</div>
        </div>
      </div>
    </div>

    <form class="chat-input-row" @submit.prevent="sendMessage">
      <input
        v-model="inputText"
        class="chat-input"
        placeholder="Type a message…"
        maxlength="500"
        :disabled="sending"
      />
      <button type="submit" class="btn btn-primary btn-sm" :disabled="!inputText.trim() || sending">Send</button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { api } from '@/lib/api.js'
import { getSocket } from '@/lib/socket.js'
import UserAvatar from '@/components/ui/UserAvatar.vue'

const props = defineProps({ noteId: { type: String, required: true } })
const emit = defineEmits(['close', 'new-message'])

const auth = useAuthStore()
const messages = ref([])
const inputText = ref('')
const loading = ref(true)
const sending = ref(false)
const messagesRef = ref(null)

let socket = null

onMounted(async () => {
  socket = getSocket()
  socket.on('chat:message', onNewMessage)

  try {
    const data = await api.get(`/notes/${props.noteId}/chat`)
    messages.value = data.messages
  } catch { /* ignore */ }
  loading.value = false
  await nextTick()
  scrollToBottom()
})

onUnmounted(() => {
  socket?.off('chat:message', onNewMessage)
})

function onNewMessage(msg) {
  if (msg.noteId !== props.noteId) return
  messages.value.push(msg)
  nextTick(scrollToBottom)
  if (msg.user_id !== auth.user?.id) emit('new-message')
}

async function sendMessage() {
  const msg = inputText.value.trim()
  if (!msg) return
  inputText.value = ''
  sending.value = true
  try {
    socket?.emit('chat:send', { noteId: props.noteId, message: msg })
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.chat-panel {
  display: flex; flex-direction: column; border-left: 1px solid var(--border);
  background: var(--bg-surface); height: 100%;
}
.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.chat-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.chat-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
.chat-loading, .chat-empty { display: flex; align-items: center; justify-content: center; flex: 1; color: var(--text-muted); font-size: 12px; }
.chat-msg { display: flex; gap: 6px; align-items: flex-end; }
.chat-msg.mine { flex-direction: row-reverse; }
.msg-content-wrap { display: flex; flex-direction: column; max-width: 80%; }
.msg-author { font-size: 10px; color: var(--text-muted); margin-bottom: 2px; padding-left: 2px; }
.chat-msg.mine .msg-author { text-align: right; padding-right: 2px; }
.msg-bubble {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: 12px; padding: 8px 12px; font-size: 13px; line-height: 1.4; word-break: break-word;
}
.chat-msg.mine .msg-bubble { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.3); color: var(--text-primary); }
.msg-time { font-size: 9px; color: var(--text-muted); margin-top: 2px; padding: 0 4px; font-family: var(--font-mono); }
.chat-msg.mine .msg-time { text-align: right; }
.chat-input-row { display: flex; gap: 6px; padding: 10px 12px; border-top: 1px solid var(--border); flex-shrink: 0; }
.chat-input {
  flex: 1; background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 7px 12px; font-size: 13px; color: var(--text-primary); outline: none;
  transition: border-color 0.2s;
}
.chat-input:focus { border-color: var(--border-focus); }
.chat-input::placeholder { color: var(--text-muted); }
</style>
