import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
    doc,
    getDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    orderBy,
    limit
} from 'firebase/firestore';
import '../styles/componentsCSS/admin.css';

const REAPPLY_COOLDOWN_MS = 5 * 30 * 24 * 60 * 60 * 1000;

function AdminApplication() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [existingApplication, setExistingApplication] = useState(null);
    const [canReapply, setCanReapply] = useState(true);
    const [cooldownRemaining, setCooldownRemaining] = useState(null);
    const [form, setForm] = useState({
        reason: '',
        experience: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);

                        if (data.role === 'admin' || data.role === 'owner') {
                            navigate('/admin');
                            return;
                        }
                    }

                    try {
                        const appQuery = query(
                            collection(db, "adminApplications"),
                            where("userId", "==", firebaseUser.uid),
                            orderBy("submittedAt", "desc"),
                            limit(1)
                        );
                        const appSnapshot = await getDocs(appQuery);

                        if (!appSnapshot.empty) {
                            const latestApp = appSnapshot.docs[0].data();
                            setExistingApplication(latestApp);

                            if (latestApp.status === 'rejected' && latestApp.reviewedAt) {
                                const reviewedDate = latestApp.reviewedAt.toDate ?
                                    latestApp.reviewedAt.toDate() : new Date(latestApp.reviewedAt);
                                const timeSinceRejection = Date.now() - reviewedDate.getTime();

                                if (timeSinceRejection < REAPPLY_COOLDOWN_MS) {
                                    setCanReapply(false);
                                    const remaining = REAPPLY_COOLDOWN_MS - timeSinceRejection;
                                    const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
                                    setCooldownRemaining(daysRemaining);
                                }
                            }
                        }
                    } catch (queryError) {
                        console.log('Query requires index, falling back to client-side check');
                        const allAppsQuery = query(collection(db, "adminApplications"));
                        const allAppsSnapshot = await getDocs(allAppsQuery);

                        const userApps = allAppsSnapshot.docs
                            .map(doc => ({ id: doc.id, ...doc.data() }))
                            .filter(app => app.userId === firebaseUser.uid)
                            .sort((a, b) => {
                                const dateA = a.submittedAt?.toDate?.() || new Date(a.submittedAt || 0);
                                const dateB = b.submittedAt?.toDate?.() || new Date(b.submittedAt || 0);
                                return dateB - dateA;
                            });

                        if (userApps.length > 0) {
                            const latestApp = userApps[0];
                            setExistingApplication(latestApp);

                            if (latestApp.status === 'rejected' && latestApp.reviewedAt) {
                                const reviewedDate = latestApp.reviewedAt.toDate ?
                                    latestApp.reviewedAt.toDate() : new Date(latestApp.reviewedAt);
                                const timeSinceRejection = Date.now() - reviewedDate.getTime();

                                if (timeSinceRejection < REAPPLY_COOLDOWN_MS) {
                                    setCanReapply(false);
                                    const remaining = REAPPLY_COOLDOWN_MS - timeSinceRejection;
                                    const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
                                    setCooldownRemaining(daysRemaining);
                                }
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
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (form.reason.length < 30) {
            setError('Please provide a more detailed reason (at least 30 characters).');
            return;
        }

        if (form.experience.length < 20) {
            setError('Please describe your relevant experience (at least 20 characters).');
            return;
        }

        setSubmitting(true);

        try {
            await addDoc(collection(db, "adminApplications"), {
                userId: user.uid,
                username: userData?.username || user.displayName,
                email: user.email,
                reason: form.reason,
                experience: form.experience,
                status: 'pending',
                submittedAt: serverTimestamp(),
                reviewedBy: null,
                reviewedAt: null,
                rejectionReason: null
            });

            setSuccess('Your admin application has been submitted! The Owner will review it soon.');
            setForm({ reason: '', experience: '' });
            setExistingApplication({ status: 'pending' });
        } catch (err) {
            console.error('Error submitting application:', err);
            setError('Failed to submit application. Please try again.');
        }
        setSubmitting(false);
    };

    if (loading) return <div className="loading">Loading...</div>;

    if (!user) {
        return (
            <div className="admin-application-page">
                <div className="admin-application-container">
                    <div className="login-prompt-banner">
                        <h3>Apply to Become an Admin</h3>
                        <p>Login or create an account to submit your application.</p>
                        <div className="login-prompt-buttons">
                            <Link to="/login" className="login-prompt-btn primary">Login</Link>
                            <Link to="/register" className="login-prompt-btn secondary">Create Account</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const hasPendingApplication = existingApplication?.status === 'pending';
    const wasRejected = existingApplication?.status === 'rejected';

    return (
        <div className="admin-application-page">
            <div className="admin-application-container">
                <div className="application-header">
                    <h1>Apply to Become an Admin</h1>
                    <p>Help manage the Killstreak community</p>
                </div>

                <div className="admin-info-section">
                    <h3>What do Admins do?</h3>
                    <ul>
                        <li>✅ Review and approve coach applications</li>
                        <li>✅ Monitor community guidelines</li>
                        <li>✅ Help maintain platform quality</li>
                        <li>✅ Support users with issues</li>
                    </ul>
                </div>

                {hasPendingApplication && (
                    <div className="status-banner pending">
                        <p>Your admin application is pending review. The Owner will review it soon.</p>
                    </div>
                )}

                {wasRejected && !canReapply && (
                    <div className="status-banner rejected">
                        <span>❌</span>
                        <div>
                            <p>Your previous application was rejected.</p>
                            {existingApplication?.rejectionReason && (
                                <p className="rejection-reason">
                                    Reason: {existingApplication.rejectionReason}
                                </p>
                            )}
                            <p className="cooldown-notice">
                                ⏰ You can reapply in <strong>{cooldownRemaining} days</strong> (5 month cooldown).
                            </p>
                        </div>
                    </div>
                )}

                {wasRejected && canReapply && (
                    <div className="status-banner info">
                        <span>ℹ️</span>
                        <div>
                            <p>Your previous application was rejected, but you can now reapply.</p>
                            {existingApplication?.rejectionReason && (
                                <p className="rejection-reason">
                                    Previous rejection reason: {existingApplication.rejectionReason}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {!hasPendingApplication && canReapply && (
                    <form onSubmit={handleSubmit} className="admin-application-form">
                        <h3>Application Form</h3>

                        <div className="form-group">
                            <label htmlFor="reason">Why do you want to become an Admin? *</label>
                            <textarea
                                id="reason"
                                value={form.reason}
                                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                placeholder="Explain why you'd like to help manage the Killstreak community..."
                                rows={4}
                                required
                                minLength={30}
                            />
                            <span className="char-count">{form.reason.length}/500</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="experience">Relevant Experience *</label>
                            <textarea
                                id="experience"
                                value={form.experience}
                                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                                placeholder="Describe any previous moderation, community management, or leadership experience..."
                                rows={3}
                                required
                                minLength={20}
                            />
                            <span className="char-count">{form.experience.length}/500</span>
                        </div>

                        {error && <div className="form-error">{error}</div>}
                        {success && <div className="form-success">{success}</div>}

                        <button type="submit" className="submit-application-btn" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default AdminApplication;