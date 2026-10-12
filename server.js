import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const userMessage = req.body.message;

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: userMessage }] }] })
  });
  const data = await r.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  res.json({ reply });
});

app.listen(3000, () => console.log('running'));
