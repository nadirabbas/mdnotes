import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pool, initDb } from './db.js';
import authRoutes from './routes/auth.js';
import noteRoutes from './routes/notes.js';
import userRoutes from './routes/users.js';
import shareRoutes from './routes/shares.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { authMiddleware } from './middleware/auth.js';

// Global error handling to prevent process crashes
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Caught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', authMiddleware, noteRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/shares', authMiddleware, shareRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Socket.IO setup
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

initDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`\x1b[32m✓\x1b[0m mdnotes server running on port \x1b[36m${PORT}\x1b[0m`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

export { io };
