import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

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
      return setError("Error: Passwords do not match.");
    if (form.password.length < 6)
      return setError("Error: Password must be at least 6 characters.");
    if (form.username.length > 15)
      return setError("Error: Username cannot exceed 15 characters.");
    if (form.username.length < 3)
      return setError("Error: Username must be at least 3 characters.");

    const DISPOSABLE_DOMAINS = [
      "tempmail.com", "10minutemail.com", "guerrillamail.com", "mailinator.com",
      "dispostable.com", "getairmail.com", "throwawaymail.com", "maildrop.cc",
      "yopmail.com", "sendoutapp.com", "sharklasers.com", "guerrillamailblock.com",
      "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz", "spam4.me",
      "grr.la", "pokemail.net", "vmani.com", "dropmail.me", "anonymbox.com"
    ];

    const emailParts = form.email.split("@");
    const emailPrefix = emailParts[0] || "";
    const emailDomain = emailParts[1] || "";

    if (emailPrefix.length < 6 || emailPrefix.length > 30)
      return setError("Error: Email prefix must be between 6 and 30 characters.");

    if (DISPOSABLE_DOMAINS.includes(emailDomain.toLowerCase()))
      return setError("Error: Temporary or disposable email addresses are not allowed.");

    setLoading(true);
    setError("");

    try {
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", form.username.trim())
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        setError("Error: Username already exists.");
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

      let message = "Error: Account creation failed. Please try again.";
      switch (error.code) {
        case "auth/email-already-in-use":
          message = "Error: Email address already registered.";
          break;
        case "auth/invalid-email":
          message = "Invalid email address format.";
          break;
        case "auth/weak-password":
          message = "Error: Password is too weak.";
          break;
        default:
          message = error.message.replace("Firebase: ", "").split("(")[0].trim();
      }

      setError(message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">

      <div className="auth-bg-blob-2" />
      <div className="auth-bg-blob-1" />

      <div className="auth-card-wrapper">
        <div className="auth-card glass-panel">
          <div className="auth-card-inner">
            <div className="auth-header">
              <div className="auth-header-inner">
                <div className="auth-title-row">
                  <div className="auth-title-bar" />
                  <h2 className="auth-title">Join RiftHub</h2>
                </div>
                <p className="auth-subtitle">User Registration</p>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <p className="auth-label">Username</p>
                <input
                  type="text"
                  placeholder="Type a username..."
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="auth-input"
                  maxLength={15}
                  required
                />
              </div>

              <div className="auth-field">
                <p className="auth-label">Email Address</p>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="auth-input"
                  required
                />
              </div>

              <div className="register-grid">
                <div className="auth-field">
                  <p className="auth-label">Password</p>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="auth-input auth-input-password"
                    required
                  />
                </div>
                <div className="auth-field">
                  <p className="auth-label">Confirm Password</p>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    className="auth-input auth-input-password"
                    required
                  />
                </div>
              </div>

              <button disabled={loading} className="auth-submit">
                <span>{loading ? "Creating Account..." : "Sign Up"}</span>
                <div className="auth-submit-shine" />
              </button>
            </form>

            <div className="auth-footer">
              <div className="auth-footer-group">
                <p className="auth-footer-text">Already have an account?</p>
                <Link to="/login" className="auth-footer-link">
                  Login to Account
                </Link>
              </div>
              <div className="auth-footer-group">
                <p className="auth-footer-text-sm">Become a Coach?</p>
                <Link to="/become-coach" className="auth-footer-link-subtle">
                  Apply for Coach Certification
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;