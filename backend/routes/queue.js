const express = require('express');
const router = express.Router();

let queue = [];
let matches = [];

router.post('/join', (req, res) => {
  try {
    const { userId, playerName, riotAccount, region } = req.body;

    const alreadyInQueue = queue.find(player => player.userId === userId);
    if (alreadyInQueue) {
      return res.json({ success: false, error: 'Already in queue' });
    }

    const player = {
      userId,
      playerName,
      riotAccount,
      region,
      joinedAt: new Date(),
      queueId: generateQueueId()
    };

    queue.push(player);
    console.log(`Player ${playerName} joined queue. Queue size: ${queue.length}`);

    tryMatchPlayers();

    res.json({ 
      success: true, 
      queueId: player.queueId,
      position: queue.length
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

router.post('/leave', (req, res) => {
  try {
    const { userId } = req.body;
    
    const initialLength = queue.length;
    queue = queue.filter(player => player.userId !== userId);
    
    console.log(`Player ${userId} left queue. Queue was ${initialLength}, now ${queue.length}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving queue:', error);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

router.get('/status/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const inQueue = queue.find(player => player.userId === userId);
    const userMatch = matches.find(match => 
      match.player1.userId === userId || match.player2.userId === userId
    );

    res.json({
      inQueue: !!inQueue,
      queuePosition: inQueue ? queue.indexOf(inQueue) + 1 : null,
      queueSize: queue.length,
      currentMatch: userMatch || null
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

router.get('/players', (req, res) => {
  try {
    res.json({
      players: queue.map(player => ({
        playerName: player.playerName,
        riotAccount: player.riotAccount,
        region: player.region,
        waitTime: Math.floor((new Date() - player.joinedAt) / 1000)
      }))
    });
  } catch (error) {
    console.error('Error getting available players:', error);
    res.status(500).json({ error: 'Failed to get available players' });
  }
});

function tryMatchPlayers() {
  if (queue.length < 2) return;

  const playersByRegion = {};
  queue.forEach(player => {
    if (!playersByRegion[player.region]) {
      playersByRegion[player.region] = [];
    }
    playersByRegion[player.region].push(player);
  });

  for (const region in playersByRegion) {
    const regionPlayers = playersByRegion[region];
    
    while (regionPlayers.length >= 2) {
      const player1 = regionPlayers.shift();
      const player2 = regionPlayers.shift();
      
      queue = queue.filter(p => p.userId !== player1.userId && p.userId !== player2.userId);
      
      const match = {
        matchId: generateMatchId(),
        player1,
        player2,
        matchedAt: new Date()
      };
      
      matches.push(match);
      
      console.log(`Matched ${player1.playerName} with ${player2.playerName} in region ${region}`);
      
      setTimeout(() => {
        matches = matches.filter(m => m.matchId !== match.matchId);
      }, 10 * 60 * 1000);
      
      break;
    }
  }
}

setInterval(() => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  const initialQueueSize = queue.length;
  queue = queue.filter(player => player.joinedAt > fifteenMinutesAgo);
  
  if (initialQueueSize !== queue.length) {
    console.log(`Cleaned up ${initialQueueSize - queue.length} old queue entries`);
  }
  
  const initialMatchesSize = matches.length;
  matches = matches.filter(match => match.matchedAt > fifteenMinutesAgo);
  
  if (initialMatchesSize !== matches.length) {
    console.log(`Cleaned up ${initialMatchesSize - matches.length} old matches`);
  }
}, 5 * 60 * 1000);

function generateQueueId() {
  return 'q_' + Math.random().toString(36).substr(2, 9);
}

function generateMatchId() {
  return 'm_' + Math.random().toString(36).substr(2, 9);
}

module.exports = router;