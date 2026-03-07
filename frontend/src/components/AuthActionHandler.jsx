import React, { useEffect, useState } from "react";
import { applyActionCode, checkActionCode, reload } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function AuthActionHandler() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("verifying");
    const [errorMessage, setErrorMessage] = useState("");
    const [verifiedUsername, setVerifiedUsername] = useState("");

    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    useEffect(() => {
        if (mode === "verifyEmail" && oobCode) {
            handleVerifyEmail(oobCode);
        } else {
            setStatus("error");
            setErrorMessage("Invalid or missing verification parameters.");
        }
    }, [mode, oobCode]);

    const handleVerifyEmail = async (code) => {
        try {
            const info = await checkActionCode(auth, code);
            const email = info.data.email;
            await applyActionCode(auth, code);
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                setVerifiedUsername(userData.username || "User");
            } else {
                setVerifiedUsername("User");
            }

            if (auth.currentUser) {
                await reload(auth.currentUser);
            }

            setStatus("success");
        } catch (error) {
            console.error("Verification error:", error);
            setStatus("error");
            setErrorMessage(
                error.code === "auth/invalid-action-code"
                    ? "The verification link has expired or has already been used."
                    : "An error occurred during verification. Please try again."
            );
        }
    };

    if (status === "verifying") {
        return (
            <div className="auth-action-handler">
                <div className="auth-action-card glass-panel">
                    <Loader2 className="animate-spin icon-lg text-primary" />
                    <h2>Verifying your email...</h2>
                    <p>Please wait while we confirm your account.</p>
                </div>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="auth-action-handler">
                <div className="auth-action-card success-card glass-panel">
                    <div className="success-glow" />
                    <CheckCircle className="icon-xl text-verified" />
                    <h2 className="premium-text">Email Verified!</h2>
                    <p>Verification completed - {verifiedUsername} has been verified</p>
                    <button
                        onClick={() => {
                            window.open("https://www.rifthub.lol/profile", "_blank");
                            setTimeout(() => window.close(), 100);
                        }}
                        className="btn-cta-primary"
                    >
                        Go to Profile
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-action-handler">
            <div className="auth-action-card error-card glass-panel">
                <XCircle className="icon-xl text-error" />
                <h2>Verification Failed</h2>
                <p>{errorMessage}</p>
                <button
                    onClick={() => navigate("/login")}
                    className="btn-cta-outline"
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}

export default AuthActionHandler;
