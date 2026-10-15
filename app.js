/**
 * ==========================
 * 1) Paste your Firebase config here
 * ==========================
 */
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  databaseURL: "PASTE_YOUR_DATABASE_URL_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE",
};

// Firebase (Modular SDK via ES Modules CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

/** ==========================
 * Firebase init
 * ==========================
 */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/** ==========================
 * DOM
 * ==========================
 */
const chatMessagesEl = document.getElementById("chatMessages");
const messageInputEl = document.getElementById("messageInput");
const sendBtnEl = document.getElementById("sendBtn");

const assignmentsListEl = document.getElementById("assignmentsList");
const addAssignmentBtnEl = document.getElementById("addAssignmentBtn");

const nameModalEl = document.getElementById("nameModal");
const nameFormEl = document.getElementById("nameForm");
const nameInputEl = document.getElementById("nameInput");
const displayNameLabelEl = document.getElementById("displayNameLabel");
const changeNameBtnEl = document.getElementById("changeNameBtn");

/** ==========================
 * Local state
 * ==========================
 */
const LS_KEY = "displayName";
let displayName = (localStorage.getItem(LS_KEY) || "").trim();
let lastRenderedDateKey = null;

/** ==========================
 * Helpers
 * ==========================
 */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateLabel(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function scrollChatToBottom() {
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function setDisplayName(name) {
  displayName = (name || "").trim();
  localStorage.setItem(LS_KEY, displayName);
  displayNameLabelEl.textContent = displayName || "—";
}

function openNameModal() {
  nameModalEl.classList.remove("hidden");
  // Small delay so focus works reliably after display change
  setTimeout(() => {
    nameInputEl.value = displayName || "";
    nameInputEl.focus();
    nameInputEl.select();
  }, 0);
}

function closeNameModal() {
  nameModalEl.classList.add("hidden");
}

/** ==========================
 * Name prompt logic
 * ==========================
 */
if (!displayName) openNameModal();
setDisplayName(displayName);

nameFormEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const proposed = nameInputEl.value.trim();
  if (!proposed) return;
  setDisplayName(proposed);
  closeNameModal();
});

changeNameBtnEl.addEventListener("click", () => {
  openNameModal();
});

/** ==========================
 * Chat: realtime messages
 * Path: chat/messages
 * ==========================
 */
const messagesRef = ref(db, "chat/messages");

function renderDateSeparatorIfNeeded(ts) {
  const key = formatDateKey(ts);
  if (key === lastRenderedDateKey) return;

  lastRenderedDateKey = key;

  const sep = document.createElement("div");
  sep.className = "date-separator";
  sep.textContent = formatDateLabel(ts);
  chatMessagesEl.appendChild(sep);
}

function appendMessage({ name, message, timestamp }) {
  const ts = Number(timestamp) || Date.now();
  const sender = (name || "Anonymous").trim();
  const text = (message || "").trim();

  renderDateSeparatorIfNeeded(ts);

  const msgEl = document.createElement("div");
  msgEl.className = "msg" + (sender && displayName && sender === displayName ? " own" : "");

  const rowEl = document.createElement("div");
  rowEl.className = "msg-row";

  const nameEl = document.createElement("div");
  nameEl.className = "msg-name";
  nameEl.textContent = sender || "Anonymous";

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = formatTime(ts);

  rowEl.appendChild(nameEl);
  rowEl.appendChild(timeEl);

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "bubble";
  // Use textContent to avoid HTML injection
  bubbleEl.textContent = text;

  msgEl.appendChild(rowEl);
  msgEl.appendChild(bubbleEl);

  chatMessagesEl.appendChild(msgEl);
  scrollChatToBottom();
}

onChildAdded(messagesRef, (snapshot) => {
  const val = snapshot.val();
  if (!val) return;
  appendMessage(val);
});

async function sendMessage() {
  if (!displayName) {
    openNameModal();
    return;
  }

  const text = messageInputEl.value.trim();
  if (!text) return;

  const payload = {
    name: displayName,
    message: text,
    timestamp: Date.now(),
  };

  messageInputEl.value = "";
  messageInputEl.focus();

  try {
    await push(messagesRef, payload);
  } catch (err) {
    console.error("Failed to send message:", err);
    alert("Message failed to send. Check your Firebase rules/config.");
  }
}

sendBtnEl.addEventListener("click", sendMessage);
messageInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

/** ==========================
 * Assignments: realtime list
 * Path: assignments
 * ==========================
 */
const assignmentsRef = ref(db, "assignments");

function renderAssignments(items) {
  assignmentsListEl.innerHTML = "";

  const values = items ? Object.entries(items).map(([id, v]) => ({ id, ...v })) : [];
  values.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

  if (values.length === 0) {
    const empty = document.createElement("div");
    empty.className = "assignment";
    empty.innerHTML = `
      <p class="assignment-title">No announcements yet</p>
      <p class="assignment-body">When homework is posted, it will appear here automatically.</p>
      <div class="assignment-meta"><span>—</span><span>—</span></div>
    `;
    assignmentsListEl.appendChild(empty);
    return;
  }

  for (const a of values) {
    const title = (a.title || "Untitled").trim();
    const body = (a.body || "").trim();
    const author = (a.author || "Admin").trim();
    const ts = Number(a.timestamp) || Date.now();

    const card = document.createElement("div");
    card.className = "assignment";

    const titleEl = document.createElement("p");
    titleEl.className = "assignment-title";
    titleEl.textContent = title;

    const bodyEl = document.createElement("p");
    bodyEl.className = "assignment-body";
    bodyEl.textContent = body || "—";

    const metaEl = document.createElement("div");
    metaEl.className = "assignment-meta";
    metaEl.innerHTML = `
      <span>${escapeHtml(author)}</span>
      <span>${escapeHtml(new Date(ts).toLocaleString())}</span>
    `;

    card.appendChild(titleEl);
    card.appendChild(bodyEl);
    card.appendChild(metaEl);

    assignmentsListEl.appendChild(card);
  }
}

onValue(assignmentsRef, (snapshot) => {
  renderAssignments(snapshot.val());
});

/** ==========================
 * Simple Admin add button (prompt-based)
 * ==========================
 * Change this to whatever you want (or remove entirely).
 * This is NOT secure security—use Firebase rules for real protection.
 */
const ADMIN_CODE = "CHANGE_ME";

async function addAssignmentFlow() {
  const code = prompt("Admin code:");
  if (code === null) return;

  if (code !== ADMIN_CODE) {
    alert("Incorrect admin code.");
    return;
  }

  const title = (prompt("Assignment title:") || "").trim();
  if (!title) return;

  const body = (prompt("Details (optional):") || "").trim();

  const payload = {
    title,
    body,
    author: displayName || "Admin",
    timestamp: Date.now(),
  };

  try {
    await push(assignmentsRef, payload);
  } catch (err) {
    console.error("Failed to add assignment:", err);
    alert("Failed to post assignment. Check Firebase rules/config.");
  }
}

addAssignmentBtnEl.addEventListener("click", addAssignmentFlow);
