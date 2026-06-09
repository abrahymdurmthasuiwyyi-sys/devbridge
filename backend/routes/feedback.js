const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/', async (req, res) => {
  try {
    const { name, email, type, subject, message, features_rating, pros, cons, overall_rating } = req.body;
    if (!name || !email || !subject || !message) return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    await db.query('INSERT INTO feedback (name, email, type, subject, message, features_rating, pros, cons, overall_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, type || 'other', subject, message, JSON.stringify(features_rating), pros, cons, overall_rating]);
    res.status(201).json({ success: true, message: 'تم إرسال ملاحظاتك بنجاح' });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

module.exports = router;
