import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
async function checkAuth() {
  try {
    const res = await fetch("/api/dashboard", {
      credentials: "include",
    });

    if (res.ok) {
      setAuthenticated(true);
    } else {
      setAuthenticated(false);
    }

  } catch {
    setAuthenticated(false);
  }
}

    checkAuth();
  }, []);

  async function logout(csrfToken) {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
      });

      setAuthenticated(false);
    } catch {
      setAuthenticated(false);
    }
  }

  return (
    <AuthContext.Provider value={{ authenticated, setAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
