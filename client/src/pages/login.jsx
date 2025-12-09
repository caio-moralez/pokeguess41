import { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext";
import { useNotification } from "../context/notificationContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth(); 

  const [csrfToken, setCsrfToken] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    async function loadCsrf() {
      try {
        const res = await fetch("/api/csrf-token");
        const data = await res.json();
        setCsrfToken(data.csrfToken || "");
      } catch (err) {
        console.error(err);
        addNotification({ type: "error", message: "Failed to load CSRF token" });
      }
    }
    loadCsrf();
  }, [addNotification]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(err =>
            addNotification({ type: "error", message: err.msg })
          );
        } else {
          addNotification({ type: "error", message: "Login failed" });
        }
        return;
      }

      setAuthenticated(true);
      addNotification({ type: "success", message: "Login successful!" });
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      addNotification({ type: "error", message: "Server error, try again" });
    }
  }

  return (
    <div className="container">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>

        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div>
          <button type="submit" className="pg-btn-action">Login</button>
        </div>
      </form>
    </div>
  );
}
