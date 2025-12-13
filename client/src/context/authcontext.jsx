import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [idToken, setIdToken] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      if (!accessToken) {
        setAuthenticated(false);
        return;
      }
      try {
        const res = await fetch("/api/dashboard", {
          headers: { "Authorization": `Bearer ${accessToken}` },
        });

        if (res.ok) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          setAccessToken(null);
          setIdToken(null);
        }
      } catch {
        setAuthenticated(false);
        setAccessToken(null);
        setIdToken(null);
      }
    }

    checkAuth();
  }, [accessToken]);

  // Logout
  async function logout() {
    try {
      if (accessToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${accessToken}` },
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setAuthenticated(false);
      setAccessToken(null);
      setIdToken(null);
    }
  }

  return (
    <AuthContext.Provider value={{ authenticated, setAuthenticated, 
    accessToken, setAccessToken, idToken, setIdToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

