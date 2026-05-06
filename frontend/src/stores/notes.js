import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api.js'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref([])
  const activeNoteId = ref(null)
  const loading = ref(false)
  const searchQuery = ref('')

  const activeNote = computed(() => notes.value.find(n => n.id === activeNoteId.value) || null)

  const filteredNotes = computed(() => {
    const q = searchQuery.value.toLowerCase()
    let list = notes.value
    if (q) {
      list = list.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
      )
    }
    return list.slice().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  })

  async function fetchNotes() {
    loading.value = true
    try {
      const data = await api.get('/notes')
      notes.value = data.notes
    } finally {
      loading.value = false
    }
  }

  async function createNote() {
    const data = await api.post('/notes', { title: 'Untitled', content: '' })
    notes.value.unshift(data.note)
    activeNoteId.value = data.note.id
    return data.note
  }

  async function updateNote(id, patch) {
    // Optimistic update
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx !== -1) Object.assign(notes.value[idx], patch)
    await api.patch(`/notes/${id}`, patch)
  }

  async function deleteNote(id) {
    await api.delete(`/notes/${id}`)
    notes.value = notes.value.filter(n => n.id !== id)
    if (activeNoteId.value === id) {
      activeNoteId.value = notes.value[0]?.id || null
    }
  }

  // Called from socket updates (remote edits)
  function applyRemoteUpdate(noteId, patch) {
    const idx = notes.value.findIndex(n => n.id === noteId)
    if (idx !== -1) Object.assign(notes.value[idx], patch, { updated_at: new Date().toISOString() })
  }

  return {
    notes, activeNoteId, loading, searchQuery, activeNote, filteredNotes,
    fetchNotes, createNote, updateNote, deleteNote, applyRemoteUpdate
  }
})
