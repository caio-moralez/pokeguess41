const { pool } = require('./dbConfig');

// INSERT USER
async function insertUser(cognitoSub, nickname) {
  return pool.query(
    `INSERT INTO cognito_users (cognito_sub, nickname)
     VALUES ($1, $2)
     ON CONFLICT (cognito_sub) DO NOTHING`,
    [cognitoSub, nickname]
  );
}

// INSERT USER SCORE
async function insertUserScore(cognitoSub) {
  return pool.query(
    `INSERT INTO user_scores (cognito_sub)
     VALUES ($1)
     ON CONFLICT (cognito_sub) DO NOTHING`,
    [cognitoSub]
  );
}

// GET LEADERBOARD
async function getLeaderboard() {
  const result = await pool.query(`
    SELECT cu.nickname, us.score
    FROM user_scores us
    JOIN cognito_users cu
    ON cu.cognito_sub = us.cognito_sub
    ORDER BY us.score DESC
    LIMIT 5
  `);
  return result.rows;
}

// GET DASHBOARD DATA
async function getUserDashboard(cognitoSub) {
  const userData = await pool.query(
    `SELECT nickname FROM cognito_users WHERE cognito_sub = $1`,
    [cognitoSub]
  );

  const scoreResult = await pool.query(
    `SELECT score FROM user_scores WHERE cognito_sub = $1`,
    [cognitoSub]
  );

  return {
    name: userData.rows[0]?.nickname,
    score: scoreResult.rows[0]?.score || 0
  };
}

// UPDATE SCORE
async function updateScore(cognitoSub, points) {
  const result = await pool.query(`
    UPDATE user_scores
    SET score = score + $1
    WHERE cognito_sub = $2
    RETURNING score
  `, [points, cognitoSub]);

  return result.rows[0].score;
}

// DELETE USER
async function deleteUser(cognitoSub) {
  return pool.query(
    `DELETE FROM cognito_users WHERE cognito_sub = $1`,
    [cognitoSub]
  );
}

module.exports = {
  insertUser,
  insertUserScore,
  getLeaderboard,
  getUserDashboard,
  updateScore,
  deleteUser
};
