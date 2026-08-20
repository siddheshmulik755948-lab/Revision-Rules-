
"use strict";

/* =========================================================
   REVISION TRACKER
   Offline-first Study / Revision App
   PDF / Image / Video / File support
   ========================================================= */

const APP_NAME = "Revision Tracker";

const DB_NAME = "revision_tracker_offline_db";
const DB_VERSION = 4;

const DATA_STORE = "appData";
const FILE_STORE = "notesFiles";

let db = null;
let currentPage = "home";

const defaultRevisionSystem = [
  { id: uid(), name: "Chapter Start", day: 1, final: false },
  { id: uid(), name: "Revision 1", day: 2, final: false },
  { id: uid(), name: "Revision 2", day: 4, final: false },
  { id: uid(), name: "Revision 3", day: 8, final: false },
  { id: uid(), name: "Revision 4", day: 16, final: false },
  { id: uid(), name: "Revision 5", day: 32, final: false },
  { id: uid(), name: "Final Revision", day: 65, final: true }
];

let state = {
  subjects: [],
  revisionSystem: defaultRevisionSystem,
  settings: {
    notifications: true,
    examDate: ""
  }
};

/* =========================================================
   START
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initDB();
    await loadState();
    registerServiceWorker();
    setupNavigation();
    setupSettingsButton();
    render();
  } catch (error) {
    console.error("Startup error:", error);
    alert("App data could not be loaded.");
  }
});

/* =========================================================
   DATABASE
   ========================================================= */

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(DATA_STORE)) {
        database.createObjectStore(DATA_STORE, {
          keyPath: "id"
        });
      }

      if (!database.objectStoreNames.contains(FILE_STORE)) {
        const store = database.createObjectStore(FILE_STORE, {
          keyPath: "id"
        });

        store.createIndex("chapterId", "chapterId", {
          unique: false
        });
      }
    };

    request.onsuccess = event => {
      db = event.target.result;

      db.onversionchange = () => {
        db.close();
      };

      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function dbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(storeName, "readwrite");

    transaction.objectStore(storeName).put(value);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("Transaction aborted"));
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(storeName, "readonly");

    const request =
      transaction.objectStore(storeName).get(key);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(storeName, "readonly");

    const request =
      transaction.objectStore(storeName).getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(storeName, "readwrite");

    transaction.objectStore(storeName).delete(key);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function dbGetByChapter(chapterId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(FILE_STORE, "readonly");

    const index =
      transaction.objectStore(FILE_STORE)
        .index("chapterId");

    const request = index.getAll(chapterId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* =========================================================
   STATE
   ========================================================= */

async function saveState() {
  await dbPut(DATA_STORE, {
    id: "main",
    value: state
  });
}

async function loadState() {
  const saved =
    await dbGet(DATA_STORE, "main");

  if (saved && saved.value) {
    state = saved.value;
  }

  if (!Array.isArray(state.subjects)) {
    state.subjects = [];
  }

  state.subjects.forEach(subject => {
    if (!Array.isArray(subject.chapters)) {
      subject.chapters = [];
    }

    subject.chapters.forEach(chapter => {
      if (!chapter.revisions) {
        chapter.revisions = {};
      }
    });
  });

  if (!Array.isArray(state.revisionSystem)) {
    state.revisionSystem =
      createDefaultRevisionSystem();
  }

  if (!state.settings) {
    state.settings = {
      notifications: true,
      examDate: ""
    };
  }

  if (typeof state.settings.notifications !== "boolean") {
    state.settings.notifications = true;
  }

  if (typeof state.settings.examDate !== "string") {
    state.settings.examDate = "";
  }
}

function createDefaultRevisionSystem() {
  return [
    {
      id: uid(),
      name: "Chapter Start",
      day: 1,
      final: false
    },
    {
      id: uid(),
      name: "Revision 1",
      day: 2,
      final: false
    },
    {
      id: uid(),
      name: "Revision 2",
      day: 4,
      final: false
    },
    {
      id: uid(),
      name: "Revision 3",
      day: 8,
      final: false
    },
    {
      id: uid(),
      name: "Revision 4",
      day: 16,
      final: false
    },
    {
      id: uid(),
      name: "Revision 5",
      day: 32,
      final: false
    },
    {
      id: uid(),
      name: "Final Revision",
      day: 65,
      final: true
    }
  ];
}

/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registerServiceWorker() {
  if (
    "serviceWorker" in navigator &&
    location.protocol !== "file:"
  ) {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(error => {
        console.warn(
          "Service Worker registration failed:",
          error
        );
      });
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function uid() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayISO() {
  const d = new Date();

  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function dateFromISO(value) {
  if (!value) return new Date();

  const parts = value.split("-").map(Number);

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );
}

function formatDate(value) {
  if (!value) return "-";

  return dateFromISO(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function daysBetween(a, b) {
  const first =
    typeof a === "string"
      ? dateFromISO(a)
      : new Date(a);

  const second =
    typeof b === "string"
      ? dateFromISO(b)
      : new Date(b);

  first.setHours(0, 0, 0, 0);
  second.setHours(0, 0, 0, 0);

  return Math.round(
    (second - first) / 86400000
  );
}

function findSubject(subjectId) {
  return state.subjects.find(
    subject => subject.id === subjectId
  );
}

function findChapter(chapterId) {
  for (const subject of state.subjects) {
    const chapter = subject.chapters.find(
      item => item.id === chapterId
    );

    if (chapter) {
      return {
        chapter,
        subject
      };
    }
  }

  return null;
}

function toast(message) {
  const old =
    document.querySelector(".toast");

  if (old) {
    old.remove();
  }

  const element =
    document.createElement("div");

  element.className = "toast";
  element.textContent = message;

  document.body.appendChild(element);

  setTimeout(() => {
    if (element.parentNode) {
      element.remove();
    }
  }, 2500);
}

/* =========================================================
   PROGRESS SYSTEM
   ========================================================= */

function totalRevisionSteps() {
  return Math.max(
    0,
    state.revisionSystem.length - 1
  );
}

function getChapterProgress(chapter) {
  const total = totalRevisionSteps();

  if (!total) {
    return 0;
  }

  const completed =
    completedCount(chapter);

  return Math.min(
    100,
    Math.round(
      (completed / total) * 100
    )
  );
}

function getSubjectProgress(subject) {
  const chapters = subject.chapters || [];

  if (!chapters.length) {
    return 0;
  }

  const total =
    chapters.reduce(
      (sum, chapter) =>
        sum + totalRevisionSteps(),
      0
    );

  if (!total) {
    return 0;
  }

  const completed =
    chapters.reduce(
      (sum, chapter) =>
        sum + completedCount(chapter),
      0
    );

  return Math.min(
    100,
    Math.round(
      (completed / total) * 100
    )
  );
}

function getOverallProgress() {
  let total = 0;
  let completed = 0;

  state.subjects.forEach(subject => {
    subject.chapters.forEach(chapter => {
      total += totalRevisionSteps();
      completed += completedCount(chapter);
    });
  });

  if (!total) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (completed / total) * 100
    )
  );
}

function renderProgressBar(progress, extraClass = "") {
  const value =
    Math.min(
      100,
      Math.max(0, Number(progress) || 0)
    );

  return `
    <div class="progress ${extraClass}">
      <div style="width:${value}%"></div>
    </div>
  `;
}

function renderProgressInfo(progress) {
  return `
    <div class="progress-row">
      <span class="muted">Progress</span>
      <strong>${progress}%</strong>
    </div>

    ${renderProgressBar(progress)}
  `;
}

/* =========================================================
   EXAM COUNTDOWN
   ========================================================= */

function getExamCountdown() {
  const examDate =
    state.settings?.examDate;

  if (!examDate) {
    return {
      status: "not-set",
      days: null
    };
  }

  const today =
    dateFromISO(todayISO());

  const exam =
    dateFromISO(examDate);

  const diff =
    Math.round(
      (exam - today) / 86400000
    );

  if (diff < 0) {
    return {
      status: "passed",
      days: Math.abs(diff)
    };
  }

  return {
    status: "upcoming",
    days: diff
  };
}

function renderExamCountdown() {
  const countdown =
    getExamCountdown();

  if (countdown.status === "not-set") {
    return `
      <div class="card exam-card">

        <div class="row">

          <div>
            <div class="exam-label">
              🎯 Exam Countdown
            </div>

            <div class="exam-title">
              Exam date not set
            </div>

            <div class="muted">
              Set your exam date in Settings.
            </div>
          </div>

          <div class="exam-icon">
            🎓
          </div>

        </div>

        <button
          class="btn full"
          style="margin-top:14px"
          onclick="goPage('settings')">
          Set Exam Date
        </button>

      </div>
    `;
  }

  if (countdown.status === "passed") {
    return `
      <div class="card exam-card exam-passed">

        <div class="row">

          <div>
            <div class="exam-label">
              🎯 Exam Countdown
            </div>

            <div class="exam-title">
              Exam date has passed
            </div>

            <div class="muted">
              Exam Date:
              ${formatDate(state.settings.examDate)}
            </div>
          </div>

          <div class="exam-icon">
            🎓
          </div>

        </div>

      </div>
    `;
  }

  return `
    <div class="card exam-card">

      <div class="row">

        <div>
          <div class="exam-label">
            🎯 Exam Countdown
          </div>

          <div class="exam-number">
            ${countdown.days}
          </div>

          <div class="exam-days">
            ${
              countdown.days === 1
                ? "Day Remaining"
                : "Days Remaining"
            }
          </div>
        </div>

        <div class="exam-icon">
          🎓
        </div>

      </div>

      <div class="exam-date">
        Exam Date:
        <strong>
          ${formatDate(state.settings.examDate)}
        </strong>
      </div>

    </div>
  `;
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
  document
    .querySelectorAll(".nav-item")
    .forEach(button => {
      button.addEventListener("click", () => {
        goPage(button.dataset.page);
      });
    });
}

function setupSettingsButton() {
  const button =
    document.getElementById("settingsBtn");

  if (button) {
    button.addEventListener("click", () => {
      goPage("settings");
    });
  }
}

function goPage(page) {
  currentPage = page;
  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   REVISION SYSTEM
   ========================================================= */

function getRevisionDates(chapter) {
  if (!chapter.startDate) {
    return [];
  }

  return state.revisionSystem.map(rule => {
    const date =
      dateFromISO(chapter.startDate);

    date.setDate(
      date.getDate() +
      Number(rule.day) -
      1
    );

    const iso =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    return {
      rule,
      date: iso
    };
  });
}

function getRevisionItems() {
  const result = [];

  for (const subject of state.subjects) {
    for (const chapter of subject.chapters) {
      const dates =
        getRevisionDates(chapter);

      for (const item of dates) {
        if (
          item.rule.name ===
          "Chapter Start"
        ) {
          continue;
        }

        const completion =
          chapter.revisions?.[
            item.rule.id
          ];

        result.push({
          subject,
          chapter,
          rule: item.rule,
          date: item.date,
          completion
        });
      }
    }
  }

  return result;
}

function dueTodayItems() {
  const today = todayISO();

  return getRevisionItems().filter(
    item =>
      item.date === today &&
      !item.completion?.submitted
  );
}

function incompleteItems() {
  const today = todayISO();

  return getRevisionItems().filter(
    item =>
      item.date < today &&
      !item.completion?.submitted
  );
}

function completedCount(chapter) {
  if (!chapter.revisions) {
    return 0;
  }

  return Object.values(
    chapter.revisions
  ).filter(
    value =>
      value &&
      value.submitted
  ).length;
}

/* =========================================================
   RENDER
   ========================================================= */

function render() {
  renderMain();
  updateNav();
}

function updateNav() {
  document
    .querySelectorAll(".nav-item")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === currentPage
      );
    });
}

function renderMain() {
  const main =
    document.getElementById(
      "mainContent"
    );

  if (!main) return;

  if (currentPage === "home") {
    main.innerHTML = renderHome();
  } else if (currentPage === "subjects") {
    main.innerHTML = renderSubjects();
  } else if (currentPage === "today") {
    main.innerHTML = renderToday();
  } else if (currentPage === "planner") {
    main.innerHTML = renderPlanner();
  } else if (currentPage === "settings") {
    main.innerHTML = renderSettings();
  }
}

/* =========================================================
   HOME
   ========================================================= */

function renderHome() {
  const totalChapters =
    state.subjects.reduce(
      (sum, subject) =>
        sum + subject.chapters.length,
      0
    );

  const today =
    dueTodayItems().length;

  const incomplete =
    incompleteItems().length;

  const progress =
    getOverallProgress();

  return `
    <section>

      <h1 class="page-title">
        Good day 👋
      </h1>

      <p class="page-subtitle">
        Let's make today productive.
      </p>

      ${renderExamCountdown()}

      <div
        class="card hero"
        style="margin-top:14px">

        <div class="row">

          <div>
            <div class="muted">
              Overall Progress
            </div>

            <div class="stat-number">
              ${progress}%
            </div>
          </div>

          <div style="font-size:40px">
            📚
          </div>

        </div>

        ${renderProgressBar(progress)}

      </div>

      <div
        class="grid grid-2"
        style="margin-top:14px">

        <div class="card">
          <div class="stat-number">
            ${today}
          </div>

          <div class="stat-label">
            Today's Revisions
          </div>
        </div>

        <div class="card">
          <div class="stat-number">
            ${incomplete}
          </div>

          <div class="stat-label">
            Incomplete Revisions
          </div>
        </div>

        <div class="card">
          <div class="stat-number">
            ${state.subjects.length}
          </div>

          <div class="stat-label">
            Subjects
          </div>
        </div>

        <div class="card">
          <div class="stat-number">
            ${totalChapters}
          </div>

          <div class="stat-label">
            Chapters
          </div>
        </div>

      </div>

      <div
        class="card"
        style="margin-top:14px">

        <div class="row">

          <div>
            <div class="title">
              Subject Progress
            </div>

            <div class="muted">
              Independent progress for each subject
            </div>
          </div>

        </div>

        <div style="margin-top:14px">

          ${
            state.subjects.length
              ? state.subjects
                  .map(renderSubjectProgress)
                  .join("")
              : `
                <div class="empty">
                  Add subjects to see subject progress.
                </div>
              `
          }

        </div>

      </div>

      <div
        class="card"
        style="margin-top:14px">

        <div class="title">
          Chapter Progress
        </div>

        <div class="muted" style="margin-top:4px">
          Independent progress for every chapter
        </div>

        <div style="margin-top:14px">

          ${
            totalChapters
              ? state.subjects
                  .map(subject =>
                    subject.chapters
                      .map(chapter =>
                        renderChapterProgress(
                          subject,
                          chapter
                        )
                      )
                      .join("")
                  )
                  .join("")
              : `
                <div class="empty">
                  Add chapters to see chapter progress.
                </div>
              `
          }

        </div>

      </div>

      <div
        class="card"
        style="margin-top:14px">

        <div class="row">

          <div>
            <div class="title">
              Today's Revisions
            </div>

            <div class="muted">
              ${today} pending
            </div>
          </div>

          <button
            class="btn small"
            onclick="goPage('today')">
            Open
          </button>

        </div>

      </div>

    </section>
  `;
}

function renderSubjectProgress(subject) {
  const progress =
    getSubjectProgress(subject);

  return `
    <div class="progress-item">

      <div class="progress-row">

        <div class="progress-name">
          ${escapeHTML(subject.name)}
        </div>

        <strong>
          ${progress}%
        </strong>

      </div>

      ${renderProgressBar(progress)}

    </div>
  `;
}

function renderChapterProgress(subject, chapter) {
  const progress =
    getChapterProgress(chapter);

  return `
    <div class="chapter-progress-item">

      <div class="progress-row">

        <div>
          <div class="progress-name">
            ${escapeHTML(chapter.name)}
          </div>

          <div class="muted">
            ${escapeHTML(subject.name)}
          </div>
        </div>

        <strong>
          ${progress}%
        </strong>

      </div>

      ${renderProgressBar(progress)}

    </div>
  `;
}

/* =========================================================
   SUBJECTS
   ========================================================= */

function renderSubjects() {
  return `
    <section>

      <div class="row">

        <div>
          <h1 class="page-title">
            Subjects
          </h1>

          <p class="page-subtitle">
            Add subjects and chapters.
          </p>
        </div>

        <button
          class="btn"
          onclick="openSubjectModal()">
          + Subject
        </button>

      </div>

      <div style="margin-top:15px">

        ${
          state.subjects.length
            ? state.subjects
                .map(renderSubjectCard)
                .join("")
            : `
              <div class="card empty">
                No subjects yet.
                <br><br>
                Add your first subject.
              </div>
            `
        }

      </div>

    </section>
  `;
}

function renderSubjectCard(subject) {
  const subjectProgress =
    getSubjectProgress(subject);

  return `
    <div class="card subject-card">

      <div class="row">

        <div>
          <div class="title">
            ${escapeHTML(subject.name)}
          </div>

          <div class="muted">
            ${subject.chapters.length}
            chapters
          </div>
        </div>

        <div class="actions">

          <button
            class="btn small secondary"
            onclick="openSubjectModal('${subject.id}')">
            Edit
          </button>

          <button
            class="btn small danger"
            onclick="deleteSubject('${subject.id}')">
            Delete
          </button>

        </div>

      </div>

      <div class="subject-progress-box">

        <div class="progress-row">

          <span>
            Subject Progress
          </span>

          <strong>
            ${subjectProgress}%
          </strong>

        </div>

        ${renderProgressBar(subjectProgress)}

      </div>

      <div style="margin-top:12px">

        ${
          subject.chapters.length
            ? subject.chapters
                .map(chapter =>
                  renderChapterCard(
                    subject,
                    chapter
                  )
                )
                .join("")
            : `
              <div class="empty">
                No chapters.
              </div>
            `
        }

      </div>

      <button
        class="btn full"
        onclick="openChapterModal('${subject.id}')">
        + Add Chapter
      </button>

    </div>
  `;
}

function renderChapterCard(subject, chapter) {
  const completed =
    completedCount(chapter);

  const total =
    totalRevisionSteps();

  const progress =
    getChapterProgress(chapter);

  return `
    <div class="card chapter-card">

      <div class="row">

        <div>
          <div class="title">
            ${escapeHTML(chapter.name)}
          </div>

          <div class="muted">
            Started:
            ${formatDate(chapter.startDate)}
          </div>

          <div
            class="badge"
            style="margin-top:7px">
            ${completed}/${total}
            revisions
          </div>
        </div>

        <div class="actions">

          <button
            class="btn small secondary"
            onclick="openChapterModal(
              '${subject.id}',
              '${chapter.id}'
            )">
            Edit
          </button>

          <button
            class="btn small secondary"
            onclick="openNotes('${chapter.id}')">
            📝 Notes
          </button>

        </div>

      </div>

      <div class="chapter-progress-box">

        <div class="progress-row">

          <span>
            Chapter Progress
          </span>

          <strong>
            ${progress}%
          </strong>

        </div>

        ${renderProgressBar(progress)}

      </div>

      <div
        class="actions"
        style="margin-top:10px">

        <button
          class="btn small secondary"
          onclick="openMoveModal('${chapter.id}')">
          Move
        </button>

        <button
          class="btn small danger"
          onclick="deleteChapter('${chapter.id}')">
          Delete
        </button>

      </div>

    </div>
  `;
}

/* =========================================================
   TODAY
   ========================================================= */

function renderToday() {
  const today = dueTodayItems();
  const incomplete = incompleteItems();

  return `
    <section>

      <h1 class="page-title">
        Today's Revisions
      </h1>

      <p class="page-subtitle">
        Complete each revision.
      </p>

      <div class="card">

        <div class="row">

          <div class="title">
            Due Today
          </div>

          <span class="badge">
            ${today.length}
          </span>

        </div>

        <div style="margin-top:12px">

          ${
            today.length
              ? today.map(renderRevisionCard).join("")
              : `
                <div class="empty">
                  🎉 No revisions pending today.
                </div>
              `
          }

        </div>

      </div>

      <div
        class="card"
        style="margin-top:15px">

        <div class="row">

          <div>
            <div class="title">
              Incomplete Revisions
            </div>

            <div class="muted">
              Missed revisions
            </div>
          </div>

          <span class="badge danger">
            ${incomplete.length}
          </span>

        </div>

        <div style="margin-top:12px">

          ${
            incomplete.length
              ? incomplete
                  .map(renderRevisionCard)
                  .join("")
              : `
                <div class="empty">
                  No incomplete revisions.
                </div>
              `
          }

        </div>

      </div>

    </section>
  `;
}

function renderRevisionCard(item) {
  const lateDays =
    Math.max(
      0,
      daysBetween(item.date, todayISO())
    );

  const checked =
    !!item.completion?.checked;

  return `
    <div class="card revision-card">

      <div class="row">

        <div>

          <div class="title">
            ${escapeHTML(item.chapter.name)}
          </div>

          <div class="muted">
            ${escapeHTML(item.subject.name)}
          </div>

          <div
            class="badge"
            style="margin-top:7px">
            ${escapeHTML(item.rule.name)}
          </div>

          ${
            lateDays > 0
              ? `
                <div
                  class="late"
                  style="margin-top:7px">
                  ${lateDays} day(s) late
                </div>
              `
              : ""
          }

        </div>

        <button
          class="checkbox ${checked ? "done" : ""}"
          onclick="toggleRevisionCheck(
            '${item.chapter.id}',
            '${item.rule.id}'
          )">

          ${checked ? "✓" : ""}

        </button>

      </div>

      <div
        class="muted"
        style="margin-top:10px">

        Due:
        ${formatDate(item.date)}

      </div>

      <button
        class="btn full"
        style="margin-top:10px"
        ${checked ? "" : "disabled"}
        onclick="submitRevision(
          '${item.chapter.id}',
          '${item.rule.id}'
        )">

        ✓ Submit Revision

      </button>

    </div>
  `;
}

/* =========================================================
   PLANNER
   ========================================================= */

function renderPlanner() {
  const items =
    getRevisionItems()
      .filter(item => !item.completion?.submitted)
      .sort((a, b) =>
        a.date.localeCompare(b.date)
      );

  return `
    <section>

      <h1 class="page-title">
        Planner
      </h1>

      <p class="page-subtitle">
        Upcoming revision schedule.
      </p>

      <div class="card">

        ${
          items.length
            ? items
                .map(item => `
                  <div
                    class="card"
                    style="margin-bottom:10px">

                    <div class="row">

                      <div>
                        <div class="title">
                          ${escapeHTML(item.chapter.name)}
                        </div>

                        <div class="muted">
                          ${escapeHTML(item.subject.name)}
                        </div>

                        <span
                          class="badge"
                          style="margin-top:6px">
                          ${escapeHTML(item.rule.name)}
                        </span>
                      </div>

                      <div class="muted">
                        ${formatDate(item.date)}
                      </div>

                    </div>

                  </div>
                `)
                .join("")
            : `
              <div class="empty">
                No upcoming revisions.
              </div>
            `
        }

      </div>

    </section>
  `;
}

/* =========================================================
   SETTINGS
   ========================================================= */

function renderSettings() {
  return `
    <section>

      <h1 class="page-title">
        Settings
      </h1>

      <p class="page-subtitle">
        Manage your Revision Tracker.
      </p>

      <div class="card">

        <div class="title">
          🎯 Exam Countdown
        </div>

        <p class="muted" style="margin-top:6px">
          Set your exam date to show the countdown
          on the Home screen.
        </p>

        <div class="form-group" style="margin-top:12px">

          <label>
            Exam Date
          </label>

          <input
            id="examDateInput"
            type="date"
            value="${escapeHTML(
              state.settings.examDate || ""
            )}">

        </div>

        <button
          class="btn full"
          onclick="saveExamDate()">
          Save Exam Date
        </button>

        ${
          state.settings.examDate
            ? `
              <div
                class="exam-settings-info"
                style="margin-top:10px">

                Current Exam Date:
                <strong>
                  ${formatDate(
                    state.settings.examDate
                  )}
                </strong>

              </div>
            `
            : ""
        }

      </div>

      <div
        class="card"
        style="margin-top:14px">

        <div class="title">
          Revision System
        </div>

        <div style="margin-top:12px">

          ${state.revisionSystem
            .map(rule => `
              <div class="system-row">

                <input
                  value="${escapeHTML(rule.name)}"
                  data-rule-name="${rule.id}">

                <input
                  class="day-input"
                  type="number"
                  min="1"
                  value="${Number(rule.day)}"
                  data-rule-day="${rule.id}">

              </div>
            `)
            .join("")}

        </div>

        <button
          class="btn full"
          onclick="saveRevisionSystem()">
          Save Revision System
        </button>

      </div>

      <div
        class="card"
        style="margin-top:14px">

        <div class="title">
          Notifications
        </div>

        <label
          style="
            display:flex;
            align-items:center;
            gap:10px;
            margin-top:12px;
          ">

          <input
            type="checkbox"
            ${
              state.settings.notifications
                ? "checked"
                : ""
            }
            onchange="toggleNotifications(this.checked)">

          Enable notifications

        </label>

      </div>

      <div
        class="card"
        style="margin-top:14px">

        <div class="title">
          Data
        </div>

        <p class="muted" style="margin-top:7px">
          Your study data and uploaded files
          are stored locally on this device.
        </p>

        <button
          class="btn danger full"
          style="margin-top:12px"
          onclick="clearAllData()">
          Delete All Data
        </button>

      </div>

    </section>
  `;
}

async function saveExamDate() {
  const input =
    document.getElementById(
      "examDateInput"
    );

  const value =
    input?.value || "";

  if (!value) {
    toast("Select an exam date.");
    return;
  }

  state.settings.examDate =
    value;

  await saveState();

  render();

  toast("Exam date saved.");
}

/* =========================================================
   MODALS
   ========================================================= */

function openModal(html) {
  const root =
    document.getElementById("modalRoot");

  root.innerHTML = `
    <div
      class="modal-bg"
      onclick="closeModal(event)">

      <div
        class="modal"
        onclick="event.stopPropagation()">

        ${html}

      </div>

    </div>
  `;
}

function closeModal(event) {
  if (
    event &&
    event.target !== event.currentTarget
  ) {
    return;
  }

  document.getElementById(
    "modalRoot"
  ).innerHTML = "";
}

/* =========================================================
   SUBJECT MODAL
   ========================================================= */

function openSubjectModal(subjectId = null) {
  const subject =
    subjectId
      ? findSubject(subjectId)
      : null;

  openModal(`
    <h2>
      ${subject ? "Edit Subject" : "Add Subject"}
    </h2>

    <div class="form-group">

      <label>
        Subject Name
      </label>

      <input
        id="subjectNameInput"
        value="${escapeHTML(subject?.name || "")}"
        placeholder="e.g. Physics">

    </div>

    <div class="actions">

      <button
        class="btn secondary"
        onclick="closeModal()">
        Cancel
      </button>

      <button
        class="btn"
        onclick="saveSubject(
          ${subjectId ? `'${subjectId}'` : "null"}
        )">
        Save
      </button>

    </div>
  `);
}

async function saveSubject(subjectId) {
  const input =
    document.getElementById(
      "subjectNameInput"
    );

  const name =
    input?.value.trim();

  if (!name) {
    toast("Enter subject name.");
    return;
  }

  if (subjectId) {
    const subject =
      findSubject(subjectId);

    if (subject) {
      subject.name = name;
    }
  } else {
    state.subjects.push({
      id: uid(),
      name,
      chapters: []
    });
  }

  await saveState();

  closeModal();
  render();

  toast("Subject saved.");
}

async function deleteSubject(subjectId) {
  const subject =
    findSubject(subjectId);

  if (!subject) return;

  if (
    !confirm(
      `Delete "${subject.name}" and all its chapters/files?`
    )
  ) {
    return;
  }

  for (const chapter of subject.chapters) {
    const files =
      await dbGetByChapter(chapter.id);

    for (const file of files) {
      await dbDelete(
        FILE_STORE,
        file.id
      );
    }
  }

  state.subjects =
    state.subjects.filter(
      item => item.id !== subjectId
    );

  await saveState();

  render();

  toast("Subject deleted.");
}

/* =========================================================
   CHAPTER MODAL
   ========================================================= */

function openChapterModal(
  subjectId,
  chapterId = null
) {
  const subject =
    findSubject(subjectId);

  if (!subject) return;

  const chapter =
    chapterId
      ? subject.chapters.find(
          item => item.id === chapterId
        )
      : null;

  openModal(`
    <h2>
      ${chapter ? "Edit Chapter" : "Add Chapter"}
    </h2>

    <div class="form-group">

      <label>
        Chapter Name
      </label>

      <input
        id="chapterNameInput"
        value="${escapeHTML(chapter?.name || "")}"
        placeholder="e.g. Rotational Dynamics">

    </div>

    <div class="form-group">

      <label>
        Start Date
      </label>

      <input
        id="chapterDateInput"
        type="date"
        value="${chapter?.startDate || todayISO()}">

    </div>

    <div class="actions">

      <button
        class="btn secondary"
        onclick="closeModal()">
        Cancel
      </button>

      <button
        class="btn"
        onclick="saveChapter(
          '${subjectId}',
          ${chapterId ? `'${chapterId}'` : "null"}
        )">
        Save
      </button>

    </div>
  `);
}

async function saveChapter(
  subjectId,
  chapterId
) {
  const subject =
    findSubject(subjectId);

  if (!subject) return;

  const name =
    document
      .getElementById("chapterNameInput")
      ?.value.trim();

  const startDate =
    document
      .getElementById("chapterDateInput")
      ?.value;

  if (!name) {
    toast("Enter chapter name.");
    return;
  }

  if (!startDate) {
    toast("Select start date.");
    return;
  }

  if (chapterId) {
    const chapter =
      subject.chapters.find(
        item => item.id === chapterId
      );

    if (chapter) {
      chapter.name = name;
      chapter.startDate = startDate;
    }
  } else {
    subject.chapters.push({
      id: uid(),
      name,
      startDate,
      revisions: {}
    });
  }

  await saveState();

  closeModal();
  render();

  toast("Chapter saved.");
}

async function deleteChapter(chapterId) {
  const found =
    findChapter(chapterId);

  if (!found) return;

  if (
    !confirm(
      `Delete "${found.chapter.name}"?`
    )
  ) {
    return;
  }

  const files =
    await dbGetByChapter(chapterId);

  for (const file of files) {
    await dbDelete(
      FILE_STORE,
      file.id
    );
  }

  found.subject.chapters =
    found.subject.chapters.filter(
      chapter =>
        chapter.id !== chapterId
    );

  await saveState();

  render();

  toast("Chapter deleted.");
}

/* =========================================================
   MOVE CHAPTER
   ========================================================= */

function openMoveModal(chapterId) {
  const found =
    findChapter(chapterId);

  if (!found) return;

  const options =
    state.subjects
      .filter(
        subject =>
          subject.id !== found.subject.id
      )
      .map(
        subject => `
          <option value="${subject.id}">
            ${escapeHTML(subject.name)}
          </option>
        `
      )
      .join("");

  if (!options) {
    toast("Add another subject first.");
    return;
  }

  openModal(`
    <h2>
      Move Chapter
    </h2>

    <div class="form-group">

      <label>
        Move to subject
      </label>

      <select id="moveSubjectInput">
        ${options}
      </select>

    </div>

    <div class="actions">

      <button
        class="btn secondary"
        onclick="closeModal()">
        Cancel
      </button>

      <button
        class="btn"
        onclick="moveChapter('${chapterId}')">
        Move
      </button>

    </div>
  `);
}

async function moveChapter(chapterId) {
  const found =
    findChapter(chapterId);

  const targetId =
    document
      .getElementById("moveSubjectInput")
      ?.value;

  const target =
    findSubject(targetId);

  if (!found || !target) return;

  found.subject.chapters =
    found.subject.chapters.filter(
      chapter =>
        chapter.id !== chapterId
    );

  target.chapters.push(
    found.chapter
  );

  await saveState();

  closeModal();
  render();

  toast("Chapter moved.");
}

/* =========================================================
   REVISION ACTIONS
   ========================================================= */

async function toggleRevisionCheck(
  chapterId,
  ruleId
) {
  const found =
    findChapter(chapterId);

  if (!found) return;

  if (!found.chapter.revisions) {
    found.chapter.revisions = {};
  }

  const current =
    found.chapter.revisions[ruleId] || {};

  current.checked =
    !current.checked;

  found.chapter.revisions[ruleId] =
    current;

  await saveState();
  render();
}

async function submitRevision(
  chapterId,
  ruleId
) {
  const found =
    findChapter(chapterId);

  if (!found) return;

  if (!found.chapter.revisions) {
    found.chapter.revisions = {};
  }

  found.chapter.revisions[ruleId] = {
    checked: true,
    submitted: true,
    submittedAt: new Date().toISOString()
  };

  await saveState();

  render();

  toast("Revision completed ✓");
}

/* =========================================================
   NOTES
   ========================================================= */

async function openNotes(chapterId) {
  const found =
    findChapter(chapterId);

  if (!found) return;

  const files =
    await dbGetByChapter(chapterId);

  openModal(`
    <div class="row">

      <div>
        <h2>
          Notes
        </h2>

        <div class="muted">
          ${escapeHTML(found.chapter.name)}
        </div>
      </div>

      <button
        class="btn small secondary"
        onclick="closeModal()">
        Close
      </button>

    </div>

    <div
      class="card"
      style="margin-top:12px">

      <div class="form-group">

        <label>
          Add file
        </label>

        <input
          id="fileInput"
          type="file"
          accept=".pdf,image/*,video/*,.txt,.doc,.docx"
          multiple>

      </div>

      <button
        class="btn full"
        onclick="uploadChapterFiles('${chapterId}')">
        Upload Files
      </button>

    </div>

    <div
      id="filesContainer"
      style="margin-top:12px">

      ${renderFiles(files)}

    </div>
  `);
}

function renderFiles(files) {
  if (!files.length) {
    return `
      <div class="card empty">
        No files uploaded yet.
      </div>
    `;
  }

  return `
    <div class="file-grid">

      ${files
        .map(file => {
          const type =
            file.type ||
            "";

          const isPDF =
            type === "application/pdf" ||
            file.name
              ?.toLowerCase()
              .endsWith(".pdf");

          const isImage =
            type.startsWith("image/");

          const isVideo =
            type.startsWith("video/");

          if (isPDF) {
            return `
              <div class="media-box">

                <div
                  class="pdf-preview">
                  📄
                </div>

                <div class="media-info">

                  <div class="title">
                    ${escapeHTML(file.name)}
                  </div>

                  <div class="actions"
                       style="margin-top:7px">

                    <button
                      class="btn small"
                      onclick="viewStoredFile('${file.id}')">
                      Open PDF
                    </button>

                    <button
                      class="btn small danger"
                      onclick="deleteStoredFile('${file.id}')">
                      Delete
                    </button>

                  </div>

                </div>

              </div>
            `;
          }

          if (isImage) {
            return `
              <div class="media-box">

                <img
                  src="${file.previewUrl || ""}"
                  alt="${escapeHTML(file.name)}">

                <div class="media-info">

                  <div class="title">
                    ${escapeHTML(file.name)}
                  </div>

                  <div class="actions"
                       style="margin-top:7px">

                    <button
                      class="btn small"
                      onclick="viewStoredFile('${file.id}')">
                      Open
                    </button>

                    <button
                      class="btn small danger"
                      onclick="deleteStoredFile('${file.id}')">
                      Delete
                    </button>

                  </div>

                </div>

              </div>
            `;
          }

          if (isVideo) {
            return `
              <div class="media-box">

                <video
                  controls
                  src="${file.previewUrl || ""}">
                </video>

                <div class="media-info">

                  <div class="title">
                    ${escapeHTML(file.name)}
                  </div>

                  <div class="actions"
                       style="margin-top:7px">

                    <button
                      class="btn small danger"
                      onclick="deleteStoredFile('${file.id}')">
                      Delete
                    </button>

                  </div>

                </div>

              </div>
            `;
          }

          return `
            <div class="media-box">

              <div class="pdf-preview">
                📎
              </div>

              <div class="media-info">

                <div class="title">
                  ${escapeHTML(file.name)}
                </div>

                <div class="actions"
                     style="margin-top:7px">

                  <button
                    class="btn small"
                    onclick="viewStoredFile('${file.id}')">
                    Open
                  </button>

                  <button
                    class="btn small danger"
                    onclick="deleteStoredFile('${file.id}')">
                    Delete
                  </button>

                </div>

              </div>

            </div>
          `;
        })
        .join("")}

    </div>
  `;
}

/* =========================================================
   UPLOAD FILES
   ========================================================= */

async function uploadChapterFiles(chapterId) {
  const input =
    document.getElementById("fileInput");

  if (!input || !input.files.length) {
    toast("Select a file first.");
    return;
  }

  try {
    for (const file of input.files) {

      const storedFile = {
        id: uid(),
        chapterId,
        name: file.name,
        type: file.type || getMimeType(file.name),
        size: file.size,
        createdAt: new Date().toISOString(),
        blob: file
      };

      await dbPut(
        FILE_STORE,
        storedFile
      );
    }

    toast("File uploaded successfully.");

    await openNotes(chapterId);

  } catch (error) {
    console.error(
      "File upload error:",
      error
    );

    toast("File could not be uploaded.");
  }
}

/* =========================================================
   PDF / STORED FILE OPEN
   ========================================================= */

async function viewStoredFile(fileId) {
  try {
    const storedFile =
      await dbGet(
        FILE_STORE,
        fileId
      );

    if (!storedFile) {
      toast("File not found.");
      return;
    }

    if (!storedFile.blob) {
      toast(
        "This old file is not stored correctly. Please upload it again."
      );
      return;
    }

    const blob =
      storedFile.blob instanceof Blob
        ? storedFile.blob
        : new Blob(
            [storedFile.blob],
            {
              type:
                storedFile.type ||
                "application/octet-stream"
            }
          );

    const blobUrl =
      URL.createObjectURL(blob);

    const newWindow =
      window.open(
        blobUrl,
        "_blank"
      );

    if (!newWindow) {
      const link =
        document.createElement("a");

      link.href = blobUrl;
      link.target = "_blank";
      link.rel = "noopener";

      document.body.appendChild(link);

      link.click();

      link.remove();
    }

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);

  } catch (error) {
    console.error(
      "Open stored file error:",
      error
    );

    toast(
      "Could not open this file."
    );
  }
}

/* =========================================================
   FILE PREVIEW URL
   ========================================================= */

async function prepareFilePreviews(files) {
  return files.map(file => {

    if (
      file.blob &&
      (
        file.type?.startsWith("image/") ||
        file.type?.startsWith("video/")
      )
    ) {
      file.previewUrl =
        URL.createObjectURL(file.blob);
    }

    return file;
  });
}

/* =========================================================
   DELETE STORED FILE
   ========================================================= */

async function deleteStoredFile(fileId) {
  if (
    !confirm(
      "Delete this file?"
    )
  ) {
    return;
  }

  try {
    const file =
      await dbGet(
        FILE_STORE,
        fileId
      );

    if (file?.previewUrl) {
      URL.revokeObjectURL(
        file.previewUrl
      );
    }

    await dbDelete(
      FILE_STORE,
      fileId
    );

    toast("File deleted.");

    if (file?.chapterId) {
      await openNotes(
        file.chapterId
      );
    }

  } catch (error) {
    console.error(
      "Delete file error:",
      error
    );

    toast("File could not be deleted.");
  }
}

/* =========================================================
   MIME TYPE
   ========================================================= */

function getMimeType(fileName) {
  const name =
    String(fileName || "")
      .toLowerCase();

  if (name.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (name.endsWith(".png")) {
    return "image/png";
  }

  if (name.endsWith(".webp")) {
    return "image/webp";
  }

  if (name.endsWith(".mp4")) {
    return "video/mp4";
  }

  if (name.endsWith(".webm")) {
    return "video/webm";
  }

  if (name.endsWith(".txt")) {
    return "text/plain";
  }

  return "application/octet-stream";
}

/* =========================================================
   REVISION SETTINGS
   ========================================================= */

async function saveRevisionSystem() {
  const updated = [];

  for (const rule of state.revisionSystem) {

    const nameInput =
      document.querySelector(
        `[data-rule-name="${rule.id}"]`
      );

    const dayInput =
      document.querySelector(
        `[data-rule-day="${rule.id}"]`
      );

    const name =
      nameInput?.value.trim();

    const day =
      Number(dayInput?.value);

    if (!name || !day || day < 1) {
      toast("Enter valid revision values.");
      return;
    }

    updated.push({
      ...rule,
      name,
      day
    });
  }

  state.revisionSystem =
    updated.sort(
      (a, b) => a.day - b.day
    );

  await saveState();

  render();

  toast("Revision system saved.");
}

async function toggleNotifications(value) {
  state.settings.notifications =
    !!value;

  await saveState();

  toast(
    value
      ? "Notifications enabled."
      : "Notifications disabled."
  );
}

/* =========================================================
   CLEAR DATA
   ========================================================= */

async function clearAllData() {
  const answer =
    confirm(
      "This will delete all subjects, chapters, revisions and uploaded files. Continue?"
    );

  if (!answer) return;

  try {
    const files =
      await dbGetAll(FILE_STORE);

    for (const file of files) {
      await dbDelete(
        FILE_STORE,
        file.id
      );
    }

    state = {
      subjects: [],
      revisionSystem:
        createDefaultRevisionSystem(),
      settings: {
        notifications: true,
        examDate: ""
      }
    };

    await saveState();

    render();

    toast("All data deleted.");

  } catch (error) {
    console.error(
      "Clear data error:",
      error
    );

    toast("Could not clear data.");
  }
}

/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.goPage = goPage;

window.openSubjectModal =
  openSubjectModal;

window.saveSubject =
  saveSubject;

window.deleteSubject =
  deleteSubject;

window.openChapterModal =
  openChapterModal;

window.saveChapter =
  saveChapter;

window.deleteChapter =
  deleteChapter;

window.openMoveModal =
  openMoveModal;

window.moveChapter =
  moveChapter;

window.openNotes =
  openNotes;

window.uploadChapterFiles =
  uploadChapterFiles;

window.viewStoredFile =
  viewStoredFile;

window.deleteStoredFile =
  deleteStoredFile;

window.toggleRevisionCheck =
  toggleRevisionCheck;

window.submitRevision =
  submitRevision;

window.saveRevisionSystem =
  saveRevisionSystem;

window.toggleNotifications =
  toggleNotifications;

window.saveExamDate =
  saveExamDate;

window.clearAllData =
  clearAllData;

window.closeModal =
  closeModal;
