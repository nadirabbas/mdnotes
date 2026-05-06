import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const router = Router();

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, avatar_color, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.patch('/profile', async (req, res) => {
  try {
    const { name, bio, avatar_color } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }
    if (avatar_color !== undefined) { updates.push(`avatar_color = $${idx++}`); values.push(avatar_color); }

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, avatar_color, bio`,
      values
    );
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users (for sharing)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const { rows } = await pool.query(
      `SELECT id, name, email, avatar_color FROM users
       WHERE id != $1 AND (LOWER(name) LIKE $2 OR LOWER(email) LIKE $2)
       LIMIT 10`,
      [req.user.id, `%${q.toLowerCase()}%`]
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
