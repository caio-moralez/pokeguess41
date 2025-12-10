import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/notificationContext";

export default function Register() {
  const [csrfToken, setCsrfToken] = useState("");
const { addNotification} = useNotification()
 const navigate = useNavigate();
const [isSubmitting, setIsSubmitting] = useState(false);


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password2: "",
  });

 
 //csrf token
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

    if (isSubmitting) return;
    setIsSubmitting(true);
    

    try {
      const res = await fetch("/api/auth/register", {
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
          addNotification({ type: "error", message: "Registered Failed !" });
        }
        return;
      }

     addNotification({ type: "success", message:  "Account created successfully!" });;
      setTimeout(() => navigate("/login"), 1200);

    } catch (error) {
      addNotification({ type: "error", message: "Server error, try again" });;
    }finally{
      setTimeout(() => setIsSubmitting(false), 1500)
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
            name="password2"
            placeholder="Confirm password"
            required
            value={formData.password2}
            onChange={handleChange}
          />
        </div>

        <div>
             <button
            type="submit"
            className="pg-btn-action"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Loading..." : "Register"}
          </button>
        </div>

      </form>
    </div>
  );
}

