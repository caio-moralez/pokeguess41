import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PokemonGame from "../components/PokemonGame";


export default function Dashboard() {
  const [csrfToken, setCsrfToken] = useState("");
  const [user, setUser] = useState(null); 
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true); 

  const navigate = useNavigate();



  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch("/api/dashboard", {
          credentials: "include",
        });

        

        if (!userRes.ok) {
          navigate("/login", { replace: true });
          return;
        }

        const userData = await userRes.json();

        if (!userData.ok) {
          navigate("/login", { replace: true });
          return;
        }
        
        setUser(userData.user?.name || "User");
           setScore(userData.score);
        
        const csrfRes = await fetch("/api/csrf-token", {
          credentials: "include",
        });

        if (csrfRes.ok) {
          const csrfData = await csrfRes.json();
          setCsrfToken(csrfData.csrfToken || "");
        } else {
          console.error("not possible recieve CSRF token");
        }
     
      } catch (err) {
        console.error("Erro no dashboard:", err);
        navigate("/login", { replace: true });
      }finally {
  setLoading(false);
}

    }

    loadData();
  }, [navigate]);


//render
  if (loading || !csrfToken )  return <p>Loading...</p> ; 

  const displayName =
    typeof user === "string" && user.length > 0
      ? user.charAt(0).toUpperCase() + user.slice(1)
      : "User";

  return (
  <div className="pg-dashboard-wrapper">


    <div className="pg-dashboard-content">
      <h1>Hello {displayName}</h1>

      {!loading && csrfToken && (
        <PokemonGame csrfToken={csrfToken} startingScore={score} />
      )}

      <hr />
    </div>

  </div>
);
}