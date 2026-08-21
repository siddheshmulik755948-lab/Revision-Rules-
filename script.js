"use strict";

/* =========================================================
   REVISION TRACKER
   Offline-first Study / Revision App
   PDF / Image / Video / File support

   Features:
   + Exam Countdown
   + Overall Progress
   + Subject-wise Progress
   + Chapter-wise Progress
   + Revision System
   + Planner Date Search
   + Past Revision / Study History
   + Future Revision Schedule
   + Notes / Files
   + Notifications
   ========================================================= */

const APP_NAME = "Revision Tracker";

const DB_NAME = "revision_tracker_offline_db";
const DB_VERSION = 5;

const DATA_STORE = "appData";
const FILE_STORE = "notesFiles";

let db = null;
let currentPage = "home";

/*
 * Planner remembers the date selected by the user.
 * Default = today's date.
 */
let plannerSelectedDate = todayISO();

const defaultRevisionSystem = [
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

    /*
     * Make sure planner date is always valid.
     */
    if (!plannerSelectedDate) {
      plannerSelectedDate = todayISO();
    }

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
    const request =
      indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const database = event.target.result;

      if (
        !database.objectStoreNames.contains(
          DATA_STORE
        )
      ) {
        database.createObjectStore(
          DATA_STORE,
          {
            keyPath: "id"
          }
        );
      }

      if (
        !database.objectStoreNames.contains(
          FILE_STORE
        )
      ) {
        const store =
          database.createObjectStore(
            FILE_STORE,
            {
              keyPath: "id"
            }
          );

        store.createIndex(
          "chapterId",
          "chapterId",
          {
            unique: false
          }
        );
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
      reject(
        new Error("Database is not ready.")
      );
      return;
    }

    const transaction =
      db.transaction(
        storeName,
        "readwrite"
      );

    transaction
      .objectStore(storeName)
      .put(value);

    transaction.oncomplete = () => resolve();

    transaction.onerror = () =>
      reject(transaction.error);

    transaction.onabort = () =>
      reject(
        transaction.error ||
        new Error("Transaction aborted")
      );
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(
        new Error("Database is not ready.")
      );
      return;
    }

    const transaction =
      db.transaction(
        storeName,
        "readonly"
      );

    const request =
      transaction
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
    if (!db) {
      reject(
        new Error("Database is not ready.")
      );
      return;
    }

    const transaction =
      db.transaction(
        storeName,
        "readonly"
      );

    const request =
      transaction
        .objectStore(storeName)
        .getAll();

    request.onsuccess = () => {
      resolve(
        request.result || []
      );
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(
        new Error("Database is not ready.")
      );
      return;
    }

    const transaction =
      db.transaction(
        storeName,
        "readwrite"
      );

    transaction
      .objectStore(storeName)
      .delete(key);

    transaction.oncomplete = () => resolve();

    transaction.onerror = () =>
      reject(transaction.error);
  });
}

function dbGetByChapter(chapterId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(
        new Error("Database is not ready.")
      );
      return;
    }

    const transaction =
      db.transaction(
        FILE_STORE,
        "readonly"
      );

    const index =
      transaction
        .objectStore(FILE_STORE)
        .index("chapterId");

    const request =
      index.getAll(chapterId);

    request.onsuccess = () => {
      resolve(
        request.result || []
      );
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
  await dbPut(
    DATA_STORE,
    {
      id: "main",
      value: state
    }
  );
}

async function loadState() {
  const saved =
    await dbGet(
      DATA_STORE,
      "main"
    );

  if (
    saved &&
    saved.value
  ) {
    state = saved.value;
  }

  if (!Array.isArray(state.subjects)) {
    state.subjects = [];
  }

  state.subjects.forEach(subject => {
    if (
      !Array.isArray(subject.chapters)
    ) {
      subject.chapters = [];
    }

    subject.chapters.forEach(chapter => {
      if (!chapter.revisions) {
        chapter.revisions = {};
      }
    });
  });

  if (
    !Array.isArray(
      state.revisionSystem
    )
  ) {
    state.revisionSystem =
      createDefaultRevisionSystem();
  }

  if (!state.settings) {
    state.settings = {
      notifications: true,
      examDate: ""
    };
  }

  if (
    typeof state.settings.notifications !==
    "boolean"
  ) {
    state.settings.notifications = true;
  }

  if (
    typeof state.settings.examDate !==
    "string"
  ) {
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
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2)
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
    String(
      d.getMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      d.getDate()
    ).padStart(2, "0")
  );
}

function dateFromISO(value) {
  if (!value) {
    return new Date();
  }

  const parts =
    value
      .split("-")
      .map(Number);

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

  return dateFromISO(value)
    .toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
}

function formatDateLong(value) {
  if (!value) {
    return "-";
  }

  return dateFromISO(value)
    .toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
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

  first.setHours(
    0,
    0,
    0,
    0
  );

  second.setHours(
    0,
    0,
    0,
    0
  );

  return Math.round(
    (second - first) /
      86400000
  );
}

function findSubject(subjectId) {
  return state.subjects.find(
    subject =>
      subject.id === subjectId
  );
}

function findChapter(chapterId) {
  for (
    const subject of state.subjects
  ) {
    const chapter =
      subject.chapters.find(
        item =>
          item.id === chapterId
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
    document.querySelector(
      ".toast"
    );

  if (old) {
    old.remove();
  }

  const element =
    document.createElement(
      "div"
    );

  element.className = "toast";
  element.textContent = message;

  document.body.appendChild(
    element
  );

  setTimeout(() => {
    if (element.parentNode) {
      element.remove();
    }
  }, 2500);
}


/* =========================================================
   PROGRESS SYSTEM
   ========================================================= */

function totalRevisionCount() {
  return Math.max(
    0,
    state.revisionSystem.length - 1
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

function chapterProgress(chapter) {
  const total =
    totalRevisionCount();

  if (!total) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (
        completedCount(chapter) /
        total
      ) * 100
    )
  );
}

function subjectProgress(subject) {
  const chapters =
    subject.chapters || [];

  if (!chapters.length) {
    return 0;
  }

  const total =
    chapters.reduce(
      (sum, chapter) =>
        sum +
        chapterProgress(
          chapter
        ),
      0
    );

  return Math.round(
    total /
    chapters.length
  );
}

function overallProgress() {
  const chapters = [];

  state.subjects.forEach(
    subject => {
      (
        subject.chapters || []
      ).forEach(
        chapter => {
          chapters.push(
            chapter
          );
        }
      );
    }
  );

  if (!chapters.length) {
    return 0;
  }

  const total =
    chapters.reduce(
      (sum, chapter) =>
        sum +
        chapterProgress(
          chapter
        ),
      0
    );

  return Math.round(
    total /
    chapters.length
  );
}

function progressBarHTML(
  progress,
  extraClass = ""
) {
  const safe =
    Math.max(
      0,
      Math.min(
        100,
        Number(progress) || 0
      )
    );

  return `
    <div class="progress ${extraClass}">
      <div style="width:${safe}%"></div>
    </div>
  `;
}


/* =========================================================
   EXAM COUNTDOWN
   ========================================================= */

function getExamCountdown() {
  const examDate =
    state.settings?.examDate ||
    "";

  if (!examDate) {
    return {
      set: false,
      days: null,
      label: "Exam date not set"
    };
  }

  const today =
    dateFromISO(
      todayISO()
    );

  const exam =
    dateFromISO(examDate);

  today.setHours(
    0,
    0,
    0,
    0
  );

  exam.setHours(
    0,
    0,
    0,
    0
  );

  const difference =
    Math.round(
      (exam - today) /
        86400000
    );

  if (difference > 0) {
    return {
      set: true,
      days: difference,
      label:
        `${difference} day${
          difference === 1
            ? ""
            : "s"
        } left`
    };
  }

  if (difference === 0) {
    return {
      set: true,
      days: 0,
      label: "Exam is today!"
    };
  }

  return {
    set: true,
    days: difference,
    label: "Exam date has passed"
  };
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          goPage(
            button.dataset.page
          );
        }
      );
    });
}

function setupSettingsButton() {
  const button =
    document.getElementById(
      "settingsBtn"
    );

  if (button) {
    button.addEventListener(
      "click",
      () => {
        goPage("settings");
      }
    );
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

  return state.revisionSystem
    .map(rule => {
      const date =
        dateFromISO(
          chapter.startDate
        );

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

  for (
    const subject of state.subjects
  ) {
    for (
      const chapter of subject.chapters
    ) {
      const dates =
        getRevisionDates(
          chapter
        );

      for (
        const item of dates
      ) {
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


/* =========================================================
   COMPLETE PLANNER DATA
   ========================================================= */

/*
 * This function returns ALL planner events,
 * including Chapter Start.
 *
 * This is different from getRevisionItems()
 * because Planner needs to show:
 *
 * Chapter Start
 * Revision 1
 * Revision 2
 * Revision 3
 * ...
 *
 * Therefore Chapter Start is NOT removed here.
 */

function getPlannerItems() {
  const result = [];

  for (
    const subject of state.subjects
  ) {
    for (
      const chapter of subject.chapters
    ) {
      const dates =
        getRevisionDates(
          chapter
        );

      for (
        const item of dates
      ) {
        const completion =
          chapter.revisions?.[
            item.rule.id
          ];

        result.push({
          subject,
          chapter,
          rule: item.rule,
          date: item.date,
          completion:
            completion || null,
          type:
            item.rule.name ===
            "Chapter Start"
              ? "study"
              : "revision"
        });
      }
    }
  }

  return result;
}


/*
 * Get all planner events for a
 * particular selected date.
 */

function getPlannerItemsForDate(
  selectedDate
) {
  return getPlannerItems()
    .filter(
      item =>
        item.date ===
        selectedDate
    )
    .sort(
      (a, b) => {
        const chapterCompare =
          a.chapter.name.localeCompare(
            b.chapter.name
          );

        if (
          chapterCompare !== 0
        ) {
          return chapterCompare;
        }

        return (
          Number(a.rule.day) -
          Number(b.rule.day)
        );
      }
    );
}


/*
 * Find revisions that were actually
 * submitted/completed on a selected
 * past date.
 *
 * This gives the user actual
 * completion history.
 */

function getCompletedOnDate(
  selectedDate
) {
  const result = [];

  for (
    const subject of state.subjects
  ) {
    for (
      const chapter of subject.chapters
    ) {
      if (!chapter.revisions) {
        continue;
      }

      for (
        const ruleId in
          chapter.revisions
      ) {
        const completion =
          chapter.revisions[
            ruleId
          ];

        if (
          !completion ||
          !completion.submitted ||
          !completion.submittedAt
        ) {
          continue;
        }

        const completedDate =
          completion.submittedAt
            .slice(0, 10);

        if (
          completedDate !==
          selectedDate
        ) {
          continue;
        }

        const rule =
          state.revisionSystem.find(
            item =>
              item.id ===
              ruleId
          );

        if (!rule) {
          continue;
        }

        result.push({
          subject,
          chapter,
          rule,
          completion
        });
      }
    }
  }

  return result;
}


/*
 * Planner date relation:
 *
 * -1 = past
 *  0 = today
 * +1 = future
 */

function plannerDateRelation(
  selectedDate
) {
  const today =
    todayISO();

  if (
    selectedDate <
    today
  ) {
    return -1;
  }

  if (
    selectedDate ===
    today
  ) {
    return 0;
  }

  return 1;
}


/* =========================================================
   TODAY / INCOMPLETE
   ========================================================= */

function dueTodayItems() {
  const today =
    todayISO();

  return getRevisionItems()
    .filter(
      item =>
        item.date ===
          today &&
        !item.completion
          ?.submitted
    );
}

function incompleteItems() {
  const today =
    todayISO();

  return getRevisionItems()
    .filter(
      item =>
        item.date <
          today &&
        !item.completion
          ?.submitted
    );
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
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page ===
          currentPage
      );
    });
}

function renderMain() {
  const main =
    document.getElementById(
      "mainContent"
    );

  if (!main) {
    return;
  }

  if (
    currentPage ===
    "home"
  ) {
    main.innerHTML =
      renderHome();

  } else if (
    currentPage ===
    "subjects"
  ) {
    main.innerHTML =
      renderSubjects();

  } else if (
    currentPage ===
    "today"
  ) {
    main.innerHTML =
      renderToday();

  } else if (
    currentPage ===
    "planner"
  ) {
    main.innerHTML =
      renderPlanner();

  } else if (
    currentPage ===
    "settings"
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
        sum +
        subject.chapters.length,
      0
    );

  const today =
    dueTodayItems().length;

  const incomplete =
    incompleteItems().length;

  const progress =
    overallProgress();

  const exam =
    getExamCountdown();

  return `
    <section>

      <h1 class="page-title">
        Good day 👋
      </h1>

      <p class="page-subtitle">
        Let's make today productive.
      </p>


      <!-- EXAM COUNTDOWN -->

      <div class="card exam-card">

        <div class="exam-icon">
          🎯
        </div>

        <div class="exam-content">

          <div class="muted">
            Exam Countdown
          </div>

          ${
            exam.set
              ? `
                <div class="exam-days">
                  ${
                    exam.days >= 0
                      ? exam.days
                      : 0
                  }
                  <span>
                    ${
                      exam.days === 1
                        ? "Day"
                        : "Days"
                    }
                  </span>
                </div>

                <div class="muted">
                  ${
                    exam.days === 0
                      ? "Exam is today!"
                      : exam.days > 0
                        ? `${formatDate(
                            state.settings
                              .examDate
                          )} • ${
                            exam.label
                          }`
                        : `${formatDate(
                            state.settings
                              .examDate
                          )} • Date passed`
                  }
                </div>
              `
              : `
                <div class="exam-not-set">
                  Exam date not set
                </div>

                <button
                  class="btn small"
                  onclick="goPage('settings')"
                  style="margin-top:8px">
                  Set Exam Date
                </button>
              `
          }

        </div>

      </div>


      <!-- OVERALL PROGRESS -->

      <div class="card hero">

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

        ${progressBarHTML(
          progress
        )}

      </div>


      <!-- SUBJECT-WISE PROGRESS -->

      <div
        class="card"
        style="margin-top:14px">

        <div class="row">

          <div>
            <div class="title">
              📚 Subject-wise Progress
            </div>

            <div class="muted">
              Progress of each subject
            </div>
          </div>

        </div>

        <div
          class="subject-progress-list"
          style="margin-top:14px">

          ${
            state.subjects.length
              ? state.subjects
                  .map(subject => {
                    const p =
                      subjectProgress(
                        subject
                      );

                    return `
                      <div
                        class="subject-progress-item">

                        <div class="row">

                          <div
                            class="progress-name">

                            ${escapeHTML(
                              subject.name
                            )}

                          </div>

                          <div
                            class="progress-percent">

                            ${p}%

                          </div>

                        </div>

                        ${progressBarHTML(
                          p
                        )}

                        <div class="muted">
                          ${
                            subject
                              .chapters
                              .length
                          }
                          chapter${
                            subject
                              .chapters
                              .length === 1
                              ? ""
                              : "s"
                          }
                        </div>

                      </div>
                    `;
                  })
                  .join("")
              : `
                <div class="empty">
                  Add subjects to see
                  subject-wise progress.
                </div>
              `
          }

        </div>

      </div>


      <!-- QUICK STATS -->

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


      <!-- TODAY -->

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

function renderSubjectCard(
  subject
) {
  const progress =
    subjectProgress(
      subject
    );

  return `
    <div class="card subject-card">

      <div class="row">

        <div style="flex:1">

          <div class="title">
            ${escapeHTML(
              subject.name
            )}
          </div>

          <div class="muted">
            ${
              subject.chapters.length
            }
            chapters
          </div>

        </div>

        <div
          class="subject-progress-circle">

          ${progress}%

        </div>

      </div>


      <!-- Subject Progress -->

      <div
        class="subject-card-progress">

        <div class="row">

          <div class="muted">
            Subject Progress
          </div>

          <div
            class="progress-percent">

            ${progress}%

          </div>

        </div>

        ${progressBarHTML(
          progress
        )}

      </div>


      <div
        class="actions"
        style="margin-top:12px">

        <button
          class="btn small secondary"
          onclick="openSubjectModal(
            '${subject.id}'
          )">

          Edit

        </button>

        <button
          class="btn small danger"
          onclick="deleteSubject(
            '${subject.id}'
          )">

          Delete

        </button>

      </div>


      <div style="margin-top:12px">

        ${
          subject.chapters.length
            ? subject.chapters
                .map(
                  chapter =>
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
        onclick="openChapterModal(
          '${subject.id}'
        )">

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
    completedCount(
      chapter
    );

  const total =
    totalRevisionCount();

  const progress =
    chapterProgress(
      chapter
    );

  return `
    <div class="card chapter-card">

      <div class="row">

        <div style="flex:1">

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

        </div>

        <div
          class="chapter-progress-number">

          ${progress}%

        </div>

      </div>


      <!-- Chapter Progress -->

      <div
        class="chapter-progress">

        <div class="row">

          <div class="muted">
            📖 Chapter Progress
          </div>

          <div
            class="progress-percent">

            ${progress}%

          </div>

        </div>

        ${progressBarHTML(
          progress
        )}

        <div
          class="badge"
          style="margin-top:7px">

          ${completed}/${total}
          revisions

        </div>

      </div>


      <div
        class="actions"
        style="margin-top:10px">

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
          onclick="openNotes(
            '${chapter.id}'
          )">

          📝 Notes

        </button>

      </div>


      <div
        class="actions"
        style="margin-top:10px">

        <button
          class="btn small secondary"
          onclick="openMoveModal(
            '${chapter.id}'
          )">

          Move

        </button>

        <button
          class="btn small danger"
          onclick="deleteChapter(
            '${chapter.id}'
          )">

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

          <span
            class="badge danger">

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

function renderRevisionCard(
  item
) {
  const lateDays =
    Math.max(
      0,
      daysBetween(
        item.date,
        todayISO()
      )
    );

  const checked =
    !!item
      .completion
      ?.checked;

  return `
    <div class="card revision-card">

      <div class="row">

        <div>

          <div class="title">
            ${escapeHTML(
              item.chapter.name
            )}
          </div>

          <div class="muted">
            ${escapeHTML(
              item.subject.name
            )}
          </div>

          <div
            class="badge"
            style="margin-top:7px">

            ${escapeHTML(
              item.rule.name
            )}

          </div>

          ${
            lateDays > 0
              ? `
                <div
                  class="late"
                  style="margin-top:7px">

                  ${lateDays}
                  day(s) late

                </div>
              `
              : ""
          }

        </div>

        <button
          class="checkbox ${
            checked
              ? "done"
              : ""
          }"
          onclick="toggleRevisionCheck(
            '${item.chapter.id}',
            '${item.rule.id}'
          )">

          ${
            checked
              ? "✓"
              : ""
          }

        </button>

      </div>

      <div
        class="muted"
        style="margin-top:10px">

        Due:
        ${formatDate(
          item.date
        )}

      </div>

      <button
        class="btn full"
        style="margin-top:10px"
        ${
          checked
            ? ""
            : "disabled"
        }
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

/*
 * Planner is now date based.
 *
 * User can enter ANY date.
 *
 * Past:
 *   Shows scheduled study/revisions
 *   and actual completed revisions.
 *
 * Today:
 *   Shows today's scheduled work.
 *
 * Future:
 *   Shows upcoming scheduled work.
 */

function renderPlanner() {
  const selectedDate =
    plannerSelectedDate ||
    todayISO();

  const relation =
    plannerDateRelation(
      selectedDate
    );

  const scheduled =
    getPlannerItemsForDate(
      selectedDate
    );

  const completed =
    getCompletedOnDate(
      selectedDate
    );

  const relationTitle =
    relation < 0
      ? "Past Study / Revision"
      : relation === 0
        ? "Today's Study / Revision"
        : "Upcoming Study / Revision";

  return `
    <section>

      <h1 class="page-title">
        Planner
      </h1>

      <p class="page-subtitle">
        Select any date to see
        your revision and study schedule.
      </p>


      <!-- =================================================
           DATE SELECTOR
           ================================================= -->

      <div class="card">

        <div class="title">
          📅 Select Date
        </div>

        <div
          class="form-group"
          style="margin-top:12px">

          <label>
            Date
          </label>

          <input
            id="plannerDateInput"
            type="date"
            value="${escapeHTML(
              selectedDate
            )}"
            onchange="changePlannerDate(this.value)">

        </div>


        <div
          class="actions"
          style="margin-top:5px">

          <button
            class="btn small secondary"
            onclick="plannerPreviousDay()">

            ← Previous

          </button>

          <button
            class="btn small"
            onclick="plannerToday()">

            Today

          </button>

          <button
            class="btn small secondary"
            onclick="plannerNextDay()">

            Next →

          </button>

        </div>

      </div>


      <!-- =================================================
           SELECTED DATE
           ================================================= -->

      <div
        class="card hero"
        style="margin-top:14px">

        <div class="muted">
          Selected Date
        </div>

        <div
          class="title"
          style="
            font-size:18px;
            margin-top:4px;
          ">

          ${formatDateLong(
            selectedDate
          )}

        </div>

        <div
          class="badge"
          style="margin-top:9px">

          ${relation < 0
            ? "Past"
            : relation === 0
              ? "Today"
              : "Future"}

        </div>

      </div>


      <!-- =================================================
           SCHEDULED WORK
           ================================================= -->

      <div
        class="card"
        style="margin-top:14px">

        <div class="row">

          <div>

            <div class="title">
              📚 ${relationTitle}
            </div>

            <div class="muted">
              ${
                scheduled.length
              }
              item${
                scheduled.length === 1
                  ? ""
                  : "s"
              }
              scheduled
            </div>

          </div>

          <span class="badge">
            ${scheduled.length}
          </span>

        </div>


        <div
          style="margin-top:12px">

          ${
            scheduled.length
              ? scheduled
                  .map(
                    renderPlannerItem
                  )
                  .join("")
              : `
                <div class="empty">

                  ${
                    relation < 0
                      ? "No study or revision was scheduled for this date."
                      : relation === 0
                        ? "🎉 No revision or study is scheduled for today."
                        : "No revision is scheduled for this date."
                  }

                </div>
              `
          }

        </div>

      </div>


      <!-- =================================================
           ACTUAL COMPLETION HISTORY
           ================================================= -->

      ${
        relation <= 0
          ? `
            <div
              class="card"
              style="margin-top:14px">

              <div class="row">

                <div>

                  <div class="title">
                    ✓ Actually Completed
                  </div>

                  <div class="muted">
                    Revisions you submitted
                    on this date
                  </div>

                </div>

                <span class="badge success">
                  ${completed.length}
                </span>

              </div>


              <div
                style="margin-top:12px">

                ${
                  completed.length
                    ? completed
                        .map(
                          renderCompletedHistoryItem
                        )
                        .join("")
                    : `
                      <div class="empty">
                        ${
                          relation < 0
                            ? "No revision was marked as completed on this date."
                            : "No revision has been submitted today yet."
                        }
                      </div>
                    `
                }

              </div>

            </div>
          `
          : ""
      }

    </section>
  `;
}


/*
 * Render one Planner scheduled item.
 */

function renderPlannerItem(
  item
) {
  const submitted =
    !!item
      .completion
      ?.submitted;

  const checked =
    !!item
      .completion
      ?.checked;

  const isStudy =
    item.type ===
    "study";

  const statusText =
    submitted
      ? "✓ Completed"
      : isStudy
        ? "Chapter Start"
        : item.date < todayISO()
          ? "Pending / Missed"
          : item.date === todayISO()
            ? "Due Today"
            : "Upcoming";

  const statusClass =
    submitted
      ? "success"
      : item.date < todayISO()
        ? "danger"
        : "";

  return `
    <div
      class="card"
      style="margin-bottom:10px">

      <div class="row">

        <div
          style="flex:1">

          <div class="title">
            ${escapeHTML(
              item.chapter.name
            )}
          </div>

          <div class="muted">
            ${escapeHTML(
              item.subject.name
            )}
          </div>

          <div
            class="badge"
            style="margin-top:7px">

            ${
              isStudy
                ? "📖 Study / Chapter Start"
                : `🔄 ${escapeHTML(
                    item.rule.name
                  )}`
            }

          </div>

        </div>

        <span
          class="badge ${
            statusClass
          }">

          ${statusText}

        </span>

      </div>


      <div
        class="muted"
        style="margin-top:9px">

        Scheduled:
        ${formatDate(
          item.date
        )}

      </div>


      ${
        submitted &&
        item.completion
          ?.submittedAt
          ? `
            <div
              class="muted"
              style="margin-top:5px">

              Completed:
              ${formatDate(
                item.completion
                  .submittedAt
                  .slice(0, 10)
              )}

            </div>
          `
          : ""
      }


      ${
        relationForPlannerItem(
          item
        ) === 0 &&
        !isStudy &&
        !submitted
          ? `
            <div
              class="actions"
              style="margin-top:10px">

              <button
                class="btn small"
                onclick="goPage('today')">

                Open Today's Revision

              </button>

            </div>
          `
          : ""
      }

    </div>
  `;
}


/*
 * Helper used by Planner item.
 */

function relationForPlannerItem(
  item
) {
  return plannerDateRelation(
    item.date
  );
}


/*
 * Render actual completed history.
 */

function renderCompletedHistoryItem(
  item
) {
  const completedDate =
    item
      .completion
      ?.submittedAt
      ? item
          .completion
          .submittedAt
          .slice(0, 10)
      : "";

  return `
    <div
      class="card"
      style="margin-bottom:10px">

      <div class="row">

        <div
          style="flex:1">

          <div class="title">
            ${escapeHTML(
              item.chapter.name
            )}
          </div>

          <div class="muted">
            ${escapeHTML(
              item.subject.name
            )}
          </div>

          <div
            class="badge success"
            style="margin-top:7px">

            ✓ ${escapeHTML(
              item.rule.name
            )}

          </div>

        </div>

        <div
          style="font-size:25px">

          ✓

        </div>

      </div>

      <div
        class="muted"
        style="margin-top:9px">

        Completed on:
        ${formatDate(
          completedDate
        )}

      </div>

    </div>
  `;
}


/* =========================================================
   PLANNER DATE ACTIONS
   ========================================================= */

function changePlannerDate(
  value
) {
  if (!value) {
    plannerSelectedDate =
      todayISO();
  } else {
    plannerSelectedDate =
      value;
  }

  render();
}

function plannerToday() {
  plannerSelectedDate =
    todayISO();

  render();
}

function plannerPreviousDay() {
  const date =
    dateFromISO(
      plannerSelectedDate ||
        todayISO()
    );

  date.setDate(
    date.getDate() - 1
  );

  plannerSelectedDate =
    dateToISO(date);

  render();
}

function plannerNextDay() {
  const date =
    dateFromISO(
      plannerSelectedDate ||
        todayISO()
    );

  date.setDate(
    date.getDate() + 1
  );

  plannerSelectedDate =
    dateToISO(date);

  render();
}

function dateToISO(date) {
  return (
    date.getFullYear() +
    "-" +
    String(
      date.getMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      date.getDate()
    ).padStart(2, "0")
  );
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


      <!-- EXAM DATE -->

      <div
        class="card exam-settings-card">

        <div class="title">
          🎯 Exam Countdown
        </div>

        <p
          class="muted"
          style="margin-top:7px">

          Choose your exam date.
          You can change it anytime.

        </p>

        <div
          class="form-group"
          style="margin-top:13px">

          <label>
            Exam Date
          </label>

          <input
            id="examDateInput"
            type="date"
            value="${escapeHTML(
              state.settings
                .examDate ||
              ""
            )}">

        </div>

        <div class="actions">

          <button
            class="btn"
            onclick="saveExamDate()">

            Save Exam Date

          </button>

          ${
            state.settings
              .examDate
              ? `
                <button
                  class="btn secondary"
                  onclick="clearExamDate()">

                  Remove Date

                </button>
              `
              : ""
          }

        </div>

      </div>


      <!-- REVISION SYSTEM -->

      <div
        class="card"
        style="margin-top:14px">

        <div class="title">
          Revision System
        </div>

        <div
          style="margin-top:12px">

          ${state.revisionSystem
            .map(
              rule => `
                <div
                  class="system-row">

                  <input
                    value="${escapeHTML(
                      rule.name
                    )}"
                    data-rule-name="${
                      rule.id
                    }">

                  <input
                    class="day-input"
                    type="number"
                    min="1"
                    value="${Number(
                      rule.day
                    )}"
                    data-rule-day="${
                      rule.id
                    }">

                </div>
              `
            )
            .join("")}

        </div>

        <button
          class="btn full"
          onclick="saveRevisionSystem()">

          Save Revision System

        </button>

      </div>


      <!-- NOTIFICATIONS -->

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
              state.settings
                .notifications
                ? "checked"
                : ""
            }
            onchange="toggleNotifications(
              this.checked
            )">

          Enable notifications

        </label>

      </div>


      <!-- DATA -->

      <div
        class="card"
        style="margin-top:14px">

        <div class="title">
          Data
        </div>

        <p
          class="muted"
          style="margin-top:7px">

          Your study data and uploaded
          files are stored locally on
          this device.

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


/* =========================================================
   EXAM DATE ACTIONS
   ========================================================= */

async function saveExamDate() {
  const input =
    document.getElementById(
      "examDateInput"
    );

  const value =
    input?.value || "";

  if (!value) {
    toast(
      "Please select an exam date."
    );
    return;
  }

  state.settings.examDate =
    value;

  await saveState();

  render();

  toast(
    "Exam date saved 🎯"
  );
}

async function clearExamDate() {
  state.settings.examDate =
    "";

  await saveState();

  render();

  toast(
    "Exam date removed."
  );
}


/* =========================================================
   MODALS
   ========================================================= */

function openModal(html) {
  const root =
    document.getElementById(
      "modalRoot"
    );

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
    event.target !==
      event.currentTarget
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

function openSubjectModal(
  subjectId = null
) {
  const subject =
    subjectId
      ? findSubject(
          subjectId
        )
      : null;

  openModal(`
    <h2>
      ${
        subject
          ? "Edit Subject"
          : "Add Subject"
      }
    </h2>

    <div class="form-group">

      <label>
        Subject Name
      </label>

      <input
        id="subjectNameInput"
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
        onclick="saveSubject(
          ${
            subjectId
              ? `'${subjectId}'`
              : "null"
          }
        )">

        Save

      </button>

    </div>
  `);
}

async function saveSubject(
  subjectId
) {
  const input =
    document.getElementById(
      "subjectNameInput"
    );

  const name =
    input?.value.trim();

  if (!name) {
    toast(
      "Enter subject name."
    );
    return;
  }

  if (subjectId) {
    const subject =
      findSubject(
        subjectId
      );

    if (subject) {
      subject.name =
        name;
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

  toast(
    "Subject saved."
  );
}

async function deleteSubject(
  subjectId
) {
  const subject =
    findSubject(
      subjectId
    );

  if (!subject) {
    return;
  }

  if (
    !confirm(
      `Delete "${subject.name}" and all its chapters/files?`
    )
  ) {
    return;
  }

  for (
    const chapter of
      subject.chapters
  ) {
    const files =
      await dbGetByChapter(
        chapter.id
      );

    for (
      const file of files
    ) {
      await dbDelete(
        FILE_STORE,
        file.id
      );
    }
  }

  state.subjects =
    state.subjects.filter(
      item =>
        item.id !==
        subjectId
    );

  await saveState();

  render();

  toast(
    "Subject deleted."
  );
}


/* =========================================================
   CHAPTER MODAL
   ========================================================= */

function openChapterModal(
  subjectId,
  chapterId = null
) {
  const subject =
    findSubject(
      subjectId
    );

  if (!subject) {
    return;
  }

  const chapter =
    chapterId
      ? subject.chapters.find(
          item =>
            item.id ===
            chapterId
        )
      : null;

  openModal(`
    <h2>
      ${
        chapter
          ? "Edit Chapter"
          : "Add Chapter"
      }
    </h2>

    <div class="form-group">

      <label>
        Chapter Name
      </label>

      <input
        id="chapterNameInput"
        value="${escapeHTML(
          chapter?.name || ""
        )}"
        placeholder="e.g. Rotational Dynamics">

    </div>

    <div class="form-group">

      <label>
        Start Date
      </label>

      <input
        id="chapterDateInput"
        type="date"
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
        onclick="saveChapter(
          '${subjectId}',
          ${
            chapterId
              ? `'${chapterId}'`
              : "null"
          }
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
    findSubject(
      subjectId
    );

  if (!subject) {
    return;
  }

  const name =
    document
      .getElementById(
        "chapterNameInput"
      )
      ?.value.trim();

  const startDate =
    document
      .getElementById(
        "chapterDateInput"
      )
      ?.value;

  if (!name) {
    toast(
      "Enter chapter name."
    );
    return;
  }

  if (!startDate) {
    toast(
      "Select start date."
    );
    return;
  }

  if (chapterId) {
    const chapter =
      subject.chapters.find(
        item =>
          item.id ===
          chapterId
      );

    if (chapter) {
      chapter.name =
        name;

      chapter.startDate =
        startDate;
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

  toast(
    "Chapter saved."
  );
}

async function deleteChapter(
  chapterId
) {
  const found =
    findChapter(
      chapterId
    );

  if (!found) {
    return;
  }

  if (
    !confirm(
      `Delete "${found.chapter.name}"?`
    )
  ) {
    return;
  }

  const files =
    await dbGetByChapter(
      chapterId
    );

  for (
    const file of files
  ) {
    await dbDelete(
      FILE_STORE,
      file.id
    );
  }

  found.subject.chapters =
    found.subject.chapters.filter(
      chapter =>
        chapter.id !==
        chapterId
    );

  await saveState();

  render();

  toast(
    "Chapter deleted."
  );
}


/* =========================================================
   MOVE CHAPTER
   ========================================================= */

function openMoveModal(
  chapterId
) {
  const found =
    findChapter(
      chapterId
    );

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
      .map(
        subject => `
          <option
            value="${subject.id}">

            ${escapeHTML(
              subject.name
            )}

          </option>
        `
      )
      .join("");

  if (!options) {
    toast(
      "Add another subject first."
    );
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

      <select
        id="moveSubjectInput">

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
        onclick="moveChapter(
          '${chapterId}'
        )">

        Move

      </button>

    </div>
  `);
}

async function moveChapter(
  chapterId
) {
  const found =
    findChapter(
      chapterId
    );

  const targetId =
    document
      .getElementById(
        "moveSubjectInput"
      )
      ?.value;

  const target =
    findSubject(
      targetId
    );

  if (
    !found ||
    !target
  ) {
    return;
  }

  found.subject.chapters =
    found.subject.chapters.filter(
      chapter =>
        chapter.id !==
        chapterId
    );

  target.chapters.push(
    found.chapter
  );

  await saveState();

  closeModal();
  render();

  toast(
    "Chapter moved."
  );
}


/* =========================================================
   REVISION ACTIONS
   ========================================================= */

async function toggleRevisionCheck(
  chapterId,
  ruleId
) {
  const found =
    findChapter(
      chapterId
    );

  if (!found) {
    return;
  }

  if (
    !found.chapter.revisions
  ) {
    found.chapter.revisions =
      {};
  }

  const current =
    found.chapter.revisions[
      ruleId
    ] || {};

  current.checked =
    !current.checked;

  found.chapter.revisions[
    ruleId
  ] = current;

  await saveState();

  render();
}

async function submitRevision(
  chapterId,
  ruleId
) {
  const found =
    findChapter(
      chapterId
    );

  if (!found) {
    return;
  }

  if (
    !found.chapter.revisions
  ) {
    found.chapter.revisions =
      {};
  }

  /*
   * Important:
   * submittedAt is saved so Planner
   * can later tell the user exactly
   * when the revision was completed.
   */

  found.chapter.revisions[
    ruleId
  ] = {
    checked: true,
    submitted: true,
    submittedAt:
      new Date().toISOString()
  };

  await saveState();

  render();

  toast(
    "Revision completed ✓"
  );
}


/* =========================================================
   NOTES
   ========================================================= */

async function openNotes(
  chapterId
) {
  const found =
    findChapter(
      chapterId
    );

  if (!found) {
    return;
  }

  const files =
    await dbGetByChapter(
      chapterId
    );

  openModal(`
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
        onclick="uploadChapterFiles(
          '${chapterId}'
        )">

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

function renderFiles(
  files
) {
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
            file.type || "";

          const isPDF =
            type ===
              "application/pdf" ||
            file.name
              ?.toLowerCase()
              .endsWith(
                ".pdf"
              );

          const isImage =
            type.startsWith(
              "image/"
            );

          const isVideo =
            type.startsWith(
              "video/"
            );

          if (isPDF) {
            return `
              <div
                class="media-box">

                <div
                  class="pdf-preview">

                  📄

                </div>

                <div
                  class="media-info">

                  <div class="title">
                    ${escapeHTML(
                      file.name
                    )}
                  </div>

                  <div
                    class="actions"
                    style="margin-top:7px">

                    <button
                      class="btn small"
                      onclick="viewStoredFile(
                        '${file.id}'
                      )">

                      Open PDF

                    </button>

                    <button
                      class="btn small danger"
                      onclick="deleteStoredFile(
                        '${file.id}'
                      )">

                      Delete

                    </button>

                  </div>

                </div>

              </div>
            `;
          }

          if (isImage) {
            return `
              <div
                class="media-box">

                <div
                  class="pdf-preview">

                  🖼️

                </div>

                <div
                  class="media-info">

                  <div class="title">
                    ${escapeHTML(
                      file.name
                    )}
                  </div>

                  <div
                    class="actions"
                    style="margin-top:7px">

                    <button
                      class="btn small"
                      onclick="viewStoredFile(
                        '${file.id}'
                      )">

                      Open

                    </button>

                    <button
                      class="btn small danger"
                      onclick="deleteStoredFile(
                        '${file.id}'
                      )">

                      Delete

                    </button>

                  </div>

                </div>

              </div>
            `;
          }

          if (isVideo) {
            return `
              <div
                class="media-box">

                <div
                  class="pdf-preview">

                  🎥

                </div>

                <div
                  class="media-info">

                  <div class="title">
                    ${escapeHTML(
                      file.name
                    )}
                  </div>

                  <div
                    class="actions"
                    style="margin-top:7px">

                    <button
                      class="btn small"
                      onclick="viewStoredFile(
                        '${file.id}'
                      )">

                      Open

                    </button>

                    <button
                      class="btn small danger"
                      onclick="deleteStoredFile(
                        '${file.id}'
                      )">

          
