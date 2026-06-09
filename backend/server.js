const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const db = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

async function findOrCreateUser(email, name, avatar, provider, providerId) {
  let [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0) {
    const [result] = await db.query('INSERT INTO users (name, email, avatar, provider, provider_id, is_verified) VALUES (?, ?, ?, ?, ?, TRUE)', [name, email, avatar, provider, providerId]);
    [users] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
  }
  return users[0];
}

function authRedirect(req, res) {
  const token = jwt.sign({ id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const user = { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, avatar: req.user.avatar };
  res.redirect('/?token=' + token + '&user=' + encodeURIComponent(JSON.stringify(user)));
}

passport.use(new GoogleStrategy({ clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, callbackURL: 'http://localhost:5000/api/auth/google/callback' }, async (a, b, profile, done) => { try { const user = await findOrCreateUser(profile.emails[0].value, profile.displayName, profile.photos[0]?.value, 'google', profile.id); done(null, user); } catch (err) { done(err, null); } }));
passport.use(new GitHubStrategy({ clientID: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET, callbackURL: 'http://localhost:5000/api/auth/github/callback' }, async (a, b, profile, done) => { try { const email = profile.emails?.[0]?.value || profile.username + '@github.com'; const user = await findOrCreateUser(email, profile.displayName || profile.username, profile.photos[0]?.value, 'github', profile.id); done(null, user); } catch (err) { done(err, null); } }));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => { const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]); done(null, users[0]); });

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/?error=google_failed' }), authRedirect);
app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/api/auth/github/callback', passport.authenticate('github', { failureRedirect: '/?error=github_failed' }), authRedirect);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/ai', require('./routes/ai'));

app.use('/api/execute', require('./routes/execute'));
app.get('*', (req, res) => {
  const htmlPath = path.join(__dirname, '../frontend/index.html');
  try {
    let html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch(e) { res.status(500).send('Error: ' + e.message); }
});

app.listen(PORT, () => { console.log('DevBridge running on port ' + PORT); });
module.exports = app;