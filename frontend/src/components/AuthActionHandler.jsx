import React, { useEffect, useState } from "react";
import { applyActionCode, checkActionCode, reload, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";

function AuthActionHandler() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("verifying");
    const [errorMessage, setErrorMessage] = useState("");
    const [verifiedUsername, setVerifiedUsername] = useState("");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetEmail, setResetEmail] = useState("");
    const [showPass, setShowPass] = useState(false);

    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    useEffect(() => {
        console.log("AuthActionHandler mounted", { mode, hasCode: !!oobCode });
        if (mode === "verifyEmail" && oobCode) {
            handleVerifyEmail(oobCode);
        } else if (mode === "resetPassword" && oobCode) {
            handleResetSetup(oobCode);
        } else {
            console.error("AuthActionHandler error: Missing params");
            setStatus("error");
            setErrorMessage("Invalid or missing verification parameters.");
        }
    }, [mode, oobCode]);

    const handleResetSetup = async (code) => {
        try {
            const email = await verifyPasswordResetCode(auth, code);
            setResetEmail(email);
            setStatus("reset-password");
        } catch (error) {
            console.error("Password reset setup error:", error);
            setStatus("error");
            setErrorMessage("The password reset link is invalid or has expired.");
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setErrorMessage("Password must be at least 6 characters.");
            return;
        }

        setStatus("resetting");
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setStatus("reset-success");
        } catch (error) {
            console.error("Password reset error:", error);
            setStatus("reset-password");
            setErrorMessage("Failed to reset password. The link may have expired.");
        }
    };

    const handleVerifyEmail = async (code) => {
        try {
            const info = await checkActionCode(auth, code);
            const email = info.data.email;
            await applyActionCode(auth, code);
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                setVerifiedUsername(userData.username || "User");

                await updateDoc(doc(db, "users", userDoc.id), {
                    emailVerified: true
                });
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
                    <h2>Verifying...</h2>
                    <p>Please wait while we process your request.</p>
                </div>
            </div>
        );
    }

    if (status === "resetting") {
        return (
            <div className="auth-action-handler">
                <div className="auth-action-card glass-panel">
                    <Loader2 className="animate-spin icon-lg text-primary" />
                    <h2>Updating Password...</h2>
                    <p>Securing your account, please wait.</p>
                </div>
            </div>
        );
    }

    if (status === "reset-password") {
        return (
            <div className="auth-action-handler">
                <div className="auth-action-card glass-panel">
                    <CheckCircle className="icon-lg text-primary mb-2" />
                    <h2 className="premium-text">Reset Password</h2>
                    <p className="mb-6">Setting new password for <strong>{resetEmail}</strong></p>

                    <form onSubmit={handleResetPassword} className="auth-form w-full">
                        <div className="auth-field">
                            <label className="auth-label">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="auth-input pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                                >
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="auth-field mt-4">
                            <label className="auth-label">Confirm New Password</label>
                            <input
                                type={showPass ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="auth-input"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {errorMessage && <p className="text-error text-xs mt-4 font-bold">{errorMessage}</p>}

                        <button type="submit" className="auth-submit mt-8">
                            Update Password
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (status === "reset-success") {
        return (
            <div className="auth-action-handler">
                <div className="auth-action-card success-card glass-panel">
                    <div className="success-glow" />
                    <CheckCircle className="icon-xl text-verified" />
                    <h2 className="premium-text">Password Updated!</h2>
                    <p>Your password has been changed successfully. You can now log in with your new credentials.</p>
                    <button
                        onClick={() => navigate("/login")}
                        className="btn-cta-primary"
                    >
                        Go to Login
                    </button>
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
                        onClick={() => navigate("/profile")}
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
                <h2>Action Failed</h2>
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
