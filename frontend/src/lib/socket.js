import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth.js'

let socket = null

export function getSocket() {
  if (!socket) {
    const auth = useAuthStore()
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      auth: { token: auth.token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => console.log('Socket connected:', socket.id))
    socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason))
    socket.on('connect_error', (err) => console.error('Socket error:', err.message))
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
