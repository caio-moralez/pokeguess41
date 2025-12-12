import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard");

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (data.ok && Array.isArray(data.rows)) {
          setLeaderboard(data.rows);
        } else {
          setLeaderboard([]);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
        setError("Erro ao carregar leaderboard");
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  return (
    <div className="home-container">
      <h1>Pokeguess 41</h1>
      <h2>Top Trainers</h2>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && leaderboard.length > 0 && (
        <motion.table
          className="leader-table"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>

          <tbody>
            {leaderboard.map((player, index) => (
              <motion.tr
                key={player.nickname}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07 }}
              >
                <td>#{index + 1}</td>
                <td>{player.nickname}</td>
                <td>{player.score}</td>
              </motion.tr>
            ))}
          </tbody>
        </motion.table>
      )}

      {!loading && !error && leaderboard.length === 0 && (
        <p>No score at the moment, come back soon...</p>
      )}
    </div>
  );
}
