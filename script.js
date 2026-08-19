
"use strict";

/* =========================================================
   REVISION TRACKER
   Offline-first application
   ========================================================= */

const APP_NAME = "Revision Tracker";
const DB_NAME = "revision_tracker_offline_db";
const DB_VERSION = 2;

const DATA_STORE = "appData";
const FILE_STORE = "notesFiles";

let db = null;
let currentPage = "home";

/* =========================================================
   DEFAULT REVISION SYSTEM
   Day 1 = Chapter Start
   ========================================================= */

const defaultRevisionSystem = [
  { id: "start", name: "Chapter Start", day: 1, final: false },
  { id: "rev1", name: "Revision 1", day: 2, final: false },
  { id: "rev2", name: "Revision 2", day: 4, final: false },
  { id: "rev3", name: "Revision 3", day: 8, final: false },
  { id: "rev4", name: "Revision 4", day: 16, final: false },
  { id: "rev5", name: "Revision 5", day: 32, final: false },
  { id: "final", name: "Final Revision", day: 65, final: true }
];

let state = {
  subjects: [],
  revisionSystem: cloneDefaultRevisionSystem(),
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
   DEFAULT COPY
   ========================================================= */

function cloneDefaultRevisionSystem() {
  return defaultRevisionSystem.map(rule => ({
    ...rule,
    id: uid()
  }));
}

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

/* =========================================================
   DATABASE HELPERS
   ========================================================= */

function dbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    const store = transaction.objectStore(storeName);

    store.put(value);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(
      storeName,
      "readonly"
    );

    const request = transaction
      .objectStore(storeName)
      .get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
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
    if (!db) {
      reject(new Error("Database is not ready."));
      return;
    }

    const transaction = db.transaction(
      storeName,
      "readwrite"
    );

    transaction
      .objectStore(storeName)
      .delete(key);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
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

  if (!Array.isArray(state.subjects)) {
    state.subjects = [];
  }

  if (!Array.isArray(state.revisionSystem) ||
      state.revisionSystem.length === 0) {
    state.revisionSystem = cloneDefaultRevisionSystem();
  }

  state.subjects.forEach(subject => {
    if (!Array.isArray(subject.chapters)) {
      subject.chapters = [];
    }

    subject.chapters.forEach(chapter => {
      if (!chapter.revisions ||
          typeof chapter.revisions !== "object") {
        chapter.revisions = {};
      }
    });
  });
}

/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker
    .register("./sw.js")
    .catch(error => {
      console.warn("Service Worker:", error);
    });
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
  const oldToast = document.querySelector(".toast");

  if (oldToast) {
    oldToast.remove();
  }

  const element = document.createElement("div");

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
   REVISION SYSTEM
   ========================================================= */

function getRevisionDates(chapter) {
  if (!chapter || !chapter.startDate) {
    return [];
  }

  return state.revisionSystem.map(rule => {
    const date = dateFromISO(chapter.startDate);

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
      rule,
      date: iso
    };
  });
}

function getRevisionItems() {
  const result = [];

  state.subjects.forEach(subject => {
    subject.chapters.forEach(chapter => {
      getRevisionDates(chapter).forEach(item => {
        if (item.rule.day === 1) {
          return;
        }

        const completion =
          chapter.revisions &&
          chapter.revisions[item.rule.id]
            ? chapter.revisions[item.rule.id]
            : null;

        result.push({
          subject,
          chapter,
          rule: item.rule,
          date: item.date,
          completion
        });
      });
    });
  });

  return result;
}

function dueTodayItems() {
  const today = todayISO();

  return getRevisionItems().filter(item => {
    return (
      item.date === today &&
      !item.completion?.submitted
    );
  });
}

function incompleteItems() {
  const today = todayISO();

  return getRevisionItems().filter(item => {
    return (
      item.date < today &&
      !item.completion?.submitted
    );
  });
}

function completedCount(chapter) {
  if (!chapter.revisions) {
    return 0;
  }

  return Object.values(chapter.revisions)
    .filter(item => item && item.submitted)
    .length;
}

/* =========================================================
   RENDER
   ========================================================= */

function render() {
  renderMain();
  updateNav();
}

function updateNav() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === currentPage
    );
  });
}

function renderMain() {
  const main = document.getElementById("mainContent");

  if (!main) {
    console.error(
      "mainContent element was not found in index.html."
    );
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
  const totalChapters = state.subjects.reduce(
    (total, subject) => {
      return total + subject.chapters.length;
    },
    0
  );

  const todayCount = dueTodayItems().length;
  const incompleteCount = incompleteItems().length;

  const completed = state.subjects.reduce(
    (total, subject) => {
      return (
        total +
        subject.chapters.reduce(
          (count, chapter) => {
            return count + completedCount(chapter);
          },
          0
        )
      );
    },
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
            ${todayCount}
          </div>

          <div class="stat-label">
            Today's Revisions
          </div>
        </div>

        <div class="card">
          <div class="stat-number">
            ${incompleteCount}
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
              ${todayCount} pending
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
  const completed = completedCount(chapter);

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
              )
            ">
            Edit
          </button>

          <button
            class="btn small secondary"
            onclick="
              openNotes('${chapter.id}')
            ">
            📝 Notes
          </button>

        </div>

      </div>

      <div
        class="actions"
        style="margin-top:10px">

        <button
          class="btn small secondary"
          onclick="
            openMoveModal('${chapter.id}')
          ">
          Move
        </button>

        <button
          class="btn small danger"
          onclick="
            deleteChapter('${chapter.id}')
          ">
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
        Tick a revision and submit it when finished.
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
  const lateDays = Math.max(
    0,
    daysBetween(
      dateFromISO(item.date),
      dateFromISO(todayISO())
    )
  );

  const checked =
    !!item.completion?.checked;

  const submitted =
    !!item.completion?.submitted;

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
                  )
                ">
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
                )
              ">
              ✓ Confirm / Submit Revision
            </button>
          `
          : ""
      }

    </div>
  `;
}

/* =========================================================
   REVISION CHECK / SUBMIT
   ========================================================= */

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

  const old =
    chapter.revisions[ruleId] || {};

  if (old.submitted) {
    toast("This revision is already final.");
    return;
  }

  chapter.revisions[ruleId] = {
    ...old,
    checked: !old.checked,
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

  const revision =
    chapter.revisions?.[ruleId];

  if (!revision?.checked) {
    toast("First tick the revision.");
    return;
  }

  const confirmed = confirm(
    "Submit this revision as FINAL?\n\n" +
    "After submission it will remain completed."
  );

  if (!confirmed) {
    return;
  }

  chapter.revisions[ruleId] = {
    ...revision,
    submitted: true,
    submittedAt: todayISO()
  };

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
        Select any date to see its revisions.
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
    document.getElementById(
      "plannerResults"
    );

  if (!input || !container) {
    return;
  }

  const selectedDate = input.value;

  const results =
    getRevisionItems().filter(
      item => item.date === selectedDate
    );

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

        ${results.map(item => `
          <div class="card revision-card">

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

            <div style="margin-top:8px">

              ${
                item.completion?.submitted
                  ? `
                    <span class="badge success">
                      ✓ Final Completed
                    </span>
                  `
                  : `
                    <span class="badge">

                      ${
                        selectedDate < todayISO()
                          ? "Missed"
                          : selectedDate === todayISO()
                          ? "Due Today"
                          : "Upcoming"
                      }

                    </span>
                  `
              }

            </div>

          </div>
        `).join("")}

      </div>

    </div>
  `;
}

/* =========================================================
   SUBJECT MODAL
   ========================================================= */

function openSubjectModal(
  subjectId = ""
) {
  const subject =
    subjectId
      ? findSubject(subjectId)
      : null;

  showModal(`
    <h2>
      ${subject ? "Edit Subject" : "Add Subject"}
    </h2>

    <div class="form-group">

      <label>
        Subject Name
      </label>

      <input
        id="subjectName"
        value="${escapeHTML(
          subject?.name || ""
        )}"
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
        onclick="saveSubject('${subjectId}')">
        Save
      </button>

    </div>
  `);
}

async function saveSubject(subjectId) {
  const input =
    document.getElementById(
      "subjectName"
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
}

/* =========================================================
   DELETE SUBJECT
   ========================================================= */

async function deleteSubject(subjectId) {
  const subject =
    findSubject(subjectId);

  if (!subject) {
    return;
  }

  const confirmed = confirm(
    `Delete "${subject.name}" and all its chapters?`
  );

  if (!confirmed) {
    return;
  }

  for (const chapter of subject.chapters) {
    await deleteChapterFiles(
      chapter.id
    );
  }

  state.subjects =
    state.subjects.filter(
      subjectItem =>
        subjectItem.id !== subjectId
    );

  await saveState();

  render();
}

/* =========================================================
   CHAPTER MODAL
   ========================================================= */

function openChapterModal(
  subjectId,
  chapterId = ""
) {
  const subject =
    findSubject(subjectId);

  const found =
    chapterId
      ? findChapter(chapterId)
      : null;

  const chapter =
    found?.chapter || null;

  if (!subject) {
    return;
  }

  showModal(`
    <h2>
      ${chapter ? "Edit Chapter" : "Add Chapter"}
    </h2>

    <div class="form-group">

      <label>
        Chapter Name
      </label>

      <input
        id="chapterName"
        value="${escapeHTML(
          chapter?.name || ""
        )}"
        placeholder="Chapter name">

    </div>

    <div class="form-group">

      <label>
        Study Start Date (Day 1)
      </label>

      <input
        type="date"
        id="chapterDate"
        value="${
          chapter?.startDate ||
          todayISO()
        }">

    </div>

    <div class="actions">

      <button
        class="btn secondary"
        onclick="closeModal()">
        Cancel
      </button>

      <button
        class="btn"
        onclick="
          saveChapter(
            '${subjectId}',
            '${chapterId}'
          )
        ">
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

  if (!subject) {
    return;
  }

  const name =
    document
      .getElementById("chapterName")
      ?.value.trim();

  const date =
    document
      .getElementById("chapterDate")
      ?.value;

  if (!name || !date) {
    toast(
      "Enter chapter name and date."
    );
    return;
  }

  if (chapterId) {
    const found =
      findChapter(chapterId);

    if (found) {
      found.chapter.name = name;
      found.chapter.startDate = date;
    }
  } else {
    subject.chapters.push({
      id: uid(),
      name,
      startDate: date,
      revisions: {}
    });
  }

  await saveState();

  closeModal();
  render();
}

/* =========================================================
   DELETE CHAPTER
   ========================================================= */

async function deleteChapter(chapterId) {
  const found =
    findChapter(chapterId);

  if (!found) {
    return;
  }

  const confirmed = confirm(
    `Delete "${found.chapter.name}"?`
  );

  if (!confirmed) {
    return;
  }

  await deleteChapterFiles(chapterId);

  found.subject.chapters =
    found.subject.chapters.filter(
      chapter =>
        chapter.id !== chapterId
    );

  await saveState();

  render();
}

/* =========================================================
   MOVE CHAPTER
   ========================================================= */

function openMoveModal(chapterId) {
  const found =
    findChapter(chapterId);

  if (!found) {
    return;
  }

  const options =
    state.subjects
      .filter(
        subject =>
          subject.id !==
          found.subject.id
      )
      .map(subject => `
        <option value="${subject.id}">
          ${escapeHTML(subject.name)}
        </option>
      `)
      .join("");

  if (!options) {
    toast(
      "Add another subject first."
    );
    return;
  }

  showModal(`
    <h2>
      Move Chapter
    </h2>

    <div class="form-group">

      <label>
        Move to Subject
      </label>

      <select id="moveSubject">
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
        onclick="
          moveChapter('${chapterId}')
        ">
        Move
      </button>

    </div>
  `);
}

async function moveChapter(chapterId) {
  const found =
    findChapter(chapterId);

  if (!found) {
    return;
  }

  const targetId =
    document.getElementById(
      "moveSubject"
    )?.value;

  const target =
    findSubject(targetId);

  if (!target) {
    return;
  }

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

  toast(
    "Chapter moved successfully."
  );
}

/* =========================================================
   NOTES
   =========================================================
   
   IMPORTANT:
   Files are stored as Blob objects inside IndexedDB.

   This means:
   - No external link.
   - No internet required.
   - Original Gallery/File Manager copy can be deleted.
   - Stored app copy remains.
   - Photo can be viewed.
   - Video can be played.
   - PDF can be opened.
   
   ========================================================= */

/* ---------- Detect file type ---------- */

function getStoredFileKind(file) {
  const type =
    String(file.type || "").toLowerCase();

  const name =
    String(file.name || "").toLowerCase();

  if (type.startsWith("image/")) {
    return "image";
  }

  if (type.startsWith("video/")) {
    return "video";
  }

  if (
    type === "application/pdf" ||
    name.endsWith(".pdf")
  ) {
    return "pdf";
  }

  return "file";
}

/* ---------- Notes screen ---------- */

async function openNotes(chapterId) {
  const found =
    findChapter(chapterId);

  if (!found) {
    return;
  }

  const allFiles =
    await dbGetAll(FILE_STORE);

  const chapterFiles =
    allFiles.filter(
      file =>
        file.chapterId === chapterId
    );

  showModal(`
    <div class="row">

      <div>
        <h2>
          Notes
        </h2>

        <div class="muted">
          ${escapeHTML(
            found.chapter.name
          )}
        </div>
      </div>

      <button
        class="btn small"
        onclick="
          document
            .getElementById('noteFileInput')
            .click()
        ">
        + Upload
      </button>

    </div>

    <input
      type="file"
      id="noteFileInput"
      hidden
      multiple
      accept="image/*,video/*,application/pdf">

    <div
      id="notesContainer"
      style="margin-top:14px">

      ${
        chapterFiles.length
          ? `
            <div class="file-grid">
              ${chapterFiles
                .map(renderNoteFile)
                .join("")}
            </div>
          `
          : `
            <div class="empty">
              No notes uploaded yet.
            </div>
          `
      }

    </div>

    <div style="margin-top:15px">

      <button
        class="btn secondary full"
        onclick="closeModal()">
        Close
      </button>

    </div>
  `);

  const input =
    document.getElementById(
      "noteFileInput"
    );

  if (!input) {
    return;
  }

  input.addEventListener(
    "change",
    async event => {
      const files =
        Array.from(
          event.target.files || []
        );

      if (!files.length) {
        return;
      }

      try {
        toast(
          `Saving ${files.length} file(s)...`
        );

        for (const file of files) {
          await storeNoteFile(
            chapterId,
            file
          );
        }

        toast(
          "Notes saved offline."
        );

        await openNotes(chapterId);
      } catch (error) {
        console.error(
          "Note upload error:",
          error
        );

        toast(
          "Could not save the file."
        );
      }
    }
  );
}

/* ---------- Render stored file ---------- */

function renderNoteFile(file) {
  const kind =
    getStoredFileKind(file);

  const name =
    escapeHTML(file.name);

  const size =
    formatFileSize(file.size);

  let content = "";

  if (kind === "image") {
    content = `
      <div class="media-box">

        <div
          class="note-image-button"
          onclick="
            viewStoredFile('${file.id}')
          ">

          <img
            src="${createObjectURLSafe(
              file.blob
            )}"
            alt="${name}"
            loading="lazy">

        </div>

        <div class="media-info">

          <div class="muted">
            ${name}
          </div>

          <div class="muted">
            ${size}
          </div>

          <div
            class="actions"
            style="margin-top:7px">

            <button
              class="btn small"
              onclick="
                viewStoredFile('${file.id}')
              ">
              Open
            </button>

            <button
              class="btn small danger"
              onclick="
                deleteNoteFile('${file.id}')
              ">
              Delete
            </button>

          </div>

        </div>

      </div>
    `;
  }

  else if (kind === "video") {
    content = `
      <div class="media-box">

        <video
          controls
          preload="metadata"
          playsinline
          src="${createObjectURLSafe(
            file.blob
          )}">
        </video>

        <div class="media-info">

          <div class="muted">
            ${name}
          </div>

          <div class="muted">
            ${size}
          </div>

          <div
            class="actions"
            style="margin-top:7px">

            <button
              class="btn small"
              onclick="
                viewStoredFile('${file.id}')
              ">
              Open
            </button>

            <button
              class="btn small danger"
              onclick="
                deleteNoteFile('${file.id}')
              ">
              Delete
            </button>

          </div>

        </div>

      </div>
    `;
  }

  else if (kind === "pdf") {
    content = `
      <div class="media-box">

        <div class="pdf-preview">
          📄
        </div>

        <div class="media-info">

          <div class="muted">
            ${name}
          </div>

          <div class="muted">
            ${size}
          </div>

          <div
            class="actions"
            style="margin-top:7px">

            <button
              class="btn small"
              onclick="
                viewStoredFile('${file.id}')
              ">
              Open PDF
            </button>

            <button
              class="btn small danger"
              onclick="
                deleteNoteFile('${file.id}')
              ">
              Delete
            </button>

          </div>

        </div>

      </div>
    `;
  }

  else {
    content = `
      <div class="media-box">

        <div class="pdf-preview">
          📎
        </div>

        <div class="media-info">

          <div class="muted">
            ${name}
          </div>

          <div class="muted">
            ${size}
          </div>

          <div
            class="actions"
            style="margin-top:7px">

            <button
              class="btn small"
              onclick="
                viewStoredFile('${file.id}')
              ">
              Open
            </button>

            <button
              class="btn small danger"
              onclick="
                deleteNoteFile('${file.id}')
              ">
              Delete
            </button>

          </div>

        </div>

      </div>
    `;
  }

  return content;
}

/* ---------- Object URL ---------- */

function createObjectURLSafe(blob) {
  try {
    if (
      blob instanceof Blob &&
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL ===
        "function"
    ) {
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error(
      "Object URL error:",
      error
    );
  }

  return "";
}

/* ---------- Store file ---------- */

async function storeNoteFile(
  chapterId,
  file
) {
  if (!file) {
    return;
  }

  if (!chapterId) {
    throw new Error(
      "Chapter ID missing."
    );
  }

  const storedFile = {
    id: uid(),
    chapterId,
    name: file.name || "Untitled file",
    type: file.type || "application/octet-stream",
    size: Number(file.size || 0),
    lastModified:
      Number(file.lastModified || 0),
    createdAt: Date.now(),

    /*
      Keep the actual Blob.
      This is the important part for
      offline viewing.
    */
    blob: file
  };

  await dbPut(
    FILE_STORE,
    storedFile
  );
}

/* =========================================================
   OPEN STORED FILE
   ========================================================= */

async function viewStoredFile(fileId) {
  try {
    const stored =
      await dbGet(
        FILE_STORE,
        fileId
      );

    if (!stored) {
      toast(
        "File not found."
      );
      return;
    }

    if (!(stored.blob instanceof Blob)) {
      toast(
        "Stored file is invalid."
      );
      return;
    }

    const url =
      createObjectURLSafe(
        stored.blob
      );

    if (!url) {
      toast(
        "Could not open the file."
      );
      return;
    }

    const kind =
      getStoredFileKind(stored);

    /*
      IMPORTANT:
      Instead of relying only on window.open(),
      create a full-screen viewer inside
      the current app. This works better on
      mobile browsers.
    */

    if (kind === "image") {
      showFileViewer(
        stored,
        url,
        "image"
      );
    }

    else if (kind === "video") {
      showFileViewer(
        stored,
        url,
        "video"
      );
    }

    else if (kind === "pdf") {
      showFileViewer(
        stored,
        url,
        "pdf"
      );
    }

    else {
      showFileViewer(
        stored,
        url,
        "file"
      );
    }

  } catch (error) {
    console.error(
      "Open file error:",
      error
    );

    toast(
      "Could not open the file."
    );
  }
}

/* =========================================================
   FILE VIEWER
   ========================================================= */

function showFileViewer(
  stored,
  url,
  kind
) {
  const root =
    document.getElementById(
      "modalRoot"
    );

  if (!root) {
    return;
  }

  const safeName =
    escapeHTML(
      stored.name
    );

  let viewer = "";

  if (kind === "image") {
    viewer = `
      <div class="offline-viewer-content">

        <img
          src="${url}"
          alt="${safeName}"
          style="
            max-width:100%;
            max-height:78vh;
            object-fit:contain;
            border-radius:14px;
            display:block;
            margin:auto;
          ">

      </div>
    `;
  }

  else if (kind === "video") {
    viewer = `
      <div class="offline-viewer-content">

        <video
          src="${url}"
          controls
          autoplay
          playsinline
          style="
            width:100%;
            max-height:78vh;
            border-radius:14px;
            display:block;
            background:#000;
          ">
        </video>

      </div>
    `;
  }

  else if (kind === "pdf") {
    viewer = `
      <div
        class="offline-viewer-content"
        style="
          height:78vh;
        ">

        <iframe
          src="${url}"
          title="${safeName}"
          style="
            width:100%;
            height:100%;
            border:0;
            border-radius:12px;
            background:white;
          ">
        </iframe>

      </div>
    `;
  }

  else {
    viewer = `
      <div
        class="empty"
        style="padding:30px">

        <div style="font-size:50px">
          📎
        </div>

        <div class="title">
          ${safeName}
        </div>

        <p class="muted">
          This file type cannot be previewed
          directly in the app.
        </p>

      </div>
    `;
  }

  root.innerHTML = `
    <div
      class="modal-bg"
      style="z-index:99999">

      <div
        class="modal"
        style="
          width:min(96vw,900px);
          max-height:94vh;
          overflow:auto;
        ">

        <div class="row">

          <div
            class="title"
            style="
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
              max-width:75%;
            ">

            ${safeName}

          </div>

          <button
            class="btn small"
            onclick="closeModal()">
            Close
          </button>

        </div>

        <div style="margin-top:12px">
          ${viewer}
        </div>

      </div>

    </div>
  `;
}

/* =========================================================
   DELETE NOTE
   ========================================================= */

async function deleteNoteFile(
  fileId
) {
  const confirmed = confirm(
    "Delete this note from the app?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await dbDelete(
      FILE_STORE,
      fileId
    );

    closeModal();

    toast(
      "Note deleted."
    );
  } catch (error) {
    console.error(
      "Delete note error:",
      error
    );

    toast(
      "Could not delete the note."
    );
  }
}

/* =========================================================
   DELETE CHAPTER FILES
   ========================================================= */

async function deleteChapterFiles(
  chapterId
) {
  const files =
    await dbGetAll(
      FILE_STORE
    );

  const chapterFiles =
    files.filter(
      file =>
        file.chapterId === chapterId
    );

  for (const file of chapterFiles) {
    await dbDelete(
      FILE_STORE,
      file.id
    );
  }
}

/* =========================================================
   FILE SIZE
   ========================================================= */

function formatFileSize(bytes) {
  const size =
    Number(bytes || 0);

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    size /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
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
        You control your revision system
        and data.
      </p>

      <div class="card">

        <div class="row">

          <div>

            <div class="title">
              Revision System
            </div>

            <div class="muted">
              Set your own revision schedule.
            </div>

          </div>

          <button
            class="btn small"
            onclick="
              openRevisionSystem()
            ">
            Edit
          </button>

        </div>

      </div>

      <div
        class="card"
        style="margin-top:14px">

        <div class="title">
          Data Control
        </div>

        <p
          class="muted"
          style="margin:8px 0 14px">

          Choose exactly what you want
          to remove.

        </p>

        <button
          class="btn secondary"
          onclick="
            openRestartOptions()
          ">
          Restart / Delete Data
        </button>

      </div>

      <div
        class="card"
        style="margin-top:14px">

        <div class="title">
          Offline Mode
        </div>

        <p
          class="muted"
          style="margin-top:7px">

          Your study data and uploaded
          Notes are stored locally
          on this device.

        </p>

        <div
          class="badge success"
          style="margin-top:10px">

          Offline Ready

        </div>

      </div>

    </section>
  `;
}

/* =========================================================
   REVISION SYSTEM EDITOR
   ========================================================= */

function openRevisionSystem() {
  showModal(`
    <h2>
      Revision System
    </h2>

    <p
      class="muted"
      style="margin-bottom:14px">

      Day 1 is the chapter start day.
      You completely control the schedule.

    </p>

    <div id="revisionRules">

      ${state.revisionSystem
        .map(
          (rule, index) => `
            <div class="system-row">

              <input
                value="${escapeHTML(
                  rule.name
                )}"
                id="ruleName${index}"
                placeholder="Revision name">

              <input
                class="day-input"
                type="number"
                min="1"
                value="${Number(
                  rule.day
                )}"
                id="ruleDay${index}">

            </div>
          `
        )
        .join("")}

    </div>

    <div
      class="actions"
      style="margin-top:12px">

      <button
        class="btn secondary"
        onclick="
          addRevisionRuleRow()
        ">
        + Add Revision
      </button>

      <button
        class="btn secondary"
        onclick="
          removeRevisionRuleRow()
        ">
        − Remove Last
      </button>

    </div>

    <div
      class="actions"
      style="margin-top:15px">

      <button
        class="btn secondary"
        onclick="closeModal()">
        Cancel
      </button>

      <button
        class="btn"
        onclick="
          saveRevisionSystem()
        ">
        Save System
      </button>

    </div>
  `);
}

function addRevisionRuleRow() {
  const last =
    state.revisionSystem[
      state.revisionSystem.length - 1
    ];

  state.revisionSystem.push({
    id: uid(),
    name:
      `Revision ${state.revisionSystem.length}`,
    day:
      Number(last?.day || 1) + 1,
    final: false
  });

  openRevisionSystem();
}

function removeRevisionRuleRow() {
  if (
    state.revisionSystem.length <= 2
  ) {
    toast(
      "Keep at least Chapter Start + one revision."
    );

    return;
  }

  state.revisionSystem.pop();

  openRevisionSystem();
}

async function saveRevisionSystem() {
  const rows = [];

  for (
    let index = 0;
    index < state.revisionSystem.length;
    index++
  ) {
    const name =
      document
        .getElementById(
          `ruleName${index}`
        )
        ?.value.trim();

    const day =
      Number(
        document
          .getElementById(
            `ruleDay${index}`
          )
          ?.value
      );

    if (
      !name ||
      !Number.isFinite(day) ||
      day < 1
    ) {
      toast(
        "Check revision names and days."
      );

      return;
    }

    rows.push({
      id:
        state.revisionSystem[index].id ||
        uid(),
      name,
      day,
      final: false
    });
  }

  rows.sort(
    (a, b) =>
      Number(a.day) -
      Number(b.day)
  );

  rows.forEach((rule, index) => {
    rule.final =
      index === rows.length - 1;
  });

  state.revisionSystem = rows;

  await saveState();

  closeModal();
  render();

  toast(
    "Revision system saved."
  );
}

/* =========================================================
   RESTART / SELECTIVE DELETE
   ========================================================= */

function openRestartOptions() {
  showModal(`
    <h2>
      Restart / Delete Data
    </h2>

    <p class="muted">

      Select what you want to delete.
      Other data will remain.

    </p>

    <div
      style="margin-top:15px">

      <label
        style="
          display:block;
          margin-bottom:10px;
        ">

        <input
          type="checkbox"
          id="deleteSubjects">

        Delete all Subjects & Chapters

      </label>

      <label
        style="
          display:block;
          margin-bottom:10px;
        ">

        <input
          type="checkbox"
          id="deleteNotes">

        Delete all Notes / Files

      </label>

      <label
        style="
          display:block;
          margin-bottom:10px;
        ">

        <input
          type="checkbox"
          id="resetRevision">

        Reset Revision System

      </label>

    </div>

    <div
      class="actions"
      style="margin-top:18px">

      <button
        class="btn secondary"
        onclick="closeModal()">
        Cancel
      </button>

      <button
        class="btn danger"
        onclick="
          performSelectiveDelete()
        ">
        Delete Selected
      </button>

    </div>
  `);
}

async function performSelectiveDelete() {
  const deleteSubjects =
    document.getElementById(
      "deleteSubjects"
    )?.checked;

  const deleteNotes =
    document.getElementById(
      "deleteNotes"
    )?.checked;

  const resetRevision =
    document.getElementById(
      "resetRevision"
    )?.checked;

  if (
    !deleteSubjects &&
    !deleteNotes &&
    !resetRevision
  ) {
    toast(
      "Select something first."
    );

    return;
  }

  const confirmed = confirm(
    "Are you sure you want to delete the selected data?"
  );

  if (!confirmed) {
    return;
  }

  if (deleteSubjects) {
    state.subjects = [];
  }

  if (deleteNotes) {
    const files =
      await dbGetAll(
        FILE_STORE
      );

    for (const file of files) {
      await dbDelete(
        FILE_STORE,
        file.id
      );
    }
  }

  if (resetRevision) {
    state.revisionSystem =
      cloneDefaultRevisionSystem();
  }

  await saveState();

  closeModal();
  render();

  toast(
    "Selected data deleted."
  );
}

/* =========================================================
   MODAL
   ========================================================= */

function showModal(content) {
  const root =
    document.getElementById(
      "modalRoot"
    );

  if (!root) {
    console.error(
      "modalRoot element was not found."
    );

    return;
  }

  root.innerHTML = `
    <div
      class="modal-bg"
      onclick="modalBackground(event)">

      <div class="modal">
        ${content}
      </div>

    </div>
  `;
}

function modalBackground(event) {
  if (
    event.target.classList.contains(
      "modal-bg"
    )
  ) {
    closeModal();
  }
}

function closeModal() {
  const root =
    document.getElementById(
      "modalRoot"
    );

  if (root) {
    root.innerHTML = "";
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function goPage(page) {
  currentPage = page;

  render();

  if (page === "planner") {
    setTimeout(
      showPlannerDate,
      0
    );
  }
}

document.addEventListener(
  "click",
  event => {
    const nav =
      event.target.closest(
        ".nav-item"
      );

    if (nav) {
      goPage(
        nav.dataset.page
      );
    }

    if (
      event.target.id ===
      "settingsBtn"
    ) {
      goPage("settings");
    }
  }
);

/* =========================================================
   ERROR HANDLING
   ========================================================= */

window.addEventListener(
  "error",
  event => {
    console.error(
      "App error:",
      event.error ||
        event.message
    );
  }
);

window.addEventListener(
  "unhandledrejection",
  event => {
    console.error(
      "Unhandled promise:",
      event.reason
    );
  }
);
