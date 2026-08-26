require('dotenv').config();
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

// Logy pro debugging
console.log('🤖 BOT STARTING...');
console.log('KICK_CLIENT_ID:', process.env.KICK_CLIENT_ID ? '✅' : '❌');
console.log('KICK_CLIENT_SECRET:', process.env.KICK_CLIENT_SECRET ? '✅' : '❌');
console.log('KICK_CHANNEL:', process.env.KICK_CHANNEL);
console.log('BOT_USERNAME:', process.env.BOT_USERNAME);

let chatRoomId = null;
let accessToken = null;

// 1️⃣ Získej Channel Info
async function getChannelInfo() {
  try {
    console.log('📡 Fetching channel info...');
    const response = await axios.get(`https://kick.com/api/v2/channels/${process.env.KICK_CHANNEL}`);
    chatRoomId = response.data.chatroom.id;
    console.log('✅ Channel ID:', response.data.id);
    console.log('✅ ChatRoom ID:', chatRoomId);
    console.log('✅ Full response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error fetching channel:', error.message);
  }
}

// 2️⃣ Získej Access Token
async function getAccessToken() {
  try {
    console.log('🔐 Getting access token...');
    const response = await axios.post('https://kick.com/api/v2/oauth/token', {
      grant_type: 'client_credentials',
      client_id: process.env.KICK_CLIENT_ID,
      client_secret: process.env.KICK_CLIENT_SECRET,
    });
    accessToken = response.data.access_token;
    console.log('✅ Access token obtained');
  } catch (error) {
    console.error('❌ Error getting token:', error.message);
  }
}

// 3️⃣ Pošli zprávu
async function sendMessage(message) {
  try {
    console.log(`📤 Sending message: ${message}`);
    const response = await axios.post(
      `https://kick.com/api/v2/channels/${process.env.KICK_CHANNEL}/messages`,
      { content: message },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Message sent!');
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
  }
}

// 4️⃣ WebSocket Connection
async function connectWebSocket() {
  try {
    console.log('🔗 Connecting to WebSocket...');
    const ws = new WebSocket('wss://ws-global.kick.com/');

    ws.on('open', () => {
      console.log('✅ WebSocket connected!');
      // Subscribe to chatroom
      const subscribe = {
        event: 'pusher:subscribe',
        data: {
          channel: `chatrooms.${chatRoomId}.v2`,
        },
      };
      ws.send(JSON.stringify(subscribe));
      console.log('📢 Subscribed to channel');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📨 Received:', JSON.stringify(message, null, 2));

        if (message.data && message.data.content) {
          const content = message.data.content;
          if (content.includes('!case')) {
            console.log('🎲 !case command detected!');
            sendMessage('@user Vyhrál jsi: 1x Ticket! 🎉');
          }
        }
      } catch (e) {
        console.log('Raw message:', data);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('⚠️ WebSocket closed');
      setTimeout(connectWebSocket, 5000);
    });
  } catch (error) {
    console.error('❌ Error connecting WebSocket:', error.message);
  }
}

// 5️⃣ Start Bot
async function startBot() {
  await getChannelInfo();
  await getAccessToken();
  await connectWebSocket();
}

// 6️⃣ Express Server
app.get('/', (req, res) => {
  res.send('✅ Bot is running!');
});

app.listen(8080, () => {
  console.log('🚀 Server running on port 8080');
  startBot();
});
