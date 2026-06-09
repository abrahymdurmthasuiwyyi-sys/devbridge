const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// دالة تنظيف الملفات المؤقتة
function cleanup(filePath) {
  try { fs.unlinkSync(filePath); } catch (e) {}
}

// تشغيل Python
router.post('/python', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, output: 'لا يوجد كود' });

  const tmpFile = path.join(os.tmpdir(), `db_py_${Date.now()}.py`);
  fs.writeFileSync(tmpFile, code, 'utf8');

  exec(`python -X utf8 "${tmpFile}"`, { timeout: 5000, env: {...process.env, PYTHONIOENCODING: 'utf-8'} }, (err, stdout, stderr) => {
    cleanup(tmpFile);
    if (err && !stdout) {
      return res.json({ success: false, output: stderr || err.message });
    }
    res.json({ success: true, output: stdout || stderr || 'لا مخرجات' });
  });
});

// تشغيل PHP
router.post('/php', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, output: 'لا يوجد كود' });

  const tmpFile = path.join(os.tmpdir(), `db_php_${Date.now()}.php`);
  fs.writeFileSync(tmpFile, code, 'utf8');

  exec(`php "${tmpFile}"`, { timeout: 5000 }, (err, stdout, stderr) => {
    cleanup(tmpFile);
    if (err && !stdout) {
      return res.json({ success: false, output: stderr || err.message });
    }
    res.json({ success: true, output: stdout || stderr || 'لا مخرجات' });
  });
});

// تشغيل JavaScript (Node.js)
router.post('/js', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, output: 'لا يوجد كود' });

  const tmpFile = path.join(os.tmpdir(), `db_js_${Date.now()}.js`);
  fs.writeFileSync(tmpFile, code, 'utf8');

  exec(`node "${tmpFile}"`, { timeout: 5000 }, (err, stdout, stderr) => {
    cleanup(tmpFile);
    if (err && !stdout) {
      return res.json({ success: false, output: stderr || err.message });
    }
    res.json({ success: true, output: stdout || stderr || 'لا مخرجات' });
  });
});

module.exports = router;
