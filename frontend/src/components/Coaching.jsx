import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';

function Coaching() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [coaches, setCoaches] = useState([]);
    const [coachingSessions, setCoachingSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('coaches');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [expandedSessions, setExpandedSessions] = useState(new Set());
    const [filters, setFilters] = useState({
        specialty: '',
        minPrice: '',
        maxPrice: ''
    });
    const [newSession, setNewSession] = useState({
        title: '',
        description: '',
        price: '',
        durationHours: '1',
        durationMinutes: '0',
        specialty: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [editFormData, setEditFormData] = useState({
        title: '',
        description: '',
        price: '',
        durationHours: '1',
        durationMinutes: '0',
        specialty: ''
    });

    const specialtyOptions = [
        'Top Lane', 'Jungle', 'Mid Lane', 'Bot Lane', 'Support',
        'Macro Strategy', 'Micro Mechanics', 'Wave Management',
        'Vision Control', 'Team Fighting', 'Mental Coaching'
    ];

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role || 'user');
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const coachesQuery = query(collection(db, "users"), where("role", "==", "coach"));
            const coachesSnapshot = await getDocs(coachesQuery);
            const coachesData = coachesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCoaches(coachesData);

            const sessionsQuery = query(collection(db, "coachingSessions"), orderBy("createdAt", "desc"));
            const sessionsSnapshot = await getDocs(sessionsQuery);
            const sessionsData = sessionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCoachingSessions(sessionsData);
        } catch (err) {
            console.error('Error fetching coaching data:', err);
        }
        setLoading(false);
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (userRole !== 'coach') return;

        setSubmitting(true);
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.data();

            const totalMinutes = (parseInt(newSession.durationHours) || 0) * 60 + (parseInt(newSession.durationMinutes) || 0);

            if (totalMinutes > 720) {
                alert('Duration cannot exceed 12 hours (720 minutes)');
                setSubmitting(false);
                return;
            }

            if (totalMinutes <= 0) {
                alert('Duration must be greater than 0');
                setSubmitting(false);
                return;
            }

            await addDoc(collection(db, "coachingSessions"), {
                coachId: user.uid,
                coachName: userData.username || user.displayName,
                coachRiotAccount: userData.riotAccount,
                coachRankedData: userData.rankedData,
                title: newSession.title,
                description: newSession.description,
                price: parseFloat(newSession.price),
                duration: totalMinutes,
                specialty: newSession.specialty,
                createdAt: serverTimestamp(),
                active: true
            });

            setNewSession({
                title: '',
                description: '',
                price: '',
                durationHours: '1',
                durationMinutes: '0',
                specialty: ''
            });
            setShowCreateForm(false);
            fetchData();
        } catch (err) {
            console.error('Error creating session:', err);
        }
        setSubmitting(false);
    };

    const handleDeleteSession = async (sessionId) => {
        if (!window.confirm('Are you sure you want to delete this coaching session?')) return;

        try {
            await deleteDoc(doc(db, "coachingSessions", sessionId));
            fetchData();
        } catch (err) {
            console.error('Error deleting session:', err);
        }
    };

    const handleEditSession = (session) => {
        const totalMin = parseInt(session.duration) || 0;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;

        setEditingSession(session.id);
        setEditFormData({
            title: session.title,
            description: session.description,
            price: session.price.toString(),
            durationHours: h.toString(),
            durationMinutes: m.toString(),
            specialty: session.specialty
        });
    };

    const handleCancelEdit = () => {
        setEditingSession(null);
        setEditFormData({
            title: '',
            description: '',
            price: '',
            durationHours: '1',
            durationMinutes: '0',
            specialty: ''
        });
    };

    const handleUpdateSession = async (sessionId) => {
        setSubmitting(true);
        try {
            const totalMinutes = (parseInt(editFormData.durationHours) || 0) * 60 + (parseInt(editFormData.durationMinutes) || 0);

            if (totalMinutes > 720) {
                alert('Duration cannot exceed 12 hours (720 minutes)');
                setSubmitting(false);
                return;
            }

            if (totalMinutes <= 0) {
                alert('Duration must be greater than 0');
                setSubmitting(false);
                return;
            }

            await updateDoc(doc(db, "coachingSessions", sessionId), {
                title: editFormData.title,
                description: editFormData.description,
                price: parseFloat(editFormData.price),
                duration: totalMinutes,
                specialty: editFormData.specialty
            });
            setEditingSession(null);
            setEditFormData({
                title: '',
                description: '',
                price: '',
                durationHours: '1',
                durationMinutes: '0',
                specialty: ''
            });
            fetchData();
        } catch (err) {
            console.error('Error updating session:', err);
        }
        setSubmitting(false);
    };

    const canDeleteSession = (session) => {
        if (!user) return false;
        if (userRole === 'admin' || userRole === 'owner') return true;
        return session.coachId === user.uid;
    };

    const canEditSession = (session) => {
        if (!user) return false;
        return session.coachId === user.uid;
    };

    const isOwnSession = (session) => {
        return user && session.coachId === user.uid;
    };

    const getHighestRank = (rankedData) => {
        if (!rankedData || rankedData.length === 0) return null;
        const tierOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
        let highest = rankedData[0];
        for (const queue of rankedData) {
            if (tierOrder.indexOf(queue.tier) > tierOrder.indexOf(highest.tier)) {
                highest = queue;
            }
        }
        return highest;
    };

    const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png` : null;

    const filteredSessions = coachingSessions.filter(session => {
        if (filters.specialty && session.specialty !== filters.specialty) return false;
        if (filters.minPrice && session.price < parseFloat(filters.minPrice)) return false;
        if (filters.maxPrice && session.price > parseFloat(filters.maxPrice)) return false;
        return true;
    });

    const toggleExpand = (sessionId) => {
        setExpandedSessions(prev => {
            const next = new Set(prev);
            if (next.has(sessionId)) next.delete(sessionId);
            else next.add(sessionId);
            return next;
        });
    };

    if (loading) return <div className="loading">Loading coaching data...</div>;

    return (
        <div className="min-h-screen py-12 px-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[60rem] h-[60rem] bg-primary/5 rounded-full blur-[12rem] -mr-96 -mt-96 opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[10rem] -ml-80 -mb-80 opacity-10 pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 animate-in fade-in duration-1000">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-20 gap-x-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                            <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter text-white italic uppercase">
                                <span className="text-primary">Coaching</span>
                            </h1>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/70 italic">Online</span>
                            </div>
                            <div className="w-px h-3 bg-white/10" />
                            <p className="text-[11px] font-black uppercase tracking-widest text-white/30 italic">Coaching Dashboard</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {userRole === 'coach' && (
                            <button
                                className={`h-14 px-10 rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase transition-all shadow-xl group overflow-hidden relative ${showCreateForm
                                    ? 'bg-white text-black'
                                    : 'bg-primary text-black hover:bg-white shadow-primary/20'
                                    } `}
                                onClick={() => setShowCreateForm(!showCreateForm)}
                            >
                                <span className="relative z-10">{showCreateForm ? '✕ Close Form' : '+ Create Session'}</span>
                                <div className="absolute inset-0 bg-white/20 translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500" />
                            </button>
                        )}
                        {(userRole === 'user' || !user) && (
                            <Link
                                to="/become-coach"
                                className="h-14 px-10 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white font-black text-[11px] tracking-[0.2em] uppercase hover:bg-primary hover:text-black hover:border-primary transition-all flex items-center shadow-2xl group relative overflow-hidden"
                            >
                                <span className="relative z-10">Apply as a Coach</span>
                                <div className="absolute inset-0 bg-primary translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-500" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Rules Banner */}
                <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 mb-16 group relative overflow-hidden hover:border-primary/20 transition-all duration-700">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 group-hover:scale-110 transition-transform duration-700">
                            <img src="/project-icons/Coaching icons/guide.png" alt="Rules" className="w-10 h-10 group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.4)] transition-all" />
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <h4 className="font-display text-2xl font-black tracking-tight text-white italic uppercase">Coaching Guidelines</h4>
                            </div>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">Rules and conduct for all coaches and students.</p>
                        </div>
                        <Link
                            to="/coach-rules"
                            className="px-8 py-3.5 rounded-xl border border-white/10 hover:border-primary/50 text-white hover:text-primary font-black text-[10px] tracking-[0.2em] uppercase transition-all flex items-center gap-2 group/link"
                        >
                            Review Rules
                            <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>
                </div>

                {/* Create Session Form */}
                {showCreateForm && userRole === 'coach' && (
                    <div className="glass-panel p-10 lg:p-12 rounded-[3.5rem] border-primary/20 mb-20 animate-in slide-in-from-top-12 duration-1000 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-20 pointer-events-none" />

                        <form onSubmit={handleCreateSession} className="relative space-y-10">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                                    <h3 className="font-display text-3xl font-black tracking-tight text-white uppercase italic text-center md:text-left">Create New Session</h3>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/50 italic ml-4.5">Coaching Setup</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase font-black tracking-[0.3em] text-white/30 ml-4 italic">Session Title</label>
                                    <input
                                        type="text"
                                        value={newSession.title}
                                        onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                                        placeholder="e.g., Mid Lane Macro"
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm text-white focus:border-primary/50 transition-all outline-none placeholder:text-white/20 font-medium"
                                        maxLength={30}
                                        required
                                    />
                                    <div className="text-[9px] text-right font-black tracking-widest text-primary/30 uppercase italic px-4">{newSession.title.length} / 30 Characters</div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase font-black tracking-[0.3em] text-white/30 ml-4 italic">Specialty</label>
                                    <select
                                        value={newSession.specialty}
                                        onChange={(e) => setNewSession({ ...newSession, specialty: e.target.value })}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm text-white focus:border-primary/50 cursor-pointer outline-none font-medium appearance-none"
                                        required
                                    >
                                        <option value="" className="bg-neutral-900">Select Specialty...</option>
                                        {specialtyOptions.map(s => (
                                            <option key={s} value={s} className="bg-neutral-900">{s.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] uppercase font-black tracking-[0.3em] text-white/30 ml-4 italic">Lesson Description</label>
                                <textarea
                                    value={newSession.description}
                                    onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                                    placeholder="Outline your coaching strategies and objectives... Be detailed."
                                    className="w-full bg-white/5 border border-white/10 rounded-3xl px-8 py-6 text-sm text-white focus:border-primary/50 transition-all min-h-[160px] outline-none placeholder:text-white/20 font-medium leading-relaxed"
                                    maxLength={1000}
                                    required
                                />
                                <div className="text-[9px] text-right font-black tracking-widest text-primary/30 uppercase italic px-4">{newSession.description.length} / 1000 Characters</div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase font-black tracking-[0.3em] text-white/30 ml-4 italic">Hourly Rate [USD/HR]</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black text-xs">$</span>
                                        <input
                                            type="number"
                                            value={newSession.price}
                                            onChange={(e) => setNewSession({ ...newSession, price: e.target.value })}
                                            placeholder="25.00"
                                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-6 text-sm text-white focus:border-primary/50 outline-none font-black"
                                            min="1"
                                            max="5000"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase font-black tracking-[0.3em] text-white/30 ml-4 italic">Duration [MAX 12H]</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={newSession.durationHours}
                                                onChange={(e) => setNewSession({ ...newSession, durationHours: e.target.value })}
                                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm text-white focus:border-primary/50 outline-none font-black text-center"
                                                min="0" max="12" required
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/20 uppercase">HR</span>
                                        </div>
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={newSession.durationMinutes}
                                                onChange={(e) => setNewSession({ ...newSession, durationMinutes: e.target.value })}
                                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm text-white focus:border-primary/50 outline-none font-black text-center"
                                                min="0" max="59" required
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/20 uppercase">MIN</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full h-16 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-white hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all shadow-xl shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group/btn relative"
                                disabled={submitting}
                            >
                                <span className="relative z-10">{submitting ? 'CREATING SESSION...' : 'Publish Coaching Session'}</span>
                                <div className="absolute inset-0 bg-white/20 translate-x-[-101%] group-hover/btn:translate-x-0 transition-transform duration-500" />
                            </button>
                        </form>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-4 mb-16 px-2">
                    <button
                        className={`group relative h-14 px-10 rounded-2xl font-black text-[10px] tracking-[0.3em] uppercase transition-all flex items-center gap-3 overflow-hidden ${activeTab === 'sessions'
                            ? 'bg-primary text-black shadow-[0_10px_30px_rgba(234,179,8,0.2)]'
                            : 'bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                            } `}
                        onClick={() => setActiveTab('sessions')}
                    >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white transition-transform ${activeTab === 'sessions' ? 'translate-x-0' : '-translate-x-full'}`} />
                        <img src="/project-icons/Coaching icons/coaching session.png" alt="" className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === 'sessions' ? '' : 'opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0'}`} />
                        <span className="relative z-10">Sessions</span>
                    </button>
                    <button
                        className={`group relative h-14 px-10 rounded-2xl font-black text-[10px] tracking-[0.3em] uppercase transition-all flex items-center gap-3 overflow-hidden ${activeTab === 'coaches'
                            ? 'bg-primary text-black shadow-[0_10px_30px_rgba(234,179,8,0.2)]'
                            : 'bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10'
                            } `}
                        onClick={() => setActiveTab('coaches')}
                    >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white transition-transform ${activeTab === 'coaches' ? 'translate-x-0' : '-translate-x-full'}`} />
                        <img src="/project-icons/Coaching icons/available coaches.png" alt="" className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === 'coaches' ? '' : 'opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0'}`} />
                        <span className="relative z-10">Available Coaches</span>
                    </button>
                    <div className="flex-1" />
                    <div className="hidden lg:flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                        <span className="text-[9px] font-black tracking-widest text-primary/40 uppercase italic">Live Updates Enabled</span>
                    </div>
                </div>

                {/* Sessions View */}
                {activeTab === 'sessions' && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {/* Filters */}
                        <div className="glass-panel p-6 rounded-3xl mb-16 flex flex-wrap items-center gap-6 border-white/5 bg-white/[0.01]">
                            <div className="flex-1 min-w-[280px] relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                                <select
                                    value={filters.specialty}
                                    onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-14 pr-6 text-[11px] font-black tracking-[0.1em] uppercase text-white outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-neutral-900">All Specialties [Default]</option>
                                    {specialtyOptions.map(s => (
                                        <option key={s} value={s} className="bg-neutral-900">{s.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 flex-1 min-w-[320px]">
                                <div className="flex-1 relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">MIN</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={filters.minPrice}
                                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-14 pr-6 text-[11px] font-black text-white outline-none focus:border-primary/50 transition-all font-mono"
                                    />
                                </div>
                                <div className="w-2 h-px bg-white/10" />
                                <div className="flex-1 relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">MAX</span>
                                    <input
                                        type="number"
                                        placeholder="500.00"
                                        value={filters.maxPrice}
                                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-14 pr-6 text-[11px] font-black text-white outline-none focus:border-primary/50 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <button
                                className="h-12 px-8 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 text-[10px] font-black tracking-[0.2em] uppercase text-white/40 hover:text-red-400 transition-all active:scale-95"
                                onClick={() => setFilters({ specialty: '', minPrice: '', maxPrice: '' })}
                            >
                                Clear Filters
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-10">
                            {filteredSessions.length === 0 ? (
                                <div className="col-span-full py-32 text-center glass-panel rounded-[3.5rem] border-white/5 bg-white/[0.01]">
                                    <div className="text-white/5 text-9xl font-black mb-8 select-none">??</div>
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">No Active Sessions Found</h3>
                                    <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] max-w-sm mx-auto">No sessions match your filters. Adjust parameters to find coaches.</p>
                                </div>
                            ) : (
                                filteredSessions.map(session => (
                                    <SessionCard
                                        key={session.id}
                                        session={session}
                                        isOwn={isOwnSession(session)}
                                        canEdit={canEditSession(session)}
                                        canDelete={canDeleteSession(session)}
                                        isEditing={editingSession === session.id}
                                        editFormData={editFormData}
                                        setEditFormData={setEditFormData}
                                        handleUpdate={() => handleUpdateSession(session.id)}
                                        handleDelete={() => handleDeleteSession(session.id)}
                                        handleEdit={() => handleEditSession(session)}
                                        handleCancelEdit={handleCancelEdit}
                                        submitting={submitting}
                                        specialtyOptions={specialtyOptions}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Coaches View */}
                {activeTab === 'coaches' && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {coaches.map(coach => (
                            <CoachCard key={coach.id} coach={coach} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function SessionCard({
    session, isOwn, canEdit, canDelete, isEditing,
    editFormData, setEditFormData, handleUpdate, handleDelete,
    handleEdit, handleCancelEdit, submitting, specialtyOptions
}) {
    const tierOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
    const getHighestRank = (rankedData) => {
        if (!rankedData || rankedData.length === 0) return null;
        let highest = rankedData[0];
        for (const queue of rankedData) {
            if (tierOrder.indexOf(queue.tier) > tierOrder.indexOf(highest.tier)) {
                highest = queue;
            }
        }
        return highest;
    };
    const rank = getHighestRank(session.coachRankedData);
    const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png` : null;

    if (isEditing) {
        return (
            <div className="glass-panel p-10 rounded-[3rem] border-primary/30 bg-primary/5 shadow-[0_20px_50px_rgba(234,179,8,0.1)] animate-in zoom-in-95 duration-500">
                <div className="space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-primary rounded-full" />
                        <h4 className="font-display text-xl font-black text-white italic uppercase tracking-tight">Modify Session Details</h4>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-primary/70 tracking-[0.3em] uppercase italic ml-4">Session Title</label>
                        <input
                            type="text"
                            value={editFormData.title}
                            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-6 text-sm text-white focus:border-primary/50 outline-none transition-all font-medium"
                            maxLength={30}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-primary/70 tracking-[0.3em] uppercase italic ml-4">Lesson description</label>
                        <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary/50 outline-none transition-all min-h-[120px] font-medium leading-relaxed"
                            maxLength={1000}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-primary/70 tracking-[0.3em] uppercase italic ml-4">Hourly Price ($)</label>
                            <input
                                type="number"
                                value={editFormData.price}
                                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-6 text-sm text-white focus:border-primary/50 outline-none font-black"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-primary/70 tracking-[0.3em] uppercase italic ml-4">Specialty</label>
                            <select
                                value={editFormData.specialty}
                                onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-[11px] font-black uppercase text-white outline-none focus:border-primary/50 appearance-none cursor-pointer"
                            >
                                {specialtyOptions.map(s => (
                                    <option key={s} value={s} className="bg-neutral-900">{s.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={handleUpdate}
                            disabled={submitting}
                            className="flex-1 h-14 bg-primary text-black rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {submitting ? 'UPDATING...' : 'Update Session'}
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="flex-1 h-14 bg-white/5 border border-white/10 text-white/50 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-8 rounded-[3rem] border-white/5 hover:border-primary/30 transition-all duration-700 group relative flex flex-col overflow-hidden bg-white/[0.01]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center gap-5">
                    {session.coachRiotAccount && (
                        <div className="relative group/avatar">
                            <div className="absolute -inset-1 bg-primary/30 rounded-2xl blur-lg opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
                            <img
                                src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${session.coachRiotAccount.profileIconId}.png`}
                                alt="Coach"
                                className="w-16 h-16 rounded-2xl border border-white/10 group-hover:border-primary/50 transition-all relative z-10"
                            />
                            {rank && (
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-black/80 border border-white/10 p-1 flex items-center justify-center shadow-xl z-20 group-hover:scale-110 transition-transform">
                                    <img src={getRankIcon(rank.tier)} alt={rank.tier} className="w-full h-full drop-shadow-[0_0_5px_rgba(234,179,8,0.3)]" />
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <Link to={`/profile/${session.coachId}`} className="font-display text-xl font-black tracking-tight text-white flex items-center gap-2 hover:text-primary transition-colors uppercase italic">
                            {session.coachName}
                            {isOwn && <span className="bg-primary/20 text-primary text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase not-italic">YOU</span>}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1 h-1 rounded-full bg-primary/40" />
                            <div className="text-[10px] font-black text-primary tracking-[0.2em] uppercase italic opacity-70">{session.specialty} Focus</div>
                        </div>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="flex items-baseline gap-1">
                        <span className="text-primary text-[10px] font-black mb-1 mr-1">$</span>
                        <div className="text-3xl font-black tracking-tighter text-white tabular-nums italic">{session.price}</div>
                    </div>
                    <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] italic">Per Hour</div>
                </div>
            </div>

            <div className="flex-1 mb-10 relative z-10 px-2 lg:px-4">
                <h3 className="font-display text-2xl font-black mb-4 text-white group-hover:text-primary transition-colors tracking-tight uppercase italic leading-tight">{session.title}</h3>
                <p className="text-[13px] font-medium text-white/40 line-clamp-4 leading-relaxed italic">{session.description}</p>
            </div>

            <div className="pt-8 border-t border-white/5 flex items-center justify-between relative z-10 mt-auto px-2">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                        <span className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase italic">Lesson Duration</span>
                    </div>
                    <div className="text-[11px] font-black text-white tracking-widest uppercase italic ml-3.5">
                        {Math.floor(session.duration / 60) > 0 ? `${Math.floor(session.duration / 60)}H ` : ''}{session.duration % 60}M Duration
                    </div>
                </div>

                <div className="flex gap-3">
                    {canEdit && (
                        <button
                            onClick={handleEdit}
                            title="Edit Session"
                            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/50 hover:bg-primary/10 transition-all hover:-translate-y-1 active:scale-90"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            title="Delete Session"
                            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 transition-all hover:-translate-y-1 active:scale-90"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    )}
                    {!isOwn && (
                        <button className="h-11 px-6 rounded-xl bg-primary text-black font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white transition-all shadow-lg shadow-primary/10 select-none opacity-50 cursor-not-allowed group/btn overflow-hidden relative">
                            <span className="relative z-10">Book Session</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function CoachCard({ coach }) {
    const tierOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
    const getHighestRank = (rankedData) => {
        if (!rankedData || rankedData.length === 0) return null;
        let highest = rankedData[0];
        for (const queue of rankedData) {
            if (tierOrder.indexOf(queue.tier) > tierOrder.indexOf(highest.tier)) {
                highest = queue;
            }
        }
        return highest;
    };
    const rank = getHighestRank(coach.rankedData);
    const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png` : null;

    return (
        <div className="glass-panel p-10 rounded-[3rem] flex flex-col items-center text-center group hover:border-primary/30 transition-all duration-700 relative overflow-hidden bg-white/[0.01]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -mr-24 -mt-24 pointer-events-none" />

            <div className="relative mb-8">
                <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-1000 scale-75 group-hover:scale-100" />
                {coach.riotAccount ? (
                    <div className="relative z-10 p-1 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent">
                        <img
                            src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${coach.riotAccount.profileIconId}.png`}
                            alt="Coach"
                            className="w-28 h-28 rounded-[2rem] border-2 border-white/5 shadow-2xl relative transition-transform duration-700 group-hover:scale-105"
                        />
                    </div>
                ) : (
                    <div className="w-28 h-28 rounded-[2.5rem] bg-white/5 flex items-center justify-center text-5xl relative z-10 border border-white/10 italic">👤</div>
                )}
                {rank && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black border border-primary/50 text-primary px-4 py-1.5 rounded-xl text-[9px] font-black shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-20 flex items-center gap-2 group-hover:scale-110 transition-transform">
                        <img src={getRankIcon(rank.tier)} alt="" className="w-4 h-4 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                        <span className="uppercase tracking-[0.1em]">{rank.tier}</span>
                    </div>
                )}
            </div>

            <div className="space-y-1 mb-6">
                <h4 className="font-display text-2xl font-black text-white tracking-tight group-hover:text-primary transition-colors uppercase italic">{coach.username}</h4>
                {coach.riotAccount && (
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">
                        {coach.riotAccount.gameName} <span className="text-primary/30">#</span>{coach.riotAccount.tagLine}
                    </div>
                )}
            </div>

            <div className="w-full space-y-6 mb-10">
                {coach.coachProfile?.specialties && (
                    <div className="flex flex-wrap justify-center gap-2 px-4">
                        {coach.coachProfile.specialties.slice(0, 3).map(s => (
                            <span key={s} className="px-3 py-1.5 rounded-lg bg-white/5 text-[9px] font-black tracking-widest uppercase italic border border-white/5 text-white/50 group-hover:text-white group-hover:border-primary/20 transition-all">{s}</span>
                        ))}
                    </div>
                )}

                <div className="h-px w-10 bg-white/10 mx-auto" />

                {coach.coachProfile?.hourlyRate && (
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] italic">Hourly Retribution</div>
                        <div className="text-2xl font-black text-white italic tabular-nums">
                            <span className="text-primary text-sm mr-1">$</span>
                            {coach.coachProfile.hourlyRate}
                        </div>
                    </div>
                )}
            </div>

            <Link
                to={`/profile/${coach.id}`}
                className="mt-auto w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white/40 group-hover:bg-primary group-hover:text-black group-hover:border-primary font-black text-[11px] tracking-[0.3em] uppercase transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group/btn"
            >
                <span className="relative z-10">Inspect Presence</span>
                <div className="absolute inset-0 bg-primary translate-x-[-101%] group-hover/btn:translate-x-0 transition-transform duration-500" />
            </Link>
        </div>
    );
}

export default Coaching;