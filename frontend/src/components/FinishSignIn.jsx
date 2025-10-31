import React, { useEffect, useState } from "react";
import { signInWithEmailLink, isSignInWithEmailLink } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function FinishSignIn() {
  const [status, setStatus] = useState("Loading...");
  const navigate = useNavigate();

  useEffect(() => {
    const completeSignIn = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        return setStatus("Invalid link");
      }

      const email = localStorage.getItem("emailForSignIn") || prompt("Enter your email:");
      if (!email) return setStatus("Email required");

      await signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem("emailForSignIn");
      navigate("/profile");
    };

    completeSignIn();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="bg-gray-800 bg-opacity-95 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-white mb-4">{status}</h2>
        {status === "Invalid link" && (
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