import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';
import { fetchDDragon } from '../utils/fetchDDragon';
import '../styles/componentsCSS/champions.css';

const ROLE_LABELS = {
    TOP: 'Top',
    JUNGLE: 'Jungle',
    MID: 'Mid',
    ADC: 'ADC',
    SUPPORT: 'Support'
};

const ROLE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

function Champions() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('user');
    const [loading, setLoading] = useState(true);
    const [champions, setChampions] = useState([]);
    const [championRoles, setChampionRoles] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [selectedChampion, setSelectedChampion] = useState(null);
    const [editRoles, setEditRoles] = useState({ mainRoles: [], secondaryRoles: [], offMetaRoles: [] });
    const [saving, setSaving] = useState(false);
    const [version, setVersion] = useState('');
    const [statusMessage, setStatusMessage] = useState(null);
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
                    if (['owner', 'admin', 'coach'].includes(role)) {
                        setUserRole(role);
                    } else {
                        navigate('/');
                        return;
                    }
                } else {
                    navigate('/');
                    return;
                }
            } catch (error) {
                console.error('Error checking role:', error);
                navigate('/');
                return;
            }

            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (loading || !user) return;

        const loadData = async () => {
            try {
                const { latestVersion, champIdToName, champNameToId } = await fetchDDragon();
                setVersion(latestVersion);

                const champList = Object.entries(champIdToName).map(([id, name]) => ({
                    id: id.toString(),
                    name,
                    displayName: name.replace(/([A-Z])/g, ' $1').trim()
                }));
                champList.sort((a, b) => a.name.localeCompare(b.name));
                setChampions(champList);

                const rolesSnapshot = await getDocs(collection(db, "champions"));
                const rolesMap = {};
                rolesSnapshot.forEach((doc) => {
                    rolesMap[doc.id] = doc.data();
                });
                setChampionRoles(rolesMap);
            } catch (error) {
                console.error('Error loading data:', error);
                setStatusMessage({ type: 'error', text: 'Failed to load champion data.' });
            }
        };

        loadData();
    }, [loading, user]);

    const handleSelectChampion = (champ) => {
        setSelectedChampion(champ);
        const saved = championRoles[champ.name];
        if (saved) {
            setEditRoles({
                mainRoles: saved.mainRoles || [],
                secondaryRoles: saved.secondaryRoles || [],
                offMetaRoles: saved.offMetaRoles || []
            });
        } else {
            setEditRoles({ mainRoles: [], secondaryRoles: [], offMetaRoles: [] });
        }
    };

    const toggleRole = (tier, role) => {
        setEditRoles(prev => {
            const newRoles = { ...prev };

            newRoles.mainRoles = newRoles.mainRoles.filter(r => r !== role);
            newRoles.secondaryRoles = newRoles.secondaryRoles.filter(r => r !== role);
            newRoles.offMetaRoles = newRoles.offMetaRoles.filter(r => r !== role);

            const wasInTier = prev[tier].includes(role);
            if (!wasInTier) {
                newRoles[tier] = [...newRoles[tier], role];
            }

            return newRoles;
        });
    };

    const getRoleTier = (role) => {
        if (editRoles.mainRoles.includes(role)) return 'mainRoles';
        if (editRoles.secondaryRoles.includes(role)) return 'secondaryRoles';
        if (editRoles.offMetaRoles.includes(role)) return 'offMetaRoles';
        return null;
    };

    const handleSave = async () => {
        if (!selectedChampion || !user) return;
        setSaving(true);

        try {
            await setDoc(doc(db, "champions", selectedChampion.name), {
                championId: selectedChampion.id,
                championName: selectedChampion.name,
                mainRoles: editRoles.mainRoles,
                secondaryRoles: editRoles.secondaryRoles,
                offMetaRoles: editRoles.offMetaRoles,
                updatedBy: user.uid,
                updatedAt: serverTimestamp()
            });

            setChampionRoles(prev => ({
                ...prev,
                [selectedChampion.name]: {
                    ...editRoles,
                    championName: selectedChampion.name
                }
            }));

            setStatusMessage({ type: 'success', text: `${selectedChampion.name} roles saved!` });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            console.error('Error saving:', error);
            setStatusMessage({ type: 'error', text: 'Failed to save roles.' });
        }

        setSaving(false);
    };

    const getChampionStatus = (champName) => {
        const saved = championRoles[champName];
        if (!saved) return 'unset';
        if (saved.mainRoles?.length > 0) return 'configured';
        return 'partial';
    };

    const getRoleIconPath = (role) => {
        const map = {
            'TOP': '/lane-icons/top lane.png',
            'JUNGLE': '/lane-icons/jg icon.png',
            'MID': '/lane-icons/mid lane.png',
            'ADC': '/lane-icons/adc lane.png',
            'SUPPORT': '/lane-icons/sup icon.png'
        };
        return map[role] || '';
    };

    const filteredChampions = champions.filter(champ => {
        const matchesSearch = champ.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (roleFilter === 'ALL') return true;
        if (roleFilter === 'UNSET') return getChampionStatus(champ.name) === 'unset';

        const saved = championRoles[champ.name];
        if (!saved) return false;

        return (
            saved.mainRoles?.includes(roleFilter) ||
            saved.secondaryRoles?.includes(roleFilter)
        );
    });

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="champions-page">
            <div className="champions-container">
                <div className="champions-header">
                    <div className="header-content">
                        <h1>Champion Role Manager</h1>
                        <p>Assign main, secondary, and off-meta roles for live game sorting</p>
                    </div>
                    <div className="header-actions">
                        <div className="role-indicator">
                            <span className={`role-badge ${userRole}`}>
                                {userRole === 'owner' ? 'Owner' : userRole === 'admin' ? 'Admin' : 'Coach'}
                            </span>
                        </div>

                    </div>
                </div>

                {statusMessage && (
                    <div className={`status-msg ${statusMessage.type}`}>
                        {statusMessage.text}
                    </div>
                )}

                <div className="priority-legend">
                    <div className="legend-item main">
                        <span className="legend-dot"></span>
                        <span>Main Role</span>
                        <span className="legend-priority">Highest Priority</span>
                    </div>
                    <div className="legend-item secondary">
                        <span className="legend-dot"></span>
                        <span>Secondary</span>
                        <span className="legend-priority">Medium Priority</span>
                    </div>
                    <div className="legend-item offmeta">
                        <span className="legend-dot"></span>
                        <span>Off-Meta</span>
                        <span className="legend-priority">Lowest Priority</span>
                    </div>
                </div>

                <div className="champions-layout">
                    <div className="champions-list-panel">
                        <div className="champions-toolbar">
                            <input
                                type="text"
                                className="champion-search"
                                placeholder="Search champions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="role-filters">
                                <button
                                    className={`filter-btn ${roleFilter === 'ALL' ? 'active' : ''}`}
                                    onClick={() => setRoleFilter('ALL')}
                                >All</button>
                                {ROLE_ORDER.map(role => (
                                    <button
                                        key={role}
                                        className={`filter-btn ${roleFilter === role ? 'active' : ''}`}
                                        onClick={() => setRoleFilter(role)}
                                        title={ROLE_LABELS[role]}
                                    >
                                        <img src={getRoleIconPath(role)} alt={role} className="filter-role-icon" />
                                    </button>
                                ))}
                                <button
                                    className={`filter-btn unset-filter ${roleFilter === 'UNSET' ? 'active' : ''}`}
                                    onClick={() => setRoleFilter('UNSET')}
                                >Unset</button>
                            </div>
                        </div>

                        <div className="champions-grid">
                            {filteredChampions.map(champ => {
                                const isSelected = selectedChampion?.id === champ.id;
                                return (
                                    <div
                                        key={champ.id}
                                        className={`champion-card ${getChampionStatus(champ.name)} ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelectChampion(champ)}
                                    >
                                        <img
                                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.name}.png`}
                                            alt={champ.name}
                                            className="champion-icon"
                                            onError={(e) => (e.target.src = '/placeholder-champ.png')}
                                        />
                                        <span className="champion-name">{champ.name}</span>
                                        <span className={`status-indicator ${getChampionStatus(champ.name)}`}></span>

                                        {roleFilter !== 'ALL' && roleFilter !== 'UNSET' &&
                                            championRoles[champ.name]?.secondaryRoles?.includes(roleFilter) && (
                                                <div className="secondary-indicator" title="Secondary Role">2</div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="champions-count">
                            Showing {filteredChampions.length} of {champions.length} champions
                        </div>
                    </div>

                    <div className={`role-assignment-panel ${selectedChampion ? 'active' : ''}`}>
                        {selectedChampion ? (
                            <>
                                <div className="assignment-header">
                                    <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${selectedChampion.name}.png`}
                                        alt={selectedChampion.name}
                                        className="assignment-champ-icon"
                                    />
                                    <div>
                                        <h2>{selectedChampion.name}</h2>
                                        <span className="champ-id">ID: {selectedChampion.id}</span>
                                    </div>
                                </div>

                                <div className="role-tiers">
                                    {ROLE_ORDER.map(role => {
                                        const currentTier = getRoleTier(role);
                                        return (
                                            <div key={role} className="role-row">
                                                <div className="role-label">
                                                    <img src={getRoleIconPath(role)} alt={role} className="role-icon-small" />
                                                    <span>{ROLE_LABELS[role]}</span>
                                                </div>
                                                <div className="tier-buttons">
                                                    <button
                                                        className={`tier-btn main ${currentTier === 'mainRoles' ? 'active' : ''}`}
                                                        onClick={() => toggleRole('mainRoles', role)}
                                                        title="Main Role"
                                                    >
                                                        Main
                                                    </button>
                                                    <button
                                                        className={`tier-btn secondary ${currentTier === 'secondaryRoles' ? 'active' : ''}`}
                                                        onClick={() => toggleRole('secondaryRoles', role)}
                                                        title="Secondary Role"
                                                    >
                                                        Secondary
                                                    </button>
                                                    <button
                                                        className={`tier-btn offmeta ${currentTier === 'offMetaRoles' ? 'active' : ''}`}
                                                        onClick={() => toggleRole('offMetaRoles', role)}
                                                        title="Off-Meta Role"
                                                    >
                                                        Off-Meta
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="assignment-summary">
                                    <h4>Current Assignment</h4>
                                    <div className="summary-roles">
                                        {editRoles.mainRoles.length > 0 && (
                                            <div className="summary-tier main">
                                                <span className="tier-label">Main:</span>
                                                {editRoles.mainRoles.map(r => (
                                                    <span key={r} className="role-tag main">{ROLE_LABELS[r]}</span>
                                                ))}
                                            </div>
                                        )}
                                        {editRoles.secondaryRoles.length > 0 && (
                                            <div className="summary-tier secondary">
                                                <span className="tier-label">Secondary:</span>
                                                {editRoles.secondaryRoles.map(r => (
                                                    <span key={r} className="role-tag secondary">{ROLE_LABELS[r]}</span>
                                                ))}
                                            </div>
                                        )}
                                        {editRoles.offMetaRoles.length > 0 && (
                                            <div className="summary-tier offmeta">
                                                <span className="tier-label">Off-Meta:</span>
                                                {editRoles.offMetaRoles.map(r => (
                                                    <span key={r} className="role-tag offmeta">{ROLE_LABELS[r]}</span>
                                                ))}
                                            </div>
                                        )}
                                        {editRoles.mainRoles.length === 0 &&
                                            editRoles.secondaryRoles.length === 0 &&
                                            editRoles.offMetaRoles.length === 0 && (
                                                <p className="no-roles-msg">No roles assigned yet</p>
                                            )}
                                    </div>
                                </div>

                                <button
                                    className="save-roles-btn"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : ' Save Roles'}
                                </button>
                            </>
                        ) : (
                            <div className="no-selection">
                                <div className="no-selection-icon"></div>
                                <p>Select a champion to assign roles</p>
                                <span>Click any champion from the grid</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Champions;
