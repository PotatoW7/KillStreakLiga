import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    serverTimestamp,
    orderBy,
    deleteDoc
} from 'firebase/firestore';
import '../styles/componentsCSS/admin.css';

function AdminPanel() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('admin-requests');
    const [adminRequests, setAdminRequests] = useState([]);
    const [coachApplications, setCoachApplications] = useState([]);
    const [processingId, setProcessingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (!firebaseUser) {
                navigate('/login');
                return;
            }

            setUser(firebaseUser);

            try {
                const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                if (userDoc.exists()) {
                    const role = userDoc.data().role || 'user';

                    if (role === 'owner') {
                        setUserRole('owner');
                        setActiveTab('admin-requests');
                        setLoading(false);
                        return;
                    } else if (role === 'admin') {
                        setUserRole('admin');
                        setActiveTab('coach-applications');
                        setLoading(false);
                        return;
                    }
                }

                const ownerDoc = await getDoc(doc(db, "owners", firebaseUser.uid));
                if (ownerDoc.exists()) {
                    setUserRole('owner');
                    setActiveTab('admin-requests');
                    setLoading(false);
                    return;
                }

                const adminDoc = await getDoc(doc(db, "admins", firebaseUser.uid));
                if (adminDoc.exists()) {
                    setUserRole('admin');
                    setActiveTab('coach-applications');
                    setLoading(false);
                    return;
                }

                navigate('/');
                return;
            } catch (error) {
                console.error('Error checking user role:', error);
                navigate('/');
                return;
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (userRole === 'owner' || userRole === 'admin') {
            fetchData();
        }
    }, [userRole]);

    const fetchData = async () => {
        setError(null);
        try {
            if (userRole === 'owner') {
                try {
                    const adminQuery = query(
                        collection(db, "adminApplications"),
                        where("status", "==", "pending"),
                        orderBy("submittedAt", "desc")
                    );
                    const adminSnapshot = await getDocs(adminQuery);
                    const adminData = adminSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setAdminRequests(adminData);
                } catch (indexError) {
                    if (indexError.code === 'failed-precondition') {
                        console.log('Index not ready, falling back to client-side sorting');
                        const adminQuery = query(
                            collection(db, "adminApplications"),
                            where("status", "==", "pending")
                        );
                        const adminSnapshot = await getDocs(adminQuery);
                        const adminData = adminSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        adminData.sort((a, b) => {
                            const dateA = a.submittedAt?.toDate?.() || new Date(a.submittedAt || 0);
                            const dateB = b.submittedAt?.toDate?.() || new Date(b.submittedAt || 0);
                            return dateB - dateA;
                        });
                        setAdminRequests(adminData);
                    } else {
                        throw indexError;
                    }
                }
            }

            try {
                const coachQuery = query(
                    collection(db, "users"),
                    where("coachApplication.status", "==", "pending")
                );
                const coachSnapshot = await getDocs(coachQuery);
                const coachData = coachSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setCoachApplications(coachData);
            } catch (nestedError) {
                console.log('Nested field query failed, trying alternative approach');
                const allUsersQuery = query(collection(db, "users"));
                const allUsersSnapshot = await getDocs(allUsersQuery);
                const coachData = allUsersSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(user =>
                        user.coachApplication &&
                        user.coachApplication.status === "pending"
                    );
                setCoachApplications(coachData);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            setError(`Failed to fetch data: ${error.message}.`);

            if (adminRequests.length === 0) setAdminRequests([]);
            if (coachApplications.length === 0) setCoachApplications([]);
        }
    };

    const handleApproveAdmin = async (applicationId, userId) => {
        if (userRole !== 'owner') return;
        setProcessingId(applicationId);

        try {
            const application = adminRequests.find(req => req.id === applicationId);
            if (!application) {
                throw new Error('Application not found in local state');
            }

            const appRef = doc(db, "adminApplications", applicationId);
            const appDoc = await getDoc(appRef);

            if (!appDoc.exists()) {
                throw new Error(`Document with ID ${applicationId} does not exist in adminApplications`);
            }

            await updateDoc(appRef, {
                status: 'approved',
                reviewedBy: user.uid,
                reviewedAt: serverTimestamp()
            });

            await setDoc(doc(db, "admins", userId), {
                username: application.username,
                email: application.email,
                promotedAt: serverTimestamp(),
                promotedBy: user.uid,
                applicationId: applicationId
            });

            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                role: 'admin'
            });

            setAdminRequests(prev => prev.filter(req => req.id !== applicationId));
            alert('User has been promoted to Admin!');
        } catch (error) {
            console.error('Error approving admin:', error);
            alert(`Failed to approve admin request: ${error.message}`);
        }

        setProcessingId(null);
    };

    const handleRejectAdmin = async (applicationId) => {
        if (userRole !== 'owner') return;
        setProcessingId(applicationId);

        try {
            const appRef = doc(db, "adminApplications", applicationId);
            const appDoc = await getDoc(appRef);

            if (!appDoc.exists()) {
                throw new Error(`Document with ID ${applicationId} does not exist in adminApplications`);
            }

            await updateDoc(appRef, {
                status: 'rejected',
                reviewedBy: user.uid,
                reviewedAt: serverTimestamp(),
                rejectionReason: rejectionReason || 'No reason provided.'
            });

            setAdminRequests(prev => prev.filter(req => req.id !== applicationId));
            setShowRejectModal(null);
            setRejectionReason('');
            alert('Admin request has been rejected. User can reapply in 5 months.');
        } catch (error) {
            console.error('Error rejecting admin:', error);
            alert(`Failed to reject admin request: ${error.message}`);
        }

        setProcessingId(null);
    };

    const handleApproveCoach = async (userId) => {
        setProcessingId(userId);

        try {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                throw new Error(`User with ID ${userId} does not exist`);
            }

            const userData = userDoc.data();

            await updateDoc(userRef, {
                role: 'coach',
                'coachApplication.status': 'approved',
                'coachApplication.reviewedBy': user.uid,
                'coachApplication.reviewedAt': serverTimestamp(),
                coachProfile: {
                    specialties: userData.coachApplication?.specialties || [],
                    experience: userData.coachApplication?.experience || '',
                    availability: userData.coachApplication?.availability || '',
                    approvedAt: serverTimestamp()
                }
            });

            setCoachApplications(prev => prev.filter(app => app.id !== userId));
            alert('User has been approved as a Coach!');
        } catch (error) {
            console.error('Error approving coach:', error);
            alert(`Failed to approve coach application: ${error.message}`);
        }

        setProcessingId(null);
    };

    const handleRejectCoach = async (userId) => {
        setProcessingId(userId);

        try {
            const userRef = doc(db, "users", userId);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                throw new Error(`User with ID ${userId} does not exist`);
            }

            await updateDoc(userRef, {
                'coachApplication.status': 'rejected',
                'coachApplication.reviewedBy': user.uid,
                'coachApplication.reviewedAt': serverTimestamp(),
                'coachApplication.rejectionReason': rejectionReason || 'No reason provided.'
            });

            setCoachApplications(prev => prev.filter(app => app.id !== userId));
            setShowRejectModal(null);
            setRejectionReason('');
            alert('Coach application has been rejected.');
        } catch (error) {
            console.error('Error rejecting coach:', error);
            alert(`Failed to reject coach application: ${error.message}`);
        }

        setProcessingId(null);
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

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    if (loading) {
        return <div className="loading">Loading admin panel...</div>;
    }

    return (
        <div className="admin-panel-page">
            <div className="admin-panel-container">
                <div className="admin-header">
                    <div className="header-content">
                        <h1>
                            {userRole === 'owner' ? '👑 Owner Dashboard' : '🛡️ Admin Panel'}
                        </h1>
                        <p>Manage applications and user roles</p>
                    </div>
                    <div className="role-indicator">
                        <span className={`role-badge ${userRole}`}>
                            {userRole === 'owner' ? '👑 Owner' : '🛡️ Admin'}
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="error-banner">
                        <p>{error}</p>
                    </div>
                )}

                <div className="admin-tabs">
                    {userRole === 'owner' && (
                        <button
                            className={`tab ${activeTab === 'admin-requests' ? 'active' : ''}`}
                            onClick={() => setActiveTab('admin-requests')}
                        >
                            👤 Admin Requests
                            {adminRequests.length > 0 && (
                                <span className="badge">{adminRequests.length}</span>
                            )}
                        </button>
                    )}
                    <button
                        className={`tab ${activeTab === 'coach-applications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('coach-applications')}
                    >
                        🎓 Coach Applications
                        {coachApplications.length > 0 && (
                            <span className="badge">{coachApplications.length}</span>
                        )}
                    </button>
                </div>

                <div className="admin-content">
                    {activeTab === 'admin-requests' && userRole === 'owner' && (
                        <div className="requests-section">
                            <h2>Pending Admin Requests</h2>
                            {adminRequests.length === 0 ? (
                                <div className="no-requests">
                                    <p>No pending admin requests at this time.</p>
                                </div>
                            ) : (
                                <div className="requests-grid">
                                    {adminRequests.map(request => (
                                        <div key={request.id} className="request-card admin-request">
                                            <div className="request-header">
                                                <div className="user-info">
                                                    <h3>{request.username}</h3>
                                                    <span className="email">{request.email}</span>
                                                </div>
                                                <span className="status-badge pending">Pending</span>
                                            </div>

                                            <div className="request-details">
                                                <div className="detail-item">
                                                    <label>Reason for Applying:</label>
                                                    <p>{request.reason || 'No reason provided'}</p>
                                                </div>
                                                <div className="detail-item">
                                                    <label>Experience:</label>
                                                    <p>{request.experience || 'No experience provided'}</p>
                                                </div>
                                                <div className="detail-item">
                                                    <label>Submitted:</label>
                                                    <p>{formatDate(request.submittedAt)}</p>
                                                </div>
                                            </div>

                                            <div className="request-actions">
                                                <button
                                                    className="approve-btn"
                                                    onClick={() => handleApproveAdmin(request.id, request.userId)}
                                                    disabled={processingId === request.id}
                                                >
                                                    {processingId === request.id ? 'Processing...' : '✅ Approve'}
                                                </button>
                                                <button
                                                    className="reject-btn"
                                                    onClick={() => setShowRejectModal({ type: 'admin', id: request.id })}
                                                    disabled={processingId === request.id}
                                                >
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'coach-applications' && (
                        <div className="requests-section">
                            <h2>Pending Coach Applications</h2>
                            {coachApplications.length === 0 ? (
                                <div className="no-requests">
                                    <p>No pending coach applications at this time.</p>
                                </div>
                            ) : (
                                <div className="requests-grid">
                                    {coachApplications.map(app => {
                                        const rank = getHighestRank(app.rankedData);
                                        return (
                                            <div key={app.id} className="request-card coach-request">
                                                <div className="request-header">
                                                    <div className="user-info">
                                                        <h3>{app.username}</h3>
                                                        {app.riotAccount && (
                                                            <span className="riot-id">
                                                                {app.riotAccount.gameName}#{app.riotAccount.tagLine}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {rank && (
                                                        <div className="rank-display">
                                                            <img src={getRankIcon(rank.tier)} alt={rank.tier} className="rank-icon" />
                                                            <span>{rank.tier} {rank.rank}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="request-details">
                                                    <div className="detail-item">
                                                        <label>Experience:</label>
                                                        <p>{app.coachApplication?.experience || 'No experience provided'}</p>
                                                    </div>
                                                    <div className="detail-item">
                                                        <label>Specialties:</label>
                                                        <div className="specialty-tags">
                                                            {app.coachApplication?.specialties?.map(s => (
                                                                <span key={s} className="specialty-tag">{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <label>Availability:</label>
                                                        <p>{app.coachApplication?.availability || 'Not specified'}</p>
                                                    </div>
                                                    <div className="detail-item">
                                                        <label>Motivation:</label>
                                                        <p>{app.coachApplication?.whyCoach || 'Not provided'}</p>
                                                    </div>
                                                    <div className="detail-item">
                                                        <label>Submitted:</label>
                                                        <p>{formatDate(app.coachApplication?.submittedAt)}</p>
                                                    </div>
                                                </div>

                                                <div className="request-actions">
                                                    <button
                                                        className="approve-btn"
                                                        onClick={() => handleApproveCoach(app.id)}
                                                        disabled={processingId === app.id}
                                                    >
                                                        {processingId === app.id ? 'Processing...' : '✅ Approve'}
                                                    </button>
                                                    <button
                                                        className="reject-btn"
                                                        onClick={() => setShowRejectModal({ type: 'coach', id: app.id })}
                                                        disabled={processingId === app.id}
                                                    >
                                                        ❌ Reject
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Reject {showRejectModal.type === 'admin' ? 'Admin Request' : 'Coach Application'}</h3>
                        <p>Please provide a reason for rejection (optional):</p>
                        {showRejectModal.type === 'admin' && (
                            <p className="cooldown-warning">
                                ⚠️ Note: Rejected users can only reapply for admin after 5 months.
                            </p>
                        )}
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows={4}
                        />
                        <div className="modal-actions">
                            <button
                                className="confirm-reject-btn"
                                onClick={() => {
                                    if (showRejectModal.type === 'admin') {
                                        handleRejectAdmin(showRejectModal.id);
                                    } else {
                                        handleRejectCoach(showRejectModal.id);
                                    }
                                }}
                            >
                                Confirm Rejection
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectionReason('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;