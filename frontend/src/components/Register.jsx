import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirm)
      return setError("Passwords don't match");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");

    setLoading(true);
    setError("");

    try {
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", form.username.trim())
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setError("Username already in use");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: form.username.trim() });

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        createdAt: new Date(),
        friends: [],
        pendingRequests: [],
        emailVerificationSent: false
      });

      navigate("/profile");
    } catch (error) {
      console.error("Error registering:", error);

      let message = "Something went wrong. Please try again.";
      switch (error.code) {
        case "auth/email-already-in-use":
          message = "Email already in use";
          break;
        case "auth/invalid-email":
          message = "Invalid email address";
          break;
        case "auth/weak-password":
          message = "Password too weak";
          break;
        default:
          message = error.message.replace("Firebase: ", "").split("(")[0].trim();
      }

      setError(message);
    }

    setLoading(false);
  };

  return (
    <div className="register-page">
      <div className="auth-container">
        <h2>Join Killstreak</h2>
        <p>Create your account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="auth-input"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="auth-input"
            required
          />

          <button disabled={loading} className="auth-button">
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;