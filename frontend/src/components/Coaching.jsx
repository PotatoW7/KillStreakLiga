import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import '../styles/componentsCSS/coaching.css';

function Coaching() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [coaches, setCoaches] = useState([]);
    const [coachingSessions, setCoachingSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('coaches');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [filters, setFilters] = useState({
        specialty: '',
        minPrice: '',
        maxPrice: ''
    });
    const [newSession, setNewSession] = useState({
        title: '',
        description: '',
        price: '',
        duration: '60',
        specialty: ''
    });
    const [submitting, setSubmitting] = useState(false);

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

            await addDoc(collection(db, "coachingSessions"), {
                coachId: user.uid,
                coachName: userData.username || user.displayName,
                coachRiotAccount: userData.riotAccount,
                coachRankedData: userData.rankedData,
                title: newSession.title,
                description: newSession.description,
                price: parseFloat(newSession.price),
                duration: parseInt(newSession.duration),
                specialty: newSession.specialty,
                createdAt: serverTimestamp(),
                active: true
            });

            setNewSession({
                title: '',
                description: '',
                price: '',
                duration: '60',
                specialty: ''
            });
            setShowCreateForm(false);
            fetchData();
        } catch (err) {
            console.error('Error creating session:', err);
        }
        setSubmitting(false);
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

    if (loading) return <div className="loading">Loading coaching data...</div>;

    return (
        <div className="coaching-page">
            <div className="coaching-container">
                <div className="coaching-header">
                    <div className="header-content">
                        <h1>Coaching Marketplace</h1>
                        <p>Learn from verified high-rank players and improve your game</p>
                    </div>
                    {userRole === 'coach' && (
                        <button
                            className="create-session-btn"
                            onClick={() => setShowCreateForm(!showCreateForm)}
                        >
                            {showCreateForm ? '✕ Cancel' : '+ Create Coaching Session'}
                        </button>
                    )}
                    {(userRole === 'user' || !user) && (
                        <div className="coach-cta-buttons">
                            <Link to="/become-coach" className="become-coach-link">
                                Want to become a coach?
                            </Link>
                            <Link to="/coach-rules" className="coach-rules-link">
                                View Coach Rules
                            </Link>
                        </div>
                    )}
                </div>
                <div className="coach-rules-preview">
                    <div className="rules-preview-content">
                        <div className="rule-item">
                            <img src="/project-icons/Coaching icons/guide.png" alt="Rules" className="rule-icon" />
                            <div>
                                <strong>Full Guidelines</strong>
                                <p>Before you start coaching or applying to become a coach, please read the guidelines</p>
                                <Link to="/coach-rules" className="view-full-rules">
                                    View complete coach rules and requirements →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {showCreateForm && userRole === 'coach' && (
                    <div className="create-session-form-container">
                        <form onSubmit={handleCreateSession} className="create-session-form">
                            <h3>Create New Coaching Session</h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="title">Session Title *</label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={newSession.title}
                                        onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                                        placeholder="e.g., Diamond Jungle Coaching"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="specialty">Specialty *</label>
                                    <select
                                        id="specialty"
                                        value={newSession.specialty}
                                        onChange={(e) => setNewSession({ ...newSession, specialty: e.target.value })}
                                        required
                                    >
                                        <option value="">Select specialty...</option>
                                        {specialtyOptions.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description *</label>
                                <textarea
                                    id="description"
                                    value={newSession.description}
                                    onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                                    placeholder="Describe what students will learn in this session..."
                                    rows={3}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="price">Price (USD) *</label>
                                    <input
                                        type="number"
                                        id="price"
                                        value={newSession.price}
                                        onChange={(e) => setNewSession({ ...newSession, price: e.target.value })}
                                        placeholder="25"
                                        min="1"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="duration">Duration (minutes) *</label>
                                    <select
                                        id="duration"
                                        value={newSession.duration}
                                        onChange={(e) => setNewSession({ ...newSession, duration: e.target.value })}
                                        required
                                    >
                                        <option value="30">30 minutes</option>
                                        <option value="60">60 minutes</option>
                                        <option value="90">90 minutes</option>
                                        <option value="120">2 hours</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="submit-session-btn" disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Session'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="coaching-tabs">
                    <button
                        className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sessions')}
                    >
                        <img src="/project-icons/Coaching icons/coaching session.png" alt="" className="tab-icon" />
                        Coaching Sessions
                    </button>
                    <button
                        className={`tab ${activeTab === 'coaches' ? 'active' : ''}`}
                        onClick={() => setActiveTab('coaches')}
                    >
                        <img src="/project-icons/Coaching icons/available coaches.png" alt="" className="tab-icon" />
                        All Coaches
                    </button>
                </div>

                {activeTab === 'sessions' && (
                    <>
                        <div className="filters-bar">
                            <select
                                value={filters.specialty}
                                onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                                className="filter-select"
                            >
                                <option value="">All Specialties</option>
                                {specialtyOptions.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                placeholder="Min Price"
                                value={filters.minPrice}
                                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                className="filter-input"
                            />
                            <input
                                type="number"
                                placeholder="Max Price"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                className="filter-input"
                            />
                            <button
                                className="clear-filters-btn"
                                onClick={() => setFilters({ specialty: '', minPrice: '', maxPrice: '' })}
                            >
                                Clear
                            </button>
                        </div>

                        <div className="sessions-grid">
                            {filteredSessions.length === 0 ? (
                                <div className="no-results">
                                    <p>No coaching sessions found. {userRole === 'coach' && 'Be the first to create one!'}</p>
                                    {!user && (
                                        <p>
                                            <Link to="/login">Login</Link> to see all available coaching sessions.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                filteredSessions.map(session => {
                                    const rank = getHighestRank(session.coachRankedData);
                                    return (
                                        <div key={session.id} className="session-card">
                                            <div className="session-header">
                                                <div className="coach-info-mini">
                                                    {session.coachRiotAccount && (
                                                        <img
                                                            src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${session.coachRiotAccount.profileIconId}.png`}
                                                            alt="Coach"
                                                            className="coach-avatar-mini"
                                                        />
                                                    )}
                                                    <div>
                                                        <span className="coach-name">{session.coachName}</span>
                                                        {rank && (
                                                            <span className="coach-rank-mini">
                                                                <img src={getRankIcon(rank.tier)} alt={rank.tier} className="rank-icon-mini" />
                                                                {rank.tier}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="session-price">${session.price}</span>
                                            </div>
                                            <h4 className="session-title">{session.title}</h4>
                                            <p className="session-description">{session.description}</p>
                                            <div className="session-meta">
                                                <span className="session-specialty">{session.specialty}</span>
                                                <span className="session-duration">Duration: {session.duration} min</span>
                                            </div>
                                            <button className="book-session-btn">Book Session</button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'coaches' && (
                    <div className="coaches-grid">
                        {coaches.length === 0 ? (
                            <div className="no-results">
                                <p>No coaches available yet.</p>
                            </div>
                        ) : (
                            coaches.map(coach => {
                                const rank = getHighestRank(coach.rankedData);
                                return (
                                    <div key={coach.id} className="coach-card">
                                        <div className="coach-card-header">
                                            {coach.riotAccount ? (
                                                <img
                                                    src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${coach.riotAccount.profileIconId}.png`}
                                                    alt="Coach"
                                                    className="coach-avatar"
                                                />
                                            ) : (
                                                <div className="coach-avatar-placeholder">👤</div>
                                            )}
                                            {rank && (
                                                <div className="coach-rank-badge">
                                                    <img src={getRankIcon(rank.tier)} alt={rank.tier} className="rank-icon" />
                                                    <span>{rank.tier} {rank.rank}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="coach-card-body">
                                            <h4 className="coach-username">{coach.username}</h4>
                                            {coach.riotAccount && (
                                                <p className="coach-riot-id">
                                                    {coach.riotAccount.gameName}#{coach.riotAccount.tagLine}
                                                </p>
                                            )}
                                            {coach.coachProfile?.specialties && (
                                                <div className="coach-specialties">
                                                    {coach.coachProfile.specialties.slice(0, 3).map(s => (
                                                        <span key={s} className="specialty-tag">{s}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {coach.coachProfile?.hourlyRate && (
                                                <p className="coach-rate">Starting at ${coach.coachProfile.hourlyRate}/hr</p>
                                            )}
                                        </div>
                                        <Link to={`/profile/${coach.id}`} className="view-coach-btn">
                                            View Profile
                                        </Link>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Coaching;