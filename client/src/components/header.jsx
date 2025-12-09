import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";

export default function Header() {
  const { authenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const navigate = useNavigate();

  // Carregar CSRF
  useEffect(() => {
    fetch("/api/csrf-token", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken));
  }, []);

  function toggleMenu() {
    setOpen(!open);
  }

  async function handleLogout() {
    await logout(csrfToken); // <<< LOGOUT REAL
    setOpen(false);
    navigate("/"); // <<< REDIRECIONA PARA HOME
  }

  return (
    <header className="pg-header">
      <div className="pg-header-inner">

        {/* Logo */}
        <Link to="/" className="pg-logo">Pokeguess 41</Link>

        {/* Menu Button + Dropdown */}
        <div className="pg-menu-wrapper">
          <button className="pg-menu-btn" onClick={toggleMenu}>
            Menu
          </button>

          {open && (
            <div className="pg-dropdown">

              {/* Menu para visitantes */}
              {!authenticated && (
                <>
                  <Link to="/" onClick={() => setOpen(false)}>Home</Link>
                  <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
                  <Link to="/register" onClick={() => setOpen(false)}>Register</Link>
                </>
              )}

              {/* Menu para logados */}
              {authenticated && (
                <>
                  <Link to="/" onClick={() => setOpen(false)}>Home</Link>
                  <Link to="/dashboard" onClick={() => setOpen(false)}>Game</Link>
                  <Link to="/delete" onClick={() => setOpen(false)}>Delete Account</Link>

                  <button
                    className="pg-dropdown-logout"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              )}

            </div>
          )}
        </div>
      </div>
    </header>
  );
}
