const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'الرسالة مطلوبة' });
    const g = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const m = g.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const r = await m.generateContent('أنت مساعد برمجي. أجب بالعربية.\n\n' + message);
    res.json({ success: true, reply: r.response.text() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ: ' + err.message });
  }
});

router.post('/explain-code', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const g = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const m = g.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const r = await m.generateContent('اشرح هذا الكود بالعربية:\n' + code);
    res.json({ success: true, explanation: r.response.text() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ: ' + err.message });
  }
});

router.post('/fix-code', authMiddleware, async (req, res) => {
  try {
    const { code, error } = req.body;
    const g = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const m = g.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const r = await m.generateContent('أصلح هذا الكود بالعربية:\n' + code + (error ? '\nالخطأ: ' + error : ''));
    res.json({ success: true, fix: r.response.text() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ: ' + err.message });
  }
});

module.exports = router;