import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import '../styles/componentsCSS/coaching.css';

const MINIMUM_RANK_TIER = ['PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const REAPPLY_COOLDOWN_MS = 3 * 30 * 24 * 60 * 60 * 1000;

function BecomeCoach() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        experience: '',
        availability: '',
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
        <div className="become-coach-page">
            <div className="become-coach-container">
                <div className="coach-header">
                    <h1>Become a Coach</h1>
                    <p>Share your knowledge and help other players improve</p>
                </div>

                <div className="coach-rules-banner">
                    <p>
                        <strong>Before you start:</strong> Please read the coach guidelines
                    </p>
                    <Link to="/coach-rules" className="view-rules-link">
                        View complete coach rules and requirements →
                    </Link>
                </div>

                <div className="requirements-summary">
                    <h3>Requirements Checklist</h3>
                    <ul className="requirements-list">
                        <li className={hasRiotAccount ? 'met' : 'not-met'}>
                            {hasRiotAccount ? '✅' : '❌'} Linked Riot Games Account
                            {!hasRiotAccount && (
                                <Link to="/profile" className="requirement-link">Link Account</Link>
                            )}
                        </li>
                        <li className={meetsRankRequirement ? 'met' : 'not-met'}>
                            {meetsRankRequirement ? '✅' : '❌'} Platinum Rank or Higher
                            {highestRank && (
                                <span className="current-rank">
                                    (Current: {highestRank.tier} {highestRank.rank})
                                </span>
                            )}
                        </li>
                    </ul>
                </div>

                {isAlreadyCoach && (
                    <div className="status-banner success">
                        <p>You are already a verified coach! <Link to="/coaching">Go to Coaching tab</Link></p>
                    </div>
                )}

                {hasPendingApplication && (
                    <div className="status-banner pending">
                        <p>Your application is pending review. We'll notify you once it's been reviewed.</p>
                    </div>
                )}

                {wasRejected && !canReapply && (
                    <div className="status-banner rejected">
                        <div>
                            <p>Your previous application was rejected.</p>
                            {userData.coachApplication.rejectionReason && (
                                <p className="rejection-reason">
                                    Reason: {userData.coachApplication.rejectionReason}
                                </p>
                            )}
                            <p className="cooldown-notice">
                                You can reapply in <strong>{cooldownRemaining} days</strong> (3 month cooldown).
                            </p>
                        </div>
                    </div>
                )}

                {wasRejected && canReapply && (
                    <div className="status-banner info">
                        <div>
                            <p>Your previous application was rejected, but you can now reapply.</p>
                            {userData.coachApplication.rejectionReason && (
                                <p className="rejection-reason">
                                    Previous rejection reason: {userData.coachApplication.rejectionReason}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {!isAlreadyCoach && !hasPendingApplication && canReapply && hasRiotAccount && meetsRankRequirement && (
                    <form onSubmit={handleSubmit} className="coach-application-form">
                        <h3>Application Form</h3>

                        <div className="form-group">
                            <label htmlFor="experience">Your League of Legends Experience *</label>
                            <textarea
                                id="experience"
                                value={form.experience}
                                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                                placeholder="Tell us about your LoL experience, achievements, and what makes you qualified to coach..."
                                rows={4}
                                required
                                minLength={50}
                            />
                            <span className="char-count">{form.experience.length}/500</span>
                        </div>

                        <div className="form-group">
                            <label>Specialties (select at least one) *</label>
                            <div className="specialty-grid">
                                {specialtyOptions.map(specialty => (
                                    <button
                                        type="button"
                                        key={specialty}
                                        className={`specialty-btn ${form.specialties.includes(specialty) ? 'selected' : ''}`}
                                        onClick={() => handleSpecialtyToggle(specialty)}
                                    >
                                        {specialty}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="availability">Availability</label>
                            <input
                                type="text"
                                id="availability"
                                value={form.availability}
                                onChange={(e) => setForm({ ...form, availability: e.target.value })}
                                placeholder="e.g., Weekdays 6PM-10PM EST, Weekends flexible"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="whyCoach">Why do you want to become a coach?</label>
                            <textarea
                                id="whyCoach"
                                value={form.whyCoach}
                                onChange={(e) => setForm({ ...form, whyCoach: e.target.value })}
                                placeholder="Share your motivation for coaching..."
                                rows={3}
                            />
                        </div>

                        {error && <div className="form-error">{error}</div>}
                        {success && <div className="form-success">{success}</div>}

                        <button type="submit" className="submit-application-btn" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </form>
                )}

                {!user && (
                    <div className="login-prompt-banner">
                        <h3>Ready to become a coach?</h3>
                        <p>Login or create an account to submit your application.</p>
                        <div className="login-prompt-buttons">
                            <Link to="/login" className="login-prompt-btn primary">Login</Link>
                            <Link to="/register" className="login-prompt-btn secondary">Create Account</Link>
                        </div>
                    </div>
                )}

                {user && (!hasRiotAccount || !meetsRankRequirement) && !isAlreadyCoach && !hasPendingApplication && (
                    <div className="eligibility-notice">
                        <p>Please meet all requirements above before applying.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BecomeCoach;