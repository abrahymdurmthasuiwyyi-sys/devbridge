const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let query = `SELECT j.*, u.name AS poster_name FROM jobs j JOIN users u ON j.user_id = u.id WHERE j.is_active = TRUE`;
    const params = [];
    if (type && type !== 'all') { query += ' AND j.type = ?'; params.push(type); }
    query += ' ORDER BY j.created_at DESC';
    const [jobs] = await db.query(query, params);
    res.json({ success: true, jobs });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, company, location, type, salary_min, salary_max, currency, description, skills } = req.body;
    const [result] = await db.query('INSERT INTO jobs (user_id, title, company, location, type, salary_min, salary_max, currency, description, skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, company, location, type, salary_min, salary_max, currency || 'USD', description, JSON.stringify(skills)]);
    res.status(201).json({ success: true, jobId: result.insertId });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

module.exports = router;
