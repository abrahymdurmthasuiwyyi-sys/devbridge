const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
require('dotenv').config();

const generateToken = (user) => jwt.sign(
  { id: user.id, email: user.email, name: user.name, role: user.role },
  process.env.JWT_SECRET, { expiresIn: '7d' }
);

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'البريد مستخدم مسبقاً' });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashed]);
    const [user] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, token: generateToken(user[0]), user: user[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
    const isMatch = await bcrypt.compare(password, users[0].password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
    const { password: _, ...user } = users[0];
    res.json({ success: true, token: generateToken(user), user });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, avatar, bio, github, linkedin, website, skills, role FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, user: users[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, bio, github, linkedin, website, skills } = req.body;
    await db.query('UPDATE users SET name=?, bio=?, github=?, linkedin=?, website=?, skills=? WHERE id=?',
      [name, bio, github, linkedin, website, JSON.stringify(skills), req.user.id]);
    res.json({ success: true, message: 'تم تحديث الملف الشخصي' });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});


router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, users: [] });
    const search = `%${q}%`;
    const [users] = await db.query(
      'SELECT id, name, email, bio, skills, avatar FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 20',
      [search, search]
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
