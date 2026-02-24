import React, { useEffect, useState } from "react";
import { signInWithEmailLink, isSignInWithEmailLink } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function FinishSignIn() {
  const [status, setStatus] = useState("Loading...");
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const storedEmail = localStorage.getItem("emailForSignIn");
      if (storedEmail) {
        setEmail(storedEmail);
        setShowEmailInput(false);
      } else {
        setShowEmailInput(true);
        setStatus("Please confirm your email address");
      }
    } else {
      setStatus("Invalid sign-in link");
    }
  }, []);

  const handleCompleteSignIn = async () => {
    if (!email) {
      setStatus("Please enter your email address");
      return;
    }

    try {
      setStatus("Completing sign-in...");
      await signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem("emailForSignIn");
      setStatus("Sign-in successful! Redirecting...");
      setTimeout(() => navigate("/profile"), 2000);
    } catch (error) {
      console.error("Error completing sign-in:", error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleCancel = () => {
    navigate("/login");
  };

  return (
    <div className="auth-confirm-page">
      <div className="auth-confirm-card">
        <h2 className="auth-confirm-title">{status}</h2>

        {showEmailInput && (
          <div className="auth-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="auth-input"
            />
            <div className="auth-confirm-actions">
              <button
                onClick={handleCompleteSignIn}
                className="auth-confirm-btn primary"
              >
                Complete Sign In
              </button>
              <button
                onClick={handleCancel}
                className="auth-confirm-btn secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {status === "Invalid sign-in link" && (
          <button
            onClick={() => navigate("/login")}
            className="auth-confirm-btn primary"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default FinishSignIn;