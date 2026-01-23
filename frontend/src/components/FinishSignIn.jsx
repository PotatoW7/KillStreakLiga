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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="bg-gray-800 bg-opacity-95 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-4">{status}</h2>
        
        {showEmailInput && (
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-cyan-500 focus:outline-none"
            />
            <div className="flex gap-4">
              <button 
                onClick={handleCompleteSignIn}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-200"
              >
                Complete Sign In
              </button>
              <button 
                onClick={handleCancel}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {status === "Invalid sign-in link" && (
          <button 
            onClick={() => navigate("/login")}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-200"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}

export default FinishSignIn;