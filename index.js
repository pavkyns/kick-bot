require('dotenv').config();
const net = require('net');
const http = require('http');
const express = require('express');

const app = express();
app.use(express.json());

console.log('[BOT] ✅ Bot se spustil!');
console.log('[BOT] Channel:', process.env.KICK_CHANNEL);
console.log('[BOT] Bot Username:', process.env.BOT_USERNAME);

// Cooldowns
const userCooldowns = new Map();
const COOLDOWN_MS = 120000; // 120 sekund

let ircSocket = null;
let ircConnected = false;

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

// IRC CONNECTION
function connectIRC() {
  console.log('[IRC] 🔌 Connecting to Kick IRC...');
  
  ircSocket = net.createConnection({
    host: 'irc.kick.com',
    port: 6667
  });

  ircSocket.on('connect', () => {
    console.log('[IRC] ✅ Connected!');
    
    // IRC Login
    ircSocket.write(`NICK ${process.env.BOT_USERNAME}\r\n`);
    ircSocket.write(`USER ${process.env.BOT_USERNAME} 0 * :${process.env.BOT_USERNAME}\r\n`);
    ircSocket.write(`PASS ${process.env.BOT_PASSWORD}\r\n`);
  });

  ircSocket.on('data', (data) => {
    const message = data.toString();
    console.log('[IRC RAW]', message);

    if (message.includes('001')) { // Connected
      console.log('[IRC] ✅ Logged in! Joining channel...');
      ircSocket.write(`JOIN #${process.env.KICK_CHANNEL}\r\n`);
      ircConnected = true;
    }

    if (message.includes('PING')) {
      const token = message.split('PING :')[1].trim();
      ircSocket.write(`PONG :${token}\r\n`);
    }
  });

  ircSocket.on('error', (error) => {
    console.error('[IRC] ❌ Error:', error.message);
    ircConnected = false;
  });

  ircSocket.on('end', () => {
    console.log('[IRC] 🔌 Disconnected');
    ircConnected = false;
    setTimeout(() => connectIRC(), 5000); // Reconnect
  });
}

// SEND CHAT MESSAGE
function sendChatMessage(message) {
  if (!ircConnected || !ircSocket) {
    console.error('[IRC] ❌ Not connected to IRC!');
    return;
  }

  const msg = `PRIVMSG #${process.env.KICK_CHANNEL} :${message}\r\n`;
  console.log('[IRC SEND]', msg);
  ircSocket.write(msg);
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

        const chatMsg = `@${username} Vyhrál jsi: ${reward}! 🎉`;
        console.log(`[CASE] ${chatMsg}`);
        
        // Send to chat
        sendChatMessage(chatMsg);
        
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

// Connect IRC on startup
setTimeout(() => connectIRC(), 2000);
