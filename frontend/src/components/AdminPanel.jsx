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
    deleteDoc,
    writeBatch,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import { fetchDDragon } from '../utils/fetchDDragon';



function AdminPanel() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('admin-requests');
    const [adminRequests, setAdminRequests] = useState([]);
    const [coachApplications, setCoachApplications] = useState([]);
    const [currentAdmins, setCurrentAdmins] = useState([]);
    const [currentCoaches, setCurrentCoaches] = useState([]);
    const [adminsMetadata, setAdminsMetadata] = useState({});
    const [staffUsernames, setStaffUsernames] = useState({});
    const [allUsers, setAllUsers] = useState([]);
    const [processingId, setProcessingId] = useState(null);
    const [demotingId, setDemotingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [error, setError] = useState(null);
    const [latestVersion, setLatestVersion] = useState("14.3.1");
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

                    if (role === 'admin') {
                        setUserRole('admin');
                        setActiveTab('admin-requests');
                        setLoading(false);
                        return;
                    }
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
        const loadVersion = async () => {
            try {
                const data = await fetchDDragon();
                setLatestVersion(data.latestVersion);
            } catch (err) {
                console.error("Failed to load DDragon version:", err);
            }
        };
        loadVersion();
    }, []);

    useEffect(() => {
        if (userRole === 'admin') {
            fetchData();
        }
    }, [userRole]);

    const fetchData = async () => {
        setError(null);
        try {
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
            const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
            const adminsSnap = await getDocs(adminsQuery);
            setCurrentAdmins(adminsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            const coachesQuery = query(collection(db, "users"), where("role", "==", "coach"));
            const coachesSnap = await getDocs(coachesQuery);
            setCurrentCoaches(coachesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            const metaSnap = await getDocs(collection(db, "admins"));
            const metaMap = {};
            metaSnap.forEach(doc => {
                metaMap[doc.id] = doc.data();
            });
            setAdminsMetadata(metaMap);
            const staffIds = new Set();
            Object.values(metaMap).forEach(m => {
                if (m.promotedBy) staffIds.add(m.promotedBy);
            });
            coachesSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.coachApplication?.reviewedBy) staffIds.add(data.coachApplication.reviewedBy);
            });

            if (staffIds.size > 0) {
                const staffMap = {};
                const userDocs = await Promise.all(
                    Array.from(staffIds).map(id => getDoc(doc(db, "users", id)))
                );
                userDocs.forEach(d => {
                    if (d.exists()) {
                        staffMap[d.id] = d.data().username;
                    }
                });
                setStaffUsernames(staffMap);
            }

            const allUsersSnap = await getDocs(collection(db, "users"));
            setAllUsers(allUsersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error('Error fetching data:', error);
            setError(`Failed to fetch data: ${error.message}.`);

            if (adminRequests.length === 0) setAdminRequests([]);
            if (coachApplications.length === 0) setCoachApplications([]);
        }
    };

    const handleApproveAdmin = async (applicationId, userId) => {
        if (userRole !== 'admin') return;
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
            setNotification({ show: true, message: 'User has been promoted to Admin!', type: 'success' });
        } catch (error) {
            console.error('Error approving admin:', error);
            setNotification({ show: true, message: `Failed to approve admin request: ${error.message}`, type: 'error' });
        }

        setProcessingId(null);
    };

    const handleRejectAdmin = async (applicationId) => {
        if (userRole !== 'admin') return;
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
            setNotification({ show: true, message: 'Admin request has been rejected.', type: 'success' });
        } catch (error) {
            console.error('Error rejecting admin:', error);
            setNotification({ show: true, message: `Failed to reject admin request: ${error.message}`, type: 'error' });
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
            setNotification({ show: true, message: 'User has been approved as a Coach!', type: 'success' });
        } catch (error) {
            console.error('Error approving coach:', error);
            setNotification({ show: true, message: `Failed to approve coach application: ${error.message}`, type: 'error' });
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
            setNotification({ show: true, message: 'Coach application has been rejected.', type: 'success' });
        } catch (error) {
            console.error('Error rejecting coach:', error);
            setNotification({ show: true, message: `Failed to reject coach application: ${error.message}`, type: 'error' });
        }

        setProcessingId(null);
    };

    const handleDemote = async (userId, currentRole) => {
        setShowConfirmModal({
            show: true,
            title: `Demote ${currentRole}`,
            message: `Are you sure you want to demote this ${currentRole} to a regular user?`,
            onConfirm: async () => {
                setShowConfirmModal(prev => ({ ...prev, show: false }));
                setDemotingId(userId);

                try {
                    const userRef = doc(db, "users", userId);
                    await updateDoc(userRef, {
                        role: 'user'
                    });

                    if (currentRole === 'admin') {
                        await updateDoc(doc(db, "admins", userId), {
                            demotedAt: serverTimestamp(),
                            demotedBy: user.uid
                        });
                    }

                    if (currentRole === 'coach') {
                        await updateDoc(userRef, {
                            'coachApplication.status': 'demoted',
                            coachProfile: null
                        });
                    }

                    setNotification({ show: true, message: `User has been demoted to a regular user.`, type: 'success' });
                    fetchData();
                } catch (error) {
                    console.error('Error demoting user:', error);
                    setNotification({ show: true, message: `Failed to demote user: ${error.message}`, type: 'error' });
                }
                setDemotingId(null);
            }
        });
    };

    const handleDeleteUser = async (userId) => {
        setShowConfirmModal({
            show: true,
            title: `Delete User Account`,
            message: `Are you sure you want to delete this user's profile and all their data (posts, friends, etc.)?`,
            onConfirm: async () => {
                setShowConfirmModal(prev => ({ ...prev, show: false }));
                setProcessingId(userId);
                try {
                    try {
                        await fetch(`${import.meta.env.VITE_API_URL || ''}/api/queue/leave`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId })
                        });
                    } catch (e) { }

                    const allUsersSnapshot = await getDocs(collection(db, "users"));
                    let batch = writeBatch(db);
                    let opCount = 0;

                    allUsersSnapshot.forEach(uDoc => {
                        if (uDoc.id !== userId) {
                            const uData = uDoc.data();
                            const updates = {};
                            if (uData.friends?.some(f => f.id === userId)) updates.friends = uData.friends.filter(f => f.id !== userId);
                            if (uData.pendingRequests?.some(r => r.from === userId)) updates.pendingRequests = uData.pendingRequests.filter(r => r.from !== userId);
                            if (uData.sentFriendRequests?.some(r => r.to === userId)) updates.sentFriendRequests = uData.sentFriendRequests.filter(r => r.to !== userId);
                            
                            if (Object.keys(updates).length > 0) {
                                batch.update(doc(db, "users", uDoc.id), updates);
                                opCount++;
                                if (opCount >= 400) {
                                    batch.commit();
                                    batch = writeBatch(db);
                                    opCount = 0;
                                }
                            }
                        }
                    });
                    if (opCount > 0) await batch.commit();

                    const chatsSnap = await getDocs(query(collection(db, "chats"), where("participants", "array-contains", userId)));
                    for (const cDoc of chatsSnap.docs) await deleteDoc(doc(db, "chats", cDoc.id));

                    const postsSnap = await getDocs(query(collection(db, "posts"), where("userId", "==", userId)));
                    for (const pDoc of postsSnap.docs) await deleteDoc(doc(db, "posts", pDoc.id));

                    await deleteDoc(doc(db, "users", userId));

                    try {
                        await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/users/${userId}`, {
                            method: 'DELETE'
                        });
                    } catch (e) { }

                    setAllUsers(prev => prev.filter(u => u.id !== userId));
                    setNotification({ show: true, message: 'User and all their database data deleted successfully!', type: 'success' });
                } catch (error) {
                    console.error('Error deleting user:', error);
                    setNotification({ show: true, message: `Failed to delete user: ${error.message}`, type: 'error' });
                }
                setProcessingId(null);
            }
        });
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
                            Admin Panel
                        </h1>
                        <p>Manage applications and user roles</p>
                    </div>
                    <div className="role-indicator">
                        <span className={`role-badge ${userRole}`}>
                            Admin
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="error-banner">
                        <p>{error}</p>
                    </div>
                )}

                <div className="admin-tabs">
                    {userRole === 'admin' && (
                        <button
                            className={`tab ${activeTab === 'admin-requests' ? 'active' : ''}`}
                            onClick={() => setActiveTab('admin-requests')}
                        >
                            Admin Requests
                            {adminRequests.length > 0 && (
                                <span className="badge">{adminRequests.length}</span>
                            )}
                        </button>
                    )}
                    <button
                        className={`tab ${activeTab === 'coach-applications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('coach-applications')}
                    >
                        Coach Applications
                        {coachApplications.length > 0 && (
                            <span className="badge">{coachApplications.length}</span>
                        )}
                    </button>
                    <button
                        className={`tab ${activeTab === 'current-admins' ? 'active' : ''}`}
                        onClick={() => setActiveTab('current-admins')}
                    >
                        Admins
                        {currentAdmins.length > 0 && (
                            <span className="staff-count">({currentAdmins.length})</span>
                        )}
                    </button>
                    <button
                        className={`tab ${activeTab === 'current-coaches' ? 'active' : ''}`}
                        onClick={() => setActiveTab('current-coaches')}
                    >
                        Coaches
                        {currentCoaches.length > 0 && (
                            <span className="staff-count">({currentCoaches.length})</span>
                        )}
                    </button>
                    <button
                        className={`tab ${activeTab === 'all-users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all-users')}
                    >
                        Users
                        {allUsers.length > 0 && (
                            <span className="staff-count">({allUsers.length})</span>
                        )}
                    </button>
                </div>

                <div className="admin-content">
                    {activeTab === 'admin-requests' && userRole === 'admin' && (
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
                                                    {processingId === request.id ? 'Processing...' : 'Approve'}
                                                </button>
                                                <button
                                                    className="reject-btn"
                                                    onClick={() => setShowRejectModal({ type: 'admin', id: request.id })}
                                                    disabled={processingId === request.id}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'all-users' && (
                        <div className="requests-section">
                            <h2>Current Users Management</h2>
                            <div className="user-list">
                                {allUsers.map(u => (
                                    <div key={u.id} className="user-item-row glass-panel">
                                        <div className="user-main-info">
                                            <div className="user-identity">
                                                <img 
                                                    src={u.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"} 
                                                    alt="" 
                                                    className="user-list-avatar"
                                                />
                                                <div className="user-text-meta">
                                                    <h3>{u.username}</h3>
                                                    <span className="user-email">{u.email}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="user-status-indicators">
                                                <div className={`verification-badge ${u.emailVerified ? 'verified' : 'unverified'}`}>
                                                    {u.emailVerified ? 'Verified' : 'Unverified'}
                                                </div>
                                                {u.riotAccount && (
                                                    <div className="riot-connection-badge">
                                                        <img 
                                                            src={`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${u.riotAccount.profileIconId}.png`} 
                                                            alt="Riot" 
                                                            className="riot-mini-icon" 
                                                            onError={(e) => {
                                                                e.target.src = "/project-icons/Profile icons/riot guest icon.png";
                                                            }}
                                                        />
                                                        {u.riotAccount.gameName}#{u.riotAccount.tagLine}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="user-actions">
                                            <button 
                                                className="delete-user-btn"
                                                onClick={() => handleDeleteUser(u.id)}
                                                disabled={processingId === u.id || u.id === user.uid}
                                            >
                                                {processingId === u.id ? '...' : 'Delete Account'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'coach-applications' && userRole === 'admin' && (
                        <div className="requests-section">
                            <h2>Pending Coach Applications</h2>
                            {coachApplications.length === 0 ? (
                                <div className="no-requests">
                                    <p>No pending coach applications at this time.</p>
                                </div>
                            ) : (
                                <div className="requests-grid">
                                    {coachApplications.map(app => (
                                        <div key={app.id} className="request-card coach-request horizontal high-density">
                                            <div className="card-column side-info">
                                                <div className="user-profile-section">
                                                    <div className="coach-avatar-box">
                                                        <img
                                                            src={app.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                                                            alt=""
                                                            className="coach-avatar"
                                                        />
                                                    </div>
                                                    <div className="user-info">
                                                        <h3 className="u-mb-1">{app.username}</h3>
                                                        {app.riotAccount && (
                                                            <div className="riot-id-wrap">
                                                                <div className="riot-id">
                                                                    {app.riotAccount.gameName}#{app.riotAccount.tagLine}
                                                                </div>
                                                                <button
                                                                    className="copy-btn-sm"
                                                                    title="Copy Riot ID"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigator.clipboard.writeText(`${app.riotAccount.gameName}#${app.riotAccount.tagLine}`);
                                                                    }}
                                                                >
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 17.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zM8 17.75V4.25h11.25V17.75m-11.25 0h11.25m-11.25 0c0-1.243 1.007-2.25 2.25-2.25h6.75c1.243 0 2.25 1.007 2.25 2.25" /></svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="side-details-group">
                                                    <div className="detail-item compact">
                                                        <label>Ranks</label>
                                                        <div className="ranks-list compact">
                                                            {app.rankedData && app.rankedData.length > 0 ? (
                                                                app.rankedData.map((rank, idx) => (
                                                                    <div key={idx} className="rank-badge-sm">
                                                                        <img src={getRankIcon(rank.tier)} alt={rank.tier} />
                                                                        <div className="rank-info">
                                                                            <span className="queue-type">{rank.queueType === 'RANKED_SOLO_5x5' ? 'Solo' : 'Flex'}</span>
                                                                            <span className="rank-text">{rank.tier} {rank.rank}</span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="unranked-tag">Unranked</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="detail-item compact u-mt-2">
                                                        <label>Specialties</label>
                                                        <div className="specialty-tags">
                                                            {app.coachApplication?.specialties?.map(s => (
                                                                <span key={s} className="specialty-tag">{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="detail-item compact u-mt-2">
                                                        <label>Availability</label>
                                                        <p className="availability-text">{app.coachApplication?.availability || 'Not specified'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="card-column main-content">
                                                <div className="detail-item compact">
                                                    <label>Experience</label>
                                                    <p className="experience-text">{app.coachApplication?.experience || 'No experience provided'}</p>
                                                </div>
                                                <div className="detail-item compact u-mt-3">
                                                    <label>Motivation</label>
                                                    <p className="motivation-text">{app.coachApplication?.whyCoach || 'Not provided'}</p>
                                                </div>
                                            </div>

                                            <div className="card-column actions-side">
                                                <div className="action-buttons-wrap">
                                                    <button
                                                        className="approve-btn"
                                                        onClick={() => handleApproveCoach(app.id)}
                                                        disabled={processingId === app.id}
                                                    >
                                                        {processingId === app.id ? '...' : 'Approve Application'}
                                                    </button>
                                                    <button
                                                        className="reject-btn"
                                                        onClick={() => setShowRejectModal({ type: 'coach', id: app.id })}
                                                        disabled={processingId === app.id}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                                <div className="submission-meta-bottom">
                                                    <label>Submitted On</label>
                                                    <span>{formatDate(app.coachApplication?.submittedAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'current-admins' && (
                        <div className="current-staff-section">
                            <h2>Current Administrators</h2>
                            {currentAdmins.length === 0 ? (
                                <div className="no-staff">
                                    <p>No other administrators found.</p>
                                </div>
                            ) : (
                                <div className="staff-grid">
                                    {currentAdmins.map(admin => {
                                        const metadata = adminsMetadata[admin.id];
                                        return (
                                            <div key={admin.id} className="staff-card">
                                                <div className="staff-user-info">
                                                    <img
                                                        src={admin.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                                                        alt=""
                                                        className="staff-avatar"
                                                    />
                                                    <div className="staff-details">
                                                        <h3>{admin.username}</h3>
                                                        <span className="email">{admin.email}</span>
                                                    </div>
                                                </div>

                                                <div className="staff-meta">
                                                    <div className="meta-row">
                                                        <label>Promoted On</label>
                                                        <span>{metadata ? formatDate(metadata.promotedAt) : 'N/A'}</span>
                                                    </div>
                                                    <div className="meta-row">
                                                        <label>Promoted By</label>
                                                        <span>{metadata?.promotedBy ? (staffUsernames[metadata.promotedBy] || 'System') : 'N/A'}</span>
                                                    </div>
                                                </div>
                                                {userRole === 'owner' && (
                                                    <button
                                                        className="demote-btn"
                                                        onClick={() => handleDemote(admin.id, 'admin')}
                                                        disabled={demotingId === admin.id || admin.id === user.uid}
                                                        title={admin.id === user.uid ? "You cannot demote yourself" : ""}
                                                    >
                                                        {demotingId === admin.id ? 'Processing...' : 'Demote to User'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'current-coaches' && (
                        <div className="current-staff-section">
                            <h2>Current Coaches</h2>
                            {currentCoaches.length === 0 ? (
                                <div className="no-staff">
                                    <p>No coaches found.</p>
                                </div>
                            ) : (
                                <div className="staff-grid">
                                    {currentCoaches.map(coach => (
                                        <div key={coach.id} className="staff-card">
                                            <div className="staff-user-info">
                                                <img
                                                    src={coach.profileImage || "https://ddragon.leagueoflegends.com/cdn/14.3.1/img/profileicon/29.png"}
                                                    alt=""
                                                    className="staff-avatar"
                                                />
                                                <div className="staff-details">
                                                    <h3>{coach.username}</h3>
                                                    <span className="email">{coach.email}</span>
                                                </div>
                                            </div>

                                            <div className="staff-meta">
                                                <div className="meta-row">
                                                    <label>Specialties</label>
                                                    <span>{coach.coachProfile?.specialties?.join(', ') || 'N/A'}</span>
                                                </div>
                                                <div className="meta-row">
                                                    <label>Approved By</label>
                                                    <span>{coach.coachProfile?.reviewedBy ? (staffUsernames[coach.coachProfile.reviewedBy] || 'System') : (staffUsernames[coach.coachApplication?.reviewedBy] || 'System')}</span>
                                                </div>
                                                <div className="meta-row">
                                                    <label>Approved On</label>
                                                    <span>{formatDate(coach.coachProfile?.approvedAt)}</span>
                                                </div>
                                            </div>

                                            <button
                                                className="demote-btn"
                                                onClick={() => handleDemote(coach.id, 'coach')}
                                                disabled={demotingId === coach.id}
                                            >
                                                {demotingId === coach.id ? 'Processing...' : 'Remove Coach Role'}
                                            </button>
                                        </div>
                                    ))}
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
                                Note: Rejected users can only reapply for admin after 5 months.
                            </p>
                        )}
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows={4}
                            maxLength={500}
                        />
                        <span className="char-counter">{rejectionReason.length}/500</span>
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

            {showConfirmModal.show && (
                <div className="modal-overlay" onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>{showConfirmModal.title}</h3>
                        <p>{showConfirmModal.message}</p>
                        <div className="modal-actions">
                            <button className="confirm-btn" onClick={showConfirmModal.onConfirm}>
                                Confirm Action
                            </button>
                            <button className="cancel-btn" onClick={() => setShowConfirmModal(prev => ({ ...prev, show: false }))}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {notification.show && (
                <div className="modal-overlay" onClick={() => setNotification({ show: false, message: '', type: 'success' })}>
                    <div className="notification-popup modal-content" onClick={e => e.stopPropagation()}>
                        <div className={`notification-icon ${notification.type}`}>
                            {notification.type === 'success' ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            )}
                        </div>
                        <h3>{notification.type === 'success' ? 'Success' : 'Error'}</h3>
                        <p>{notification.message}</p>
                        <button className="close-notif-btn" onClick={() => setNotification({ show: false, message: '', type: 'success' })}>
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminPanel;