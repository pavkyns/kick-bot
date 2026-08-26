require('dotenv').config();

const http = require('http');
const express = require('express');

const app = express();
app.use(express.json());

console.log('[BOT] ✅ Bot se spustil!');
console.log('[BOT] Channel:', process.env.KICK_CHANNEL);

// Cooldowns
const userCooldowns = new Map();
const COOLDOWN_MS = 120000; // 120 sekund

function spinCase() {
  const rand = Math.random() * 100;
  if (rand < 30) return '1x Ticket';
  if (rand < 55) return '2x Ticket';
  if (rand < 75) return '5x Ticket';
  if (rand < 88) return '10x Ticket';
  if (rand < 96) return 'VIP Day';
  if (rand < 99) return '7 Day VIP';
  return 'Perma VIP';
}

// WEBHOOK ENDPOINT
app.post('/webhook', (req, res) => {
  try {
    const { type, data } = req.body;

    console.log('[WEBHOOK] Přijata zpráva:', type);

    // Chat message event
    if (type === 'message' || type === 'chat_message') {
      const message = data.message || data.content || '';
      const username = data.sender?.username || data.user?.username || 'Unknown';

      console.log(`[CHAT] ${username}: ${message}`);

      // Check for !case command
      if (message.toLowerCase().includes('!case')) {
        // Cooldown check
        if (userCooldowns.has(username)) {
          const expirationTime = userCooldowns.get(username) + COOLDOWN_MS;
          if (Date.now() < expirationTime) {
            const remainingMs = expirationTime - Date.now();
            console.log(`[COOLDOWN] ${username} musí čekat ${Math.ceil(remainingMs / 1000)}s`);
            res.status(200).json({ status: 'on_cooldown' });
            return;
          }
        }

        // Spin case
        const reward = spinCase();
        userCooldowns.set(username, Date.now());

        console.log(`[CASE] ${username} vyhrál: ${reward}! 🎉`);
        
        // V budoucnu zde pošleš zprávu do chatu
        res.status(200).json({ 
          status: 'success',
          reward: reward,
          user: username
        });
        return;
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[ERROR] Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'Kick Bot Running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SERVER] ✅ Listening on port ${PORT}`);
  console.log(`[WEBHOOK] 📍 https://kick-bot-production-408a.up.railway.app/webhook`);
});
