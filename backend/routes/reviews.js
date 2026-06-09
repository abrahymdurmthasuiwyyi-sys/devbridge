const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [reviews] = await db.query(`SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.is_approved = TRUE ORDER BY r.created_at DESC`);
    const [stats] = await db.query(`SELECT COUNT(*) AS total, AVG(rating) AS average, SUM(rating=5) AS five_star, SUM(rating=4) AS four_star, SUM(rating=3) AS three_star, SUM(rating=2) AS two_star, SUM(rating=1) AS one_star FROM reviews WHERE is_approved = TRUE`);
    res.json({ success: true, reviews, stats: stats[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { rating, title, content, category } = req.body;
    if (!rating || !title || !content) return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    const [result] = await db.query('INSERT INTO reviews (user_id, rating, title, content, category) VALUES (?, ?, ?, ?, ?)', [req.user.id, rating, title, content, category || 'General']);
    const [review] = await db.query(`SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?`, [result.insertId]);
    res.status(201).json({ success: true, review: review[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

module.exports = router;
