// ---------------------------------------------------------------------------
// CONFIG — three categories (A/B/C), each with a list of audio clips.
// The task screen only shows one button per category; clicking it randomly
// picks one clip from that category's `items` and plays it. Add/remove/
// replace clips freely — `id` must stay unique across the whole config (it's
// logged as `audioId` so you can tell which clip was actually picked).
// `src` points to a file under audio/<category>/.
// ---------------------------------------------------------------------------
const AUDIO_CATEGORIES = [
  {
    id: "A",
    label: "靜觀飲食",
    items: [
      { id: "A1", label: "靜觀飲食", src: "audio/A/A1.mp3" },
      { id: "A2", label: "10分鐘靜觀飲食練習 （mark）", src: "audio/A/A2.mp3" },
      { id: "A3", label: "11分鐘回想親人的祝福（Mark）", src: "audio/A/A3.mp3" },
      { id: "A4", label: "11分鐘聯想山脈的景象及細節（mark）", src: "audio/A/A4.mp3" },
      { id: "A5", label: "14分鐘靜觀靜坐的練習湖水的冥想 (廣東話) Lake Meditation【hongkongcancerfund】", src: "audio/A/A5.mp3" },
      { id: "A6", label: "5分鐘 用靜觀方法品嚐食物的第一啖【330life 】", src: "audio/A/A6.mp3" },
      { id: "A7", label: "6分鐘靜顴品嚐練習【330 newlife】", src: "audio/A/A7.mp3" },
    ],
  },
  {
    id: "B",
    label: "身體掃描",
    items: [
      { id: "B1", label: "身體掃描", src: "audio/B/B1.mp3" },
      { id: "B2", label: "10分鐘靜觀伸展練習【newlife330】", src: "audio/B/B2.mp3" },
      { id: "B3", label: "10分鐘靜觀身體掃描【香港復康會】", src: "audio/B/B3.mp3" },
      { id: "B4", label: "11分鐘放鬆並感受下肢（mark）", src: "audio/B/B4.mp3" },
      { id: "B5", label: "12分鐘掃描下肢練習（mark）", src: "audio/B/B5.mp3" },
      { id: "B6", label: "15分鐘配合呼吸伸展身體（mark）", src: "audio/B/B6.mp3" },
      { id: "B7", label: "7分鐘站立左右拉伸（mark）", src: "audio/B/B7.mp3" },
      { id: "B8", label: "8分鐘 靜觀伸展手臂【香港復康會】", src: "audio/B/B8.mp3" },
      { id: "B9", label: "8分鐘冥想及身體掃描練習【Dr. Sam Brain & Psychology 大腦及心理教室】", src: "audio/B/B9.mp3" },
    ],
  },
  {
    id: "C",
    label: "靜觀呼吸",
    items: [
      { id: "C1", label: "靜觀呼吸", src: "audio/C/C1.mp3" },
      { id: "C2", label: "10分鐘專注呼吸引導冥想【冥想小貓】", src: "audio/C/C2.mp3" },
      { id: "C3", label: "10分鐘靜坐_ 靜觀身體與呼吸練習 (廣東話) 【Samantha Yung Mindfulness 靜觀 · 修心 】", src: "audio/C/C3.mp3" },
      { id: "C4", label: "10分鐘靜坐及靜觀練習【明愛牛頭角長者中心】", src: "audio/C/C4.mp3" },
      { id: "C5", label: "11分鐘覺知身體各部位感覺 （Mark）", src: "audio/C/C5.mp3" },
      { id: "C6", label: "12分鐘散步呼吸練習及冥想【Ava Siu Yoga 瑜伽.冥想.廣東話】", src: "audio/C/C6.mp3" },
      { id: "C7", label: "3分鐘靜觀呼吸練習【香港復康會】", src: "audio/C/C7.mp3" },
      { id: "C8", label: "3分钟呼吸空間靜觀練習(Mark)", src: "audio/C/C8.mp3" },
      { id: "C9", label: "5分鐘三步呼吸空間靜觀練習(廣東話)【Samantha Yung Mindfulness 靜觀 · 修心 】", src: "audio/C/C9.mp3" },
      { id: "C10", label: "5分鐘助眠安神靜觀練習【MindfulOcean，KarsonWong】", src: "audio/C/C10.mp3" },
      { id: "C11", label: "5分鐘應對緊張擔心靜觀練習 【PSY時間｜心理港播】", src: "audio/C/C11.mp3" },
    ],
  },
];

const STORAGE_KEY_LOG = "kiki_event_log";
const STORAGE_KEY_USER = "kiki_current_user";

// Entering this exact string on the ID screen opens the admin data view
// instead of the task screen. It is NOT a password — it's just a routing
// trigger. The actual access control is Firebase Auth + Firestore rules
// (only a specific signed-in Google account can read the "events"
// collection), so this string being guessed or shared is not a security
// concern by itself.
const ADMIN_USER_ID = "admin";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentUserId = null;
let currentAudioItem = null; // { id, label, src, category, categoryLabel } of the clip currently loaded/playing (or paused)
let pendingFreshStart = false; // true between starting a new audio and its first "play" event

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const idScreen = document.getElementById("id-screen");
const taskScreen = document.getElementById("task-screen");
const idForm = document.getElementById("id-form");
const userIdInput = document.getElementById("user-id-input");
const currentUserIdEl = document.getElementById("current-user-id");
const switchUserBtn = document.getElementById("switch-user-btn");
const audioButtonsEl = document.getElementById("audio-buttons");
const nowPlayingEl = document.getElementById("now-playing");
const nowPlayingLabelEl = document.getElementById("now-playing-label");
const nowPlayingTimeEl = document.getElementById("now-playing-time");
const progressEl = document.getElementById("audio-progress");
const pauseBtn = document.getElementById("pause-btn");
const stopBtn = document.getElementById("stop-btn");
const audioPlayer = document.getElementById("audio-player");

const adminScreen = document.getElementById("admin-screen");
const adminSwitchBtn = document.getElementById("admin-switch-btn");
const adminSigninEl = document.getElementById("admin-signin");
const adminGoogleBtn = document.getElementById("admin-google-btn");
const adminStatusEl = document.getElementById("admin-status");
const adminDataEl = document.getElementById("admin-data");
const adminSummaryEl = document.getElementById("admin-summary");
const adminGroupsEl = document.getElementById("admin-groups");
const adminRefreshBtn = document.getElementById("admin-refresh-btn");
const adminExportJsonBtn = document.getElementById("admin-export-json-btn");
const adminExportCsvBtn = document.getElementById("admin-export-csv-btn");

// Resolves once the Firebase module script (in index.html) has finished
// initializing, or after 3s if it never does (offline, blocked, bad config)
// — logEvent() awaits this once so an event fired the instant the page
// loads doesn't lose its cloud write just because the module was still
// fetching from the CDN.
const firebaseReady = new Promise((resolve) => {
  if (window._fsAddDoc) {
    resolve(true);
    return;
  }
  window.addEventListener("firebase-ready", () => resolve(true), { once: true });
  setTimeout(() => resolve(false), 3000);
});

// ---------------------------------------------------------------------------
// Logging
//
// logEvent() is the single choke point for recording data: every entry is
// written to localStorage (a silent local backup, no UI — kept in case a
// participant is offline) and, when the Firebase SDK loaded successfully
// (see the <script type="module"> block in index.html), also to the
// "events" collection in Firestore. Firestore's security rules only allow
// `create` for anonymous requests — reading requires signing in as the
// authorized admin account (see the admin screen below).
// ---------------------------------------------------------------------------
function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_LOG)) || [];
  } catch {
    return [];
  }
}

function saveLog(log) {
  localStorage.setItem(STORAGE_KEY_LOG, JSON.stringify(log));
}

async function logEvent({ eventType, category = "", audioId = "", duration = null, totalDuration = null }) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: currentUserId,
    timestamp: new Date().toISOString(),
    eventType, // 'session_start' | 'click' | 'play_start' | 'pause' | 'resume' | 'play_end'
    category, // 'A' | 'B' | 'C'
    audioId, // e.g. 'A1' — which specific clip was (randomly) picked
    duration, // seconds actually listened, only set on play_end
    totalDuration, // full length of the clip in seconds, set on play_start/play_end
  };

  const log = loadLog();
  log.push(entry);
  saveLog(log);

  // Cloud write is best-effort: local storage above already has the entry,
  // so a slow/unready/unreachable Firebase must never block or crash logging.
  await firebaseReady;
  if (window._fsAddDoc) {
    try {
      await window._fsAddDoc(window._fsCollection(window._db, "events"), entry);
    } catch (err) {
      console.error("写入云端数据库失败(本地记录不受影响):", err);
    }
  }

  return entry;
}

// ---------------------------------------------------------------------------
// ID screen
// ---------------------------------------------------------------------------
function showTaskScreen(userId) {
  currentUserId = userId;
  sessionStorage.setItem(STORAGE_KEY_USER, userId);
  currentUserIdEl.textContent = userId;
  idScreen.classList.add("hidden");
  adminScreen.classList.add("hidden");
  taskScreen.classList.remove("hidden");
  logEvent({ eventType: "session_start" });
}

function showAdminScreen() {
  sessionStorage.setItem(STORAGE_KEY_USER, ADMIN_USER_ID);
  idScreen.classList.add("hidden");
  taskScreen.classList.add("hidden");
  adminScreen.classList.remove("hidden");
  adminSigninEl.classList.remove("hidden");
  adminDataEl.classList.add("hidden");
  adminStatusEl.textContent = "";
}

function returnToIdScreen() {
  stopPlayback(); // logs a play_end if something was mid-playback; no-op from the admin screen
  currentUserId = null;
  sessionStorage.removeItem(STORAGE_KEY_USER);
  userIdInput.value = "";
  taskScreen.classList.add("hidden");
  adminScreen.classList.add("hidden");
  idScreen.classList.remove("hidden");
  userIdInput.focus();
  if (window._signOutAuth) window._signOutAuth().catch(() => {});
}

idForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = userIdInput.value.trim();
  if (!val) return;
  if (val === ADMIN_USER_ID) {
    showAdminScreen();
  } else {
    showTaskScreen(val);
  }
});

switchUserBtn.addEventListener("click", returnToIdScreen);
adminSwitchBtn.addEventListener("click", returnToIdScreen);

// Resume the same screen within a browser session (e.g. accidental reload)
const savedUser = sessionStorage.getItem(STORAGE_KEY_USER);
if (savedUser === ADMIN_USER_ID) {
  showAdminScreen();
} else if (savedUser) {
  showTaskScreen(savedUser);
}

// ---------------------------------------------------------------------------
// Audio buttons
// ---------------------------------------------------------------------------
function renderAudioButtons() {
  audioButtonsEl.innerHTML = "";
  AUDIO_CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "audio-btn";
    btn.textContent = cat.label;
    btn.dataset.id = cat.id;
    btn.addEventListener("click", () => handleCategoryButtonClick(cat));
    audioButtonsEl.appendChild(btn);
  });
}

function pickRandomItem(cat) {
  if (cat.items.length === 0) return null;
  return cat.items[Math.floor(Math.random() * cat.items.length)];
}

function handleCategoryButtonClick(cat) {
  // Re-clicking the category that's actively playing stops it.
  if (currentAudioItem && currentAudioItem.category === cat.id && !audioPlayer.paused) {
    logEvent({ eventType: "click", category: cat.id, audioId: currentAudioItem.id });
    stopPlayback();
    return;
  }

  const item = pickRandomItem(cat);
  if (!item) {
    alert(`${cat.label} 裡還沒有配置任何音頻。`);
    return;
  }
  logEvent({ eventType: "click", category: cat.id, audioId: item.id });

  // Anything else loaded (playing or paused) gets closed out before starting fresh.
  // Resuming a paused clip is done via the dedicated pause/resume button, not the grid.
  if (currentAudioItem) {
    stopPlayback();
  }

  startAudio({ ...item, category: cat.id, categoryLabel: cat.label });
}

// A play() promise rejects with AbortError when a near-simultaneous pause()
// or src change interrupts it (e.g. user hits pause right after clicking a
// category, before playback has actually started) — that's expected browser
// behavior, not a real failure, so it must not be treated as one.
function isAbortError(err) {
  return err && err.name === "AbortError";
}

function startAudio(item) {
  currentAudioItem = item;
  audioPlayer.src = item.src;
  resetProgressUI();
  pendingFreshStart = true;
  audioPlayer.play().catch((err) => {
    if (isAbortError(err)) return;
    pendingFreshStart = false;
    currentAudioItem = null;
    console.error("音频播放失败:", err);
    alert(`無法播放 ${item.label}(${item.src})。請確認音頻文件存在。`);
    updatePlayingUI();
  });
}

// "play" fires both for a fresh start and for resuming after pause — only log
// play_start the first time, using the pendingFreshStart flag set in startAudio().
audioPlayer.addEventListener("play", () => {
  if (pendingFreshStart) {
    pendingFreshStart = false;
    logEvent({
      eventType: "play_start",
      category: currentAudioItem?.category ?? "",
      audioId: currentAudioItem?.id ?? "",
      totalDuration: getTotalDuration(),
    });
  }
  updatePlayingUI();
});

audioPlayer.addEventListener("pause", () => {
  updatePlayingUI();
});

audioPlayer.addEventListener("ended", () => {
  finishPlayback();
});

audioPlayer.addEventListener("timeupdate", updateProgressUI);
audioPlayer.addEventListener("loadedmetadata", updateProgressUI);

function togglePause() {
  if (!currentAudioItem) return;
  const position = Math.round((audioPlayer.currentTime || 0) * 100) / 100;
  if (audioPlayer.paused) {
    audioPlayer.play().catch((err) => {
      if (isAbortError(err)) return;
      console.error("恢复播放失败:", err);
    });
    logEvent({
      eventType: "resume",
      category: currentAudioItem.category,
      audioId: currentAudioItem.id,
      duration: position,
      totalDuration: getTotalDuration(),
    });
  } else {
    audioPlayer.pause();
    logEvent({
      eventType: "pause",
      category: currentAudioItem.category,
      audioId: currentAudioItem.id,
      duration: position,
      totalDuration: getTotalDuration(),
    });
  }
}

function stopPlayback() {
  if (!currentAudioItem) return;
  if (!audioPlayer.paused) {
    audioPlayer.pause();
  }
  finishPlayback();
}

function finishPlayback() {
  if (!currentAudioItem) {
    updatePlayingUI();
    return;
  }
  // currentTime reflects exactly how far playback got, whether it ended
  // naturally, was stopped mid-play, or was stopped while paused — since
  // there's no seeking, this is always the true time actually played.
  const durationPlayed = Math.round((audioPlayer.currentTime || 0) * 100) / 100;
  logEvent({
    eventType: "play_end",
    category: currentAudioItem.category,
    audioId: currentAudioItem.id,
    duration: durationPlayed,
    totalDuration: getTotalDuration(),
  });
  currentAudioItem = null;
  audioPlayer.removeAttribute("src");
  resetProgressUI();
  updatePlayingUI();
}

function updatePlayingUI() {
  document.querySelectorAll(".audio-btn").forEach((b) => b.classList.remove("playing"));
  if (!currentAudioItem) {
    nowPlayingEl.classList.add("hidden");
    return;
  }
  const activeBtn = audioButtonsEl.querySelector(`[data-id="${currentAudioItem.category}"]`);
  activeBtn?.classList.add("playing");
  const isPaused = audioPlayer.paused;
  nowPlayingLabelEl.textContent = `${isPaused ? "已暫停" : "正在播放"}: ${currentAudioItem.categoryLabel}`;
  pauseBtn.textContent = isPaused ? "繼續" : "暫停";
  nowPlayingEl.classList.remove("hidden");
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getTotalDuration() {
  const d = audioPlayer.duration;
  return isFinite(d) && d > 0 ? Math.round(d * 100) / 100 : null;
}

function resetProgressUI() {
  progressEl.value = 0;
  progressEl.max = 1;
  nowPlayingTimeEl.textContent = "0:00 / 0:00";
}

function updateProgressUI() {
  if (!currentAudioItem) return;
  const current = audioPlayer.currentTime || 0;
  const total = audioPlayer.duration;
  const totalValid = isFinite(total) && total > 0;
  progressEl.max = totalValid ? total : 1;
  progressEl.value = totalValid ? current : 0;
  nowPlayingTimeEl.textContent = `${formatTime(current)} / ${totalValid ? formatTime(total) : "0:00"}`;
}

pauseBtn.addEventListener("click", togglePause);
stopBtn.addEventListener("click", stopPlayback);

// ---------------------------------------------------------------------------
// Admin data view — Google-sign-in gated (see index.html / README). Once
// signed in as the authorized account, fetches every participant's records
// from Firestore and groups them by date, then by user within each date.
// ---------------------------------------------------------------------------
let adminEvents = []; // flat list from the last successful load; feeds the export buttons

async function fetchAndRenderAdminData() {
  adminStatusEl.textContent = "正在讀取所有記錄...";
  try {
    const snap = await window._fsGetDocs(window._fsCollection(window._db, "events"));
    adminEvents = [];
    snap.forEach((doc) => adminEvents.push(doc.data()));
    renderAdminData(adminEvents);
    adminSigninEl.classList.add("hidden");
    adminDataEl.classList.remove("hidden");
    adminStatusEl.textContent = "";
  } catch (err) {
    adminStatusEl.textContent =
      err.code === "permission-denied"
        ? "讀取失敗:這個 Google 帳號沒有查看資料的權限。"
        : `讀取失敗:${err.code || err.message}`;
  }
}

async function signInAndLoadAdminData() {
  if (!window._signInWithGoogle) {
    adminStatusEl.textContent = "Firebase 尚未載入完成,請稍後再試一次。";
    return;
  }
  adminStatusEl.textContent = "登入中...";
  try {
    await window._signInWithGoogle();
  } catch (err) {
    adminStatusEl.textContent = `登入失敗:${err.code || err.message}`;
    return;
  }
  await fetchAndRenderAdminData();
}

function renderAdminData(events) {
  const byDate = new Map();
  events.forEach((entry) => {
    const date = (entry.timestamp || "").slice(0, 10) || "(未知日期)";
    if (!byDate.has(date)) byDate.set(date, new Map());
    const byUser = byDate.get(date);
    const uid = entry.userId || "(未知用戶)";
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(entry);
  });

  const dates = [...byDate.keys()].sort().reverse(); // newest date first
  const userCount = new Set(events.map((e) => e.userId)).size;
  adminSummaryEl.textContent = `共 ${events.length} 條記錄・${dates.length} 天・${userCount} 位用戶`;

  adminGroupsEl.innerHTML = "";
  if (dates.length === 0) {
    adminGroupsEl.innerHTML = `<p class="hint">目前還沒有任何記錄。</p>`;
    return;
  }

  dates.forEach((date) => {
    const dateSection = document.createElement("div");
    dateSection.className = "admin-date-group";

    const dateHeading = document.createElement("h3");
    dateHeading.className = "admin-date-title";
    dateHeading.textContent = date;
    dateSection.appendChild(dateHeading);

    const byUser = byDate.get(date);
    [...byUser.keys()].sort().forEach((uid) => {
      const userEvents = byUser
        .get(uid)
        .slice()
        .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

      const userSection = document.createElement("div");
      userSection.className = "admin-user-group";

      const userHeading = document.createElement("h4");
      userHeading.className = "admin-user-title";
      userHeading.textContent = `${uid}(${userEvents.length} 條記錄)`;
      userSection.appendChild(userHeading);

      userSection.appendChild(buildEventsTable(userEvents));
      dateSection.appendChild(userSection);
    });

    adminGroupsEl.appendChild(dateSection);
  });
}

function buildEventsTable(events) {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>時間</th>
        <th>事件</th>
        <th>類別</th>
        <th>音頻</th>
        <th>時長(秒)</th>
        <th>音頻總時長(秒)</th>
      </tr>
    </thead>
    <tbody>
      ${events
        .map(
          (e) => `
        <tr>
          <td>${e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : "-"}</td>
          <td>${escapeHtml(e.eventType || "")}</td>
          <td>${escapeHtml(e.category || "-")}</td>
          <td>${escapeHtml(e.audioId || "-")}</td>
          <td>${e.duration ?? "-"}</td>
          <td>${e.totalDuration ?? "-"}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  `;
  wrap.appendChild(table);
  return wrap;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

adminGoogleBtn.addEventListener("click", signInAndLoadAdminData);
adminRefreshBtn.addEventListener("click", fetchAndRenderAdminData);

adminExportJsonBtn.addEventListener("click", () => {
  downloadFile(`kiki-all-events-${Date.now()}.json`, JSON.stringify(adminEvents, null, 2), "application/json");
});

adminExportCsvBtn.addEventListener("click", () => {
  const header = "timestamp,userId,eventType,category,audioId,duration,totalDuration";
  const rows = adminEvents.map((e) =>
    [e.timestamp, e.userId, e.eventType, e.category, e.audioId, e.duration ?? "", e.totalDuration ?? ""].join(",")
  );
  downloadFile(`kiki-all-events-${Date.now()}.csv`, [header, ...rows].join("\n"), "text/csv");
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
renderAudioButtons();
