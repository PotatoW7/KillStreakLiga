import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Passwords don't match");
    if (form.password.length < 6) return setError("Password too short");

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(userCredential.user, { displayName: form.username });
      await sendEmailVerification(userCredential.user);
      alert("Account created! Check your email for verification.");
      navigate("/profile");
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div className="auth-container">
        <h2>Join KillStreak</h2>
        <p>Create your account</p>
        
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={e => setForm({...form, username: e.target.value})}
            className="auth-input"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={form.confirm}
            onChange={e => setForm({...form, confirm: e.target.value})}
            className="auth-input"
            required
          />
          
          <button
            disabled={loading}
            className="auth-button"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;