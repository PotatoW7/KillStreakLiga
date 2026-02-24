import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const MINIMUM_RANK_TIER = ['PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const REAPPLY_COOLDOWN_MS = 3 * 30 * 24 * 60 * 60 * 1000;

function BecomeCoach() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        experience: '',
        availability: '1-2 hours',
        availabilityType: '1-2 hours',
        specialties: [],
        whyCoach: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [canReapply, setCanReapply] = useState(true);
    const [cooldownRemaining, setCooldownRemaining] = useState(null);
    const navigate = useNavigate();

    const specialtyOptions = [
        'Top Lane', 'Jungle', 'Mid Lane', 'Bot Lane', 'Support',
        'Macro Strategy', 'Micro Mechanics', 'Wave Management',
        'Vision Control', 'Team Fighting', 'Mental Coaching'
    ];

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);

                        if (data.role === 'coach') {
                            setError('You are already a verified coach!');
                        } else if (data.coachApplication?.status === 'pending') {
                            setError('You already have a pending coach application.');
                        }

                        if (data.coachApplication?.status === 'rejected' && data.coachApplication?.reviewedAt) {
                            const reviewedDate = data.coachApplication.reviewedAt.toDate ?
                                data.coachApplication.reviewedAt.toDate() : new Date(data.coachApplication.reviewedAt);
                            const timeSinceRejection = Date.now() - reviewedDate.getTime();

                            if (timeSinceRejection < REAPPLY_COOLDOWN_MS) {
                                setCanReapply(false);
                                const remaining = REAPPLY_COOLDOWN_MS - timeSinceRejection;
                                const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
                                setCooldownRemaining(daysRemaining);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

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

    const isEligibleRank = (rankedData) => {
        const highest = getHighestRank(rankedData);
        if (!highest) return false;
        return MINIMUM_RANK_TIER.includes(highest.tier);
    };

    const handleSpecialtyToggle = (specialty) => {
        setForm(prev => ({
            ...prev,
            specialties: prev.specialties.includes(specialty)
                ? prev.specialties.filter(s => s !== specialty)
                : [...prev.specialties, specialty]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!canReapply) {
            setError(`You cannot reapply for coaching yet. Please wait ${cooldownRemaining} more days.`);
            return;
        }

        if (!userData?.riotAccount) {
            setError('You must link a Riot Games account first.');
            return;
        }

        if (!isEligibleRank(userData.rankedData)) {
            setError('You must be Platinum rank or higher to become a coach.');
            return;
        }

        if (form.specialties.length === 0) {
            setError('Please select at least one specialty.');
            return;
        }

        if (form.experience.length < 50) {
            setError('Please provide more detail about your experience (at least 50 characters).');
            return;
        }

        setSubmitting(true);

        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                coachApplication: {
                    status: 'pending',
                    submittedAt: serverTimestamp(),
                    riotAccount: userData.riotAccount,
                    rankedData: userData.rankedData,
                    experience: form.experience,
                    availability: form.availability,
                    specialties: form.specialties,
                    whyCoach: form.whyCoach,
                    reviewedBy: null,
                    reviewedAt: null,
                    rejectionReason: null
                }
            }, { merge: true });

            setSuccess('Your coach application has been submitted! An admin will review it soon.');
            setTimeout(() => navigate('/profile'), 3000);
        } catch (err) {
            console.error('Error submitting application:', err);
            setError('Failed to submit application. Please try again.');
        }
        setSubmitting(false);
    };

    if (loading) return <div className="loading">Loading...</div>;

    const hasRiotAccount = userData?.riotAccount;
    const highestRank = getHighestRank(userData?.rankedData);
    const meetsRankRequirement = isEligibleRank(userData?.rankedData);
    const hasPendingApplication = userData?.coachApplication?.status === 'pending';
    const isAlreadyCoach = userData?.role === 'coach';
    const wasRejected = userData?.coachApplication?.status === 'rejected';

    return (
        <div className="min-h-screen py-20 px-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-[60rem] h-[60rem] bg-primary/5 rounded-full blur-[12rem] -ml-96 -mt-96 opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[10rem] -mr-80 -mb-80 opacity-10 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Header Section */}
                <div className="text-center space-y-4 mb-20">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4 group hover:border-primary/30 transition-all duration-500">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 italic">Status: Open</span>
                    </div>
                    <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter text-white italic uppercase leading-none">
                        Coach <span className="text-primary italic">Application</span>
                    </h1>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30 italic max-w-lg mx-auto leading-relaxed">
                        Apply to Coach
                    </p>
                </div>

                {/* Rules Banner */}
                <div className="glass-panel p-8 rounded-[2.5rem] border-white/5 mb-16 hover:border-primary/20 transition-all duration-700 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 group-hover:scale-110 transition-transform">
                            <img src="/project-icons/Coaching icons/guide.png" alt="Rules" className="w-8 h-8" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h4 className="font-display text-xl font-black tracking-tight text-white italic uppercase mb-1">Coach Guidelines</h4>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mandatory requirements for all active coaches.</p>
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

                {/* Requirements Checklist */}
                <div className="glass-panel p-10 rounded-[3rem] border-white/5 mb-16 relative overflow-hidden bg-white/[0.01]">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                        <h3 className="font-display text-2xl font-black tracking-tight text-white uppercase italic">Checklist</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className={`p-6 rounded-2xl border transition-all duration-500 flex flex-col gap-4 ${hasRiotAccount ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/10 opacity-60'}`}>
                            <div className="flex justify-between items-start">
                                <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Step 01</div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${hasRiotAccount ? 'bg-primary text-black' : 'bg-white/10 text-white/20'}`}>
                                    {hasRiotAccount ? '✓' : '01'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-display text-lg font-black text-white italic uppercase tracking-tight">Link Account</h4>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">A verified Riot Games account must be linked to your profile.</p>
                            </div>
                            {!hasRiotAccount && (
                                <Link to="/profile" className="mt-2 text-primary font-black text-[10px] uppercase tracking-widest hover:underline">Link Account [Link]</Link>
                            )}
                        </div>

                        <div className={`p-6 rounded-2xl border transition-all duration-500 flex flex-col gap-4 ${meetsRankRequirement ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/10 opacity-60'}`}>
                            <div className="flex justify-between items-start">
                                <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Step 02</div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${meetsRankRequirement ? 'bg-primary text-black' : 'bg-white/10 text-white/20'}`}>
                                    {meetsRankRequirement ? '✓' : '02'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-display text-lg font-black text-white italic uppercase tracking-tight">Rank Requirement</h4>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">Coach application requires a confirmed Platinum tier or above.</p>
                                {highestRank && (
                                    <div className="mt-2 text-[10px] font-black text-primary uppercase italic">Detected Tier: {highestRank.tier} {highestRank.rank}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isAlreadyCoach && (
                    <div className="glass-panel p-8 rounded-[2.5rem] border-primary/30 bg-primary/5 mb-16 animate-in zoom-in-95 duration-700">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl shadow-[0_0_15px_rgba(234,179,8,0.2)]">✓</div>
                            <div className="space-y-1">
                                <h4 className="font-display text-xl font-black text-white italic uppercase tracking-tight">Coach Verified</h4>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">You are already a verified coach. <Link to="/coaching" className="text-primary hover:underline">Access Dashboard</Link></p>
                            </div>
                        </div>
                    </div>
                )}

                {hasPendingApplication && (
                    <div className="glass-panel p-8 rounded-[2.5rem] border-primary/30 bg-primary/5 mb-16 animate-in zoom-in-95 duration-700">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl animate-pulse">⟳</div>
                            <div className="space-y-1">
                                <h4 className="font-display text-xl font-black text-white italic uppercase tracking-tight">Application Pending</h4>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Your application is being reviewed. You will be notified when a decision is made.</p>
                            </div>
                        </div>
                    </div>
                )}

                {wasRejected && !canReapply && (
                    <div className="glass-panel p-8 rounded-[2.5rem] border-red-500/30 bg-red-500/5 mb-16 animate-in zoom-in-95 duration-700">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xl font-black">✕</div>
                            <div className="space-y-1">
                                <h4 className="font-display text-xl font-black text-white italic uppercase tracking-tight text-red-400">Application Rejected</h4>
                                {userData.coachApplication.rejectionReason && (
                                    <p className="text-[10px] font-bold text-red-400/60 uppercase tracking-widest mb-1 italic">Reason: {userData.coachApplication.rejectionReason}</p>
                                )}
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">You can reapply in <span className="text-white">{cooldownRemaining} days</span>.</p>
                            </div>
                        </div>
                    </div>
                )}

                {wasRejected && canReapply && (
                    <div className="glass-panel p-8 rounded-[2.5rem] border-white/10 bg-white/5 mb-16 animate-in zoom-in-95 duration-700">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xl font-black">!</div>
                            <div className="space-y-1">
                                <h4 className="font-display text-xl font-black text-white italic uppercase tracking-tight">Status Reset</h4>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">Your previous application was unsuccessful, but you can now reapply.</p>
                                {userData.coachApplication.rejectionReason && (
                                    <p className="text-[9px] font-black text-red-400/40 uppercase tracking-[0.2em] mt-1 italic">Log: {userData.coachApplication.rejectionReason}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!isAlreadyCoach && !hasPendingApplication && canReapply && hasRiotAccount && meetsRankRequirement && (
                    <form onSubmit={handleSubmit} className="glass-panel p-10 lg:p-12 rounded-[3.5rem] border-white/5 relative overflow-hidden bg-white/[0.01]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-20 pointer-events-none" />

                        <div className="flex flex-col gap-1 mb-12">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                                <h3 className="font-display text-3xl font-black tracking-tight text-white uppercase italic">Application Form</h3>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic ml-4.5">Please fill out the details below</p>
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-4">
                                <label className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/70 ml-4 italic">Experience Summary [Min 50 Characters]</label>
                                <textarea
                                    id="experience"
                                    value={form.experience}
                                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                                    placeholder="Detail your achievements, leadership, and coaching style..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-sm text-white focus:border-primary/50 outline-none transition-all min-h-[160px] font-medium leading-relaxed placeholder:text-white/10"
                                    required
                                    minLength={50}
                                    maxLength={1000}
                                />
                                <div className="text-[9px] text-right font-black tracking-widest text-white/20 uppercase italic px-4">{form.experience.length} / 1000 CHARACTERS</div>
                            </div>

                            <div className="space-y-6">
                                <label className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/70 ml-4 italic">Specialties</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {specialtyOptions.map(specialty => (
                                        <button
                                            type="button"
                                            key={specialty}
                                            className={`h-12 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center justify-center px-4 border ${form.specialties.includes(specialty)
                                                ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(234,179,8,0.2)] scale-105'
                                                : 'bg-white/5 text-white/30 border-white/5 hover:border-white/20'}`}
                                            onClick={() => handleSpecialtyToggle(specialty)}
                                        >
                                            {specialty}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <label className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/70 ml-4 italic">Availability</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {['1-2 hours', '3-6 hours', 'custom'].map(type => (
                                        <button
                                            type="button"
                                            key={type}
                                            className={`h-14 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center border ${form.availabilityType === type
                                                ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                                                : 'bg-white/5 text-white/30 border-white/5 hover:border-white/20'}`}
                                            onClick={() => setForm({ ...form, availabilityType: type, availability: type === 'custom' ? '' : type })}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                {form.availabilityType === 'custom' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <input
                                            type="text"
                                            id="availability"
                                            value={form.availability}
                                            onChange={(e) => setForm({ ...form, availability: e.target.value })}
                                            placeholder="e.g., Weekdays 6PM-10PM EST"
                                            className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-8 text-sm text-white focus:border-primary/50 outline-none transition-all font-medium placeholder:text-white/10"
                                            required
                                            maxLength={20}
                                        />
                                        <div className="text-[9px] text-right font-black tracking-[0.2em] text-white/20 uppercase mt-2 px-4 italic">{form.availability.length} / 20 CHARACTERS</div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/70 ml-4 italic">Motivation</label>
                                <textarea
                                    id="whyCoach"
                                    value={form.whyCoach}
                                    onChange={(e) => setForm({ ...form, whyCoach: e.target.value })}
                                    placeholder="Briefly share why you want to coach..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-sm text-white focus:border-primary/50 outline-none transition-all min-h-[120px] font-medium leading-relaxed placeholder:text-white/10"
                                    maxLength={1000}
                                />
                                <div className="text-[9px] text-right font-black tracking-widest text-white/20 uppercase italic px-4">{(form.whyCoach || '').length} / 1000 CHARACTERS</div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest italic animate-in shake duration-500">
                                    Error: {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest italic animate-in fade-in duration-500">
                                    Success: {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full h-18 bg-primary text-black rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] hover:bg-white hover:shadow-[0_0_40px_rgba(234,179,8,0.3)] transition-all shadow-xl shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden relative"
                                disabled={submitting}
                            >
                                <span className="relative z-10 italic">{submitting ? 'SUBMITTING...' : 'Submit Application'}</span>
                                <div className="absolute inset-0 bg-white/20 translate-x-[-101%] group-hover/btn:translate-x-0 transition-transform duration-500" />
                            </button>
                        </div>
                    </form>
                )}

                {!user && (
                    <div className="glass-panel p-10 rounded-[3rem] border-white/5 text-center relative overflow-hidden bg-white/[0.01]">
                        <div className="absolute inset-0 bg-primary/5 opacity-10 pointer-events-none" />
                        <h3 className="font-display text-2xl font-black text-white uppercase italic mb-4">Become a Coach</h3>
                        <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-10 max-w-sm mx-auto">Sign in to submit your coach application.</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/login" className="h-14 px-10 rounded-xl bg-primary text-black font-black text-[11px] tracking-[0.3em] uppercase transition-all shadow-xl hover:bg-white flex items-center justify-center italic">Login</Link>
                            <Link to="/register" className="h-14 px-10 rounded-xl bg-white/5 border border-white/10 text-white font-black text-[11px] tracking-[0.3em] uppercase transition-all hover:bg-white/10 flex items-center justify-center italic">Register</Link>
                        </div>
                    </div>
                )}

                {user && (!hasRiotAccount || !meetsRankRequirement) && !isAlreadyCoach && !hasPendingApplication && (
                    <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 text-center animate-pulse">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] italic">Requirements not met. Please fulfill all requirements to apply.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BecomeCoach;