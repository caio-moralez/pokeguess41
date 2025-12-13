import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/notificationContext";

export default function Register() {
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passwordMatchingCheck: "",
  });

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (formData.password !== formData.passwordMatchingCheck) {
      addNotification({ type: "error", message: "Passwords do not match" });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          passwordMatchingCheck: formData.passwordMatchingCheck,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(err =>
            addNotification({ type: "error", message: err.msg })
          );
        } else {
          addNotification({ type: "error", message: "Registration failed" });
        }
        return;
      }

      addNotification({ type: "success", message: "Account created successfully!" });
      setTimeout(() => navigate("/login"), 1200);

    } catch (error) {
      console.error(error);
      addNotification({ type: "error", message: "Server error, try again" });
    } finally {
      setTimeout(() => setIsSubmitting(false), 1500);
    }
  }

  return (
    <div className="container">
      <h1>Register</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <div>
          <input
            type="password"
            name="passwordMatchingCheck"
            placeholder="Confirm password"
            required
            value={formData.passwordMatchingCheck}
            onChange={handleChange}
          />
        </div>

        <div>
          <button type="submit" className="pg-btn-action" disabled={isSubmitting}>
            {isSubmitting ? "Loading..." : "Register"}
          </button>
        </div>
      </form>
    </div>
  );
}

