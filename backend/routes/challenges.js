const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { VM } = require('vm2');

router.get('/', async (req, res) => {
  try {
    const [challenges] = await db.query('SELECT id, title, description, difficulty, category, points, starter_code, test_cases FROM challenges ORDER BY points ASC');
    res.json({ success: true, challenges });
  } catch (err) { res.status(500).json({ success: false, message: 'خطأ في الخادم' }); }
});

router.post('/:id/submit', authMiddleware, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'الكود مطلوب' });

    // جلب التحدي وtest cases
    const [rows] = await db.query('SELECT * FROM challenges WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'التحدي غير موجود' });

    const challenge = rows[0];
    let testCases = [];
    try { testCases = JSON.parse(challenge.test_cases || '[]'); } catch(e) {}

    let status = 'failed';
    let message = 'حاول مجدداً';
    let passedTests = 0;
    let totalTests = testCases.length;
    let details = [];

    if (language === 'javascript' || !language) {
      if (testCases.length === 0) {
        // لو ما في test cases، نشغّل الكود ونتحقق أنه ما فيه أخطاء
        try {
          const vm = new VM({ timeout: 3000, sandbox: {} });
          vm.run(code);
          status = 'passed';
          message = '🎉 أحسنت! الكود يعمل بدون أخطاء';
        } catch(e) {
          status = 'failed';
          message = '❌ خطأ في الكود: ' + e.message;
        }
      } else {
        // تشغيل كل test case
        for (const tc of testCases) {
          try {
            const vm = new VM({ timeout: 3000, sandbox: {} });
            const fullCode = code + `\n__result__ = ${tc.call};`;
            const result = vm.run(fullCode + '\n__result__');
            const expected = tc.expected;
            const passed = JSON.stringify(result) === JSON.stringify(expected);
            if (passed) passedTests++;
            details.push({
              input: tc.call,
              expected: JSON.stringify(expected),
              got: JSON.stringify(result),
              passed
            });
          } catch(e) {
            details.push({ input: tc.call, expected: JSON.stringify(tc.expected), got: 'خطأ: ' + e.message, passed: false });
          }
        }
        status = passedTests === totalTests ? 'passed' : 'failed';
        message = status === 'passed'
          ? `🎉 أحسنت! اجتزت ${passedTests}/${totalTests} اختبارات`
          : `❌ اجتزت ${passedTests}/${totalTests} اختبارات فقط`;
      }
    } else {
      // لغات أخرى — تحقق بسيط
      status = code.trim().length > 30 ? 'passed' : 'failed';
      message = status === 'passed' ? '🎉 تم قبول الحل' : 'الكود قصير جداً';
    }

    const score = status === 'passed' ? (challenge.points || 100) : 0;
    await db.query(
      'INSERT INTO submissions (user_id, challenge_id, code, language, status, score) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, req.params.id, code, language || 'javascript', status, score]
    );

    res.json({ success: true, status, message, passed_tests: passedTests, total_tests: totalTests, details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

module.exports = router;
