import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Get all notes for current user (owned + shared)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT n.id, n.title, n.content, n.created_at, n.updated_at, n.owner_id,
             u.name as owner_name, u.avatar_color as owner_color,
             CASE WHEN n.owner_id = $1 THEN 'owner' ELSE ns.permission END as permission
      FROM notes n
      JOIN users u ON u.id = n.owner_id
      LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.user_id = $1
      WHERE n.owner_id = $1 OR ns.user_id = $1
      ORDER BY n.updated_at DESC
    `, [req.user.id]);
    res.json({ notes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single note
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT n.id, n.title, n.content, n.created_at, n.updated_at, n.owner_id,
             u.name as owner_name, u.avatar_color as owner_color,
             CASE WHEN n.owner_id = $1 THEN 'owner' ELSE ns.permission END as permission
      FROM notes n
      JOIN users u ON u.id = n.owner_id
      LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.user_id = $1
      WHERE n.id = $2 AND (n.owner_id = $1 OR ns.user_id = $1)
    `, [req.user.id, req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Note not found' });
    res.json({ note: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create note
router.post('/', async (req, res) => {
  try {
    const { title = 'Untitled', content = '' } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO notes (owner_id, title, content) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, title, content]
    );
    res.status(201).json({ note: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update note
router.patch('/:id', async (req, res) => {
  try {
    // Check permissions
    const perm = await pool.query(`
      SELECT CASE WHEN n.owner_id = $1 THEN 'owner' ELSE ns.permission END as permission
      FROM notes n
      LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.user_id = $1
      WHERE n.id = $2 AND (n.owner_id = $1 OR ns.user_id = $1)
    `, [req.user.id, req.params.id]);

    if (!perm.rows.length) return res.status(404).json({ error: 'Note not found' });
    if (perm.rows[0].permission === 'view') return res.status(403).json({ error: 'Read-only access' });

    const { title, content } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (content !== undefined) { updates.push(`content = $${idx++}`); values.push(content); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE notes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json({ note: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete note (owner only)
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Note not found or not authorized' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat messages for a note
router.get('/:id/chat', async (req, res) => {
  try {
    // Verify access
    const access = await pool.query(`
      SELECT 1 FROM notes n
      LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.user_id = $1
      WHERE n.id = $2 AND (n.owner_id = $1 OR ns.user_id = $1)
    `, [req.user.id, req.params.id]);
    if (!access.rows.length) return res.status(403).json({ error: 'Access denied' });

    const { rows } = await pool.query(`
      SELECT cm.id, cm.message, cm.created_at, u.id as user_id, u.name, u.avatar_color
      FROM chat_messages cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.note_id = $1
      ORDER BY cm.created_at ASC
      LIMIT 200
    `, [req.params.id]);
    res.json({ messages: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate title using Gemini
router.post('/:id/gen-title', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    // Verify access
    const perm = await pool.query(`
      SELECT 1 FROM notes n
      LEFT JOIN note_shares ns ON ns.note_id = n.id AND ns.user_id = $1
      WHERE n.id = $2 AND (n.owner_id = $1 OR ns.user_id = $1)
    `, [req.user.id, id]);
    if (!perm.rows.length) return res.status(404).json({ error: 'Note not found' });

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a title generator. Generate a concise title (max 6 words) for the following note content. Return ONLY the title text, no quotes or explanation:
    
    ${content.substring(0, 5000)}`;

    const result = await model.generateContent(prompt);

    const title = result.response.text().trim().replace(/^"|"$/g, '');

    res.json({ title });
  } catch (err) {
    console.error('Gemini Error:', err);
    res.status(500).json({ error: 'Failed to generate title' });
  }
});

export default router;
