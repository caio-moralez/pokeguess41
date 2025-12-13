import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { useNotification } from "../context/notificationContext";

export default function DeleteAccount() {
  const { addNotification } = useNotification();
  const { authenticated, setAuthenticated, accessToken, idToken } = useAuth(); 
  const [formData, setFormData] = useState({
    password: "",
    passwordMatchingCheck: "",
  });

  const navigate = useNavigate();

  // redirect if not authenticated 
  useEffect(() => {
    if (authenticated === false) {
      navigate("/login");
    }
  }, [authenticated, navigate]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // checking mach of passwords
    if (formData.password !== formData.passwordMatchingCheck) {
      addNotification({ type: "error", message: "Passwords do not match" });
      return;
    }

    try {
      const res = await fetch("/api/auth/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`, 
        },
        body: JSON.stringify({ password: formData.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(err =>
            addNotification({ type: "error", message: err.msg })
          );
        } else {
          addNotification({ type: "error", message: "Unable to delete account" });
        }
        return;
      }

      addNotification({ type: "success", message: "Account deleted successfully" });
      setAuthenticated(false);
      navigate("/");

    } catch (error) {
      addNotification({ type: "error", message: "Server connection error" });
    }
  }

  return (
    <div>
      <h2>Delete Account</h2>
      <p>
        This action is <strong>PERMANENT</strong>.<br />
        All your data and score will be removed.
      </p>

      <form onSubmit={handleSubmit}>
        <label>Password</label>
        <br />
        <input
          type="password"
          name="password"
          required
          value={formData.password}
          onChange={handleChange}
        />
        <br /><br />

        <label>Confirm Password</label>
        <br />
        <input
          type="password"
          name="passwordMatchingCheck"
          required
          value={formData.passwordMatchingCheck}
          onChange={handleChange}
        />
        <br /><br />

        <button type="submit" className="pg-btn-action">
          Delete my account permanently
        </button>
      </form>

      <br />
      <a href="/dashboard" className="pg-btn-action">Cancel</a>
    </div>
  );
}
