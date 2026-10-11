// server.js
// Local development server (Express). Run with: npm run dev
// It serves the files in /public and exposes the same /api/chat endpoint that
// Vercel provides in production. (Vercel does NOT use this file.)

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import chatHandler from './api/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.all('/api/chat', chatHandler);

// Return friendly JSON for bad requests (e.g. invalid JSON body)
app.use((err, req, res, next) => {
  res.status(400).json({ error: 'Invalid request.' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.');
  }
});
