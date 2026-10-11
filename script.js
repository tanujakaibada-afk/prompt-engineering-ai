const STORAGE_KEY = 'ai-assistant-chats-v1';
const MAX_HISTORY_SENT = 20;
const API_KEY = "AQ.Ab8RN6LB6BSyICxRD8LZwnOG1f5bzNzR_DVEf7E6fhSDSUe1pA "; // <-- IKKADA NEE GEMINI KEY PASTE CHEY

const $ = (id) => document.getElementById(id);
const sidebar = $('sidebar');
const overlay = $('overlay');
const historyList = $('historyList');
const welcome = $('welcome');
const messagesEl = $('messages');
const chatEl = $('chat');
const inputEl = $('input');
const sendBtn = $('sendBtn');
const chatTitle = $('chatTitle');

let chats = [];
let activeId = null;
let isLoading = false;

function loadChats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.chats)) {
      chats = saved.chats;
      activeId = saved.activeId;
    }
  } catch (e) { chats = []; }
}
function saveChats() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats, activeId })); } catch (e) {}
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function getActiveChat() { return chats.find((c) => c.id === activeId); }
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function formatMessage(text) {
  return text.split('```').map((part, i) => {
      if (i % 2 === 1) {
        const code = part.replace(/^[a-zA-Z0-9+#_-]*\n/, '');
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
      }
      let html = escapeHtml(part);
      html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
      html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/^#{1,6}\s+(.+)$/gm, '<strong>$1</strong>');
      html = html.replace(/^[-*]\s+(.+)$/gm, '• $1');
      return html.replace(/\n/g, '<br>');
    }).join('');
}
function scrollToBottom() { chatEl.scrollTop = chatEl.scrollHeight; }
function autoResize() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
}
function createMessageEl(role, content, extraClass = '') {
  const wrap = document.createElement('div');
  wrap.className = `message ${role} ${extraClass}`.trim();
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '🙂' : extraClass === 'error' ? '⚠️' : '✦';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  if (role === 'user' || extraClass === 'error') { bubble.textContent = content; } 
  else { bubble.innerHTML = formatMessage(content); }
  wrap.append(avatar, bubble);
  return wrap;
}
function renderMessages() {
  const chat = getActiveChat();
  messagesEl.innerHTML = '';
  const hasMessages = chat && chat.messages.length > 0;
  welcome.style.display = hasMessages ? 'none' : 'block';
  chatTitle.textContent = chat ? chat.title : 'New chat';
  if (hasMessages) {
    chat.messages.forEach((m) => { messagesEl.appendChild(createMessageEl(m.role === 'user' ? 'user' : 'ai', m.content)); });
  }
  scrollToBottom();
}
function renderSidebar() {
  historyList.innerHTML = '';
  const withMessages = chats.filter((c) => c.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt);
  if (withMessages.length === 0) {
    const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'No conversations yet'; historyList.appendChild(li); return;
  }
  withMessages.forEach((chat) => {
    const li = document.createElement('li'); if (chat.id === activeId) li.classList.add('active');
    const title = document.createElement('span'); title.className = 'title'; title.textContent = chat.title;
    const del = document.createElement('button'); del.className = 'del'; del.textContent = '✕'; del.title = 'Delete chat';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteChat(chat.id); });
    li.append(title, del);
    li.addEventListener('click', () => {
      if (isLoading) return; activeId = chat.id; saveChats(); renderAll(); closeSidebar();
    });
    historyList.appendChild(li);
  });
}
function renderAll() { renderSidebar(); renderMessages(); }
function createChat() {
  const chat = { id: newId(), title: 'New chat', messages: [], updatedAt: Date.now() };
  chats.push(chat); activeId = chat.id; return chat;
}
function startNewChat() {
  if (isLoading) return;
  const current = getActiveChat();
  if (!current || current.messages.length > 0) createChat();
  saveChats(); renderAll(); closeSidebar(); inputEl.focus();
}
function deleteChat(id) {
  if (isLoading) return; chats = chats.filter((c) => c.id !== id);
  if (activeId === id) { activeId = null; startNewChat(); return; }
  saveChats(); renderAll();
}
function clearCurrentChat() {
  if (isLoading) return; const chat = getActiveChat();
  if (!chat || chat.messages.length === 0) return;
  if (!confirm('Clear all messages in this chat?')) return;
  chat.messages = []; chat.title = 'New chat'; saveChats(); renderAll();
}
function deleteAllChats() {
  if (isLoading) return; if (!confirm('Delete ALL saved chats?')) return;
  chats = []; activeId = null; createChat(); saveChats(); renderAll(); closeSidebar();
}
function setLoading(state) { isLoading = state; sendBtn.disabled = state; inputEl.disabled = state; if (!state) inputEl.focus(); }
function showTyping() {
  const wrap = document.createElement('div'); wrap.className = 'message ai'; wrap.id = 'typingIndicator';
  wrap.innerHTML = '<div class="avatar">✦</div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
  messagesEl.appendChild(wrap); scrollToBottom();
}
function hideTyping() { const el = $('typingIndicator'); if (el) el.remove(); }

async function sendMessage(text) {
  text = (text || '').trim();
  if (!text || isLoading) return;
  let chat = getActiveChat();
  if (!chat) chat = createChat();
  chat.messages.push({ role: 'user', content: text });
  if (chat.title === 'New chat') { chat.title = text.slice(0, 32); }
  chat.updatedAt = Date.now();
  saveChats();
  inputEl.value = ''; autoResize(); renderAll(); setLoading(true); showTyping();

  try {
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
    });
    const data = await response.json();
    hideTyping();
    if (!response.ok) { throw new Error(data.error ? data.error.message : 'API Error'); }
    const reply = data.candidates[0].content.parts[0].text;
    chat.messages.push({ role: 'assistant', content: reply });
    chat.updatedAt = Date.now(); saveChats(); renderAll();
  } catch (err) {
    hideTyping();
    messagesEl.appendChild(createMessageEl('ai', 'Error: ' + err.message, 'error'));
    scrollToBottom();
  } finally { setLoading(false); }
}
function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }
sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(inputEl.value); }
});
inputEl.addEventListener('input', autoResize);
document.querySelectorAll('.prompt-card').forEach((btn) => {
  btn.addEventListener('click', () => sendMessage(btn.dataset.prompt));
});
$('newChatBtn').addEventListener('click', startNewChat);
$('clearChatBtn').addEventListener('click', clearCurrentChat);
$('deleteAllBtn').addEventListener('click', deleteAllChats);
$('menuBtn').addEventListener('click', openSidebar);
overlay.addEventListener('click', closeSidebar);
loadChats();
if (!getActiveChat()) {
  const latest = [...chats].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (latest) activeId = latest.id; else createChat();
}
saveChats(); renderAll(); inputEl.focus();