import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDDragon } from '../context/DDragonContext';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import '../styles/componentsCSS/coaching.css';

function Coaching() {
    const { latestVersion: version } = useDDragon();
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
        if (userRole === 'admin') return true;
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
        <div className="coaching-page">
            <div className="coaching-bg-decor-1" />
            <div className="coaching-bg-decor-2" />

            <div className="coaching-container">
                <div className="page-header-row">
                    <div className="header-title-group">
                        <div className="title-with-accent">
                            <div className="title-accent-bar" />
                            <h1 className="page-title">
                                <span className="text-primary">Coaching</span>
                            </h1>
                        </div>
                        <div className="header-status-info">
                            <div className="header-divider-v" />
                            <p className="dashboard-subtitle">Coaching Dashboard</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        {userRole === 'coach' && (
                            <button
                                className={`create-session-btn ${showCreateForm ? 'active' : 'inactive'}`}
                                onClick={() => setShowCreateForm(!showCreateForm)}
                            >
                                <span className="u-relative u-z-10">{showCreateForm ? '✕ Close Form' : '+ Create Session'}</span>
                                <div className="btn-hover-overlay" />
                            </button>
                        )}
                        {(userRole === 'user' || !user) && (
                            <Link
                                to="/become-coach"
                                className="apply-coach-btn"
                            >
                                <span className="u-relative u-z-10">Become a Coach</span>
                                <div className="btn-hover-overlay" />
                            </Link>
                        )}
                    </div>
                </div>
                <div className="rules-banner-panel">
                    <div className="rules-banner-panel-glow" />
                    <div className="rules-banner-content-row">
                        <div className="rules-icon-wrap">
                            <img src="/project-icons/Coaching icons/guide.png" alt="Rules" className="rules-icon-img" />
                        </div>
                        <div className="rules-content">
                            <div className="rules-title-wrap">
                                <h4 className="rules-title-text">Coaching Guidelines</h4>
                            </div>
                            <p className="rules-desc-text">Rules and conduct for all coaches and students.</p>
                        </div>
                        <Link
                            to="/coach-rules"
                            className="rules-link-btn"
                        >
                            Review Rules
                            <span className="rules-btn-arrow">→</span>
                        </Link>
                    </div>
                </div>
                {showCreateForm && userRole === 'coach' && (
                    <div className="session-creation-panel glass-panel">
                        <div className="coach-bg-decor-1" style={{ width: '16rem', height: '16rem', marginRight: '-8rem', marginTop: '-8rem' }} />

                        <form onSubmit={handleCreateSession} className="creation-form">
                            <div className="creation-form-header">
                                <div className="creation-title-wrap">
                                    <div className="creation-accent-bar" />
                                    <h3 className="creation-title">Create New Session</h3>
                                </div>
                                <p className="creation-subtitle">Coaching Setup</p>
                            </div>

                            <div className="creation-grid">
                                <div className="creation-form-group">
                                    <label className="creation-label">Session Title</label>
                                    <input
                                        type="text"
                                        value={newSession.title}
                                        onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                                        placeholder="e.g., Mid Lane Macro"
                                        className="creation-input"
                                        maxLength={30}
                                        required
                                    />
                                    <div className="form-char-count">{newSession.title.length} / 30 Characters</div>
                                </div>
                                <div className="creation-form-group">
                                    <label className="creation-label">Specialty</label>
                                    <select
                                        value={newSession.specialty}
                                        onChange={(e) => setNewSession({ ...newSession, specialty: e.target.value })}
                                        className="creation-select"
                                        required
                                    >
                                        <option value="" className="option-bg-dark">Select Specialty...</option>
                                        {specialtyOptions.map(s => (
                                            <option key={s} value={s} className="option-bg-dark">{s.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="creation-form-group">
                                <label className="creation-label">Lesson Description</label>
                                <textarea
                                    value={newSession.description}
                                    onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                                    placeholder="Outline your coaching strategies and objectives... Be detailed."
                                    className="creation-textarea"
                                    maxLength={1000}
                                    required
                                />
                                <div className="form-char-count">{newSession.description.length} / 1000 Characters</div>
                            </div>

                            <div className="creation-grid">
                                <div className="creation-form-group">
                                    <label className="creation-label">Hourly Rate [USD/HR]</label>
                                    <div className="price-input-wrapper">
                                        <span className="price-symbol">$</span>
                                        <input
                                            type="number"
                                            value={newSession.price}
                                            onChange={(e) => setNewSession({ ...newSession, price: e.target.value })}
                                            placeholder="25.00"
                                            className="creation-input price"
                                            min="1"
                                            max="5000"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="creation-form-group">
                                    <label className="creation-label">Duration [MAX 12H]</label>
                                    <div className="duration-inputs">
                                        <div className="duration-box">
                                            <input
                                                type="number"
                                                value={newSession.durationHours}
                                                onChange={(e) => setNewSession({ ...newSession, durationHours: e.target.value })}
                                                className="duration-input"
                                                min="0" max="12" required
                                            />
                                            <span className="duration-label">HR</span>
                                        </div>
                                        <div className="duration-box">
                                            <input
                                                type="number"
                                                value={newSession.durationMinutes}
                                                onChange={(e) => setNewSession({ ...newSession, durationMinutes: e.target.value })}
                                                className="duration-input"
                                                min="0" max="59" required
                                            />
                                            <span className="duration-label">MIN</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="creation-submit-btn"
                                disabled={submitting}
                            >
                                <span className="u-relative u-z-10">{submitting ? 'CREATING SESSION...' : 'Publish Coaching Session'}</span>
                                <div className="btn-hover-overlay" />
                            </button>
                        </form>
                    </div>
                )}
                <div className="coaching-tabs-nav">
                    <button
                        className={`coaching-tab ${activeTab === 'sessions' ? 'active' : 'inactive'}`}
                        onClick={() => setActiveTab('sessions')}
                    >
                        <div className="tab-accent-v" />
                        <img src="/project-icons/Coaching icons/coaching session.png" alt="" className="tab-icon" />
                        <span className="u-relative u-z-10">Sessions</span>
                    </button>
                    <button
                        className={`coaching-tab ${activeTab === 'coaches' ? 'active' : 'inactive'}`}
                        onClick={() => setActiveTab('coaches')}
                    >
                        <div className="tab-accent-v" />
                        <img src="/project-icons/Coaching icons/available coaches.png" alt="" className="tab-icon" />
                        <span className="u-relative u-z-10">Available Coaches</span>
                    </button>
                </div>
                {activeTab === 'sessions' && (
                    <div className="view-sessions-section">
                        <div className="coaching-filters-bar glass-panel">
                            <div className="filter-select-wrap group">
                                <div className="filter-search-icon">
                                    <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </div>
                                <select
                                    value={filters.specialty}
                                    onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                                    className="filter-select"
                                >
                                    <option value="" className="option-bg-dark">All Specialties [Default]</option>
                                    {specialtyOptions.map(s => (
                                        <option key={s} value={s} className="option-bg-dark">{s.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="price-filters-wrap">
                                <div className="price-filter-box">
                                    <span className="price-filter-label">MIN</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={filters.minPrice}
                                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                        className="price-filter-input"
                                    />
                                </div>
                                <div className="filter-divider-h" />
                                <div className="price-filter-box">
                                    <span className="price-filter-label">MAX</span>
                                    <input
                                        type="number"
                                        placeholder="500.00"
                                        value={filters.maxPrice}
                                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                        className="price-filter-input"
                                    />
                                </div>
                            </div>

                            <button
                                className="clear-filters-btn"
                                onClick={() => setFilters({ specialty: '', minPrice: '', maxPrice: '' })}
                            >
                                Clear Filters
                            </button>
                        </div>

                        <div className="sessions-grid">
                            {filteredSessions.length === 0 ? (
                                <div className="coaching-empty-state col-span-full glass-panel">
                                    <div className="empty-state-icon">??</div>
                                    <h3 className="empty-state-title">No Active Sessions Found</h3>
                                    <p className="empty-state-desc">No sessions match your filters. Adjust parameters to find coaches.</p>
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
                {activeTab === 'coaches' && (
                    <div className="coaches-grid">
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
    const { latestVersion: version } = useDDragon();
    const getRankByQueue = (rankedData, queueType) => {
        if (!rankedData || rankedData.length === 0) return null;
        return rankedData.find(q => q.queueType === queueType) || null;
    };
    const soloRank = getRankByQueue(session.coachRankedData, 'RANKED_SOLO_5x5');
    const flexRank = getRankByQueue(session.coachRankedData, 'RANKED_FLEX_SR');
    const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png` : null;

    if (isEditing) {
        return (
            <div className="edit-session-panel glass-panel">
                <div className="edit-panel-body">
                    <div className="edit-panel-header">
                        <div className="edit-accent-bar" />
                        <h3 className="edit-panel-title">Edit Session</h3>
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-label">Session Title</label>
                        <input
                            type="text"
                            value={editFormData.title}
                            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                            className="edit-input"
                            maxLength={30}
                            required
                        />
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-label">Description</label>
                        <textarea
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            className="edit-textarea"
                            maxLength={1000}
                            required
                        />
                    </div>

                    <div className="edit-grid-2">
                        <div className="edit-form-group">
                            <label className="edit-label">Price [USD]</label>
                            <input
                                type="number"
                                value={editFormData.price}
                                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                                className="edit-input"
                                min="1" required
                            />
                        </div>
                        <div className="edit-form-group">
                            <label className="edit-label">Specialty</label>
                            <select
                                value={editFormData.specialty}
                                onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                                className="edit-select"
                                required
                            >
                                {specialtyOptions.map(s => (
                                    <option key={s} value={s} className="option-bg-dark">{s.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="edit-panel-actions">
                        <button
                            onClick={handleUpdate}
                            className="update-confirm-btn"
                            disabled={submitting}
                        >
                            {submitting ? 'UPDATING...' : 'SAVE CHANGES'}
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="cancel-edit-btn"
                        >
                            CANCEL
                        </button>
                    </div>
                </div >
            </div >
        );
    }

    return (
        <div className="session-card glass-panel">
            <div className="card-decor-glow" />

            <div className="card-top-row">
                <div className="card-coach-info">
                    {session.coachRiotAccount && (
                        <div className="coach-avatar-wrapper">
                            <div className="avatar-hover-glow" />
                            <img
                                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${session.coachRiotAccount.profileIconId}.png`}
                                alt="Coach"
                                className="coach-pfp"
                            />
                        </div>
                    )}
                    <div className="coach-meta">
                        <Link to={`/profile/${session.coachId}`} className="coach-name-link">
                            {session.coachName}
                            {isOwn && <span className="own-badge">YOU</span>}
                        </Link>
                        <div className="specialty-focus-row">
                            <div className="focus-dot" />
                            <span className="focus-label">{session.specialty} Focus</span>
                        </div>
                        <div className="session-ranks-row">
                            {soloRank && (
                                <div className="session-rank-item">
                                    <img src={getRankIcon(soloRank.tier)} alt={soloRank.tier} className="session-rank-icon" />
                                    <span className="session-rank-label">Solo/Duo</span>
                                    <span className="session-rank-tier">{soloRank.tier} {soloRank.rank}</span>
                                </div>
                            )}
                            {flexRank && (
                                <div className="session-rank-item">
                                    <img src={getRankIcon(flexRank.tier)} alt={flexRank.tier} className="session-rank-icon" />
                                    <span className="session-rank-label">Flex</span>
                                    <span className="session-rank-tier">{flexRank.tier} {flexRank.rank}</span>
                                </div>
                            )}
                            {!soloRank && !flexRank && (
                                <span className="session-rank-unranked">Unranked</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card-pricing">
                    <div className="price-row">
                        <span className="price-currency">$</span>
                        <span className="price-val">{Number(session.price || 0).toFixed(2)}</span>
                    </div>
                    <span className="price-unit">PER HOUR</span>
                </div>
            </div>

            <div className="card-body">
                <h3 className="card-main-title">{session.title}</h3>
                <p className="card-main-desc">{session.description}</p>
            </div>

            <div className="card-footer">
                <div className="duration-info-wrap">
                    <div className="duration-head">
                        <div className="duration-dot" />
                        <span className="duration-label-text">Lesson Duration</span>
                    </div>
                    <span className="duration-val-text">
                        {Math.floor(session.duration / 60) > 0 ? `${Math.floor(session.duration / 60)}H ` : ''}{session.duration % 60}M Length
                    </span>
                </div>

                <div className="card-action-btns">
                    {canEdit && (
                        <button
                            onClick={handleEdit}
                            className="action-icon-btn edit-session-btn"
                            title="Edit Session"
                        >
                            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            className="action-icon-btn delete-session-btn"
                            title="Delete Session"
                        >
                            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    )}
                    {!isOwn && (
                        <button
                            className="book-session-btn"
                            title="Coming Soon"
                        >
                            <span className="relative z-10">BOOK NOW</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function CoachCard({ coach }) {
    const { latestVersion: version } = useDDragon();
    const getRankByQueue = (rankedData, queueType) => {
        if (!rankedData || rankedData.length === 0) return null;
        return rankedData.find(q => q.queueType === queueType) || null;
    };
    const soloRank = getRankByQueue(coach.rankedData, 'RANKED_SOLO_5x5');
    const flexRank = getRankByQueue(coach.rankedData, 'RANKED_FLEX_SR');
    const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}.png` : null;

    return (
        <div className="coach-small-card glass-panel">
            <div className="coach-card-glow" />

            <div className="coach-avatar-area">
                <div className="avatar-backdrop-glow" />
                <div className="avatar-container-inner">
                    {coach.riotAccount ? (
                        <img
                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${coach.riotAccount.profileIconId}.png`}
                            alt={coach.username}
                            className="coach-main-pfp"
                        />
                    ) : (
                        <div className="pfp-placeholder italic"></div>
                    )}
                </div>
                <div className="coach-dual-rank">
                    {soloRank && (
                        <div className="coach-rank-entry">
                            <img src={getRankIcon(soloRank.tier)} alt={soloRank.tier} className="rank-badge-icon" />
                            <div className="rank-entry-text">
                                <span className="rank-entry-queue">Solo/Duo</span>
                                <span className="rank-entry-tier">{soloRank.tier} {soloRank.rank}</span>
                            </div>
                        </div>
                    )}
                    {flexRank && (
                        <div className="coach-rank-entry">
                            <img src={getRankIcon(flexRank.tier)} alt={flexRank.tier} className="rank-badge-icon" />
                            <div className="rank-entry-text">
                                <span className="rank-entry-queue">Flex</span>
                                <span className="rank-entry-tier">{flexRank.tier} {flexRank.rank}</span>
                            </div>
                        </div>
                    )}
                    {!soloRank && !flexRank && (
                        <span className="rank-entry-unranked">Unranked</span>
                    )}
                </div>
            </div>

            <div className="coach-card-info-header">
                <h3 className="coach-card-name">{coach.username}</h3>
                {coach.riotAccount && (
                    <p className="coach-riot-id">
                        {coach.riotAccount.gameName} <span className="riot-tag-hash">#</span>{coach.riotAccount.tagLine}
                    </p>
                )}
            </div>

            <div className="coach-card-body">
                <div className="coach-specialty-tags">
                    {coach.coachProfile?.specialties?.slice(0, 3).map(s => (
                        <span key={s} className="mini-specialty-tag">
                            {s}
                        </span>
                    ))}
                </div>


            </div>

            <Link
                to={`/profile/${coach.id}`}
                className="inspect-coach-btn"
            >
                <span className="inspect-btn-label">View Profile</span>
                <div className="inspect-btn-hover-bg" />
            </Link>
        </div>
    );
}

export default Coaching;
