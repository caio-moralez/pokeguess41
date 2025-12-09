const LocalStrategy = require('passport-local').Strategy;
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');

function initialize(passport) {

  const authenticateUser = (email, password, done) => {
    pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
      async (err, results) => {
        if (err) {
          console.error("DB error:", err);
          return done(err);
        }

        if (results.rows.length === 0) {
          return done(null, false, { message: "Email not registered" });
        }

        const user = results.rows[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            console.error("Bcrypt error:", err);
            return done(err);
          }

          if (isMatch) {
            return done(null, user);
          }

          return done(null, false, { message: "Password is not correct" });
        });
      }
    );
  };

  passport.use(new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password"
    },
    authenticateUser
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    pool.query(
      `SELECT * FROM users WHERE id = $1`,
      [id],
      (err, results) => {
        if (err) {
          console.error("Deserialize error:", err);
          return done(err);
        }
        return done(null, results.rows[0]);
      }
    );
  });
}

module.exports = initialize;
