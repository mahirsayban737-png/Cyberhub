/**
 * ===========================
 * Firebase config (PASTE KEYS)
 * ===========================
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

/**
 * SECURITY NOTE (important):
 * This app uses a per-browser generated userId (localStorage), not Firebase Auth.
 * That means real privacy/moderation MUST be enforced via Firebase Realtime Database Rules
 * and ideally Firebase Auth. Front-end-only “owner login” is not secure by itself.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  remove,
  get,
  child,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  off,
  query,
  orderByChild,
  equalTo,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* =========================
   Constants
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
  rollNumber: "rollNumberLocked",
  ownerAuthed: "ownerAuthed",
  ownerAnonChat: "ownerAnonChat",
};

const OWNER_PASSWORD = "/login LianAdmin5570"; // exact required
const COMPLETED_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/* =========================
   Helpers
========================= */
const $ = (id) => document.getElementById(id);

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
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `u_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function formatDT(ts) {
  const d = new Date(Number(ts) || Date.now());
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setHidden(el, hidden) {
  el.classList.toggle("hidden", !!hidden);
}

function threadIdFor(a, b) {
  return [a, b].sort().join("__");
}

/* Mobile keyboard layout fix: keep overlay height accurate */
function updateVVH() {
  const vv = window.visualViewport;
  if (!vv) return;
  document.documentElement.style.setProperty("--vvh", `${vv.height}px`);
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateVVH);
  window.visualViewport.addEventListener("scroll", updateVVH);
  updateVVH();
}

/* =========================
   DOM refs
========================= */
const backBtn = $("backBtn");
const chatBtn = $("chatBtn");
const displayNameLabel = $("displayNameLabel");
const changeNameBtn = $("changeNameBtn");

const viewEls = Array.from(document.querySelectorAll(".view"));
const subjectsContainer = $("subjectsContainer");

// Name modal
const nameModal = $("nameModal");
const nameForm = $("nameForm");
const nameInput = $("nameInput");

// Home nav
const goAssignmentsBtn = $("goAssignments");
const goContactBtn = $("goContact");
const goApplyBtn = $("goApply");
const ownerLoginBtn = $("ownerLoginBtn");

// Public issues
const issueInput = $("issueInput");
const issueSubmitBtn = $("issueSubmitBtn");
const issuesList = $("issuesList");

// Contact
const contactText = $("contactText");
const saveContactBtn = $("saveContactBtn");
const yourRequestBox = $("yourRequestBox");
const loadRequestToEditorBtn = $("loadRequestToEditorBtn");

// Apply
const applyForm = $("applyForm");
const fullNameEl = $("fullName");
const rollNumberApplyEl = $("rollNumberApply");
const mobileNumberEl = $("mobileNumber");
const whyAdminEl = $("whyAdmin");
const applyStatusEl = $("applyStatus");

// Owner
const logoutOwnerBtn = $("logoutOwnerBtn");
const ownerAnonToggle = $("ownerAnonToggle");
const ownerTabs = Array.from(document.querySelectorAll(".tab[data-owner-tab]"));
const ownerTabPanels = Array.from(document.querySelectorAll(".owner-tab[data-owner-tab-panel]"));

const ownerAssignmentsList = $("ownerAssignmentsList");
const ownerApplicationsList = $("ownerApplicationsList");
const ownerIssuesList = $("ownerIssuesList");
const ownerContactsList = $("ownerContactsList");
const addAssignmentBtn = $("addAssignmentBtn");

// Assignment modal
const assignmentModal = $("assignmentModal");
const closeAssignmentModalBtn = $("closeAssignmentModalBtn");
const assignmentForm = $("assignmentForm");
const assignmentEditId = $("assignmentEditId");
const assignmentSubject = $("assignmentSubject");
const assignmentStatus = $("assignmentStatus");
const assignmentTitle = $("assignmentTitle");
const assignmentDetails = $("assignmentDetails");
const assignmentCompleted = $("assignmentCompleted");
const assignmentModalHint = $("assignmentModalHint");

// Chat overlay + tabs
const chatOverlay = $("chatOverlay");
const chatBackBtn = $("chatBackBtn");
const chatSubTitle = $("chatSubTitle");
const chatTabBtns = Array.from(document.querySelectorAll(".chat-tab[data-chat-tab]"));
const chatPanels = Array.from(document.querySelectorAll(".chat-panel[data-chat-panel]"));

// Global chat
const globalMessagesEl = $("globalMessages");
const globalChatInput = $("globalChatInput");
const globalChatSendBtn = $("globalChatSendBtn");

// DM
const dmFriendsBar = $("dmFriendsBar");
const dmThreadHeader = $("dmThreadHeader");
const dmMessagesEl = $("dmMessages");
const dmInput = $("dmInput");
const dmSendBtn = $("dmSendBtn");

// Profile
const profilePanel = $("profilePanel");

/* =========================
   Identity / Session
========================= */
let userId = (localStorage.getItem(LS.userId) || "").trim();
if (!userId) {
  userId = safeUUID();
  localStorage.setItem(LS.userId, userId);
}

let displayName = (localStorage.getItem(LS.displayName) || "").trim();
let lockedRoll = (localStorage.getItem(LS.rollNumber) || "").trim();

let isOwner = localStorage.getItem(LS.ownerAuthed) === "1";
let ownerAnonChat = localStorage.getItem(LS.ownerAnonChat) === "1";
ownerAnonToggle.checked = ownerAnonChat;

/* =========================
   View navigation
========================= */
let navStack = ["home"];

function setActiveView(viewName, { pushToStack = true } = {}) {
  for (const v of viewEls) v.classList.toggle("active", v.dataset.view === viewName);

  if (pushToStack) {
    const last = navStack[navStack.length - 1];
    if (last !== viewName) navStack.push(viewName);
  }

  setHidden(backBtn, viewName === "home");

  if (viewName === "owner" && !isOwner) {
    navStack = ["home"];
    setActiveView("home", { pushToStack: false });
    return;
  }
}

function goBack() {
  if (navStack.length <= 1) return;
  navStack.pop();
  setActiveView(navStack[navStack.length - 1] || "home", { pushToStack: false });
}

backBtn.addEventListener("click", goBack);
goAssignmentsBtn?.addEventListener("click", () => setActiveView("assignments"));
goContactBtn?.addEventListener("click", () => setActiveView("contact"));
goApplyBtn?.addEventListener("click", () => setActiveView("apply"));

/* =========================
   Name modal
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
  // keep profile synced
  upsertMyUserProfile();
});

changeNameBtn.addEventListener("click", openNameModal);

/* =========================
   Owner login / logout
========================= */
ownerLoginBtn.addEventListener("click", async () => {
  if (isOwner) {
    setActiveView("owner");
    return;
  }
  const entered = prompt("Owner Login Password:");
  if (entered === null) return;
  if (entered !== OWNER_PASSWORD) return alert("Incorrect password.");

  isOwner = true;
  localStorage.setItem(LS.ownerAuthed, "1");
  setActiveView("owner");

  // Encourage owner to set roll number in Profile tab (locked once)
  if (!lockedRoll) {
    alert("Owner: Please set your roll number in Chat → Profile (it becomes locked).");
  }
});

logoutOwnerBtn.addEventListener("click", () => {
  isOwner = false;
  localStorage.removeItem(LS.ownerAuthed);
  setActiveView("home");
});

ownerAnonToggle.addEventListener("change", () => {
  ownerAnonChat = ownerAnonToggle.checked;
  localStorage.setItem(LS.ownerAnonChat, ownerAnonChat ? "1" : "0");
});

/* =========================
   Chat overlay (fullscreen + fixed/sticky compose)
========================= */
const chatState = {
  open: false,
  tab: "global",
  viewingUid: userId,       // for profile view
  activeDmUid: null,        // selected friend for DM
};

function openChat() {
  chatOverlay.classList.remove("hidden");
  chatOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("chat-open");
  chatState.open = true;
  setChatTab(chatState.tab || "global", { focus: true });
}

function closeChat() {
  chatOverlay.classList.add("hidden");
  chatOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("chat-open");
  chatState.open = false;
}

chatBtn.addEventListener("click", openChat);
chatBackBtn.addEventListener("click", closeChat);

/* Smooth switching tabs */
function setChatTab(tabName, { focus = false } = {}) {
  chatState.tab = tabName;

  chatTabBtns.forEach((b) => b.classList.toggle("active", b.dataset.chatTab === tabName));
  chatPanels.forEach((p) => p.classList.toggle("active", p.dataset.chatPanel === tabName));

  if (tabName === "global") {
    chatSubTitle.textContent = "Global room";
    if (focus) setTimeout(() => globalChatInput?.focus(), 0);
  } else if (tabName === "personal") {
    chatSubTitle.textContent = "Friends inbox";
    if (focus) setTimeout(() => dmInput?.focus(), 0);
  } else if (tabName === "profile") {
    chatSubTitle.textContent = chatState.viewingUid === userId ? "Your profile" : "User profile";
    renderProfilePanel(); // ensures up-to-date UI
  }
}

chatTabBtns.forEach((b) => b.addEventListener("click", () => setChatTab(b.dataset.chatTab, { focus: true })));

/* =========================
   Users / Profiles (public)
   DB: users/{uid}
========================= */
const usersRef = ref(db, "users");
const myUserRef = ref(db, `users/${userId}`);

async function upsertMyUserProfile() {
  // Ensure user profile exists; roll number locked after first set
  try {
    const snap = await get(myUserRef);
    const existing = snap.exists() ? snap.val() : null;

    const payload = {
      displayName: displayName || "Anonymous",
      bio: existing?.bio ?? "",
      rollNumber: existing?.rollNumber ?? (lockedRoll || ""),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };

    // Never overwrite an already stored rollNumber with a different one.
    if (existing?.rollNumber && lockedRoll && existing.rollNumber !== lockedRoll) {
      lockedRoll = existing.rollNumber;
      localStorage.setItem(LS.rollNumber, lockedRoll);
      payload.rollNumber = existing.rollNumber;
    }

    if (!snap.exists()) {
      await set(myUserRef, payload);
    } else {
      await update(myUserRef, {
        displayName: payload.displayName,
        bio: payload.bio,
        updatedAt: payload.updatedAt,
        // rollNumber only if it's empty in DB
        ...(existing?.rollNumber ? {} : { rollNumber: payload.rollNumber }),
      });
    }
  } catch (e) {
    console.warn("Profile upsert failed:", e);
  }
}

upsertMyUserProfile();

/* Profile view listeners (switchable when viewing other user) */
let profileUserCb = null;
let profileFriendsCb = null;
let profileIncomingReqCb = null;
let profileAppCb = null;

let profileDataCache = null;
let profileFriendCountCache = 0;
let incomingRequestsCache = {};
let myAdminAppCache = null;

function detachProfileListeners(uid) {
  if (!uid) return;
  if (profileUserCb) off(ref(db, `users/${uid}`), "value", profileUserCb);
  if (profileFriendsCb) off(ref(db, `friends/${uid}`), "value", profileFriendsCb);
  if (uid === userId && profileIncomingReqCb) off(ref(db, `friendRequests/${userId}`), "value", profileIncomingReqCb);
  if (uid === userId && profileAppCb) off(ref(db, `adminApplications/${userId}`), "value", profileAppCb);
  profileUserCb = profileFriendsCb = profileIncomingReqCb = profileAppCb = null;
}

function attachProfileListeners(uid) {
  detachProfileListeners(chatState.viewingUid);

  // user data
  const uref = ref(db, `users/${uid}`);
  profileUserCb = (snap) => {
    profileDataCache = snap.val() || null;
    renderProfilePanel();
  };
  onValue(uref, profileUserCb);

  // friend count
  const fref = ref(db, `friends/${uid}`);
  profileFriendsCb = (snap) => {
    const v = snap.val() || {};
    profileFriendCountCache = Object.keys(v).length;
    renderProfilePanel();
  };
  onValue(fref, profileFriendsCb);

  // if viewing self: incoming friend requests + admin app status
  if (uid === userId) {
    const reqRef = ref(db, `friendRequests/${userId}`);
    profileIncomingReqCb = (snap) => {
      incomingRequestsCache = snap.val() || {};
      renderProfilePanel();
    };
    onValue(reqRef, profileIncomingReqCb);

    const appRef = ref(db, `adminApplications/${userId}`);
    profileAppCb = (snap) => {
      myAdminAppCache = snap.val() || null;
      renderProfilePanel();
    };
    onValue(appRef, profileAppCb);
  }
}

/* =========================
   Friends & Friend Requests
   DB:
     friendRequests/{toUid}/{fromUid} = { fromUid, fromName, timestamp }
     friends/{uid}/{friendUid} = true
========================= */
async function sendFriendRequest(toUid) {
  if (!displayName) return openNameModal();
  if (toUid === userId) return;

  const reqPath = ref(db, `friendRequests/${toUid}/${userId}`);
  await set(reqPath, { fromUid: userId, fromName: displayName, timestamp: now() });
}

async function acceptFriendRequest(fromUid) {
  const updates = {};
  updates[`friends/${userId}/${fromUid}`] = true;
  updates[`friends/${fromUid}/${userId}`] = true;
  updates[`friendRequests/${userId}/${fromUid}`] = null;
  await update(ref(db), updates);
}

async function declineFriendRequest(fromUid) {
  await remove(ref(db, `friendRequests/${userId}/${fromUid}`));
}

async function areFriends(a, b) {
  const snap = await get(ref(db, `friends/${a}/${b}`));
  return snap.exists();
}

/* =========================
   Profile Panel Rendering
========================= */
function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  return s.split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase() || "").join("");
}

async function getRequestState(otherUid) {
  // friend / sent / received
  const [fSnap, sentSnap, recvSnap] = await Promise.all([
    get(ref(db, `friends/${userId}/${otherUid}`)),
    get(ref(db, `friendRequests/${otherUid}/${userId}`)),
    get(ref(db, `friendRequests/${userId}/${otherUid}`)),
  ]);
  return {
    isFriend: fSnap.exists(),
    requestSent: sentSnap.exists(),
    requestReceived: recvSnap.exists(),
  };
}

function renderProfilePanel() {
  const uid = chatState.viewingUid;
  const viewingSelf = uid === userId;

  const display = profileDataCache?.displayName || (viewingSelf ? displayName : "Unknown");
  const roll = profileDataCache?.rollNumber || "—";
  const bio = profileDataCache?.bio || "";

  // Status line for my admin application
  let appStatusHtml = "";
  if (viewingSelf) {
    const status = myAdminAppCache?.status || "not_submitted";
    const label =
      status === "pending" ? "Pending"
      : status === "accepted" ? "Accepted"
      : status === "declined" ? "Declined"
      : "Not submitted";
    appStatusHtml = `
      <div class="issue-card" style="margin-top:12px;">
        <div class="panel-title">Admin Application Status</div>
        <div class="muted small">Status: <span class="mono">${escapeHtml(label)}</span></div>
      </div>
    `;
  }

  const incomingReqHtml = viewingSelf
    ? (() => {
        const entries = Object.entries(incomingRequestsCache || {});
        if (entries.length === 0) {
          return `
            <div class="issue-card" style="margin-top:12px;">
              <div class="panel-title">Friend Requests</div>
              <div class="muted small">No incoming requests.</div>
            </div>
          `;
        }
        const cards = entries.map(([fromUid, r]) => `
          <div class="issue-card" style="margin-top:10px;">
            <div class="issue-meta">
              <div>${escapeHtml(r?.fromName || "Unknown")} <span class="muted">(${escapeHtml(fromUid)})</span></div>
              <div>${escapeHtml(formatDT(r?.timestamp))}</div>
            </div>
            <div class="row right">
              <button class="btn btn-invert" data-fr-action="decline" data-from="${escapeHtml(fromUid)}" type="button">Decline</button>
              <button class="btn" data-fr-action="accept" data-from="${escapeHtml(fromUid)}" type="button">Accept</button>
            </div>
          </div>
        `).join("");
        return `
          <div class="issue-card" style="margin-top:12px;">
            <div class="panel-title">Friend Requests</div>
            <div class="muted small">Accept or decline.</div>
          </div>
          ${cards}
        `;
      })()
    : "";

  const selfEditHtml = viewingSelf
    ? `
      <div class="profile-card">
        <div class="profile-top">
          <div>
            <div class="profile-name">${escapeHtml(display)}</div>
            <div class="profile-meta">Roll: <span class="mono">${escapeHtml(roll)}</span> · Friends: <span class="mono">${profileFriendCountCache}</span></div>
          </div>
        </div>

        <div class="profile-grid">
          <div>
            <label class="label">Display Name</label>
            <input id="profileDisplayName" class="input" type="text" maxlength="32" value="${escapeHtml(display)}" />
          </div>

          <div>
            <label class="label">Roll Number (locked after first set)</label>
            <input id="profileRoll" class="input" type="text" maxlength="20"
              value="${escapeHtml(lockedRoll || roll === "—" ? "" : roll)}"
              ${lockedRoll ? "disabled" : ""} placeholder="${lockedRoll ? "" : "Set once and lock"}" />
          </div>

          <div class="span-2">
            <label class="label">Bio</label>
            <textarea id="profileBio" class="input textarea" rows="5" maxlength="700"
              placeholder="Write something about you…">${escapeHtml(bio)}</textarea>
          </div>

          <div class="span-2 row right">
            <button id="profileSaveBtn" class="btn" type="button">Save Profile</button>
          </div>

          <div class="span-2 muted small">
            Roll number becomes permanently locked after you save it once on this device (and stored in DB).
          </div>
        </div>
      </div>
      ${appStatusHtml}
      ${incomingReqHtml}
    `
    : `
      <div class="profile-card">
        <div class="profile-top">
          <div>
            <div class="profile-name">${escapeHtml(display)}</div>
            <div class="profile-meta">Roll: <span class="mono">${escapeHtml(roll)}</span> · Friends: <span class="mono">${profileFriendCountCache}</span></div>
          </div>
          <div class="profile-actions">
            <button id="backToMyProfileBtn" class="btn btn-invert" type="button">My Profile</button>
          </div>
        </div>

        <div class="profile-bio">${escapeHtml(bio || "No bio yet.")}</div>

        <div class="profile-actions">
          <button id="sendFriendReqBtn" class="btn btn-invert" type="button">Send Friend Request</button>
          <button id="startDmBtn" class="btn" type="button">Message</button>
        </div>

        <div id="profileActionHint" class="muted small"></div>
      </div>
    `;

  profilePanel.innerHTML = selfEditHtml;

  // Bind profile interactions
  if (viewingSelf) {
    const saveBtn = $("profileSaveBtn");
    saveBtn?.addEventListener("click", async () => {
      const dn = ($("profileDisplayName")?.value || "").trim();
      const bioText = ($("profileBio")?.value || "").trim();
      const rollInput = ($("profileRoll")?.value || "").trim();

      if (!dn) return alert("Display name required.");

      // Lock roll if not already locked
      if (!lockedRoll) {
        if (!rollInput) return alert("Please set your roll number once to lock it.");
        lockedRoll = rollInput;
        localStorage.setItem(LS.rollNumber, lockedRoll);
      }

      // Update local display name
      setDisplayName(dn);

      try {
        // Never change rollNumber if already set in DB
        const snap = await get(myUserRef);
        const existingRoll = snap.val()?.rollNumber || "";
        const patch = {
          displayName: dn,
          bio: bioText,
          updatedAt: now(),
          ...(existingRoll ? {} : { rollNumber: lockedRoll }),
        };
        await update(myUserRef, patch);
        alert("Profile saved.");
        // refresh listeners
        attachProfileListeners(userId);
      } catch (e) {
        console.error(e);
        alert("Failed to save profile. Check Firebase rules.");
      }
    });

    // Friend request accept/decline buttons
    profilePanel.querySelectorAll("[data-fr-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const action = e.currentTarget.getAttribute("data-fr-action");
        const fromUid = e.currentTarget.getAttribute("data-from");
        try {
          if (action === "accept") await acceptFriendRequest(fromUid);
          if (action === "decline") await declineFriendRequest(fromUid);
        } catch (err) {
          console.error(err);
          alert("Failed. Check Firebase rules.");
        }
      });
    });
  } else {
    $("backToMyProfileBtn")?.addEventListener("click", () => {
      openProfile(userId);
    });

    const hint = $("profileActionHint");

    // Compute state for friend request buttons
    (async () => {
      try {
        const st = await getRequestState(uid);
        const sendBtn = $("sendFriendReqBtn");
        const dmBtn = $("startDmBtn");

        if (st.isFriend) {
          sendBtn.textContent = "Friends";
          sendBtn.disabled = true;
          hint.textContent = "You are friends.";
        } else if (st.requestSent) {
          sendBtn.textContent = "Request Sent";
          sendBtn.disabled = true;
          hint.textContent = "Friend request already sent.";
        } else if (st.requestReceived) {
          sendBtn.textContent = "Accept Request";
          sendBtn.disabled = false;
          hint.textContent = "This user already requested you.";
          sendBtn.onclick = async () => {
            await acceptFriendRequest(uid);
            hint.textContent = "You are now friends.";
            sendBtn.textContent = "Friends";
            sendBtn.disabled = true;
          };
        } else {
          sendBtn.disabled = false;
          sendBtn.onclick = async () => {
            await sendFriendRequest(uid);
            hint.textContent = "Friend request sent.";
            sendBtn.textContent = "Request Sent";
            sendBtn.disabled = true;
          };
        }

        dmBtn.onclick = async () => {
          const friend = await areFriends(userId, uid);
          if (!friend) return alert("You must be friends to start Personal Chat.");
          chatState.activeDmUid = uid;
          setChatTab("personal", { focus: true });
          await selectDmFriend(uid);
        };
      } catch (e) {
        console.error(e);
        hint.textContent = "Failed to load relationship state.";
      }
    })();
  }
}

function openProfile(uid) {
  chatState.viewingUid = uid;
  attachProfileListeners(uid);
  setChatTab("profile", { focus: false });
}

/* On entering profile tab initially, attach listeners for self */
attachProfileListeners(userId);

/* =========================
   GLOBAL CHAT
   DB: chat/globalMessages/{msgId}
   - clicking name opens profile
   - own messages edit/delete
   - owner can delete any message
========================= */
const globalChatRef = ref(db, "chat/globalMessages");
const globalMsgEls = new Map();

function scrollToBottom(el) {
  el.scrollTop = el.scrollHeight;
}

function canEditMessage(msg) {
  return msg?.uid === userId;
}
function canDeleteMessage(msg) {
  if (msg?.uid === userId) return true;
  return isOwner; // owner moderation: delete any global message
}

function renderGlobalMessage(key, msg) {
  const senderName = String(msg?.name || "Anonymous");
  const text = String(msg?.text || "");
  const ts = Number(msg?.timestamp) || now();
  const editedAt = Number(msg?.editedAt) || 0;
  const role = msg?.role || "user";

  const own = msg?.uid === userId && role !== "owner_anon";

  const wrap = document.createElement("div");
  wrap.className = "msg" + (own ? " own" : "");
  wrap.dataset.key = key;

  const row = document.createElement("div");
  row.className = "msg-row";

  const nameEl = document.createElement("div");
  nameEl.className = "msg-name";
  const nameBtn = document.createElement("button");
  nameBtn.type = "button";
  nameBtn.textContent = senderName;
  nameBtn.addEventListener("click", () => {
    const uid = msg?.uid;
    if (!uid) return;
    openProfile(uid);
  });
  nameEl.appendChild(nameBtn);

  if (role === "owner_anon") {
    const chip = document.createElement("span");
    chip.className = "owner-chip";
    chip.textContent = "Owner";
    nameEl.appendChild(chip);
  }

  const timeEl = document.createElement("div");
  timeEl.className = "msg-time";
  timeEl.textContent = `${new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${editedAt ? " · edited" : ""}`;

  row.appendChild(nameEl);
  row.appendChild(timeEl);

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  wrap.appendChild(row);
  wrap.appendChild(bubble);

  // Actions row
  if (canDeleteMessage(msg) || canEditMessage(msg)) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    if (canEditMessage(msg)) {
      const editBtn = document.createElement("button");
      editBtn.className = "action-btn";
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", async () => {
        const next = prompt("Edit your message:", text);
        if (next === null) return;
        const trimmed = next.trim();
        if (!trimmed) return alert("Message cannot be empty.");
        try {
          await update(ref(db, `chat/globalMessages/${key}`), { text: trimmed, editedAt: now() });
        } catch (e) {
          console.error(e);
          alert("Failed to edit message (rules/config).");
        }
      });
      actions.appendChild(editBtn);
    }

    if (canDeleteMessage(msg)) {
      const delBtn = document.createElement("button");
      delBtn.className = "action-btn";
      delBtn.type = "button";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        const ok = confirm("Delete this message?");
        if (!ok) return;
        try {
          await remove(ref(db, `chat/globalMessages/${key}`));
        } catch (e) {
          console.error(e);
          alert("Failed to delete message (rules/config).");
        }
      });
      actions.appendChild(delBtn);
    }

    wrap.appendChild(actions);
  }

  globalMsgEls.set(key, wrap);
  globalMessagesEl.appendChild(wrap);
}

onChildAdded(globalChatRef, (snap) => {
  const key = snap.key;
  const msg = snap.val();
  if (!key || !msg) return;
  renderGlobalMessage(key, msg);
  scrollToBottom(globalMessagesEl);
});

onChildChanged(globalChatRef, (snap) => {
  const key = snap.key;
  const msg = snap.val();
  const el = globalMsgEls.get(key);
  if (!key || !msg || !el) return;

  // re-render simple parts
  const bubble = el.querySelector(".msg-bubble");
  if (bubble) bubble.textContent = String(msg.text || "");

  const time = el.querySelector(".msg-time");
  const ts = Number(msg.timestamp) || now();
  const editedAt = Number(msg.editedAt) || 0;
  if (time) time.textContent = `${new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${editedAt ? " · edited" : ""}`;
});

onChildRemoved(globalChatRef, (snap) => {
  const key = snap.key;
  const el = globalMsgEls.get(key);
  if (el) el.remove();
  globalMsgEls.delete(key);
});

async function sendGlobalChat() {
  if (!displayName) return openNameModal();
  const text = globalChatInput.value.trim();
  if (!text) return;

  const payload = {
    uid: userId,
    name: isOwner && ownerAnonChat ? "Owner" : displayName,
    text,
    timestamp: now(),
    role: isOwner && ownerAnonChat ? "owner_anon" : "user",
  };

  globalChatInput.value = "";
  globalChatInput.focus();

  try {
    await push(globalChatRef, payload);
  } catch (e) {
    console.error(e);
    alert("Failed to send message. Check Firebase rules/config.");
  }
}

globalChatSendBtn.addEventListener("click", sendGlobalChat);
globalChatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendGlobalChat();
  }
});

/* =========================
   PERSONAL CHAT (Friends Inbox)
   - friends list on top
   - thread below
   DB:
     friends/{uid}/{friendUid}
     dmThreads/{threadId}/messages
========================= */
const myFriendsRef = ref(db, `friends/${userId}`);
let friendsCache = {};            // {friendUid:true}
let userCache = new Map();        // uid -> {displayName, rollNumber, bio}
let dmActiveThreadId = null;

let dmMsgAddedCb = null;
let dmMsgChangedCb = null;
let dmMsgRemovedCb = null;

function setDmPlaceholderVisible(visible) {
  dmThreadHeader.textContent = visible ? "Select a friend to start chatting." : dmThreadHeader.textContent;
}

async function fetchUser(uid) {
  if (userCache.has(uid)) return userCache.get(uid);
  const snap = await get(ref(db, `users/${uid}`));
  const v = snap.exists() ? snap.val() : { displayName: "Unknown" };
  userCache.set(uid, v);
  return v;
}

function renderFriendsBar() {
  dmFriendsBar.innerHTML = "";
  const uids = Object.keys(friendsCache || {});
  if (uids.length === 0) {
    dmFriendsBar.innerHTML = `<div class="muted small">No friends yet. Open a user profile in Global Chat to send requests.</div>`;
    return;
  }

  for (const uid of uids) {
    const chip = document.createElement("button");
    chip.className = "friend-chip" + (chatState.activeDmUid === uid ? " active" : "");
    chip.type = "button";
    chip.innerHTML = `<span class="friend-dot">?</span><span class="mono">${escapeHtml(uid.slice(0, 6))}</span>`;
    chip.addEventListener("click", () => selectDmFriend(uid));

    // fill label async
    fetchUser(uid).then((u) => {
      const dot = chip.querySelector(".friend-dot");
      if (dot) dot.textContent = initials(u.displayName);
      chip.innerHTML = `<span class="friend-dot">${escapeHtml(initials(u.displayName))}</span><span>${escapeHtml(u.displayName || "Friend")}</span>`;
      chip.classList.toggle("active", chatState.activeDmUid === uid);
    });

    dmFriendsBar.appendChild(chip);
  }
}

function detachDmListeners() {
  if (!dmActiveThreadId) return;
  const msgsRef = ref(db, `dmThreads/${dmActiveThreadId}/messages`);
  if (dmMsgAddedCb) off(msgsRef, "child_added", dmMsgAddedCb);
  if (dmMsgChangedCb) off(msgsRef, "child_changed", dmMsgChangedCb);
  if (dmMsgRemovedCb) off(msgsRef, "child_removed", dmMsgRemovedCb);
  dmMsgAddedCb = dmMsgChangedCb = dmMsgRemovedCb = null;
}

const dmMsgEls = new Map();

function renderDmMessage(key, msg) {
  const sender = String(msg?.fromName || "Unknown");
  const text = String(msg?.text || "");
  const ts = Number(msg?.timestamp) || now();
  const own = msg?.fromUid === userId;

  const wrap = document.createElement("div");
  wrap.className = "msg" + (own ? " own" : "");
  wrap.dataset.key = key;

  const row = document.createElement("div");
  row.className = "msg-row";

  const nameEl = document.createElement("div");
  nameEl.className = "msg-name";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = sender;
  btn.addEventListener("click", () => openProfile(msg?.fromUid));
  nameEl.appendChild(btn);

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

  dmMsgEls.set(key, wrap);
  dmMessagesEl.appendChild(wrap);
}

async function selectDmFriend(friendUid) {
  chatState.activeDmUid = friendUid;

  const friend = await fetchUser(friendUid);
  dmThreadHeader.textContent = `Chat with ${friend.displayName || "Friend"} (roll: ${friend.rollNumber || "—"})`;

  renderFriendsBar();

  // attach DM thread messages listener
  detachDmListeners();
  dmMsgEls.clear();
  dmMessagesEl.innerHTML = "";

  dmActiveThreadId = threadIdFor(userId, friendUid);
  const msgsRef = ref(db, `dmThreads/${dmActiveThreadId}/messages`);

  dmMsgAddedCb = (snap) => {
    const key = snap.key;
    const msg = snap.val();
    if (!key || !msg) return;
    renderDmMessage(key, msg);
    scrollToBottom(dmMessagesEl);
  };
  onChildAdded(msgsRef, dmMsgAddedCb);

  // Minimal changed/removed support
  dmMsgChangedCb = (snap) => {
    const key = snap.key;
    const msg = snap.val();
    const el = dmMsgEls.get(key);
    if (!el || !msg) return;
    const bubble = el.querySelector(".msg-bubble");
    if (bubble) bubble.textContent = msg.text || "";
  };
  onChildChanged(msgsRef, dmMsgChangedCb);

  dmMsgRemovedCb = (snap) => {
    const key = snap.key;
    const el = dmMsgEls.get(key);
    if (el) el.remove();
    dmMsgEls.delete(key);
  };
  onChildRemoved(msgsRef, dmMsgRemovedCb);
}

onValue(myFriendsRef, (snap) => {
  friendsCache = snap.val() || {};
  renderFriendsBar();
});

/* Send DM */
async function sendDm() {
  if (!displayName) return openNameModal();
  const friendUid = chatState.activeDmUid;
  if (!friendUid) return alert("Select a friend first.");
  const text = dmInput.value.trim();
  if (!text) return;

  const tId = threadIdFor(userId, friendUid);

  const msg = {
    fromUid: userId,
    fromName: displayName,
    text,
    timestamp: now(),
  };

  dmInput.value = "";
  dmInput.focus();

  try {
    await push(ref(db, `dmThreads/${tId}/messages`), msg);
    await update(ref(db, `dmThreads/${tId}`), {
      updatedAt: now(),
      lastMessage: { text, timestamp: now(), fromUid: userId },
      users: { [userId]: true, [friendUid]: true },
    });
  } catch (e) {
    console.error(e);
    alert("Failed to send DM. Check Firebase rules/config.");
  }
}

dmSendBtn.addEventListener("click", sendDm);
dmInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendDm();
  }
});

/* =========================
   PUBLIC ISSUES / REQUESTS (Homepage)
   DB: publicIssues/{issueId}
========================= */
const issuesRef = ref(db, "publicIssues");

issueSubmitBtn?.addEventListener("click", async () => {
  if (!displayName) return openNameModal();
  const text = issueInput.value.trim();
  if (!text) return;

  const payload = {
    uid: userId,
    name: displayName,
    text,
    timestamp: now(),
  };

  issueInput.value = "";

  try {
    await push(issuesRef, payload);
  } catch (e) {
    console.error(e);
    alert("Failed to submit issue. Check rules/config.");
  }
});

onValue(issuesRef, (snap) => {
  const data = snap.val() || {};
  const items = Object.entries(data).map(([id, v]) => ({ id, ...v }));
  items.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

  if (items.length === 0) {
    issuesList.innerHTML = `<div class="muted small">No public issues yet.</div>`;
    return;
  }

  issuesList.innerHTML = items.map((it) => {
    const likeCount = it.likes ? Object.keys(it.likes).length : 0;
    const reply = it.reply?.text ? `
      <div class="issue-reply">
        <div class="muted small">Owner reply · ${escapeHtml(formatDT(it.reply.timestamp))}</div>
        <div>${escapeHtml(it.reply.text)}</div>
      </div>` : "";

    return `
      <div class="issue-card">
        <div class="issue-meta">
          <div><strong>${escapeHtml(it.name || "Anonymous")}</strong></div>
          <div>${escapeHtml(formatDT(it.timestamp))}</div>
        </div>
        <div class="issue-text">${escapeHtml(it.text || "")}</div>
        <div class="issue-stats muted small">
          <span>Likes: <span class="mono">${likeCount}</span></span>
        </div>
        ${reply}
      </div>
    `;
  }).join("");
});

/* =========================
   APPLY FOR ADMIN (Private)
   DB: adminApplications/{uid}
   - Owner can Accept/Decline
   - Applicant sees status in Chat → Profile
========================= */
const adminAppRef = ref(db, `adminApplications/${userId}`);

applyForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!displayName) return openNameModal();

  const payload = {
    uid: userId,
    displayName,
    fullName: fullNameEl.value.trim(),
    rollNumber: rollNumberApplyEl.value.trim(),
    mobileNumber: mobileNumberEl.value.trim(),
    reason: whyAdminEl.value.trim(),
    timestamp: now(),
    status: "pending",
    decidedAt: null,
    decisionBy: null,
  };

  if (!payload.fullName || !payload.rollNumber || !payload.mobileNumber || !payload.reason) return;

  applyStatusEl.textContent = "Submitting…";

  try {
    await set(adminAppRef, payload);
    applyStatusEl.textContent = "Submitted (pending). Check Chat → Profile for status.";
    applyForm.reset();
  } catch (err) {
    console.error(err);
    applyStatusEl.textContent = "Failed to submit. Check Firebase rules/config.";
  }
});

/* =========================
   OWNER: Applications (Accept/Decline)
========================= */
const allAppsRef = ref(db, "adminApplications");

onValue(allAppsRef, (snap) => {
  if (!isOwner) {
    ownerApplicationsList.textContent = "Login as owner to view applications.";
    return;
  }
  const data = snap.val() || {};
  const items = Object.entries(data).map(([uid, v]) => ({ uid, ...v }));
  items.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

  if (items.length === 0) {
    ownerApplicationsList.innerHTML = `<div class="owner-item"><div class="muted">No applications yet.</div></div>`;
    return;
  }

  ownerApplicationsList.innerHTML = items.map((a) => `
    <div class="owner-item" data-app-uid="${escapeHtml(a.uid)}">
      <div class="owner-item-head">
        <div class="owner-item-title">${escapeHtml(a.fullName || "—")}</div>
        <div class="owner-item-meta">${escapeHtml(formatDT(a.timestamp))}</div>
      </div>
      <div class="muted small">
        <div><span class="mono">Display:</span> ${escapeHtml(a.displayName || "—")}</div>
        <div><span class="mono">Roll:</span> ${escapeHtml(a.rollNumber || "—")}</div>
        <div><span class="mono">Mobile:</span> ${escapeHtml(a.mobileNumber || "—")}</div>
        <div><span class="mono">Status:</span> <strong>${escapeHtml(a.status || "pending")}</strong></div>
      </div>
      <div class="request-box">${escapeHtml(a.reason || "")}</div>
      <div class="owner-item-actions">
        <button class="btn btn-invert" data-app-action="decline" type="button">Decline</button>
        <button class="btn" data-app-action="accept" type="button">Accept</button>
      </div>
    </div>
  `).join("");

  ownerApplicationsList.querySelectorAll("[data-app-action]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const action = e.currentTarget.getAttribute("data-app-action");
      const wrap = e.currentTarget.closest("[data-app-uid]");
      const uid = wrap?.getAttribute("data-app-uid");
      if (!uid) return;

      const nextStatus = action === "accept" ? "accepted" : "declined";

      try {
        await update(ref(db, `adminApplications/${uid}`), {
          status: nextStatus,
          decidedAt: now(),
          decisionBy: userId,
        });
      } catch (err) {
        console.error(err);
        alert("Failed to update decision. Check rules/config.");
      }
    });
  });
});

/* =========================
   OWNER: Public Issues (Reply/Like)
========================= */
onValue(issuesRef, (snap) => {
  if (!isOwner) {
    ownerIssuesList.textContent = "Login as owner to reply/like.";
    return;
  }
  const data = snap.val() || {};
  const items = Object.entries(data).map(([id, v]) => ({ id, ...v }));
  items.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

  if (items.length === 0) {
    ownerIssuesList.innerHTML = `<div class="owner-item"><div class="muted">No public issues yet.</div></div>`;
    return;
  }

  ownerIssuesList.innerHTML = items.map((it) => {
    const likeCount = it.likes ? Object.keys(it.likes).length : 0;
    const ownerLiked = !!it.likes?.[userId];
    return `
      <div class="owner-item" data-issue-id="${escapeHtml(it.id)}">
        <div class="owner-item-head">
          <div class="owner-item-title">${escapeHtml(it.name || "Anonymous")}</div>
          <div class="owner-item-meta">${escapeHtml(formatDT(it.timestamp))}</div>
        </div>
        <div class="request-box">${escapeHtml(it.text || "")}</div>
        <div class="muted small">Likes: <span class="mono">${likeCount}</span> ${ownerLiked ? "(you liked)" : ""}</div>
        <div class="owner-item-actions">
          <button class="btn btn-invert" data-issue-action="like" type="button">${ownerLiked ? "Unlike" : "Like"}</button>
          <button class="btn" data-issue-action="reply" type="button">Reply</button>
        </div>
        ${it.reply?.text ? `
          <div class="issue-reply">
            <div class="muted small">Current reply · ${escapeHtml(formatDT(it.reply.timestamp))}</div>
            <div>${escapeHtml(it.reply.text)}</div>
          </div>` : ""}
      </div>
    `;
  }).join("");

  ownerIssuesList.querySelectorAll("[data-issue-action]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const action = e.currentTarget.getAttribute("data-issue-action");
      const wrap = e.currentTarget.closest("[data-issue-id]");
      const id = wrap?.getAttribute("data-issue-id");
      if (!id) return;

      if (action === "like") {
        try {
          const likeRef = ref(db, `publicIssues/${id}/likes/${userId}`);
          const snapLike = await get(likeRef);
          if (snapLike.exists()) await remove(likeRef);
          else await set(likeRef, true);
        } catch (err) {
          console.error(err);
          alert("Failed to toggle like.");
        }
      }

      if (action === "reply") {
        const text = prompt("Owner reply (public):", "");
        if (text === null) return;
        const trimmed = text.trim();
        if (!trimmed) return alert("Reply cannot be empty.");
        try {
          await set(ref(db, `publicIssues/${id}/reply`), {
            text: trimmed,
            byUid: userId,
            byName: displayName || "Owner",
            timestamp: now(),
          });
        } catch (err) {
          console.error(err);
          alert("Failed to save reply.");
        }
      }
    });
  });
});

/* =========================
   OWNER TABS
========================= */
function setOwnerTab(name) {
  ownerTabs.forEach((t) => t.classList.toggle("active", t.dataset.ownerTab === name));
  ownerTabPanels.forEach((p) => p.classList.toggle("active", p.dataset.ownerTabPanel === name));
}
ownerTabs.forEach((t) => t.addEventListener("click", () => setOwnerTab(t.dataset.ownerTab)));

/* =========================
   CONTACT (private per browser ID)
========================= */
const contactRef = ref(db, `contactRequests/${userId}`);
let yourRequestCache = null;

onValue(contactRef, (snap) => {
  const v = snap.val();
  yourRequestCache = v;
  if (!v?.text) {
    yourRequestBox.textContent = "No request submitted yet.";
    yourRequestBox.classList.add("muted");
  } else {
    yourRequestBox.textContent = v.text;
    yourRequestBox.classList.remove("muted");
  }
});

saveContactBtn?.addEventListener("click", async () => {
  if (!displayName) return openNameModal();
  const text = contactText.value.trim();
  if (!text) return alert("Please write a message first.");

  try {
    await set(contactRef, { userId, name: displayName, text, updatedAt: now() });
  } catch (e) {
    console.error(e);
    alert("Failed to send. Check rules/config.");
  }
});

loadRequestToEditorBtn?.addEventListener("click", () => {
  const txt = (yourRequestCache?.text || "").trim();
  if (!txt) return;
  contactText.value = txt;
  contactText.focus();
});

/* =========================
   OWNER: Contacts list
========================= */
const ownerContactsRef = ref(db, "contactRequests");
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
      <div class="muted small"><span class="mono">UserId:</span> ${escapeHtml(r.userId || r.id)}</div>
      <div class="request-box">${escapeHtml(r.text || "")}</div>
    </div>
  `).join("");
});

/* =========================
   ASSIGNMENTS (kept from previous version)
========================= */
const assignmentsRootRef = ref(db, "assignments");
let latestAssignmentsSnapshot = null;
const attemptedDeletes = new Set();

function normalizeAssignmentsData(raw) {
  const out = {};
  for (const s of SUBJECTS) out[s] = raw?.[s] || {};
  return out;
}

async function cleanupExpiredCompleted(assignmentsBySubject) {
  const cutoff = now() - COMPLETED_TTL_MS;
  for (const subject of SUBJECTS) {
    const items = assignmentsBySubject?.[subject] || {};
    for (const [id, a] of Object.entries(items)) {
      if (!a?.completed) continue;
      const completedAt = Number(a.completedAt) || 0;
      if (!completedAt) continue;
      if (completedAt < cutoff) {
        const k = `del:${subject}:${id}`;
        if (attemptedDeletes.has(k)) continue;
        attemptedDeletes.add(k);
        try { await remove(ref(db, `assignments/${subject}/${id}`)); } catch {}
      }
    }
  }
}

function badgeHtml(text, cls = "gray") {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
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
  if (!subjectsContainer) return;
  subjectsContainer.innerHTML = "";

  for (const subject of SUBJECTS) {
    const itemsObj = assignmentsBySubject?.[subject] || {};
    const items = Object.entries(itemsObj).map(([id, v]) => ({ id, ...v }));
    items.sort((a, b) => (Number(b.updatedAt || b.createdAt) || 0) - (Number(a.updatedAt || a.createdAt) || 0));

    const { label, badge } = statusForSubject(itemsObj);

    const section = document.createElement("section");
    section.className = "panel";
    section.innerHTML = `
      <div class="panel-head">
        <div class="panel-title">${escapeHtml(subject)}</div>
        <div class="muted small">${escapeHtml(label)}</div>
      </div>
      <div class="panel-body" id="sub_${escapeHtml(subject)}"></div>
    `;

    const body = section.querySelector(".panel-body");

    if (items.length === 0) {
      body.innerHTML = `<div class="muted">No assignment or hw.</div>`;
    } else {
      body.innerHTML = items.slice(0, 4).map((a) => {
        const title = a.title || "Untitled";
        const details = a.details || (String(a.status).toLowerCase() === "underwork" ? "underwork" : "—");
        const ts = Number(a.updatedAt || a.createdAt) || now();
        const flags = [];
        if (a.completed) flags.push(`<span class="mono" style="color:var(--green)">✓ completed</span>`);
        return `
          <div class="issue-card">
            <div class="issue-meta">
              <div><strong>${escapeHtml(title)}</strong></div>
              <div>${escapeHtml(formatDT(ts))}</div>
            </div>
            <div class="issue-text">${escapeHtml(details)}</div>
            ${flags.length ? `<div class="muted small">${flags.join(" ")}</div>` : ""}
          </div>
        `;
      }).join("");
    }

    subjectsContainer.appendChild(section);
  }
}

/* Owner assignment manager (minimal, same as earlier) */
function renderOwnerAssignments(assignmentsBySubject) {
  if (!ownerAssignmentsList) return;
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
      blocks.push(`
        <div class="owner-item" data-subject="${escapeHtml(subject)}" data-id="${escapeHtml(a.id)}">
          <div class="owner-item-head">
            <div class="owner-item-title">${escapeHtml(a.title || "Untitled")}</div>
            <div class="owner-item-meta">${escapeHtml(formatDT(a.updatedAt || a.createdAt))}</div>
          </div>
          <div class="owner-item-actions">
            <button class="btn btn-invert" data-a="edit" type="button">Edit</button>
            <button class="btn" data-a="delete" type="button">Delete</button>
          </div>
        </div>
      `);
    }
  }

  ownerAssignmentsList.innerHTML = blocks.join("");

  ownerAssignmentsList.querySelectorAll("[data-a]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const action = e.currentTarget.getAttribute("data-a");
      const item = e.currentTarget.closest(".owner-item");
      const subject = item?.getAttribute("data-subject");
      const id = item?.getAttribute("data-id");
      if (!subject || !id) return;

      if (action === "edit") {
        const data = latestAssignmentsSnapshot?.[subject]?.[id];
        openAssignmentModal({ subject, id, data });
      }
      if (action === "delete") {
        if (!confirm("Delete this assignment?")) return;
        try { await remove(ref(db, `assignments/${subject}/${id}`)); } catch (err) {
          console.error(err); alert("Delete failed.");
        }
      }
    });
  });
}

onValue(assignmentsRootRef, async (snap) => {
  const data = normalizeAssignmentsData(snap.val() || {});
  latestAssignmentsSnapshot = data;
  renderAssignmentsView(data);
  renderOwnerAssignments(data);
  cleanupExpiredCompleted(data);
});

/* Assignment modal (owner) */
function openAssignmentModal({ subject, id, data } = {}) {
  assignmentModal.classList.remove("hidden");
  assignmentEditId.value = id || "";
  assignmentSubject.value = subject || "Bangla-1";
  assignmentStatus.value = (data?.status || "posted").toLowerCase();
  assignmentTitle.value = data?.title || "";
  assignmentDetails.value = data?.details || "";
  assignmentCompleted.checked = !!data?.completed;
  assignmentModalHint.textContent = id ? `Editing: ${subject} / ${id}` : "Creating new assignment.";
  setTimeout(() => assignmentTitle.focus(), 0);
}
function closeAssignmentModal() {
  assignmentModal.classList.add("hidden");
  assignmentForm.reset();
  assignmentEditId.value = "";
  assignmentModalHint.textContent = "";
}
closeAssignmentModalBtn.addEventListener("click", closeAssignmentModal);
addAssignmentBtn?.addEventListener("click", () => {
  if (!isOwner) return alert("Owner only.");
  openAssignmentModal({ subject: "Bangla-1" });
});
assignmentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isOwner) return alert("Owner only.");

  const subject = assignmentSubject.value;
  const id = assignmentEditId.value.trim();

  const payload = {
    title: assignmentTitle.value.trim(),
    details: assignmentDetails.value.trim(),
    status: assignmentStatus.value,
    updatedAt: now(),
    completed: !!assignmentCompleted.checked,
    completedAt: assignmentCompleted.checked ? now() : null,
  };
  if (!payload.title) return;

  try {
    if (id) {
      await update(ref(db, `assignments/${subject}/${id}`), payload);
    } else {
      await push(ref(db, `assignments/${subject}`), {
        ...payload,
        createdAt: now(),
      });
    }
    closeAssignmentModal();
  } catch (err) {
    console.error(err);
    alert("Failed to save assignment. Check rules/config.");
  }
});

/* =========================
   OWNER panel: start tab
========================= */
setOwnerTab("assignments");

/* =========================
   Start view
========================= */
setActiveView("home", { pushToStack: false });

/* When chat opens first time, show self profile state ready */
chatOverlay.addEventListener("click", (e) => {
  // prevent accidental selections outside; overlay has no backdrop element now
  // (everything is inside chat-shell)
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!chatOverlay.classList.contains("hidden")) closeChat();
    if (!assignmentModal.classList.contains("hidden")) closeAssignmentModal();
    if (!nameModal.classList.contains("hidden") && displayName) closeNameModal();
  }
});

/* Default: profile panel is ready */
openProfile(userId);
