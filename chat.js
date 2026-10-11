// api/chat.js
// Server-side AI endpoint. On Vercel this file automatically becomes POST /api/chat.
// Locally, server.js mounts the very same function, so behaviour is identical.
// The API key is read ONLY from the OPENAI_API_KEY environment variable.

import OpenAI from 'openai';

// ---------- Settings ----------
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_MESSAGES = 20;          // how many past messages we accept per request
const MAX_MESSAGE_LENGTH = 4000;  // characters per message
const MAX_OUTPUT_TOKENS = 1000;   // cap on the length of the AI reply
const RATE_LIMIT_MAX = 15;        // requests allowed ...
const RATE_LIMIT_WINDOW_MS = 60_000; // ... per minute per IP

const SYSTEM_INSTRUCTIONS =
  'You are "Your AI Assistant", a helpful, friendly and accurate AI assistant. ' +
  'Give clear, well-structured answers. Use short paragraphs, simple language for ' +
  'beginners, and put code inside triple-backtick code blocks. If you are not sure ' +
  'about something, say so honestly.';

// ---------- Basic in-memory rate limiter ----------
// Note: on serverless platforms each instance has its own memory, so this is a
// simple first line of defence, not a perfect global limit.
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Tidy up old entries so the Map doesn't grow forever
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > RATE_LIMIT_MAX;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

// ---------- Input validation ----------
function validateMessages(body) {
  if (!body || !Array.isArray(body.messages)) {
    return { error: 'Request must include a "messages" array.' };
  }
  if (body.messages.length === 0) {
    return { error: 'Please type a message first.' };
  }
  if (body.messages.length > MAX_MESSAGES) {
    return { error: `Too many messages in one request (max ${MAX_MESSAGES}).` };
  }

  const clean = [];
  for (const m of body.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return { error: 'Each message needs a valid role and text content.' };
    }
    const content = m.content.trim();
    if (!content) return { error: 'Messages cannot be empty.' };
    if (content.length > MAX_MESSAGE_LENGTH) {
      return { error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` };
    }
    clean.push({ role: m.role, content });
  }

  if (clean[clean.length - 1].role !== 'user') {
    return { error: 'The last message must come from the user.' };
  }
  return { messages: clean };
}

// ---------- The handler ----------
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 1. Is the API key configured?
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      code: 'missing_api_key',
      error:
        'The AI is not configured yet. Add your OPENAI_API_KEY to a local .env file ' +
        '(or to Vercel Environment Variables) and restart/redeploy. See the README.'
    });
  }

  // 2. Rate limit
  if (isRateLimited(getClientIp(req))) {
    return res.status(429).json({
      error: 'You are sending messages too quickly. Please wait a minute and try again.'
    });
  }

  // 3. Validate input
  const { messages, error } = validateMessages(req.body);
  if (error) return res.status(400).json({ error });

  // 4. Call the OpenAI Responses API (server-side only)
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: MODEL,
      instructions: SYSTEM_INSTRUCTIONS,
      input: messages,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false
    });

    const reply = (response.output_text || '').trim();
    if (!reply) {
      return res.status(502).json({ error: 'The AI returned an empty answer. Please try again.' });
    }
    return res.status(200).json({ reply });
  } catch (err) {
    // Log details on the server only; never send raw errors to the browser.
    console.error('OpenAI error:', err?.status, err?.code, err?.message);

    if (err?.status === 401) {
      return res.status(500).json({
        error: 'The server API key was rejected. Please check OPENAI_API_KEY.'
      });
    }
    if (err?.status === 429) {
      return res.status(429).json({
        error: 'The AI service is busy or the usage quota has been reached. Please try again later.'
      });
    }
    if (err?.status === 404) {
      return res.status(500).json({
        error: 'The configured AI model was not found. Check OPENAI_MODEL.'
      });
    }
    return res.status(500).json({ error: 'Something went wrong while contacting the AI. Please try again.' });
  }
}
