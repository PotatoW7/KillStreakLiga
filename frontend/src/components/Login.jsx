import React, { useState } from "react";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setError("Verification pending: Please check your email first. A new verification link has been sent.");
      } else {
        navigate("/profile");
      }
    } catch (err) {
      console.error("Login error:", err);

      let message = "Login Error: Authentication failed. Please try again.";

      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          message = "Access Denied: Invalid credentials.";
          break;
        case "auth/too-many-requests":
          message = "Too many failed attempts. Account temporarily locked.";
          break;
        case "auth/invalid-email":
          message = "Invalid email address.";
          break;
        default:
          message = err.message.replace("Firebase: ", "").split("(")[0].trim();
      }

      setError(message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-blob-1" />
      <div className="auth-bg-blob-2" />

      <div className="auth-card-wrapper">
        <div className="auth-card glass-panel">
          <div className="auth-card-inner">
            <div className="auth-header">
              <div className="auth-header-inner">
                <div className="auth-title-row">
                  <div className="auth-title-bar" />
                  <h2 className="auth-title">Welcome to RiftHub</h2>
                </div>
                <p className="auth-subtitle">Login</p>
              </div>
            </div>

            {isVerified && (
              <div className="auth-success">
                Verification completed successfully! You can now log in.
              </div>
            )}

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="auth-form">
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

              <button disabled={loading} className="auth-submit">
                <span>{loading ? "Logging in..." : "Sign In"}</span>
                <div className="auth-submit-shine" />
              </button>
            </form>

            <div className="auth-footer">
              <div className="auth-footer-group">
                <p className="auth-footer-text">New to RiftHub?</p>
                <Link to="/register" className="auth-footer-link">
                  Create Account
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

export default Login;