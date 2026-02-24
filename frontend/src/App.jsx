import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Summoner from "./components/Summoner";
import FinishSignIn from "./components/FinishSignIn";
import FriendsList from "./components/FriendsList";
import Chat from "./components/Chat";
import QueueSystem from "./components/QueueSystem";
import Home from "./components/Home";
import Announcement from "./components/Announcement";
import BecomeCoach from "./components/BecomeCoach";
import CoachRules from "./components/CoachRules";
import Coaching from "./components/Coaching";
import AdminPanel from "./components/AdminPanel";
import AdminApplication from "./components/AdminApplication";
import LiveGame from "./components/LiveGame";
import Champions from "./components/Champions";
import Feeds from "./components/Feeds";
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfService from "./components/TermsOfService";
import Legal from "./components/Legal";
import Contact from "./components/Contact";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";

import { auth, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./styles/index.css";

const OWNER_EMAIL = "mainprofile@gmail.com";

function NavLink({ to, children }) {
  const navigate = useNavigate();
  const isActive = window.location.pathname === to;
  return (
    <Link
      to={to}
      className={`text-sm font-black uppercase tracking-[0.2em] transition-all hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
    >
      {children}
    </Link>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showSocial, setShowSocial] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeTab, setActiveTab] = useState('friends');
  const [socialMode, setSocialMode] = useState('chat');
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [profileImage, setProfileImage] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const role = await initializeUserInFirestore(firebaseUser);
        setUserRole(role);

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setProfileImage(userDoc.data().profileImage || null);
          }
        } catch (error) {
          console.error("Error fetching profile image:", error);
        }
      } else {
        setUserRole('user');
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const initializeUserInFirestore = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    const isOwner = user.email?.toLowerCase() === OWNER_EMAIL;

    if (!userDoc.exists()) {
      const newUserData = {
        username: isOwner ? "Owner" : user.displayName,
        email: user.email,
        createdAt: new Date(),
        friends: [],
        pendingRequests: [],
        role: isOwner ? "owner" : "user",
      };
      await setDoc(userRef, newUserData);

      if (isOwner) {
        await setDoc(doc(db, "owners", user.uid), {
          username: "Owner",
          email: user.email,
          createdAt: new Date()
        });
      }
      return newUserData.role;
    } else {
      const existingData = userDoc.data();
      if (isOwner && existingData.role !== 'owner') {
        await setDoc(userRef, { role: 'owner', username: 'Owner' }, { merge: true });
        await setDoc(doc(db, "owners", user.uid), {
          username: "Owner",
          email: user.email,
          createdAt: new Date()
        }, { merge: true });
        return 'owner';
      }
      return existingData.role || 'user';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setSelectedFriend(null);
      setShowSocial(false);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
  };

  const handleBackToFriends = () => {
    setSelectedFriend(null);
  };

  const toggleSocial = () => {
    setShowSocial(!showSocial);
    if (!showSocial) {
      setSelectedFriend(null);
    }
  };

  if (loading) return <div className="loading">Checking authentication...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-6">
          <Link
            className="flex items-center gap-2 group transition-all"
            to="/"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300">
              <div className="w-5 h-5 bg-primary rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-500" />
            </div>
            <span className="font-display font-black text-2xl tracking-tighter text-foreground group-hover:text-primary transition-colors">
              RIFTHUB
            </span>
          </Link>

          <div className="flex items-center gap-4 sm:gap-8">
            <nav className="hidden lg:flex items-center gap-8">
              <NavLink to="/feeds">Feed</NavLink>
              {!user ? (
                <>
                  <NavLink to="/summoner">Summoner</NavLink>
                  <NavLink to="/coaching">Coaching</NavLink>
                  <Link
                    to="/login"
                    className="px-6 py-2.5 rounded-full bg-secondary text-foreground hover:bg-primary hover:text-black font-bold text-sm transition-all"
                  >
                    LOGIN
                  </Link>
                </>
              ) : (
                <>
                  <NavLink to="/summoner">Summoner</NavLink>
                  <NavLink to="/live-game">Live Game</NavLink>
                  <NavLink to="/queue">Queue</NavLink>
                  <NavLink to="/coaching">Coaching</NavLink>
                  {(userRole === 'admin' || userRole === 'owner' || userRole === 'coach') && (
                    <NavLink to="/champions">Champions</NavLink>
                  )}
                  {(userRole === 'admin' || userRole === 'owner') && (
                    <Link
                      className="px-4 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
                      to="/admin"
                    >
                      {userRole === 'owner' ? 'OWNER' : 'ADMIN'}
                    </Link>
                  )}
                </>
              )}
            </nav>

            {user && (
              <div className="flex items-center gap-2 sm:gap-3 pl-4 sm:pl-6 border-l border-white/10">
                {/* Notification Bell - Strategic Entry Point */}
                <button
                  className="relative p-2 rounded-xl hover:bg-white/5 transition-all group"
                  onClick={() => {
                    if (showSocial && socialMode === 'notifications') {
                      setShowSocial(false);
                    } else {
                      setShowSocial(true);
                      setSocialMode('notifications');
                      setActiveTab('requests');
                      setSelectedFriend(null);
                    }
                  }}
                  title="System Logs"
                >
                  <img src="/project-icons/Friends and Chat icons/bell.png" alt="Notifications" className="w-5 h-5 object-contain group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.4)] transition-all" />
                  {notificationCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                    </span>
                  )}
                </button>

                <div className="w-px h-4 bg-white/5" />

                {/* Profile Access Portal */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="relative group p-0.5 rounded-xl border border-transparent hover:border-primary/50 transition-all duration-300"
                  >
                    <img
                      src={profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                      alt="Profile"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                  </button>
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-4 w-56 glass-panel rounded-2xl py-3 animate-in fade-in zoom-in-95 duration-200 shadow-2xl z-[70]">
                      <button
                        onClick={() => { navigate('/profile'); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-5 py-3 hover:bg-primary hover:text-black font-bold transition-all text-[11px] uppercase tracking-widest flex items-center gap-3 italic text-white/70"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Access Profile
                      </button>
                      <div className="h-px bg-white/5 mx-3 my-1" />
                      <button
                        onClick={() => { handleLogout(); setProfileDropdownOpen(false); }}
                        className="w-full text-left px-5 py-3 hover:bg-red-500 hover:text-white font-bold transition-all text-[11px] uppercase tracking-widest flex items-center gap-3 italic text-white/70"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Terminate Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!user && (
              <Link
                to="/login"
                className="lg:hidden w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-black transition-all active:scale-95"
              >
                <span className="text-sm font-black italic">!</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle would go here if needed */}
        </div>
      </header>

      <main className="flex-grow flex flex-col relative">
        <div className="page-content flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/login"
              element={user ? <Navigate to="/profile" /> : <Login />}
            />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/feeds" element={<Feeds />} />
            <Route path="/summoner" element={<Summoner />} />
            <Route path="/live-game" element={<LiveGame />} />
            <Route path="/queue" element={<QueueSystem />} />
            <Route path="/finishSignIn" element={<FinishSignIn />} />
            <Route path="/become-coach" element={<BecomeCoach />} />
            <Route path="/coach-rules" element={<CoachRules />} />
            <Route path="/coaching" element={<Coaching />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/apply-admin" element={<AdminApplication />} />
            <Route path="/champions" element={<Champions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/tos" element={<TermsOfService />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />

            <Route
              path="*"
              element={<p className="error-box">404: Page not found</p>}
            />
          </Routes>
        </div>
        {user && (
          <Announcement
            notificationCount={notificationCount}
            setNotificationCount={setNotificationCount}
            isEmbedded={false}
            showPanel={false}
          />
        )}
        {user && (
          <>
            {/* Chat Interface Trigger - Command Focal Point */}
            <button
              className={`fixed right-6 bottom-12 z-[60] w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-2xl group animate-in slide-in-from-right duration-700 overflow-hidden ${showSocial && socialMode === 'chat'
                ? 'bg-white text-black'
                : 'bg-primary text-black hover:bg-white shadow-primary/20'
                }`}
              onClick={() => {
                if (showSocial && socialMode === 'chat') {
                  setShowSocial(false);
                } else {
                  setShowSocial(true);
                  setSocialMode('chat');
                  setActiveTab('friends');
                  setSelectedFriend(null);
                }
              }}
              title={showSocial ? "Close Hub" : "Open Social Hub"}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src="/project-icons/Friends and Chat icons/comment chat balloon.png" alt="Chat" className="w-6 h-6 object-contain group-hover:scale-110 transition-all duration-500" />
              {totalUnreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shadow-lg border-2 border-primary animate-bounce">
                  {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                </span>
              )}
            </button>

            {/* Social Panel: Community Synchronization */}
            <div className={`fixed right-0 top-0 bottom-0 z-[55] w-full md:w-96 glass-panel border-l border-white/5 transform transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[-20px_0_60px_rgba(0,0,0,0.8)] flex flex-col ${showSocial ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}>
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex flex-col gap-1">
                  <h4 className="font-display font-black text-xl tracking-tight uppercase italic text-white">
                    {socialMode === 'chat' ? 'Community Chat' : 'Notifications'}
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-primary/40 rounded-full" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">Online Sync: Active</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSocial(false)}
                  className="p-3 bg-white/2 hover:bg-white/5 border border-white/5 rounded-2xl transition-all active:scale-90 group"
                >
                  <div className="w-4 h-4 relative flex items-center justify-center">
                    <div className="absolute w-full h-0.5 bg-muted-foreground/50 group-hover:bg-primary rotate-45 transition-colors" />
                    <div className="absolute w-full h-0.5 bg-muted-foreground/50 group-hover:bg-primary -rotate-45 transition-colors" />
                  </div>
                </button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-30 pointer-events-none" />
                {socialMode === 'chat' ? (
                  !selectedFriend ? (
                    <FriendsList
                      onSelectFriend={handleSelectFriend}
                      onUnreadCountChange={setTotalUnreadMessages}
                    />
                  ) : (
                    <Chat
                      selectedFriend={selectedFriend}
                      onBack={handleBackToFriends}
                    />
                  )
                ) : (
                  <Announcement
                    notificationCount={notificationCount}
                    setNotificationCount={setNotificationCount}
                    isEmbedded={true}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
      <CookieConsent />
    </div >
  );
}

export default App;