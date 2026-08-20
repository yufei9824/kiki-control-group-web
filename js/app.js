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
    label: "A 类",
    items: [
      { id: "A1", label: "A1", src: "audio/A/A1.mp3" },
      { id: "A2", label: "A2", src: "audio/A/A2.mp3" },
      { id: "A3", label: "A3", src: "audio/A/A3.mp3" },
    ],
  },
  {
    id: "B",
    label: "B 类",
    items: [
      { id: "B1", label: "B1", src: "audio/B/B1.mp3" },
      { id: "B2", label: "B2", src: "audio/B/B2.mp3" },
      { id: "B3", label: "B3", src: "audio/B/B3.mp3" },
    ],
  },
  {
    id: "C",
    label: "C 类",
    items: [
      { id: "C1", label: "C1", src: "audio/C/C1.mp3" },
      { id: "C2", label: "C2", src: "audio/C/C2.mp3" },
      { id: "C3", label: "C3", src: "audio/C/C3.mp3" },
    ],
  },
];

const STORAGE_KEY_LOG = "kiki_event_log";
const STORAGE_KEY_USER = "kiki_current_user";

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
const logTableBody = document.getElementById("log-table-body");
const exportJsonBtn = document.getElementById("export-json-btn");
const exportCsvBtn = document.getElementById("export-csv-btn");
const clearLogBtn = document.getElementById("clear-log-btn");

// ---------------------------------------------------------------------------
// Logging
//
// logEvent() is the single choke point for recording data. Right now it
// writes to localStorage so the framework is testable with zero backend
// setup. To wire up real persistence (recommended: Firebase Firestore),
// add the write call where marked below — every call site in this file
// stays the same.
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
    eventType, // 'session_start' | 'click' | 'play_start' | 'play_end'
    category, // 'A' | 'B' | 'C'
    audioId, // e.g. 'A1' — which specific clip was (randomly) picked
    duration, // seconds actually listened, only set on play_end
    totalDuration, // full length of the clip in seconds, set on play_start/play_end
  };

  const log = loadLog();
  log.push(entry);
  saveLog(log);

  // --- TODO: send to a real backend instead of / in addition to localStorage ---
  // Example with Firebase Firestore (after adding the SDK + config, see README):
  //   await addDoc(collection(db, "events"), entry);

  renderLogTable();
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
  taskScreen.classList.remove("hidden");
  logEvent({ eventType: "session_start" });
}

idForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = userIdInput.value.trim();
  if (!val) return;
  showTaskScreen(val);
});

switchUserBtn.addEventListener("click", () => {
  stopPlayback(); // logs a play_end if something was mid-playback
  currentUserId = null;
  sessionStorage.removeItem(STORAGE_KEY_USER);
  userIdInput.value = "";
  taskScreen.classList.add("hidden");
  idScreen.classList.remove("hidden");
  userIdInput.focus();
});

// Resume the same user within a browser session (e.g. accidental reload)
const savedUser = sessionStorage.getItem(STORAGE_KEY_USER);
if (savedUser) showTaskScreen(savedUser);

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
    alert(`${cat.label} 里还没有配置任何音频。`);
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

function startAudio(item) {
  currentAudioItem = item;
  audioPlayer.src = item.src;
  resetProgressUI();
  pendingFreshStart = true;
  audioPlayer.play().catch((err) => {
    pendingFreshStart = false;
    currentAudioItem = null;
    console.error("音频播放失败:", err);
    alert(`无法播放 ${item.label}(${item.src})。请确认音频文件存在。`);
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
  if (audioPlayer.paused) {
    audioPlayer.play().catch((err) => console.error("恢复播放失败:", err));
  } else {
    audioPlayer.pause();
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
  nowPlayingLabelEl.textContent = `${isPaused ? "已暂停" : "正在播放"}: ${currentAudioItem.categoryLabel}`;
  pauseBtn.textContent = isPaused ? "继续" : "暂停";
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
// Debug panel: table + export + clear
// ---------------------------------------------------------------------------
function renderLogTable() {
  const log = loadLog().slice().reverse(); // newest first
  logTableBody.innerHTML = "";

  if (log.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    row.innerHTML = `<td colspan="7">暂无记录</td>`;
    logTableBody.appendChild(row);
    return;
  }

  log.forEach((entry) => {
    const row = document.createElement("tr");
    const time = new Date(entry.timestamp).toLocaleString();
    row.innerHTML = `
      <td>${time}</td>
      <td>${escapeHtml(entry.userId ?? "")}</td>
      <td>${escapeHtml(entry.eventType)}</td>
      <td>${escapeHtml(entry.category || "-")}</td>
      <td>${escapeHtml(entry.audioId || "-")}</td>
      <td>${entry.duration ?? "-"}</td>
      <td>${entry.totalDuration ?? "-"}</td>
    `;
    logTableBody.appendChild(row);
  });
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

exportJsonBtn.addEventListener("click", () => {
  const log = loadLog();
  downloadFile(`kiki-log-${Date.now()}.json`, JSON.stringify(log, null, 2), "application/json");
});

exportCsvBtn.addEventListener("click", () => {
  const log = loadLog();
  const header = "timestamp,userId,eventType,category,audioId,duration,totalDuration";
  const rows = log.map((e) =>
    [e.timestamp, e.userId, e.eventType, e.category, e.audioId, e.duration ?? "", e.totalDuration ?? ""].join(",")
  );
  downloadFile(`kiki-log-${Date.now()}.csv`, [header, ...rows].join("\n"), "text/csv");
});

clearLogBtn.addEventListener("click", () => {
  if (confirm("确定要清空本地记录吗?此操作无法撤销(可先导出备份)。")) {
    saveLog([]);
    renderLogTable();
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
renderAudioButtons();
renderLogTable();
