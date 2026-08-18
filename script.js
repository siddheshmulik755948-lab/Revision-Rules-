"use strict";

/* =========================================================
   REVISION TRACKER
   Offline-first study/revision application
   ========================================================= */

const APP_NAME = "Revision Tracker";
const DB_NAME = "revision_tracker_offline_db";
const DB_VERSION = 1;

const DATA_STORE = "appData";
const FILE_STORE = "notesFiles";

let db = null;
let currentPage = "home";

/* =========================================================
   DEFAULT REVISION SYSTEM
   ========================================================= */

function createDefaultRevisionSystem() {
  return [
    { id: uid(), name: "Chapter Start", day: 1, final: false },
    { id: uid(), name: "Revision 1", day: 2, final: false },
    { id: uid(), name: "Revision 2", day: 4, final: false },
    { id: uid(), name: "Revision 3", day: 8, final: false },
    { id: uid(), name: "Revision 4", day: 16, final: false },
    { id: uid(), name: "Revision 5", day: 32, final: false },
    { id: uid(), name: "Final Revision", day: 65, final: true }
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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initDB();
    await loadState();
    registerServiceWorker();
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
    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    transaction.objectStore(storeName).put(value);

    transaction.oncomplete = () => resolve();

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      storeName,
      "readonly"
    );

    const request = transaction
      .objectStore(storeName)
      .get(key);

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
    const transaction = db.transaction(
      storeName,
      "readonly"
    );

    const request = transaction
      .objectStore(storeName)
      .getAll();

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
    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    transaction.objectStore(storeName).delete(key);

    transaction.oncomplete = () => resolve();

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

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

  if (!Array.isArray(state.subjects)) {
    state.subjects = [];
  }

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
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(error => {
        console.warn("Service Worker:", error);
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

  const year = d.getFullYear();
  const month = String(
    d.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    d.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  const first = new Date(a);
  const second = new Date(b);

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
      c => c.id === chapterId
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
  const old = document.querySelector(".toast");

  if (old) {
    old.remove();
  }

  const element = document.createElement("div");

  element.className = "toast";
  element.textContent = message;

  document.body.appendChild(element);

  setTimeout(() => {
    element.remove();
  }, 2500);
}

/* =========================================================
   REVISION CALCULATION
   ========================================================= */

function getRevisionDates(chapter) {
  if (!chapter.startDate) {
    return [];
  }

  return state.revisionSystem.map(rule => {
    const date = dateFromISO(
      chapter.startDate
    );

    /*
      Day 1 = Chapter Start
      Day 2 = Revision 1
      Day 4 = Revision 2
      etc.
    */

    date.setDate(
      date.getDate() +
      Number(rule.day) -
      1
    );

    const iso =
      date.getFullYear() +
      "-" +
      String(
        date.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        date.getDate()
      ).padStart(2, "0");

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
      const dates = getRevisionDates(chapter);

      dates.forEach(item => {
        if (
          item.rule.name === "Chapter Start"
        ) {
          return;
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
      });
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
  } else if (
    currentPage === "subjects"
  ) {
    main.innerHTML =
      renderSubjects();
  } else if (
    currentPage === "today"
  ) {
    main.innerHTML =
      renderToday();
  } else if (
    currentPage === "planner"
  ) {
    main.innerHTML =
      renderPlanner();
  } else if (
    currentPage === "settings"
  ) {
    main.innerHTML =
      renderSettings();
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

  const completed =
    state.subjects.reduce(
      (sum, subject) =>
        sum +
        subject.chapters.reduce(
          (number, chapter) =>
            number +
            completedCount(chapter),
          0
        ),
      0
    );

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
          (completed /
            totalRevisions) *
            100
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
              ${Math.min(
                progress,
                100
              )}%
            </div>
          </div>

          <div style="font-size:40px">
            📚
          </div>

        </div>

        <div class="progress">

          <div
            style="
              width:${Math.min(
                progress,
                100
              )}%
            ">
          </div>

        </div>

      </div>

      <div
        class="grid grid-2"
        style="margin-top:14px"
      >

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
        style="margin-top:14px"
      >

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
            onclick="goPage('today')"
          >
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
            Add as many subjects and chapters
            as you need.
          </p>
        </div>

        <button
          class="btn"
          onclick="openSubjectModal()"
        >
          + Subject
        </button>

      </div>

      <div style="margin-top:15px">

        ${
          state.subjects.length
            ? state.subjects
                .map(
                  renderSubjectCard
                )
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
  return `
    <div class="card subject-card">

      <div class="row">

        <div>
          <div class="title">
            ${escapeHTML(
              subject.name
            )}
          </div>

          <div class="muted">
            ${
              subject.chapters.length
            } chapters
          </div>
        </div>

        <div class="actions">

          <button
            class="btn small secondary"
            onclick="
              openSubjectModal(
                '${subject.id}'
              )
            "
          >
            Edit
          </button>

          <button
            class="btn small danger"
            onclick="
              deleteSubject(
                '${subject.id}'
              )
            "
          >
            Delete
          </button>

        </div>

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
        onclick="
          openChapterModal(
            '${subject.id}'
          )
        "
      >
        + Add Chapter
      </button>

    </div>
  `;
}

function renderChapterCard(
  subject,
  chapter
) {
  const completed =
    completedCount(chapter);

  const total =
    Math.max(
      0,
      state.revisionSystem.length - 1
    );

  return `
    <div class="card chapter-card">

      <div class="row">

        <div>

          <div class="title">
            ${escapeHTML(
              chapter.name
            )}
          </div>

          <div class="muted">
            Started:
            ${formatDate(
              chapter.startDate
            )}
          </div>

          <div
            class="badge"
            style="margin-top:7px"
          >
            ${completed}/${total}
            revisions
          </div>

        </div>

        <div class="actions">

          <button
            class="btn small secondary"
            onclick="
              openChapterModal(
                '${subject.id}',
                '${chapter.id}'
              )
            "
          >
            Edit
          </button>

          <button
            class="btn small secondary"
            onclick="
              openNotes(
                '${chapter.id}'
              )
            "
          >
            📝 Notes
          </button>

        </div>

      </div>

      <div
        class="actions"
        style="margin-top:10px"
      >

        <button
          class="btn small secondary"
          onclick="
            openMoveModal(
              '${chapter.id}'
            )
          "
        >
          Move
        </button>

        <button
          class="btn small danger"
          onclick="
            deleteChapter(
              '${chapter.id}'
            )
          "
        >
          Delete
        </button>

      </div>

    </div>
  `;
}

/* =========================================================
   TODAY + INCOMPLETE
   ========================================================= */

function renderToday() {
  const today =
    dueTodayItems();

  const incomplete =
    incompleteItems();

  return `
    <section>

      <h1 class="page-title">
        Today's Revisions
      </h1>

      <p class="page-subtitle">
        Complete and submit each revision
        to make it final.
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
                  .map(
                    renderRevisionCard
                  )
                  .join("")
              : `
                <div class="empty">
                  🎉 No revisions
                  pending today.
                </div>
              `
          }

        </div>

      </div>

      <div
        class="card"
        style="margin-top:15px"
      >

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
                  .map(
                    renderRevisionCard
                  )
                  .join("")
              : `
                <div class="empty">
                  No incomplete
                  revisions.
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
      daysBetween(
        dateFromISO(item.date),
        dateFrom
