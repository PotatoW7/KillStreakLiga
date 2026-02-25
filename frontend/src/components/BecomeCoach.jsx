import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import "../styles/componentsCSS/coaching.css";

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
        <div className="become-coach-page">
            <div className="coach-bg-decor-1" />
            <div className="coach-bg-decor-2" />

            <div className="become-coach-container animate-base">
                <div className="coach-app-header">
                    <div className="status-badge-container">
                        <span className="status-ping">
                            <span className="ping-animate" />
                            <span className="ping-dot" />
                        </span>
                        <span className="status-text">Status: Open</span>
                    </div>
                    <h1 className="coach-app-title">
                        Coach <span className="text-primary">Application</span>
                    </h1>
                    <p className="coach-app-subtitle">
                        Apply to Coach
                    </p>
                </div>
                <div className="coach-rules-banner glass-panel">
                    <div className="banner-glow-bg" />
                    <div className="banner-content">
                        <div className="info-icon-wrapper">
                            <img src="/project-icons/Coaching icons/guide.png" alt="Rules" />
                        </div>
                        <div className="banner-text-content">
                            <h4 className="banner-title">Coach Guidelines</h4>
                            <p className="banner-subtitle">Mandatory requirements for all active coaches.</p>
                        </div>
                        <Link to="/coach-rules" className="banner-action-btn">
                            Review Rules
                            <span className="btn-arrow">→</span>
                        </Link>
                    </div>
                </div>
                <div className="coach-checklist-panel glass-panel">
                    <div className="checklist-header">
                        <div className="section-accent-line" />
                        <h3 className="checklist-title">Checklist</h3>
                    </div>

                    <div className="checklist-grid">
                        <div className={`checklist-card ${hasRiotAccount ? 'complete' : 'incomplete'}`}>
                            <div className="card-step-header">
                                <div className="step-label">Step 01</div>
                                <div className="step-status-icon">
                                    {hasRiotAccount ? '✓' : '01'}
                                </div>
                            </div>
                            <div className="card-info-content">
                                <h4 className="card-title">Link Account</h4>
                                <p className="card-description">A verified Riot Games account must be linked to your profile.</p>
                            </div>
                            {!hasRiotAccount && (
                                <Link to="/profile" className="link-action-text">Link Account [Link]</Link>
                            )}
                        </div>

                        <div className={`checklist-card ${meetsRankRequirement ? 'complete' : 'incomplete'}`}>
                            <div className="card-step-header">
                                <div className="step-label">Step 02</div>
                                <div className="step-status-icon">
                                    {meetsRankRequirement ? '✓' : '02'}
                                </div>
                            </div>
                            <div className="card-info-content">
                                <h4 className="card-title">Rank Requirement</h4>
                                <p className="card-description">Coach application requires a confirmed Platinum tier or above.</p>
                                {highestRank && (
                                    <div className="detected-tier">Detected Tier: {highestRank.tier} {highestRank.rank}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isAlreadyCoach && (
                    <div className="status-msg-panel verified glass-panel">
                        <div className="status-msg-content">
                            <div className="status-msg-icon">✓</div>
                            <div className="status-msg-text">
                                <h4 className="status-msg-title">Coach Verified</h4>
                                <p className="status-msg-desc">You are already a verified coach. <Link to="/coaching" className="text-primary hover:underline">Access Dashboard</Link></p>
                            </div>
                        </div>
                    </div>
                )}

                {hasPendingApplication && (
                    <div className="status-msg-panel pending glass-panel">
                        <div className="status-msg-content">
                            <div className="status-msg-icon animate-pulse">⟳</div>
                            <div className="status-msg-text">
                                <h4 className="status-msg-title">Application Pending</h4>
                                <p className="status-msg-desc">Your application is being reviewed. You will be notified when a decision is made.</p>
                            </div>
                        </div>
                    </div>
                )}

                {wasRejected && !canReapply && (
                    <div className="status-msg-panel rejected glass-panel">
                        <div className="status-msg-content">
                            <div className="status-msg-icon">✕</div>
                            <div className="status-msg-text">
                                <h4 className="status-msg-title">Application Rejected</h4>
                                {userData.coachApplication.rejectionReason && (
                                    <p className="rejection-reason">Reason: {userData.coachApplication.rejectionReason}</p>
                                )}
                                <p className="cooldown-text">You can reapply in <span>{cooldownRemaining} days</span>.</p>
                            </div>
                        </div>
                    </div>
                )}

                {wasRejected && canReapply && (
                    <div className="status-msg-panel reset glass-panel">
                        <div className="status-msg-content">
                            <div className="status-msg-icon">!</div>
                            <div className="status-msg-text">
                                <h4 className="status-msg-title">Status Reset</h4>
                                <p className="status-msg-desc">Your previous application was unsuccessful, but you can now reapply.</p>
                                {userData.coachApplication.rejectionReason && (
                                    <p className="rejection-reason">Log: {userData.coachApplication.rejectionReason}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!isAlreadyCoach && !hasPendingApplication && canReapply && hasRiotAccount && meetsRankRequirement && (
                    <form onSubmit={handleSubmit} className="coach-form-panel glass-panel">
                        <div className="banner-glow-bg" />

                        <div className="form-header">
                            <div className="form-title-wrapper">
                                <div className="section-accent-line" />
                                <h3 className="form-title">Application Form</h3>
                            </div>
                            <p className="form-subtitle">Please fill out the details below</p>
                        </div>

                        <div className="form-sections">
                            <div className="form-group">
                                <label className="form-label">Experience Summary [Min 50 Characters]</label>
                                <textarea
                                    id="experience"
                                    value={form.experience}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setForm(prev => ({ ...prev, experience: newValue }));
                                    }}
                                    placeholder="Detail your achievements, leadership, and coaching style..."
                                    className="form-textarea"
                                    required
                                    minLength={50}
                                    maxLength={1000}
                                />
                                <div className="char-counter">{form.experience.length} / 1000 CHARACTERS</div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Specialties</label>
                                <div className="specialties-grid">
                                    {specialtyOptions.map(specialty => (
                                        <button
                                            type="button"
                                            key={specialty}
                                            className={`specialty-btn ${form.specialties.includes(specialty) ? 'active' : 'inactive'}`}
                                            onClick={() => handleSpecialtyToggle(specialty)}
                                        >
                                            {specialty}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Availability</label>
                                <div className="availability-grid">
                                    {['1-2 hours', '3-6 hours', 'custom'].map(type => (
                                        <button
                                            type="button"
                                            key={type}
                                            className={`availability-btn ${form.availabilityType === type ? 'active' : 'inactive'}`}
                                            onClick={() => {
                                                setForm(prev => ({
                                                    ...prev,
                                                    availabilityType: type,
                                                    availability: type === 'custom' ? prev.availability : type
                                                }));
                                            }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                                {form.availabilityType === 'custom' && (
                                    <div className="animate-base">
                                        <input
                                            type="text"
                                            id="availability"
                                            value={form.availability}
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                setForm(prev => ({ ...prev, availability: newValue }));
                                            }}
                                            placeholder="e.g., Weekdays 6PM-10PM EST"
                                            className="custom-availability-input"
                                            required
                                            maxLength={20}
                                        />
                                        <div className="char-counter">{form.availability.length} / 20 CHARACTERS</div>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Motivation</label>
                                <textarea
                                    id="whyCoach"
                                    value={form.whyCoach}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setForm(prev => ({ ...prev, whyCoach: newValue }));
                                    }}
                                    placeholder="Briefly share why you want to coach..."
                                    className="form-textarea"
                                    style={{ minHeight: '120px' }}
                                    maxLength={1000}
                                />
                                <div className="char-counter">{(form.whyCoach || '').length} / 1000 CHARACTERS</div>
                            </div>

                            {error && (
                                <div className="feedback-msg error">
                                    Error: {error}
                                </div>
                            )}
                            {success && (
                                <div className="feedback-msg success">
                                    Success: {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="form-submit-btn"
                                disabled={submitting}
                            >
                                <span className="btn-label">{submitting ? 'SUBMITTING...' : 'Submit Application'}</span>
                                <div className="btn-hover-effect" />
                            </button>
                        </div>
                    </form>
                )}

                {!user && (
                    <div className="coach-guest-view glass-panel">
                        <div className="guest-bg-glow" />
                        <h3 className="guest-title">Become a Coach</h3>
                        <p className="guest-subtitle">Sign in to submit your coach application.</p>
                        <div className="guest-actions">
                            <Link to="/login" className="guest-btn login">Login</Link>
                            <Link to="/register" className="guest-btn register">Register</Link>
                        </div>
                    </div>
                )}

                {user && (!hasRiotAccount || !meetsRankRequirement) && !isAlreadyCoach && !hasPendingApplication && (
                    <div className="req-warning-panel">
                        <p className="req-warning-text">Requirements not met. Please fulfill all requirements to apply.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BecomeCoach;
