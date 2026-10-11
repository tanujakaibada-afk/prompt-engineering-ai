# ✦ Your AI Assistant — LLM-Powered AI Chatbot

A modern, responsive AI chatbot web app. Users type a question and receive a **real AI-generated answer** from a Large Language Model through the official **OpenAI JavaScript SDK** and the **Responses API**. The API key stays on the server and is never sent to the browser.

**Live demo:** _add your Vercel URL here after a successful deployment_ (e.g. `https://your-project.vercel.app`)

## Features

- Welcome page ("Your AI Assistant") with 4 suggested prompts
- Sidebar with New Chat, saved chat history and delete options
- Separate chat bubbles for user and AI, with code-block formatting
- Send button, Enter-to-send (Shift+Enter = new line), loading indicator, clear-chat button
- Chat history stored locally in the browser (`localStorage`)
- Friendly error messages (missing key, rate limit, network, API errors)
- Server-side input validation and basic per-IP rate limiting
- Dark navy + purple premium design, responsive on desktop and mobile

## Technology Stack

| Part | Technology |
|------|-----------|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend (local) | Node.js + Express |
| Backend (production) | Vercel serverless function (`api/chat.js`) |
| AI | OpenAI JS SDK (`openai`) + Responses API |
| Deployment | GitHub + Vercel |

## Project Structure

```
ai-chatbot/
├── api/
│   └── chat.js        # Serverless AI endpoint (POST /api/chat)
├── public/
│   ├── index.html     # Page structure
│   ├── style.css      # Design and responsive layout
│   └── script.js      # Chat logic, history, fetch calls
├── server.js          # Local dev server (not used by Vercel)
├── vercel.json        # Vercel function settings
├── package.json       # Dependencies and scripts
├── .env.example       # Placeholder for environment variables
├── .gitignore         # Keeps .env and node_modules out of Git
└── README.md
```

## Run Locally (VS Code)

1. Install **Node.js 18+** from https://nodejs.org and **VS Code** from https://code.visualstudio.com.
2. Open the project folder in VS Code (File → Open Folder).
3. Open the terminal (Terminal → New Terminal) and run:
   ```bash
   npm install
   ```
4. Create your environment file:
   ```bash
   cp .env.example .env        # Windows PowerShell: copy .env.example .env
   ```
5. Open `.env` and replace the placeholder with your real key from https://platform.openai.com/api-keys:
   ```
   OPENAI_API_KEY=sk-...your-real-key...
   ```
6. Start the app:
   ```bash
   npm run dev
   ```
7. Visit http://localhost:3000.

If the key is missing, the chat shows a clear configuration message instead of an answer.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: AI chatbot"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Create the empty repository on github.com first. Check that `.env` does not appear in your files on GitHub (`.gitignore` blocks it).

## Deploy to Vercel

1. Sign in at https://vercel.com with your GitHub account.
2. Click **Add New → Project** and import your repository.
3. Leave the framework preset as **Other**. No build command is needed.
4. Open **Environment Variables** and add:
   - Name: `OPENAI_API_KEY`
   - Value: your real OpenAI key
   - Environments: Production, Preview and Development
   - (Optional) `OPENAI_MODEL` to change the model.
5. Click **Deploy**.
6. Open the URL Vercel gives you and send a test message.

If you add or change environment variables after deploying, **redeploy** (Deployments → ⋯ → Redeploy) so they take effect.

## Security Notes

- The API key is read from `process.env.OPENAI_API_KEY` on the server only.
- `.env` is git-ignored; `.env.example` contains a placeholder only.
- Requests are validated (roles, length, message count) and rate limited.
- AI text is HTML-escaped before display to prevent script injection.
- Errors shown to users are generic; details are logged on the server only.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "The AI is not configured yet" | Set `OPENAI_API_KEY` (in `.env` locally, or in Vercel settings) and restart/redeploy |
| "quota" / 429 message | Check billing and usage at platform.openai.com |
| "model was not found" | Set `OPENAI_MODEL` to a model your account can use |
| `npm` not recognised | Reinstall Node.js and restart VS Code |
