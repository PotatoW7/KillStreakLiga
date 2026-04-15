import React, { useState, useEffect, useRef } from "react";
import { signInWithEmailAndPassword, sendEmailVerification, signInWithPopup, signInWithRedirect, sendPasswordResetEmail } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const loadStartTime = useRef(0);

  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setInterval(() => {
        setResetCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resetCooldown]);

  useEffect(() => {
    const handleFocus = () => {
      if (loading && (Date.now() - loadStartTime.current > 3000)) {
        setTimeout(() => setLoading(false), 1000);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loading]);

  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (resetCooldown > 0) return;
    if (!resetEmail) return setError("Please enter your email address.");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      setResetCooldown(60);
      setError("");
    } catch (err) {
      console.error("Reset error:", err);
      setError("Failed to send reset email. Verify your email address.");
    }
    setLoading(false);
  };

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
        const { doc, updateDoc } = await import("firebase/firestore");
        const { db } = await import("../firebase");
        await updateDoc(doc(db, "users", user.uid), {
          emailVerified: true
        });
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
  const handleGoogleLogin = async () => {
    sessionStorage.removeItem('ignoringUsernameModal');
    loadStartTime.current = Date.now();
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sign-in error:", err);
      setLoading(false);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google Sign-In failed. Please try again.");
      }
      return;
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
                  <h2 className="auth-title">Welcome to KillStreak</h2>
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

              <div className="auth-extra-row">
                <button
                  type="button"
                  onClick={() => setShowForgot(!showForgot)}
                  className="auth-forgot-link"
                >
                  Forgot Password?
                </button>
              </div>

              {showForgot && (
                <div className="auth-forgot-panel animate-slideDown">
                  <p className="auth-forgot-hint">Enter your email to receive a password reset link.</p>
                  <div className="auth-field">
                    <input
                      type="email"
                      placeholder="recovery@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <button
                    onClick={handleForgotPassword}
                    className="auth-reset-btn"
                    disabled={loading || resetCooldown > 0}
                  >
                    {loading ? "Sending..." : resetCooldown > 0 ? `Resend in ${resetCooldown}s` : "Send Reset Link"}
                  </button>
                  {resetSent && <p className="auth-success-msg">Email sent! Check your inbox to set a new password.</p>}
                </div>
              )}

              <button disabled={loading} className="auth-submit">
                <span>{loading ? "Logging in..." : "Sign In"}</span>
                <div className="auth-submit-shine" />
              </button>
            </form>

            <div className="auth-divider">
              <div className="auth-divider-line" />
              <p className="auth-divider-text">OR</p>
              <div className="auth-divider-line" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="auth-google-btn"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="auth-google-icon" />
              <span>Continue with Google</span>
            </button>

            <div className="auth-footer">
              <div className="auth-footer-group">
                <p className="auth-footer-text">New to KillStreak?</p>
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