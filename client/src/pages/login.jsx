import { useEffect, useState } from "react";
import { useAuth } from "../context/authcontext";
import { useNotification } from "../context/notificationContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const { setAuthenticated, setAccessToken } = useAuth(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return; 
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      setAccessToken(data.accessToken);
      setIdToken(data.idToken)
      setAuthenticated(true);
      addNotification({ type: "success", message: "Login successful!" });
      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      addNotification({ type: "error", message: "Server error, try again" });
    } finally {
      setTimeout(() => setIsSubmitting(false), 1500);
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
          <button type="submit" className="pg-btn-action" disabled={isSubmitting}>
            {isSubmitting ? "Loading ..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
}
