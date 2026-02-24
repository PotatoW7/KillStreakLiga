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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">

      <div className="absolute top-0 left-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[10rem] -ml-96 -mt-96 opacity-20" />
      <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-[8rem] -mr-80 -mb-80 opacity-10" />

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="glass-panel rounded-[2.5rem] p-10 lg:p-12 border-primary/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative group overflow-hidden">
          <div className="relative space-y-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                  <h2 className="font-display text-4xl font-black uppercase tracking-tight text-white italic">Join RiftHub</h2>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/50 italic">User Registration</p>
              </div>
            </div>

            {error && (
              <div className="px-6 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-400 italic text-center animate-in fade-in duration-500">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-4 mb-2">Username</p>
                <input
                  type="text"
                  placeholder="Type a username..."
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:border-primary/50 focus:bg-white/[0.08] transition-all outline-none placeholder:text-white/20 font-medium"
                  maxLength={15}
                  required
                />
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-4 mb-2">Email Address</p>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:border-primary/50 focus:bg-white/[0.08] transition-all outline-none placeholder:text-white/20 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-4 mb-2">Password</p>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:border-primary/50 focus:bg-white/[0.08] transition-all outline-none placeholder:text-white/20 font-medium tracking-[0.2em]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 ml-4 mb-2">Confirm Password</p>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:border-primary/50 focus:bg-white/[0.08] transition-all outline-none placeholder:text-white/20 font-medium tracking-[0.2em]"
                    required
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full mt-4 h-14 rounded-2xl bg-primary text-black font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all shadow-lg shadow-primary/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group/btn relative"
              >
                <span className="relative z-10">{loading ? "Creating Account..." : "Sign Up"}</span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-101%] group-hover/btn:translate-x-0 transition-transform duration-500" />
              </button>
            </form>

            <div className="pt-8 border-t border-white/5 space-y-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Already have an account?</p>
                <Link to="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-white transition-all italic underline underline-offset-4 decoration-primary/30">
                  Login to Account
                </Link>
              </div>
              <div className="flex flex-col items-center gap-2 pt-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Become a Coach?</p>
                <Link to="/become-coach" className="text-[9px] font-black uppercase tracking-[0.15em] text-white/40 hover:text-primary transition-all">
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