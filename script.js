"use strict";

/* =========================================================
   REVISION TRACKER
   Offline-first PWA
   ========================================================= */

const APP_NAME = "Revision Tracker";
const DB_NAME = "revision_tracker_offline_db";
const DB_VERSION = 2;

const DATA_STORE = "appData";
const FILE_STORE = "notesFiles";

let db = null;
let currentPage = "home";

function makeId() {
  if (window.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2)
  );
}

/* =========================================================
   DEFAULT REVISION SYSTEM
   ========================================================= */

function createDefaultRevisionSystem() {
  return [
    {
      id: makeId(),
      name: "Chapter Start",
      day: 1,
      final: false
    },
    {
      id: makeId(),
      name: "Revision 1",
      day: 2,
      final: false
    },
    {
      id: makeId(),
      name: "Revision 2",
      day: 4,
      final: false
    },
    {
      id: makeId(),
      name: "Revision 3",
      day: 8,
      final: false
    },
    {
      id: makeId(),
      name: "Revision 4",
      day: 16,
      final: false
    },
    {
      id: makeId(),
      name: "Revision 5",
      day: 32,
      final: false
    },
    {
      id: makeId(),
      name: "Final Revision",
      day: 65,
      final: true
    }
  ];
}

let state = {
  subjects: [],
  revisionSystem: createDefaultRevisionSystem(),
  settings: {
    notifications: true
  }
};

/* =========================================================
   START APP
   ========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
  try {
    await initDB();
    await loadState();
    registerServiceWorker();
    render();
  } catch (error) {
    console.error("Startup error:", error);

    try {
      render();
    } catch (renderError) {
      console.error(renderError);
    }
  }
});

/* =========================================================
   INDEXED DB
   ========================================================= */

function initDB() {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
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

    request.onsuccess = function (event) {
      db = event.target.result;

      db.onversionchange = function () {
        db.close();
      };

      resolve();
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

function dbPut(storeName, value) {
  return new Promise(function (resolve, reject) {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    transaction.objectStore(storeName).put(value);

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function () {
      reject(transaction.error);
    };
  });
}

function dbGet(storeName, key) {
  return new Promise(function (resolve, reject) {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const request = db
      .transaction(storeName, "readonly")
      .objectStore(storeName)
      .get(key);

    request.onsuccess = function () {
      resolve(request.result);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

function dbGetAll(storeName) {
  return new Promise(function (resolve, reject) {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const request = db
      .transaction(storeName, "readonly")
      .objectStore(storeName)
      .getAll();

    request.onsuccess = function () {
      resolve(request.result || []);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

function dbDelete(storeName, key) {
  return new Promise(function (resolve, reject) {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    transaction.objectStore(storeName).delete(key);

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function () {
      reject(transaction.error);
    };
  });
}

function dbClear(storeName) {
  return new Promise(function (resolve, reject) {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    transaction.objectStore(storeName).clear();

    transaction.oncomplete = function () {
      resolve();
    };

    transaction.onerror = function () {
      reject(transaction.error);
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
  const saved = await dbGet(DATA_STORE, "main");

  if (saved && saved.value) {
    state = saved.value;
  }

  if (!state || typeof state !== "object") {
    state = {
      subjects: [],
      revisionSystem: createDefaultRevisionSystem(),
      settings: {
        notifications: true
      }
    };
  }

  if (!Array.isArray(state.subjects)) {
    state.subjects = [];
  }

  state.subjects.forEach(function (subject) {
    if (!Array.isArray(subject.chapters)) {
      subject.chapters = [];
    }

    subject.chapters.forEach(function (chapter) {
      if (!chapter.revisions) {
        chapter.revisions = {};
      }
    });
  });

  if (!Array.isArray(state.revisionSystem)) {
    state.revisionSystem = createDefaultRevisionSystem();
  }

  if (!state.settings) {
    state.settings = {
      notifications: true
    };
  }
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
      .catch(function (error) {
        console.warn("Service worker error:", error);
      });
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function todayISO() {
  const date = new Date();

  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function dateFromISO(value) {
  if (!value) {
    return new Date();
  }

  const parts = value.split("-").map(Number);

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return dateFromISO(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function daysBetween(firstDate, secondDate) {
  const a = new Date(firstDate);
  const b = new Date(secondDate);

  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);

  return Math.round(
    (b.getTime() - a.getTime()) / 86400000
  );
}

function findSubject(subjectId) {
  return state.subjects.find(function (subject) {
    return subject.id === subjectId;
  });
}

function findChapter(chapterId) {
  for (const subject of state.subjects) {
    const chapter = subject.chapters.find(function (item) {
      return item.id === chapterId;
    });

    if (chapter) {
      return {
        chapter: chapter,
        subject: subject
      };
    }
  }

  return null;
}

function toast(message) {
  const old = document.querySelector(".toast");

  if (old) {
    old.remove();
  }

  const element = document.createElement("div");

  element.className = "toast";
  element.textContent = message;

  document.body.appendChild(element);

  setTimeout(function () {
    element.remove();
  }, 2500);
}

/* =========================================================
   REVISION SYSTEM
   ========================================================= */

function getRevisionDates(chapter) {
  if (!chapter || !chapter.startDate) {
    return [];
  }

  return state.revisionSystem.map(function (rule) {
    const date = dateFromISO(chapter.startDate);

    /*
      Day 1 = Chapter Start.
      Therefore:
      Day 1 -> +0
      Day 2 -> +1
      Day 4 -> +3
      Day 8 -> +7
      Day 16 -> +15
      Day 32 -> +31
      Day 65 -> +64
    */

    date.setDate(
      date.getDate() + Number(rule.day) - 1
    );

    const iso =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");

    return {
      rule: rule,
      date: iso
    };
  });
}

function getRevisionItems() {
  const result = [];

  state.subjects.forEach(function (subject) {
    subject.chapters.forEach(function (chapter) {
      getRevisionDates(chapter).forEach(function (item) {
        if (
          item.rule.name === "Chapter Start" ||
          item.rule.day === 1
        ) {
          return;
        }

        const completion =
          chapter.revisions &&
          chapter.revisions[item.rule.id]
            ? chapter.revisions[item.rule.id]
            : null;

        result.push({
          subject: subject,
          chapter: chapter,
          rule: item.rule,
          date: item.date,
          completion: completion
        });
      });
    });
  });

  return result;
}

function dueTodayItems() {
  const today = todayISO();

  return getRevisionItems().filter(function (item) {
    return (
      item.date === today &&
      !(
        item.completion &&
        item.completion.submitted
      )
    );
  });
}

function incompleteItems() {
  const today = todayISO();

  return getRevisionItems().filter(function (item) {
    return (
      item.date < today &&
      !(
        item.completion &&
        item.completion.submitted
      )
    );
  });
}

function completedCount(chapter) {
  if (!chapter.revisions) {
    return 0;
  }

  return Object.values(chapter.revisions).filter(
    function (value) {
      return value && value.submitted;
    }
  ).length;
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

function render() {
  renderMain();
  updateNav();
}

function updateNav() {
  document.querySelectorAll(".nav-item").forEach(
    function (button) {
      button.classList.toggle(
        "active",
        button.dataset.page === currentPage
      );
    }
  );
}

function renderMain() {
  const main =
    document.getElementById("mainContent");

  if (!main) {
    return;
  }

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
  } else {
    currentPage = "home";
    main.innerHTML = renderHome();
  }
}

/* =========================================================
   HOME
   ========================================================= */

function renderHome() {
  const totalChapters =
    state.subjects.reduce(function (sum, subject) {
      return sum + subject.chapters.length;
    }, 0);

  const today = dueTodayItems().length;
  const incomplete = incompleteItems().length;

  const completed =
    state.subjects.reduce(function (sum, subject) {
      return (
        sum +
        subject.chapters.reduce(function (
          number,
          chapter
        ) {
          return number + completedCount(chapter);
        }, 0)
      );
    }, 0);

  const totalRevisions =
    totalChapters *
    Math.max(
      0,
      state.revisionSystem.length - 1
    );

  const progress =
    totalRevisions === 0
      ? 0
      : Math.round(
          (completed / totalRevisions) * 100
        );

  return `
    <section>

      <h1 class="page-title">
        Good day 👋
      </h1>

      <p class="page-subtitle">
        Let's make today productive.
      </p>

      <div class="card hero">

        <div class="row">

          <div>
            <div class="muted">
              Overall Progress
            </div>

            <div class="stat-number">
              ${Math.min(progress, 100)}%
            </div>
          </div>

          <div style="font-size:40px">
            📚
          </div>

        </div>

        <div class="progress">

          <div
            style="width:${Math.min(progress, 100)}%">
          </div>

        </div>

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
            Add unlimited subjects and chapters.
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
                No subjects yet.<br><br>
                Add your first subject.
              </div>
            `
        }

      </div>

    </section>
  `;
}

function renderSubjectCard(subject) {
  return `
    <div class="card subject-card">

      <div class="row">

        <div>
          <div class="title">
            ${escapeHTML(subject.name)}
          </div>

          <div class="muted">
            ${subject.chapters.length} chapters
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

      <div style="margin-top:12px">

        ${
          subject.chapters.length
            ? subject.chapters
                .map(function (chapter) {
                  return renderChapterCard(
                    subject,
                    chapter
                  );
                })
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
  const completed = completedCount(chapter);

  const total = Math.max(
    0,
    state.revisionSystem.length - 1
  );

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

            ${completed}/${total} revisions

          </div>

        </div>

        <div class="actions">

          <button
            class="btn small secondary"
            onclick="
              openChapterModal(
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
        Complete and submit each revision.
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
              ? today
                  .map(renderRevisionCard)
                  .join("")
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
              Revisions that were missed
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
  const lateDays = Math.max(
    0,
    daysBetween(
      dateFromISO(item.date),
      dateFromISO(todayISO())
    )
  );

  const checked = Boolean(
    item.completion &&
    item.completion.checked
  );

  const submitted = Boolean(
    item.completion &&
    item.completion.submitted
  );

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

        </div>

        ${
          submitted
            ? `
              <div class="badge success">
                ✓ Final
              </div>
            `
            : `
              <button
                class="checkbox ${
                  checked ? "done" : ""
                }"
                onclick="
                  toggleRevisionCheck(
                    '${item.chapter.id}',
                    '${item.rule.id}'
                  )">

                ${checked ? "✓" : ""}

              </button>
            `
        }

      </div>

      <div
        style="margin-top:10px"
        class="muted">

        Scheduled:
        <strong>
          ${formatDate(item.date)}
        </strong>

      </div>

      ${
        lateDays > 0
          ? `
            <div
              class="late"
              style="margin-top:5px">

              ${lateDays} day(s) late

            </div>
          `
          : ""
      }

      ${
        checked && !submitted
          ? `
            <button
              class="btn full"
              style="margin-top:10px"
              onclick="
                confirmRevision(
                  '${item.chapter.id}',
                  '${item.rule.id}'
                )">

              ✓ Confirm / Submit Revision

            </button>
          `
          : ""
      }

    </div>
  `;
}

async function toggleRevisionCheck(
  chapterId,
  ruleId
) {
  const found = findChapter(chapterId);

  if (!found) {
    return;
  }

  const chapter = found.chapter;

  if (!chapter.revisions) {
    chapter.revisions = {};
  }

  const existing =
    chapter.revisions[ruleId] || {};

  if (existing.submitted) {
    toast("This revision is already final.");
    return;
  }

  chapter.revisions[ruleId] = {
    checked: !existing.checked,
    submitted: false
  };

  await saveState();
  render();
}

async function confirmRevision(
  chapterId,
  ruleId
) {
  const found = findChapter(chapterId);

  if (!found) {
    return;
  }

  const chapter = found.chapter;

  if (
    !chapter.revisions ||
    !chapter.revisions[ruleId] ||
    !chapter.revisions[ruleId].checked
  ) {
    toast("First tick the revision.");
    return;
  }

  const confirmed = window.confirm(
    "Submit this revision as FINAL?\n\n" +
    "After submission it will remain completed."
  );

  if (!confirmed) {
    return;
  }

  chapter.revisions[ruleId].submitted = true;
  chapter.revisions[ruleId].submittedAt =
    new Date().toISOString();

  await saveState();

  toast("Revision submitted successfully.");

  render();
}

/* =========================================================
   DATE PLANNER
   ========================================================= */

function renderPlanner() {
  return `
    <section>

      <h1 class="page-title">
        Date Planner
      </h1>

      <p class="page-subtitle">
        Enter any date to see its revisions.
      </p>

      <div class="card">

        <div class="form-group">

          <label>
            Select Date
          </label>

          <input
            type="date"
            id="plannerDate"
            value="${todayISO()}"
            onchange="showPlannerDate()">

        </div>

      </div>

      <div
        id="plannerResults"
        style="margin-top:14px">
      </div>

    </section>
  `;
}

function showPlannerDate() {
  const input =
    document.getElementById("plannerDate");

  const container =
    document.getElementById("plannerResults");

  if (!input || !container) {
    return;
  }

  const selectedDate = input.value;

  if (!selectedDate) {
    container.innerHTML = "";
    return;
  }

  const results =
    getRevisionItems().filter(function (item) {
      return item.date === selectedDate;
    });

  if (!results.length) {
    container.innerHTML = `
      <div class="card empty">

        No revision scheduled for
        ${formatDate(selectedDate)}.

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="card">

      <div class="title">
        Revisions for
        ${formatDate(selectedDate)}
      </div>

      <div style="margin-top:12px">

        ${results.map(function (item) {
          const submitted =
            item.completion &&
            item.completion.submitted;

          const isPast =
            selectedDate < todayISO();

          const isToday =
            selectedDate === todayISO();

          let status = "Upcoming
