
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const csrf = require('csurf');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const { pool } = require('./dbConfig');
const initializePassport = require('./passportConfig');
const pgSession = require("connect-pg-simple")(session)

initializePassport(passport);

const app = express();

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV ;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// cors
app.use(cors());

app.set('trust proxy', 1);
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// session
app.use(session({
  store: new pgSession({
    pool:pool,
    tableName: "session",
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));


app.use(passport.initialize());
app.use(passport.session());

app.use(helmet({ contentSecurityPolicy: false }));


const csrfProtection = csrf({
  cookie: false // using session-based tokens
});

// validation
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .matches(/^[^<>\\/]+$/)
    .withMessage("Name contains invalid characters")
    .escape(),

  body("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .matches(/^[^<>\\/]+$/)
    .withMessage("Email contains invalid characters")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("password2")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    })
];

const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
];

function ensureAuthenticatedApi(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ ok: false,
     errors: [{msg: 'Unauthorized' }]});
}

// endpoint csrf token 
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  req.session.save((err) => {
    if (err) {
      console.error('Session save error before csrf token:', err);
      return res.status(500).json({ ok: false });
    }
    res.json({ csrfToken: req.csrfToken() });
  });
});

//register
app.post('/api/auth/register', csrfProtection, registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array().map(err => ({msg: err.msg})) });
  }

  const { name, email, password } = req.body;
  try {
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({
         ok: false, 
        errors: [{msg: "email already registered !!"}] 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    const userId = userResult.rows[0].id;

  //initialize score 
    await pool.query('INSERT INTO user_scores (user_id, score) VALUES ($1, 0)', [userId]);

    return res.json({ ok: true, message: 'Registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ 
      ok: false, 
      errors: [{msg: 'Server error' }]
    });
  }
});

//login 
app.post(
  "/api/auth/login",
  csrfProtection,
  loginValidation,
  (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ok: false,
        errors: errors.array().map(err => ({msg: err.msg}))
      });
    }

    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Passport auth error:", err);
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          ok: false,
          errors: [{ msg: info?.message || "Invalid credentials" }]
        });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        return res.json({
          ok: true,
          user: {
            id: user.id,
            name: user.name
          }
        });
      });
    })(req, res, next);
  }
);


app.post('/api/auth/logout', (req, res, next) => {
  req.logout({ keepSessionInfo: false }, (err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        ok: false,
        errors: [{ msg: 'Logout failed' }]
      });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({
          ok: false,
          errors: [{ msg: 'Session destroy failed' }]
        });
      }

      
      return res.json({ ok: true });
    });
  });
});


// home / leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT users.name, user_scores.score
      FROM user_scores
      JOIN users ON users.id = user_scores.user_id
      ORDER BY user_scores.score DESC
      LIMIT 5
    `);
    return res.json({ ok: true, rows: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ ok: false });
  }
});

//dashboard
app.get('/api/dashboard', ensureAuthenticatedApi, async (req, res) => {
  try {
    const scoreResult = await pool.query('SELECT score FROM user_scores WHERE user_id = $1', [req.user.id]);
    return res.json({
      ok: true,
      user: { id: req.user.id, name: req.user.name },
      score: scoreResult.rows[0]?.score || 0
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ ok: false });
  }
});

//game endpoints
app.post('/api/game/start', csrfProtection, ensureAuthenticatedApi, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, message: 'Missing pokemon name' });
  req.session.currentPokemon = name;
  return res.json({ ok: true });
});

//guess
app.post('/api/game/guess', csrfProtection, ensureAuthenticatedApi, async (req, res) => {
  const correct = req.session.currentPokemon;
  const guess = req.body.guess;

  if (!correct) return res.json({correct: false });

  if (guess === correct) {
    try {
      const update = await pool.query(`
        INSERT INTO user_scores (user_id, score)
        VALUES ($1, 10)
        ON CONFLICT (user_id)
        DO UPDATE SET score = user_scores.score + 10
        RETURNING score
      `, [req.user.id]);

      req.session.currentPokemon = null;
      return res.json({ correct: true, points: update.rows[0].score });
    } catch (err) {
      console.error('Game guess update error:', err);
      return res.status(500).json({ ok: false });
    }
  }

  return res.json({ correct: false });
});

//delete app.delete???
app.post('/api/auth/delete', csrfProtection, ensureAuthenticatedApi, async (req, res) => {
  const { password, password2 } = req.body;
  if (!password || !password2) return res.status(400).json({ 
    ok: false,
     errors: [{msg: "All fields are required"}]
     });
  if (password !== password2) return res.status(400).json({
     ok: false, 
     errors: [{msg: 'Passwords do not match'}]
     });

  try {
    const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) return res.status(404).json({ ok: false ,
      errors:[{msg: 'user not found'}]
    });

    const hashed = userResult.rows[0].password;
    const isMatch = await bcrypt.compare(password, hashed);
    if (!isMatch) return res.status(401).json({ ok: false,
       errors: [{msg: 'Incorrect password' }]
      });

    // Delete user row CASCADE delete the scores
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);

    // logout and destroy session
    req.logout({ keepSessionInfo: false }, (err) => {
      if (err) {
        console.error('Logout after delete error:', err);
      }
      req.session.destroy((err) => {
        if (err) console.error('Session destroy after delete error:', err);
        return res.json({ ok: true });
      });
    });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ ok: false,
      errors: [{msg: 'server error !'}]
    });
  }
});

if (NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, 'client', 'dist');
  app.use(express.static(staticPath));
  app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

}

// global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
       ok: false,
       errors: [{msg: 'Invalid CSRF token' }]});
  }
  return res.status(500).json({
     ok: false, 
     errors: [{msg:'Server error'}] });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (NODE_ENV=${NODE_ENV})`);
});
