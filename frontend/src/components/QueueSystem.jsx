import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

function QueueSystem() {
  const [inQueue, setInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      loadUserProfile(user.uid);
      checkQueueStatus(user.uid);
      
      const interval = setInterval(() => {
        if (user.uid) {
          checkQueueStatus(user.uid);
          fetchAvailablePlayers();
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    let interval;
    if (inQueue) {
      interval = setInterval(() => {
        setQueueTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inQueue]);

  const loadUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkQueueStatus = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/queue/status/${userId}`);
      const data = await response.json();
      
      setInQueue(data.inQueue);
      setQueuePosition(data.queuePosition);
      
      if (data.currentMatch) {
        setCurrentMatch(data.currentMatch);
        setInQueue(false);
        setQueueTime(0);
      }
    } catch (error) {
      console.error('Error checking queue status:', error);
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/queue/players');
      const data = await response.json();
      setAvailablePlayers(data.players || []);
    } catch (error) {
      console.error('Error fetching available players:', error);
      setAvailablePlayers([]);
    }
  };

  const joinQueue = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!userProfile?.riotAccount?.gameName) {
      alert("Please link your Riot account in your profile before joining the queue!");
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/queue/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          playerName: user.displayName || 'Anonymous',
          riotAccount: userProfile.riotAccount,
          region: userProfile.riotAccount?.region || 'na1'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setInQueue(true);
        setQueueTime(0);
      } else {
        alert(data.error || 'Failed to join queue');
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Failed to join queue');
    }
  };

  const leaveQueue = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await fetch('http://localhost:3000/api/queue/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid
        })
      });

      setInQueue(false);
      setQueueTime(0);
      setQueuePosition(0);
    } catch (error) {
      console.error('Error leaving queue:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiotId = (player) => {
    if (!player.riotAccount) return 'No Riot ID';
    return `${player.riotAccount.gameName || 'Unknown'}#${player.riotAccount.tagLine || '0000'}`;
  };

  const getRegion = (player) => {
    return player.riotAccount?.region || player.region || 'Unknown';
  };

  const getMatchedPlayer = (match) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !match) return null;
    
    if (match.player1.userId === currentUserId) {
      return match.player2;
    }
    if (match.player2.userId === currentUserId) {
      return match.player1;
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="queue-container">
        <div className="queue-loading">
          <div className="spinner">⏳</div>
          <p>Loading queue system...</p>
        </div>
      </div>
    );
  }

  const matchedPlayer = currentMatch ? getMatchedPlayer(currentMatch) : null;

  return (
    <div className="queue-container">
      <h2>Find Players to Queue With</h2>
      
      {!userProfile?.riotAccount?.gameName ? (
        <div className="queue-warning">
          <p>⚠️ You need to link your Riot account in your profile before queuing!</p>
          <button 
            onClick={() => window.location.href = '/profile'}
            className="link-profile-btn"
          >
            Go to Profile
          </button>
        </div>
      ) : (
        <>
          <div className="queue-controls">
            {!inQueue && !currentMatch ? (
              <button onClick={joinQueue} className="join-queue-btn">
                🎮 Join Queue
              </button>
            ) : inQueue ? (
              <div className="in-queue">
                <div className="queue-status">
                  <div className="searching-animation">🔍</div>
                  <h3>Searching for players...</h3>
                  <p>Time in queue: {formatTime(queueTime)}</p>
                  <p>Position: {queuePosition} of {availablePlayers.length + 1}</p>
                  <button onClick={leaveQueue} className="leave-queue-btn">
                    Leave Queue
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {currentMatch && matchedPlayer && (
            <div className="match-found">
              <h3>🎉 Match Found!</h3>
              <div className="matched-player">
                <div className="player-info">
                  <strong>{matchedPlayer.playerName}</strong>
                  <span className="riot-id">
                    {getRiotId(matchedPlayer)}
                  </span>
                  <span className="region">Region: {getRegion(matchedPlayer)}</span>
                </div>
              </div>
              <p className="match-instructions">
                Add this player in-game using their Riot ID above!
              </p>
              <button 
                onClick={() => {
                  setCurrentMatch(null);
                  setInQueue(false);
                }}
                className="close-match-btn"
              >
                Find Another Match
              </button>
            </div>
          )}

          {availablePlayers.length > 0 && !currentMatch && (
            <div className="available-players">
              <h4>Players in Queue ({availablePlayers.length})</h4>
              <div className="players-list">
                {availablePlayers.map((player, index) => (
                  <div key={index} className="player-card">
                    <div className="player-details">
                      <strong>{player.playerName}</strong>
                      <span className="riot-id">
                        {getRiotId(player)}
                      </span>
                      <span className="region">Region: {getRegion(player)}</span>
                    </div>
                    <span className="queue-time">
                      Waiting: {formatTime(player.waitTime || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availablePlayers.length === 0 && !inQueue && !currentMatch && (
            <div className="queue-empty">
              <p>No players in queue. Be the first to join!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default QueueSystem;