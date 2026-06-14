const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// جلب كل المشاريع
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    let query = `SELECT p.*, u.name AS poster_name, u.avatar AS poster_avatar 
                 FROM posts p JOIN users u ON p.user_id = u.id 
                 WHERE p.budget IS NOT NULL`;
    const params = [];
    if (category) { query += ' AND p.category = ?'; params.push(category); }
    if (status) { query += ' AND p.status = ?'; params.push(status); }
    query += ' ORDER BY p.created_at DESC';
    const [projects] = await db.query(query, params);
    res.json({ success: true, projects });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

// نشر مشروع جديد
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, budget, category, deadline, tags } = req.body;
    if (!title || !content || !budget) 
      return res.status(400).json({ success: false, message: 'العنوان والوصف والميزانية مطلوبة' });
    const [result] = await db.query(
      'INSERT INTO posts (user_id, title, content, budget, category, deadline, tags, status) VALUES (?, ?, ?, ?, ?, ?, ?, "open")',
      [req.user.id, title, content, budget, category, deadline, JSON.stringify(tags)]
    );
    res.status(201).json({ success: true, projectId: result.insertId });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

// تقديم عرض على مشروع
router.post('/:id/proposals', authMiddleware, async (req, res) => {
  try {
    const { message, price } = req.body;
    const postId = req.params.id;
    const [existing] = await db.query(
      'SELECT id FROM proposals WHERE post_id = ? AND user_id = ?', 
      [postId, req.user.id]
    );
    if (existing.length > 0) 
      return res.status(409).json({ success: false, message: 'قدمت عرضاً على هذا المشروع مسبقاً' });
    await db.query(
      'INSERT INTO proposals (post_id, user_id, message, price) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, message, price]
    );
    res.status(201).json({ success: true, message: 'تم تقديم عرضك بنجاح' });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

// جلب عروض مشروع معين
router.get('/:id/proposals', authMiddleware, async (req, res) => {
  try {
    const [proposals] = await db.query(
      `SELECT pr.*, u.name, u.avatar FROM proposals pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.post_id = ?`, 
      [req.params.id]
    );
    res.json({ success: true, proposals });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

// قبول عرض
router.put('/:id/proposals/:proposalId/accept', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE proposals SET status = "accepted" WHERE id = ?', [req.params.proposalId]);
    await db.query('UPDATE proposals SET status = "rejected" WHERE post_id = ? AND id != ?', 
      [req.params.id, req.params.proposalId]);
    await db.query('UPDATE posts SET status = "in_progress" WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'تم قبول العرض' });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

module.exports = router;