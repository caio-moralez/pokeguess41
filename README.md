# PokeGuess

PokeGuess is a full-stack web game where authenticated users guess Pokémon names based on official artwork images. The application is fully deployed and integrates modern authentication, caching, and game state management using AWS Cognito, Redis, and a Node.js backend.

Live application:
[https://pokeguess41.onrender.com/](https://pokeguess41.onrender.com/)

---

## Overview

The goal of PokeGuess is simple: players must correctly identify Pokémon shown on screen to earn points. The game focuses on performance, security, and scalability by leveraging external services such as AWS Cognito for authentication and Redis for fast in-memory game state handling.

The application is split into a React frontend and an Express.js backend, served together in production.

---

## Tech Stack

### Frontend

* React
* React Router
* Context API (authentication and notifications)
* Fetch API

### Backend

* Node.js
* Express.js
* AWS Cognito (User authentication and management)
* Redis (queue and game state)
* PostgreSQL (user and score persistence)

### Infrastructure

* Render (deployment)
* AWS Cognito User Pool
* Redis instance

---

## Architecture

* The frontend communicates exclusively with the backend API using JSON over HTTP.
* Authentication is handled by AWS Cognito using JWT tokens.
* Protected routes are secured with a custom Express middleware that validates Cognito access tokens.
* Redis is used to:

  * Maintain a Pokémon queue
  * Store temporary per-user game state
* PostgreSQL stores persistent user data and scores.

---

## Authentication Flow

1. User registers or logs in using email and password.
2. Credentials are validated by AWS Cognito.
3. Cognito returns an Access Token and ID Token.
4. Tokens are stored in the frontend AuthContext.
5. Protected API routes require a valid Access Token in the Authorization header.

---

## API Routes

### Authentication

POST /api/auth/register

* Registers a new user

POST /api/auth/login

* Authenticates user and returns Cognito tokens

POST /api/auth/logout

* Global sign-out using Cognito

POST /api/auth/delete

* Deletes the authenticated user from Cognito and the database

---

### User

GET /api/dashboard

* Returns authenticated user data and score

GET /api/leaderboard

* Returns the top users by score

---

### Game

GET /api/game/next-pokemon

* Returns the next Pokémon from Redis queue

POST /api/game/start

* Stores the correct Pokémon name for the current round

POST /api/game/guess

* Validates user guess and updates score

---

## Redis Usage

Redis is used as an in-memory cache to ensure fast gameplay and minimal external API calls.

### Pokémon Queue

* Key: pokemonQueue
* Max size: 10 Pokémon
* Each Pokémon is stored as a JSON string containing:

  * id
  * name
  * image URL

Approximate memory usage per Pokémon:

* ~200–400 bytes
* Total queue usage: ~2–4 KB

### Per-User Game State

* Key format: pokemon:{userSub}
* Stores the correct Pokémon name for the current round

---

## Environment Variables

The following environment variables are required:

### Server

PORT=4000
NODE_ENV=production
FRONTEND_ORIGIN=[https://pokeguess41.onrender.com](https://pokeguess41.onrender.com)

### AWS Cognito

COGNITO_REGION=
COGNITO_CLIENT_ID=
COGNITO_USER_POOL_ID=

### Database

DATABASE_URL=

### Redis

REDIS_URL=

---

## Production Build

In production, the React frontend is built and served by the Express server:

* Frontend build output: client/dist
* Express serves static files and falls back to index.html for client-side routing

---

## Security

* Passwords are never stored locally
* Authentication is delegated to AWS Cognito
* JWT validation middleware protects private routes
* Helmet is used to apply HTTP security headers

---

## Author

Name: Caio Moralez

---

## License

This project is for educational and portfolio purposes.
