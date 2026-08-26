require('dotenv').config();

const http = require('http');
const axios = require('axios');

console.log('[BOT] ✅ Bot se spustil!');
console.log('[BOT] Channel:', process.env.KICK_CHANNEL);

// HTTP Server
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Kick Bot Running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SERVER] ✅ Listening on port ${PORT}`);
});

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

// Get Access Token
async function getAccessToken() {
  try {
    const response = await axios.post('https://kick.com/api/v2/oauth/token', {
      client_id: process.env.KICK_CLIENT_ID,
      client_secret: process.env.KICK_CLIENT_SECRET,
      grant_type: 'client_credentials'
    });
    return response.data.access_token;
  } catch (error) {
    console.error('[ERROR] Nelze získat token:', error.message);
    return null;
  }
}

// Send Chat Message
async function sendChatMessage(message) {
  try {
    const token = await getAccessToken();
    if (!token) return;

    await axios.post(
      `https://kick.com/api/v2/channels/${process.env.KICK_CHANNEL}/messages`,
      { content: message },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`[CHAT] Odeslano: ${message}`);
  } catch (error) {
    console.error('[ERROR] Nelze poslat zprávu:', error.message);
  }
}

// Listen to chat (polling)
async function listenToChat() {
  try {
    const token = await getAccessToken();
    if (!token) {
      setTimeout(listenToChat, 5000);
      return;
    }

    const response = await axios.get(
      `https://kick.com/api/v2/channels/${process.env.KICK_CHANNEL}/messages`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const messages = response.data.messages || [];
    
    messages.forEach(msg => {
      if (msg.content.includes('!case')) {
        const username = msg.sender.username;
        
        // Cooldown check
        if (userCooldowns.has(username)) {
          const expirationTime = userCooldowns.get(username) + COOLDOWN_MS;
          if (Date.now() < expirationTime) {
            return;
          }
        }

        // Spin case
        const reward = spinCase();
        userCooldowns.set(username, Date.now());
        
        sendChatMessage(`@${username} wygrał: ${reward}! 🎉`);
        console.log(`[CASE] ${username} -> ${reward}`);
      }
    });

    setTimeout(listenToChat, 5000);
  } catch (error) {
    console.error('[ERROR] Chat listener error:', error.message);
    setTimeout(listenToChat, 5000);
  }
}

// Start
console.log('[BOT] ✅ Bot je připraven!');
listenToChat();
