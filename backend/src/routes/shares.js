import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// List shares for a note
router.get('/:noteId', async (req, res) => {
  try {
    // Must be owner
    const own = await pool.query('SELECT id FROM notes WHERE id = $1 AND owner_id = $2', [req.params.noteId, req.user.id]);
    if (!own.rows.length) return res.status(403).json({ error: 'Not authorized' });

    const { rows } = await pool.query(`
      SELECT ns.id, ns.permission, ns.created_at, u.id as user_id, u.name, u.email, u.avatar_color
      FROM note_shares ns
      JOIN users u ON u.id = ns.user_id
      WHERE ns.note_id = $1
    `, [req.params.noteId]);
    res.json({ shares: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Share a note
router.post('/:noteId', async (req, res) => {
  try {
    const own = await pool.query('SELECT id FROM notes WHERE id = $1 AND owner_id = $2', [req.params.noteId, req.user.id]);
    if (!own.rows.length) return res.status(403).json({ error: 'Not authorized' });

    const { userId, permission = 'view' } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot share with yourself' });

    const { rows } = await pool.query(
      `INSERT INTO note_shares (note_id, user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (note_id, user_id) DO UPDATE SET permission = $3
       RETURNING *`,
      [req.params.noteId, userId, permission]
    );
    res.status(201).json({ share: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update share permission
router.patch('/:noteId/:userId', async (req, res) => {
  try {
    const own = await pool.query('SELECT id FROM notes WHERE id = $1 AND owner_id = $2', [req.params.noteId, req.user.id]);
    if (!own.rows.length) return res.status(403).json({ error: 'Not authorized' });

    const { permission } = req.body;
    await pool.query(
      'UPDATE note_shares SET permission = $1 WHERE note_id = $2 AND user_id = $3',
      [permission, req.params.noteId, req.params.userId]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove share
router.delete('/:noteId/:userId', async (req, res) => {
  try {
    const own = await pool.query('SELECT id FROM notes WHERE id = $1 AND owner_id = $2', [req.params.noteId, req.user.id]);
    if (!own.rows.length) return res.status(403).json({ error: 'Not authorized' });

    await pool.query(
      'DELETE FROM note_shares WHERE note_id = $1 AND user_id = $2',
      [req.params.noteId, req.params.userId]
    );
    res.json({ message: 'Share removed' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
