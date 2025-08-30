require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

const app = express();
app.use(bodyParser.json());

// webhook verify
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// webhook receive
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      for (const ev of entry.messaging) {
        const psid = ev.sender.id;
        if (ev.message?.text) {
          const msg = ev.message.text.trim().toLowerCase();
          if (msg === 'check ip' || msg === '/checkip') {
            const link = `${getBaseUrl(req)}/getip?uid=${psid}`;
            await sendMsg(psid, { text: `Bấm link để xem IP: ${link}` });
          } else {
            await sendMsg(psid, { text: `Bạn vừa gõ: ${ev.message.text}` });
          }
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// route getip
app.get('/getip', (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0];
  res.send(`<h3>IP của bạn: ${ip}</h3>`);
});

// helper
function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['host'];
  return `${proto}://${host}`;
}

async function sendMsg(psid, message) {
  const url = `https://graph.facebook.com/v16.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: psid }, message })
  });
}

app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
