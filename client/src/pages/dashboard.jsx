import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PokemonGame from "../components/PokemonGame";
import { useAuth } from "../context/authcontext";

export default function Dashboard() {
  const { accessToken, authenticated } = useAuth();
  const [user, setUser] = useState(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authenticated || !accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    async function loadData() {
      try {
        const res = await fetch("/api/dashboard", {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          navigate("/login", { replace: true });
          return;
        }

        const data = await res.json();

        if (!data.ok) {
          navigate("/login", { replace: true });
          return;
        }

        setUser(data.user?.name || "User");
        setScore(data.score || 0);
      } catch (err) {
        console.error("Erro no dashboard:", err);
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [accessToken, authenticated, navigate]);

  if (loading) return <p>Loading...</p>;

  const displayName =
    typeof user === "string" && user.length > 0
      ? user.charAt(0).toUpperCase() + user.slice(1)
      : "User";

  return (
    <div className="pg-dashboard-wrapper">
      <div className="pg-dashboard-content">
        <h1>Hello {displayName}</h1>
        <PokemonGame startingScore={score} />
        <hr />
      </div>
    </div>
  );
}
