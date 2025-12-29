require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const redis = require('./redisClient');
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");


// AWS COGNITO SDK IMPORTS
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminDeleteUserCommand,
  GlobalSignOutCommand,
  AdminConfirmSignUpCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

// Midleware to protect routes that require authentication
const requireAuth = require('./authMiddleware');
// Database queries 
const db = require('./queries'); 

const app = express();

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV;

// Cognito Client
const cognito = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION
});


//GLOBAL MIDDLEWARES
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// VALIDATION RULES
const validationCommon = [
  body("email")
    .isEmail().withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/\d/).withMessage("Password must contain at least one number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must contain at least one special character")
];

const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/).withMessage("Name contains invalid characters"),

  ...validationCommon,

  body("passwordMatchingCheck")
    .custom((value, { req }) => {
      if (value !== req.body.password)
        throw new Error("Passwords do not match");
      return true;
    })
];

const loginValidation = validationCommon;

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - passwordMatchingCheck
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ash Ketchum
 *               email:
 *                 type: string
 *                 example: ash@email.com
 *               password:
 *                 type: string
 *                 example: Strong@123
 *               passwordMatchingCheck:
 *                 type: string
 *                 example: Strong@123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation or registration error
 */


// USER REGISTER
app.post('/api/auth/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      errors: errors.array().map(err => ({ msg: err.msg }))
    });
  }

  const { name, email, password } = req.body;

  try {
    // Create user in Cognito
    const signUpCmd = new SignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "nickname", Value: name }
      ],
    });

    const out = await cognito.send(signUpCmd);

    // AUTO CONFIRM USER
    await cognito.send(new AdminConfirmSignUpCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email
    }));

    const cognitoSub = out?.UserSub || null;

    if (cognitoSub) {
      await db.insertUser(cognitoSub, name);
      await db.insertUserScore(cognitoSub);
    }

    return res.status(201).json({
      ok: true,
      message: 'Registered and successfully'
    });

  } catch (err) {
    console.error(err);
    return res.status(400).json({
      ok: false,
      errors: [{ msg: err?.message || 'Register error' }]
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ash@email.com
 *               password:
 *                 type: string
 *                 example: Strong@123
 *     responses:
 *       200:
 *         description: Authentication successful, tokens returned
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */


// LOGIN
app.post('/api/auth/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      errors: errors.array().map(err => ({ msg: err.msg }))
    });
  }

  const { email, password } = req.body;

  try {
    const cmd = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password }
    });

    const result = await cognito.send(cmd);

    if (!result?.AuthenticationResult) {
      return res.status(401).json({
        ok: false,
        errors: [{ msg: 'Authentication failed' }]
      });
    }

    // Return Cognito tokens to frontend
    return res.status(200).json({
      ok: true,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn
    });

  } catch (err) {
    return res.status(401).json({
      ok: false,
      errors: [{ msg: 'Invalid credentials' }]
    });
  }
});


/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
 */

// LOGOUT
app.post('/api/auth/logout', async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return res.json({ ok: true });

  try {
    await cognito.send(new GlobalSignOutCommand({ AccessToken: token }));
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true });
  }
});

/**
 * @swagger
 * /api/auth/delete:
 *   post:
 *     summary: Delete authenticated user account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: Strong@123
 *     responses:
 *       204:
 *         description: User account deleted successfully
 *       400:
 *         description: Password not provided
 *       401:
 *         description: Incorrect password or unauthorized
 *       500:
 *         description: Internal server error
 */

// DELETE ACCOUNT
app.post('/api/auth/delete', requireAuth, async (req, res) => {
  const { password } = req.body;
  const username = req.user["cognito:username"] || req.user.email;
  const cognitoSub = req.user.sub;

  if (!password) {
    return res.status(400).json({ ok: false, errors: [{ msg: "Password is required" }] });
  }

  // Verify password
  try {
    await cognito.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: username, PASSWORD: password }
    }));
  } catch {
    return res.status(401).json({ ok: false, errors: [{ msg: 'Incorrect password' }] });
  }

  // Delete user from Cognito
  try {
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: username
    }));
  } catch (err) {
    return res.status(500).json({ ok: false, errors: [{ msg: 'Failed to delete Cognito user' }] });
  }

  // Delete user from database
  try {
    await db.deleteUser(cognitoSub);
  } catch (err) {
    return res.status(500).json({ ok: false, errors: [{ msg: 'Failed to delete user from database' }] });
  }

  return res.status(204).send();
});

/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     summary: Retrieve leaderboard ranking
 *     tags: [Leaderboard]
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *       500:
 *         description: Internal server error
 */

// LEADERBOARD
app.get('/api/leaderboard', async (req, res) => {
  try {
    const rows = await db.getLeaderboard(); // fetch top 5 scores from DB
    return res.json({ ok: true, rows });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
});

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Retrieve authenticated user dashboard data
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data returned
 *       401:
 *         description: Unauthorized or invalid token
 */

// DASHBOARD
app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const cognitoSub = req.user.sub;
    const userData = await db.getUserDashboard(cognitoSub); // fetch user data + score

    return res.status(200).json({
      ok: true,
      user: { id: cognitoSub, name: userData.name },
      score: userData.score
    });
  } catch {
    return res.status(401).json({ ok: false });
  }
});



// GAME ENV

// FETCH POKEAPI
async function fetchPokemon(id) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) throw new Error("Pokemon not found");

  const data = await response.json();

  const image =
    data.sprites?.other?.["official-artwork"]?.front_default ||
    data.sprites?.front_default ||
    null;

  if (!image) throw new Error("No image available");

  return {
    id: data.id,
    name: data.name,
    image,
  };
}

// FIL THE QUEUE -- 10 max

const QUEUE_KEY = "pokemonQueue";
const QUEUE_SIZE = 10;

async function fillQueue() {
  const queueLength = await redis.LLEN(QUEUE_KEY);

  let length = queueLength;
  while (length < QUEUE_SIZE) {
    const id = Math.floor(Math.random() * 386) + 1;
    try {
      const pokemon = await fetchPokemon(id);
      await redis.RPUSH(QUEUE_KEY, JSON.stringify(pokemon));
      length++;
    } catch (err) {
      console.log("Skipping invalid Pokémon:", err.message);
    }
  }
};


/**
 * @swagger
 * /api/game/next-pokemon:
 *   get:
 *     summary: Get next Pokémon for the game
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pokémon returned successfully
 *       500:
 *         description: Server error
 */


// RETURN NEXT POKEMON 
app.get("/api/game/next-pokemon", requireAuth, async (req, res) => {
  try {
    let pokemonData = await redis.LPOP(QUEUE_KEY);

    // if no queue = fill 
    while (!pokemonData) {
      await fillQueue();
      pokemonData = await redis.LPOP(QUEUE_KEY);
    }

    // fill the queue on background
    fillQueue().catch(console.error);

    res.status(200).json(JSON.parse(pokemonData));
  } catch (err) {
    console.error("Error fetching next Pokémon:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});
// INIT QUEUE WEN SERVER IS ON 
fillQueue().catch(err =>
  console.error("Failed to initialize Pokémon queue:", err)
);


/**
 * @swagger
 * /api/game/start:
 *   post:
 *     summary: Start a new game round
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: pikachu
 *     responses:
 *       201:
 *         description: Game started successfully
 *       400:
 *         description: Missing Pokémon name
 *       401:
 *         description: Unauthorized
 */

// GAME START
app.post('/api/game/start', requireAuth, async (req, res) => {
  try {
    const cognitoSub = req.user.sub;
    const { name } = req.body;

    if (!name) return res.status(400).json({ ok: false, message: 'Missing pokemon name' });

    await redis.set(`pokemon:${cognitoSub}`, name); // store current pokemon in Redis
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(401).json({ ok: false });
  }
});


/**
 * @swagger
 * /api/game/guess:
 *   post:
 *     summary: Submit a Pokémon guess
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guess
 *             properties:
 *               guess:
 *                 type: string
 *                 example: pikachu
 *     responses:
 *       200:
 *         description: Guess result returned
 *       401:
 *         description: Unauthorized
 */

// GAME GUESS
app.post('/api/game/guess', requireAuth, async (req, res) => {
  try {
    const cognitoSub = req.user.sub;
    const correct = await redis.get(`pokemon:${cognitoSub}`);
    const guess = req.body.guess;
    const pointsPerRound = 10;

    if (!correct) return res.json({ correct: false });

    if (guess === correct) {
      const updatedScore = await db.updateScore(cognitoSub, pointsPerRound); // add points
      await redis.del(`pokemon:${cognitoSub}`);
      return res.status(200).json({ correct: true, points: updatedScore });
    }

    return res.status(200).json({ correct: false });
  } catch {
    return res.status(401).json({ ok: false });
  }
});




// STATIC FILES
if (NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, 'client', 'dist');
  app.use(express.static(staticPath));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err?.stack || err);
  return res.status(500).json({ ok: false, errors: [{ msg: 'Server error' }] });
});


//START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (NODE_ENV=${NODE_ENV})`);
});
