/**
 * ==========================================
 * Firebase config (PASTE YOUR KEYS HERE)
 * ==========================================
 */
const firebaseConfig = {
  apiKey: "AIzaSyDj26Y-4-3F09e8nU2A5fTfpEstuaJzMIo",
  authDomain: "cyber-hub-34426.firebaseapp.com",
  databaseURL: "https://cyber-hub-34426-default-rtdb.firebaseio.com",
  projectId: "cyber-hub-34426",
  storageBucket: "cyber-hub-34426.firebasestorage.app",
  messagingSenderId: "910738985731",
  appId: "1:910738985731:web:dd347a7cc54dd56f824f36",
  measurementId: "G-74X78474MF"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  onChildAdded,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

/* =========================
   Init
========================= */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* =========================
   Constants / Subjects
========================= */
const SUBJECTS = [
  "Bangla-1",
  "English-1",
  "Math-1",
  "Physics-1",
  "Basic Electricity",
  "Computer Application",
  "Engineering Drawing",
];

const LS = {
  userId: "portalUserId",
  displayName: "displayName",
  ownerAuthed: "ownerAuthed",
  ownerAnonChat: "ownerAnonChat",
};

const OWNER_PASSWORD = "/login LianAdmin5570"; // exact match required

const COMPLETED_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const attemptedDeletes = new Set(); // best-effort client-side cleanup

/* =========================
   Helpers
========================= */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function now() {
  return Date.now();
}

function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "u_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function formatDT(ts) {
  const d = new Date(Number(ts) || Date.now());
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function badgeHtml(text, cls = "gray") {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

function setHidden(el, hidden) {
  el.classList.toggle("hidden", !!hidden);
}

/* =========================
   DOM Refs
========================= */
const backBtn = document.getElementById("backBtn");
const chatFab = document.getElementById("chatFab");

const viewsRoot = document.getElementById("viewsRoot");
const viewEls = Array.from(document.querySelectorAll(".view"));
const displayNameLabel = document.getElementById("displayNameLabel");
const changeNameBtn = document.getElementById("changeNameBtn");

// Home buttons
const goAssignmentsBtn = document.getElementById("goAssignments");
const goContactBtn = document.getElementById("goContact");
const goApplyBtn = document.getElementById("goApply");
const ownerLoginBtn = document.getElementById("ownerLoginBtn");

// Name modal
const nameModal = document.getElementById("nameModal");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");

// Assignments view
const subjectsContainer = document.getElementById("subjectsContainer");

// Contact view
const contactText = document.getElementById("contactText");
const saveContactBtn = document.getElementById("saveContactBtn");
const yourRequestBox = document.getElementById("yourRequestBox");
const loadRequestToEditorBtn = document.getElementById("loadRequestToEditorBtn");

// Apply view
const applyForm = document.getElementById("applyForm");
const fullNameEl = document.getElementById("fullName");
const rollNumberEl = document.getElementById("rollNumber");
const mobileNumberEl = document.getElementById("mobileNumber");
const whyAdminEl = document.getElementById("whyAdmin");
const applyStatusEl = document.getElementById("applyStatus");

// Owner view
const logoutOwnerBtn = document.getElementById("logoutOwnerBtn");
const ownerAnonToggle = document.getElementById("ownerAnonToggle");
const ownerAssignmentsList = document.getElementById("ownerAssignmentsList");
const ownerApplicationsList = document.getElementById("ownerApplicationsList");
const ownerContactsList = document.getElementById("ownerContactsList");
const ownerTabs = Array.from(document.querySelectorAll(".tab[data-owner-tab]"));
const ownerTabPanels = Array.from(document.querySelectorAll(".owner-tab[data-owner-tab-panel]"));

const addAssignmentBtn = document.getElementById("addAssignmentBtn");

// Assignment modal
const assignmentModal = document.getElementById("assignmentModal");
const closeAssignmentModalBtn = document.getElementById("closeAssignmentModalBtn");
const assignmentForm = document.getElementById("assignmentForm");
const assignmentEditId = document.getElementById("assignmentEditId");
const assignmentSubject = document.getElementById("assignmentSubject");
const assignmentStatus = document.getElementById("assignmentStatus");
const assignmentTitle = document.getElementById("assignmentTitle");
const assignmentDetails = document.getElementById("assignmentDetails");
const assignmentCompleted = document.getElementById("assignmentCompleted");
const assignmentModalHint = document.getElementById("assignmentModalHint");

// Chat overlay
const chatOverlay = document.getElementById("chatOverlay");
const chatBackdrop = document.getElementById("chatBackdrop");
const closeChatBtn = document.getElementById("closeChatBtn");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatOwnerHint = document.getElementById("chatOwnerHint");

/* =========================
   Identity
========================= */
let userId = (localStorage.getItem(LS.userId) || "").trim();
if (!userId) {
  userId = safeUUID();
  localStorage.setItem(LS.userId, userId);
}

let displayName = (localStorage.getItem(LS.displayName) || "").trim();
let isOwner = localStorage.getItem(LS.ownerAuthed) === "1";
let ownerAnonChat = localStorage.getItem(LS.ownerAnonChat) === "1";
ownerAnonToggle.checked = ownerAnonChat;

/* =========================
   Navigation (multi-view)
========================= */
let navStack = ["home"];

function setActiveView(viewName, { pushToStack = true } = {}) {
  // Animate via .active toggle
  for (const v of viewEls) v.classList.toggle("active", v.dataset.view === viewName);

  if (pushToStack) {
    const last = navStack[navStack.length - 1];
    if (last !== viewName) navStack.push(viewName);
  }

  // Back button visible on sub-pages
  setHidden(backBtn, viewName === "home");

  // If opening owner view without auth, bounce home
  if (viewName === "owner" && !isOwner) {
    navStack = ["home"];
    setActiveView("home", { pushToStack: false });
    return;
  }

  // Small UX: focus appropriate element
  if (viewName === "contact") contactText?.focus();
  if (viewName === "assignments") {
    // no-op
  }
}

function goBack() {
  if (navStack.length <= 1) return;
  navStack.pop();
  const prev = navStack[navStack.length - 1] || "home";
  setActiveView(prev, { pushToStack: false });
}

backBtn.addEventListener("click", goBack);

// Home routing
goAssignmentsBtn.addEventListener("click", () => setActiveView("assignments"));
goContactBtn.addEventListener("click", () => setActiveView("contact"));
goApplyBtn.addEventListener("click", () => setActiveView("apply"));

ownerLoginBtn.addEventListener("click", () => {
  if (isOwner) {
    setActiveView("owner");
    return;
  }
  const entered = prompt("Owner Login Password:");
  if (entered === null) return;
  if (entered !== OWNER_PASSWORD) {
    alert("Incorrect password.");
    return;
  }
  isOwner = true;
  localStorage.setItem(LS.ownerAuthed, "1");
  setActiveView("owner");
  refreshOwnerUIVisibility();
});

/* =========================
   Name Modal
========================= */
function openNameModal() {
  nameModal.classList.remove("hidden");
  setTimeout(() => {
    nameInput.value = displayName || "";
    nameInput.focus();
    nameInput.select();
  }, 0);
}
function closeNameModal() {
  nameModal.classList.add("hidden");
}
function setDisplayName(name) {
  displayName = String(name || "").trim();
  localStorage.setItem(LS.displayName, displayName);
  displayNameLabel.textContent = displayName || "—";
}

if (!displayName) openNameModal();
setDisplayName(displayName);

nameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const n = nameInput.value.trim();
  if (!n) return;
  setDisplayName(n);
  closeNameModal();
});

changeNameBtn.addEventListener("click", openNameModal);

/* =========================
   Chat Overlay
========================= */
function openChat() {
  chatOverlay.classList.remove("hidden");
  chatOverlay.classList.add("open");
  chatOverlay.setAttribute("aria-hidden", "false");
  setTimeout(() => chatInput.focus(), 0);
}
function closeChat() {
  chatOverlay.classList.remove("open");
  chatOverlay.setAttribute("aria-hidden", "true");
  // wait for transition, then hide
  setTimeout(() => chatOverlay.classList.add("hidden"), 220);
}

chatFab.addEventListener("click", openChat);
closeChatBtn.addEventListener("click", closeChat);
chatBackdrop.addEventListener("click", closeChat);

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendChatMessage({ name, message, timestamp, role } = {}) {
  const sender = String(name || "Anonymous").trim();
  const text = String(message || "").trim();
  const ts = Number(timestamp) || Date.now();
  const isOwn = sender && displayName && sender === displayName && role !== "owner";

  const wrap = document.createElement("div");
  wrap.className = "msg" + (isOwn ? " own" : "");

  const row = document.createElement("div");
  row.className = "msg-row";

  const nameEl = document.createElement("div");
  nameEl.className = "msg-name";
  nameEl.textContent = sender || "Anonymous";

  if (role === "owner") {
    const chip = document.createElement("span");
    chip.className = "owner-chip";
    chip.textContent = "Owner";
    nameEl.appendChild(chip);
  }

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  row.appendChild(nameEl);
  row.appendChild(timeEl);

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  wrap.appendChild(row);
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  scrollChatToBottom();
}

/* Firebase chat wiring */
const chatRef = ref(db, "chat/messages");
onChildAdded(chatRef, (snap) => {
  const val = snap.val();
  if (!val) return;
  appendChatMessage(val);
});

async function sendChatMessage() {
  if (!displayName) {
    openNameModal();
    return;
  }
  const msg = chatInput.value.trim();
  if (!msg) return;

  const payload = {
    name: isOwner && ownerAnonChat ? "Owner" : displayName,
    message: msg,
    timestamp: now(),
    role: isOwner && ownerAnonChat ? "owner" : "user",
  };

  chatInput.value = "";
  chatInput.focus();

  try {
    await push(chatRef, payload);
  } catch (e) {
    console.error(e);
    alert("Failed to send chat message. Check Firebase config/rules.");
  }
}

chatSendBtn.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendChatMessage();
  }
});

/* =========================
   Assignments (subject-wise)
   DB: assignments/{subject}/{assignmentId}
========================= */
const assignmentsRootRef = ref(db, "assignments");
let latestAssignmentsSnapshot = null;

function normalizeAssignmentsData(raw) {
  // raw: {subject: {id: {...}}}
  const out = {};
  for (const s of SUBJECTS) out[s] = raw?.[s] || {};
  return out;
}

async function cleanupExpiredCompleted(assignmentsBySubject) {
  const cutoff = now() - COMPLETED_TTL_MS;

  for (const subject of SUBJECTS) {
    const items = assignmentsBySubject?.[subject] || {};
    for (const [id, a] of Object.entries(items)) {
      if (!a) continue;

      const completed = !!a.completed;
      const completedAt = Number(a.completedAt) || 0;
      if (!completed) continue;

      // If completedAt missing, try to set it once (best effort)
      if (!completedAt) {
        const key = `setCompletedAt:${subject}:${id}`;
        if (!attemptedDeletes.has(key)) {
          attemptedDeletes.add(key);
          try {
            await update(ref(db, `assignments/${subject}/${id}`), { completedAt: Number(a.updatedAt) || Number(a.createdAt) || now() });
          } catch (e) {
            // ignore
          }
        }
        continue;
      }

      if (completedAt < cutoff) {
        const delKey = `del:${subject}:${id}`;
        if (attemptedDeletes.has(delKey)) continue;
        attemptedDeletes.add(delKey);
        try {
          await remove(ref(db, `assignments/${subject}/${id}`));
        } catch (e) {
          // If rules don't allow, it won't delete. (True auto-delete normally needs backend.)
          // We'll silently ignore.
        }
      }
    }
  }
}

function statusForSubject(itemsObj) {
  const items = Object.entries(itemsObj || {}).map(([id, v]) => ({ id, ...v }));
  if (items.length === 0) return { label: "no assignment or hw", badge: "gray" };

  items.sort((a, b) => (Number(b.updatedAt || b.createdAt) || 0) - (Number(a.updatedAt || a.createdAt) || 0));
  const latest = items[0];

  if (latest.completed) return { label: "completed", badge: "green" };
  if ((latest.status || "").toLowerCase() === "underwork") return { label: "underwork", badge: "underwork" };
  return { label: "posted", badge: "gray" };
}

function renderAssignmentsView(assignmentsBySubject) {
  subjectsContainer.innerHTML = "";

  for (const subject of SUBJECTS) {
    const itemsObj = assignmentsBySubject?.[subject] || {};
    const items = Object.entries(itemsObj).map(([id, v]) => ({ id, ...v }));

    items.sort((a, b) => (Number(b.updatedAt || b.createdAt) || 0) - (Number(a.updatedAt || a.createdAt) || 0));

    const { label, badge } = statusForSubject(itemsObj);

    const section = document.createElement("section");
    section.className = "subject";

    const head = document.createElement("div");
    head.className = "subject-head";
    head.innerHTML = `
      <div class="subject-name">${escapeHtml(subject)}</div>
      <div class="subject-status">
        ${badgeHtml(label, badge === "underwork" ? "underwork" : badge)}
      </div>
    `;

    const body = document.createElement("div");
    body.className = "subject-body";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "assignment";
      empty.innerHTML = `
        <div class="assignment-top">
          <div class="assignment-title">No assignment or hw</div>
          <div class="assignment-meta">—</div>
        </div>
        <p class="assignment-details muted">Nothing posted for this subject yet.</p>
      `;
      body.appendChild(empty);
    } else {
      // show up to latest 4 items for a clean portal feel
      const show = items.slice(0, 4);

      for (const a of show) {
        const title = String(a.title || "Untitled").trim();
        const details = String(a.details || "").trim();
        const ts = Number(a.updatedAt || a.createdAt) || now();
        const status = String(a.status || "posted").toLowerCase();
        const completed = !!a.completed;
        const completedAt = Number(a.completedAt) || 0;

        const flags = [];
        if (completed) flags.push(badgeHtml("✓ completed", "green"));
        else if (status === "underwork") flags.push(badgeHtml("underwork", "underwork"));
        else flags.push(badgeHtml("posted", "gray"));

        if (completed && completedAt) {
          const remaining = Math.max(0, COMPLETED_TTL_MS - (now() - completedAt));
          const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
          flags.push(badgeHtml(`auto delete ~${days}d`, "gray"));
        }

        const card = document.createElement("div");
        card.className = "assignment";
        card.innerHTML = `
          <div class="assignment-top">
            <div class="assignment-title">${escapeHtml(title)}</div>
            <div class="assignment-meta">${escapeHtml(formatDT(ts))}</div>
          </div>
          <div class="assignment-flags">${flags.join("")}</div>
          <p class="assignment-details">${escapeHtml(details || (status === "underwork" ? "underwork" : "—"))}</p>
        `;
        body.appendChild(card);
      }
    }

    section.appendChild(head);
    section.appendChild(body);
    subjectsContainer.appendChild(section);
  }
}

/* Owner list render */
function renderOwnerAssignments(assignmentsBySubject) {
  if (!isOwner) {
    ownerAssignmentsList.textContent = "Login as owner to manage assignments.";
    return;
  }

  const blocks = [];

  for (const subject of SUBJECTS) {
    const itemsObj = assignmentsBySubject?.[subject] || {};
    const items = Object.entries(itemsObj).map(([id, v]) => ({ id, ...v }));
    items.sort((a, b) => (Number(b.updatedAt || b.createdAt) || 0) - (Number(a.updatedAt || a.createdAt) || 0));

    blocks.push(`<div class="muted small" style="margin-top:6px">${escapeHtml(subject)}</div>`);

    if (items.length === 0) {
      blocks.push(`<div class="owner-item"><div class="muted">No items.</div></div>`);
      continue;
    }

    for (const a of items) {
      const title = String(a.title || "Untitled").trim();
      const ts = Number(a.updatedAt || a.createdAt) || now();
      const status = String(a.status || "posted").toLowerCase();
      const completed = !!a.completed;

      blocks.push(`
        <div class="owner-item" data-subject="${escapeHtml(subject)}" data-id="${escapeHtml(a.id)}">
          <div class="owner-item-head">
            <div class="owner-item-title">${escapeHtml(title)}</div>
            <div class="owner-item-meta">${escapeHtml(formatDT(ts))}</div>
          </div>

          <div class="assignment-flags">
            ${completed ? badgeHtml("✓ completed", "green") : (status === "underwork" ? badgeHtml("underwork", "underwork") : badgeHtml("posted", "gray"))}
          </div>

          <div class="owner-item-actions">
            <button class="btn btn-invert" type="button" data-action="edit">Edit</button>
            <button class="btn btn-invert" type="button" data-action="toggleCompleted">
              ${completed ? "Unmark Completed" : "Mark Completed"}
            </button>
            <button class="btn" type="button" data-action="delete">Delete</button>
          </div>
        </div>
      `);
    }
  }

  ownerAssignmentsList.innerHTML = blocks.join("");

  // delegate click actions
  ownerAssignmentsList.querySelectorAll(".owner-item [data-action]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const itemEl = e.target.closest(".owner-item");
      const subject = itemEl?.getAttribute("data-subject");
      const id = itemEl?.getAttribute("data-id");
      const action = e.target.getAttribute("data-action");
      if (!subject || !id) return;

      if (action === "edit") {
        const a = latestAssignmentsSnapshot?.[subject]?.[id];
        openAssignmentModal({ subject, id, data: a });
      }

      if (action === "toggleCompleted") {
        const a = latestAssignmentsSnapshot?.[subject]?.[id] || {};
        const next = !a.completed;
        const patch = next
          ? { completed: true, completedAt: now(), updatedAt: now() }
          : { completed: false, completedAt: null, updatedAt: now() };

        try {
          await update(ref(db, `assignments/${subject}/${id}`), patch);
        } catch (err) {
          console.error(err);
          alert("Failed to update. Check Firebase rules.");
        }
      }

      if (action === "delete") {
        const ok = confirm(`Delete this assignment?\n\n${subject} / ${id}`);
        if (!ok) return;
        try {
          await remove(ref(db, `assignments/${subject}/${id}`));
        } catch (err) {
          console.error(err);
          alert("Failed to delete. Check Firebase rules.");
        }
      }
    });
  });
}

/* Main assignments listener */
onValue(assignmentsRootRef, async (snap) => {
  const data = normalizeAssignmentsData(snap.val() || {});
  latestAssignmentsSnapshot = data;

  renderAssignmentsView(data);
  renderOwnerAssignments(data);

  // best-effort cleanup for completed items older than 3 days
  cleanupExpiredCompleted(data);
});

/* =========================
   Contact with Admin (private per userId)
   DB: contactRequests/{userId}
========================= */
const contactRef = ref(db, `contactRequests/${userId}`);
let yourRequestCache = null;

onValue(contactRef, (snap) => {
  const v = snap.val();
  yourRequestCache = v;
  if (!v || !v.text) {
    yourRequestBox.textContent = "No request submitted yet.";
    yourRequestBox.classList.add("muted");
  } else {
    yourRequestBox.textContent = v.text;
    yourRequestBox.classList.remove("muted");
  }
});

saveContactBtn.addEventListener("click", async () => {
  if (!displayName) {
    openNameModal();
    return;
  }
  const text = contactText.value.trim();
  if (!text) {
    alert("Please write a message first.");
    return;
  }

  const payload = {
    userId,
    name: displayName,
    text,
    updatedAt: now(),
  };

  try {
    await set(contactRef, payload);
  } catch (e) {
    console.error(e);
    alert("Failed to send. Check Firebase config/rules.");
  }
});

loadRequestToEditorBtn.addEventListener("click", () => {
  const txt = (yourRequestCache?.text || "").trim();
  if (!txt) return;
  contactText.value = txt;
  contactText.focus();
});

/* =========================
   Apply for Admin
   DB: adminApplications/{pushId}
========================= */
const applicationsRef = ref(db, "adminApplications");

applyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!displayName) {
    openNameModal();
    return;
  }

  const payload = {
    userId,
    displayName,
    fullName: fullNameEl.value.trim(),
    rollNumber: rollNumberEl.value.trim(),
    mobileNumber: mobileNumberEl.value.trim(),
    reason: whyAdminEl.value.trim(),
    timestamp: now(),
  };

  if (!payload.fullName || !payload.rollNumber || !payload.mobileNumber || !payload.reason) return;

  applyStatusEl.textContent = "Submitting…";

  try {
    await push(applicationsRef, payload);
    applyStatusEl.textContent = "Submitted successfully.";
    applyForm.reset();
  } catch (err) {
    console.error(err);
    applyStatusEl.textContent = "Failed to submit. Check Firebase rules/config.";
  }
});

/* =========================
   Owner panel: tabs + data
========================= */
function setOwnerTab(tabName) {
  ownerTabs.forEach((t) => t.classList.toggle("active", t.dataset.ownerTab === tabName));
  ownerTabPanels.forEach((p) => p.classList.toggle("active", p.dataset.ownerTabPanel === tabName));
}

ownerTabs.forEach((t) => {
  t.addEventListener("click", () => setOwnerTab(t.dataset.ownerTab));
});

logoutOwnerBtn.addEventListener("click", () => {
  isOwner = false;
  localStorage.removeItem(LS.ownerAuthed);
  setActiveView("home");
  refreshOwnerUIVisibility();
});

/* Owner anonymous chat toggle */
ownerAnonToggle.addEventListener("change", () => {
  ownerAnonChat = ownerAnonToggle.checked;
  localStorage.setItem(LS.ownerAnonChat, ownerAnonChat ? "1" : "0");
});

/* Owner data listeners */
const ownerApplicationsRef = ref(db, "adminApplications");
const ownerContactsRef = ref(db, "contactRequests");

onValue(ownerApplicationsRef, (snap) => {
  if (!isOwner) {
    ownerApplicationsList.textContent = "Login as owner to view submissions.";
    return;
  }
  const data = snap.val() || {};
  const items = Object.entries(data).map(([id, v]) => ({ id, ...v }));
  items.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

  if (items.length === 0) {
    ownerApplicationsList.innerHTML = `<div class="owner-item"><div class="muted">No applications yet.</div></div>`;
    return;
  }

  ownerApplicationsList.innerHTML = items.map((a) => `
    <div class="owner-item">
      <div class="owner-item-head">
        <div class="owner-item-title">${escapeHtml(a.fullName || "—")}</div>
        <div class="owner-item-meta">${escapeHtml(formatDT(a.timestamp))}</div>
      </div>
      <div class="muted small">
        <div><span class="mono">Display:</span> ${escapeHtml(a.displayName || "—")}</div>
        <div><span class="mono">Roll:</span> ${escapeHtml(a.rollNumber || "—")}</div>
        <div><span class="mono">Mobile:</span> ${escapeHtml(a.mobileNumber || "—")}</div>
        <div style="margin-top:8px;"><span class="mono">Reason:</span></div>
        <div class="request-box" style="margin-top:6px;">${escapeHtml(a.reason || "")}</div>
      </div>
    </div>
  `).join("");
});

onValue(ownerContactsRef, (snap) => {
  if (!isOwner) {
    ownerContactsList.textContent = "Login as owner to view contact requests.";
    return;
  }
  const data = snap.val() || {};
  const items = Object.entries(data).map(([id, v]) => ({ id, ...v }));
  items.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));

  if (items.length === 0) {
    ownerContactsList.innerHTML = `<div class="owner-item"><div class="muted">No contact requests yet.</div></div>`;
    return;
  }

  ownerContactsList.innerHTML = items.map((r) => `
    <div class="owner-item">
      <div class="owner-item-head">
        <div class="owner-item-title">${escapeHtml(r.name || "Anonymous")}</div>
        <div class="owner-item-meta">${escapeHtml(formatDT(r.updatedAt))}</div>
      </div>
      <div class="muted small"><span class="mono">UserId:</span> ${escapeHtml(r.userId || id)}</div>
      <div class="request-box" style="margin-top:8px;">${escapeHtml(r.text || "")}</div>
    </div>
  `).join("");
});

/* =========================
   Owner: Add/Edit Assignment Modal
========================= */
function openAssignmentModal({ subject, id, data } = {}) {
  assignmentModal.classList.remove("hidden");

  const isEdit = !!id;
  assignmentEditId.value = id || "";
  assignmentSubject.value = subject || "Bangla-1";
  assignmentStatus.value = (data?.status || "posted").toLowerCase();
  assignmentTitle.value = data?.title || "";
  assignmentDetails.value = data?.details || "";
  assignmentCompleted.checked = !!data?.completed;

  document.getElementById("assignmentModalTitle").textContent = isEdit ? "Edit Assignment" : "Add Assignment";
  assignmentModalHint.textContent = isEdit
    ? `Editing: ${subject} / ${id}`
    : "Creating a new assignment item.";

  setTimeout(() => assignmentTitle.focus(), 0);
}

function closeAssignmentModal() {
  assignmentModal.classList.add("hidden");
  assignmentForm.reset();
  assignmentEditId.value = "";
  assignmentModalHint.textContent = "";
}

closeAssignmentModalBtn.addEventListener("click", closeAssignmentModal);

addAssignmentBtn.addEventListener("click", () => {
  if (!isOwner) return alert("Owner only.");
  openAssignmentModal({ subject: "Bangla-1" });
});

assignmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isOwner) return alert("Owner only.");

  const subject = assignmentSubject.value;
  const id = assignmentEditId.value.trim();
  const payload = {
    subject,
    status: assignmentStatus.value,
    title: assignmentTitle.value.trim(),
    details: assignmentDetails.value.trim(),
    updatedAt: now(),
    completed: !!assignmentCompleted.checked,
    completedAt: assignmentCompleted.checked ? now() : null,
  };

  if (!payload.title) return;

  try {
    if (id) {
      // edit existing
      await update(ref(db, `assignments/${subject}/${id}`), payload);
    } else {
      // create new
      const base = {
        title: payload.title,
        details: payload.details,
        status: payload.status,
        createdAt: now(),
        updatedAt: now(),
        completed: payload.completed,
        completedAt: payload.completed ? now() : null,
      };
      await push(ref(db, `assignments/${subject}`), base);
    }
    closeAssignmentModal();
  } catch (err) {
    console.error(err);
    alert("Failed to save assignment. Check Firebase rules/config.");
  }
});

/* =========================
   Owner UI visibility hints
========================= */
function refreshOwnerUIVisibility() {
  // Chat hint
  setHidden(chatOwnerHint, !isOwner);
}
refreshOwnerUIVisibility();

/* =========================
   Start view
========================= */
setActiveView("home", { pushToStack: false });

/* UX: Escape closes chat/modal */
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!chatOverlay.classList.contains("hidden")) closeChat();
    if (!assignmentModal.classList.contains("hidden")) closeAssignmentModal();
    if (!nameModal.classList.contains("hidden")) {
      // allow ESC to close only if name already set
      if (displayName) closeNameModal();
    }
  }
});
