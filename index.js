require('dotenv').config();
const http = require('http');
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

console.log('[BOT] ✅ Bot se spustil!');
console.log('[BOT] Channel:', process.env.KICK_CHANNEL);
console.log('[BOT] Bot Username:', process.env.BOT_USERNAME);

// Cooldowns
const userCooldowns = new Map();
const COOLDOWN_MS = 120000; // 120 sekund

let ws = null;
let userId = null;
let channelId = null;
let chatRoomId = null;

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

// Get Channel ID from Kick API
async function getChannelInfo() {
  try {
    console.log('[API] 🔍 Getting channel info...');
    const response = await axios.get(
      `https://kick.com/api/v2/channels/${process.env.KICK_CHANNEL}`
    );
    
    const data = response.data.channel || response.data;
    channelId = data.id;
    chatRoomId = data.chatroom?.id;
    
    console.log('[API] ✅ Channel ID:', channelId);
    console.log('[API] ✅ ChatRoom ID:', chatRoomId);
    
    return { channelId, chatRoomId };
  } catch (error) {
    console.error('[API] ❌ Error getting channel info:', error.message);
    return null;
  }
}

// Connect to Kick WebSocket
async function connectWebSocket() {
  try {
    const channelInfo = await getChannelInfo();
    if (!channelInfo) {
      console.error('[WS] ❌ Could not get channel info');
      setTimeout(() => connectWebSocket(), 5000);
      return;
    }

    console.log('[WS] 🔌 Connecting to Kick WebSocket...');
    
    ws = new WebSocket('wss://ws-global.kick.com/');

    ws.on('open', () => {
      console.log('[WS] ✅ Connected to WebSocket!');
      
      // Subscribe to channel
      ws.send(JSON.stringify({
        event: 'pusher:subscribe',
        data: {
          channel: `chatrooms.${chatRoomId}.v2`
        }
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.event === 'pusher:subscription_succeeded') {
          console.log('[WS] ✅ Subscribed to chat!');
        }

        // Listen for chat messages
        if (message.event === 'App\\Events\\ChatMessageCreated') {
          const chatData = JSON.parse(message.data);
          const username = chatData.sender?.username || 'Unknown';
          const content = chatData.content || '';

          console.log(`[CHAT] ${username}: ${content}`);

          // Check for !case command
          if (content.toLowerCase().includes('!case')) {
            handleCase(username);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    ws.on('error', (error) => {
      console.error('[WS] ❌ Error:', error.message);
    });

    ws.on('close', () => {
      console.log('[WS] 🔌 Disconnected');
      setTimeout(() => connectWebSocket(), 5000);
    });
  } catch (error) {
    console.error('[WS] ❌ Connection error:', error.message);
    setTimeout(() => connectWebSocket(), 5000);
  }
}

// Handle !case command
function handleCase(username) {
  // Cooldown check
  if (userCooldowns.has(username)) {
    const expirationTime = userCooldowns.get(username) + COOLDOWN_MS;
    if (Date.now() < expirationTime) {
      const remainingMs = expirationTime - Date.now();
      console.log(`[COOLDOWN] ${username} musí čekat ${Math.ceil(remainingMs / 1000)}s`);
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
}

// Send Chat Message
function sendChatMessage(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[WS] ❌ WebSocket not connected!');
    return;
  }

  // Kick API endpoint for sending messages
  axios.post(
    `https://kick.com/api/v2/channels/${process.env.KICK_CHANNEL}/messages`,
    {
      content: message
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.KICK_CLIENT_ID}`,
        'Content-Type': 'application/json'
      }
    }
  ).then(() => {
    console.log('[API] ✅ Message sent!');
  }).catch((error) => {
    console.error('[API] ❌ Error sending message:', error.message);
  });
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
        handleCase(username);
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

// Connect WebSocket on startup
setTimeout(() => connectWebSocket(), 2000);
