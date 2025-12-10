import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { useNotification } from "../context/notificationContext";

export default function DeleteAccount() {
  const { addNotification } = useNotification();
  const { authenticated, setAuthenticated } = useAuth(); 
  const [csrfToken, setCsrfToken] = useState("");
  const [formData, setFormData] = useState({
    password: "",
    password2: "",
  });
  


  const navigate = useNavigate();

    useEffect(() => {
    if (authenticated === false) {
      navigate("/login");
    }
  }, [authenticated, navigate]);




  useEffect(() => {
    fetch("/api/csrf-token", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken))
      .catch((err) => console.error("Error loading CSRF:", err));
  }, []);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
   

    try {
      const res = await fetch("/api/auth/delete", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "CSRF-Token": csrfToken, 
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
       if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(err =>
            addNotification({ type: "error", message: err.msg })
          );
        } else {
          addNotification({ type: "error", message: "Not possible delete account" });
        }
        return;
      }
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
          name="password2"
          required
          value={formData.password2}
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
