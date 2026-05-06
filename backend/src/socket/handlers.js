import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { pool } from '../db.js';

// Track active users per note: noteId -> Map<socketId, userInfo>
const activeUsers = new Map();
// Track Yjs Docs per note: noteId -> Y.Doc
const yDocs = new Map();

function getYDoc(noteId) {
  if (!yDocs.has(noteId)) {
    const doc = new Y.Doc();
    yDocs.set(noteId, doc);
  }
  return yDocs.get(noteId);
}

function getNoteUsers(noteId) {
  if (!activeUsers.has(noteId)) activeUsers.set(noteId, new Map());
  return activeUsers.get(noteId);
}

export function setupSocketHandlers(io) {
  // Auth middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-dev-key-change-in-prod');
      const { rows } = await pool.query(
        'SELECT id, name, email, avatar_color FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (!rows.length) return next(new Error('User not found'));

      socket.user = rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.id})`);

    // Join a note room
    socket.on('join:note', async ({ noteId }) => {
      try {
        // Verify access and get permission
        const { rows } = await pool.query(`
          SELECT CASE WHEN n.owner_id = $1 THEN 'owner' ELSE ns.permission END as permission
          FROM notes n
          LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.user_id = $1
          WHERE n.id = $2 AND (n.owner_id = $1 OR ns.user_id = $1)
        `, [socket.user.id, noteId]);

        if (!rows.length) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const permission = rows[0].permission;

        // Leave previous note rooms
        const prevRoom = socket.currentNoteId;
        if (prevRoom) {
          socket.leave(prevRoom);
          const users = getNoteUsers(prevRoom);
          users.delete(socket.id);
          io.to(prevRoom).emit('note:users', Array.from(users.values()));
        }

        socket.join(noteId);
        socket.currentNoteId = noteId;

        // Initialize YDoc with DB content if first join
        const doc = getYDoc(noteId);
        const yText = doc.getText('content');
        if (yText.length === 0) {
          const noteData = await pool.query('SELECT content FROM notes WHERE id = $1', [noteId]);
          if (noteData.rows[0]?.content) {
            yText.insert(0, noteData.rows[0].content);
          }
        }

        const users = getNoteUsers(noteId);
        users.set(socket.id, {
          id: socket.user.id,
          name: socket.user.name,
          color: socket.user.avatar_color,
          socketId: socket.id,
          permission,
          cursor: null,
          pointer: null,
        });

        // Broadcast updated user list
        io.to(noteId).emit('note:users', Array.from(users.values()));
        
        // Send initial state
        const state = Y.encodeStateAsUpdate(doc);
        socket.emit('note:init', { noteId, state: Buffer.from(state) });
        
        socket.emit('note:joined', { noteId });
      } catch (err) {
        console.error('join:note error:', err);
        socket.emit('error', { message: 'Failed to join note' });
      }
    });

    // Leave note room
    socket.on('leave:note', ({ noteId }) => {
      socket.leave(noteId);
      const users = getNoteUsers(noteId);
      users.delete(socket.id);
      io.to(noteId).emit('note:users', Array.from(users.values()));
      socket.currentNoteId = null;
    });

    // Yjs Update (Binary delta)
    socket.on('y-update', async ({ noteId, update }) => {
      if (!socket.currentNoteId || socket.currentNoteId !== noteId) return;

      const users = getNoteUsers(noteId);
      const user = users.get(socket.id);
      if (!user || user.permission === 'view') return;

      const doc = getYDoc(noteId);
      Y.applyUpdate(doc, new Uint8Array(update));

      // Broadcast to others
      socket.to(noteId).emit('y-updated', { noteId, update });

      // Persist to DB (throttled/debounced)
      try {
        const text = doc.getText('content').toString();
        await pool.query('UPDATE notes SET content = $1, updated_at = NOW() WHERE id = $2', [text, noteId]);
      } catch (err) {
        console.error('y-update DB save error:', err);
      }
    });

    // Real-time metadata update (title)
    socket.on('note:update', async ({ noteId, title }) => {
      if (!socket.currentNoteId || socket.currentNoteId !== noteId) return;

      const users = getNoteUsers(noteId);
      const user = users.get(socket.id);
      if (!user || user.permission === 'view') return;

      if (title !== undefined) {
        socket.to(noteId).emit('note:updated', { noteId, title, userId: socket.user.id });
        await pool.query('UPDATE notes SET title = $1, updated_at = NOW() WHERE id = $2', [title, noteId]);
      }
    });

    // Cursor position (textarea character index)
    socket.on('cursor:update', ({ noteId, start, end }) => {
      if (socket.currentNoteId !== noteId) return;
      const users = getNoteUsers(noteId);
      const user = users.get(socket.id);
      if (user) {
        user.cursor = { start, end };
        socket.to(noteId).emit('cursor:updated', {
          socketId: socket.id,
          userId: socket.user.id,
          name: socket.user.name,
          color: socket.user.avatar_color,
          permission: user.permission,
          start,
          end,
        });
      }
    });

    // Mouse pointer position (relative %)
    socket.on('pointer:update', ({ noteId, x, y, cursorType }) => {
      if (socket.currentNoteId !== noteId) return;
      const users = getNoteUsers(noteId);
      const user = users.get(socket.id);
      if (user) {
        user.pointer = { x, y, cursorType };
        socket.to(noteId).emit('pointer:updated', {
          socketId: socket.id,
          userId: socket.user.id,
          name: socket.user.name,
          color: socket.user.avatar_color,
          x,
          y,
          cursorType,
        });
      }
    });

    // Chat message
    socket.on('chat:send', async ({ noteId, message }) => {
      if (!message?.trim() || !socket.currentNoteId) return;

      try {
        // Verify access
        const access = await pool.query(`
          SELECT 1 FROM notes n
          LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.user_id = $1
          WHERE n.id = $2 AND (n.owner_id = $1 OR ns.user_id = $1)
        `, [socket.user.id, noteId]);

        if (!access.rows.length) return;

        const { rows } = await pool.query(
          'INSERT INTO chat_messages (note_id, user_id, message) VALUES ($1, $2, $3) RETURNING id, created_at',
          [noteId, socket.user.id, message.trim()]
        );

        io.to(noteId).emit('chat:message', {
          id: rows[0].id,
          noteId,
          message: message.trim(),
          created_at: rows[0].created_at,
          user_id: socket.user.id,
          name: socket.user.name,
          avatar_color: socket.user.avatar_color,
        });
      } catch (err) {
        console.error('chat:send error:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user?.name} (${socket.id})`);
      const noteId = socket.currentNoteId;
      if (noteId) {
        const users = getNoteUsers(noteId);
        users.delete(socket.id);
        io.to(noteId).emit('note:users', Array.from(users.values()));
        // Notify others that pointer/cursor is gone
        io.to(noteId).emit('pointer:left', { socketId: socket.id });
      }
    });
  });
}
