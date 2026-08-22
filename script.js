"use strict";

/* =========================================================
   REVISION TRACKER
   Corrected Offline-First Version
   ========================================================= */

const APP_NAME = "Revision Tracker";

const DB_NAME = "revision_tracker_offline_db";
const DB_VERSION = 8;

const DATA_STORE = "appData";
const FILE_STORE = "notesFiles";

let db = null;
let dbAvailable = false;
let currentPage = "home";
let plannerSelectedDate = todayISO();

/* =========================================================
   DEFAULT REVISION SYSTEM
   ========================================================= */

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
   DEFAULT STATE
   ========================================================= */

function createDefaultState() {
  return {
    subjects: [],
    revisionSystem: createDefaultRevisionSystem(),
    settings: {
      notifications: true,
      examDate: ""
    }
  };
}

let state = createDefaultState();


/* =========================================================
   STARTUP
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  console.log("Revision Tracker: Starting...");

  /*
   * IMPORTANT:
   * First render the application UI.
   * Do NOT wait for IndexedDB before rendering.
   * This prevents a completely blank page if IndexedDB
   * has an error or is unavailable.
   */

  try {

    setupNavigation();
    setupSettingsButton();

    if (!plannerSelectedDate) {
      plannerSelectedDate = todayISO();
    }

    /*
     * Render immediately using default state.
     */
    render();

    console.log("Revision Tracker: Initial UI rendered.");

  } catch (error) {

    console.error(
      "Initial render error:",
      error
    );

    showFatalError(error);
  }


  /*
   * Load database in the background.
   */
  try {

    await initDB();

    console.log(
      "Revision Tracker: IndexedDB initialized."
    );

    await loadState();

    console.log(
      "Revision Tracker: State loaded."
    );

    /*
     * Re-render after saved data has loaded.
     */
    render();

    /*
     * Register service worker after UI is working.
     */
    registerServiceWorker();

    console.log(
      "Revision Tracker: App ready."
    );

  } catch (error) {

    console.error(
      "Database / state loading error:",
      error
    );

    /*
     * DO NOT make the page blank.
     *
     * The app will continue working with the
     * default in-memory state.
     */

    toast(
      "Local database unavailable. App is running in basic mode."
    );

    /*
     * Make sure the UI is still visible.
     */
    render();
  }

});


/* =========================================================
   FATAL ERROR SCREEN
   ========================================================= */

function showFatalError(error) {

  console.error(
    "Fatal application error:",
    error
  );

  const main =
    document.getElementById(
      "mainContent"
    );

  if (!main) {
    return;
  }

  main.innerHTML = `
    <section>

      <div class="card">

        <h2>
          ⚠️ Revision Tracker
        </h2>

        <p
          class="muted"
          style="margin-top:10px">

          The application could not start
          correctly.

        </p>

        <button
          class="btn full"
          style="margin-top:15px"
          onclick="location.reload()">

          🔄 Reload App

        </button>

        <details
          style="margin-top:15px">

          <summary>
            Technical details
          </summary>

          <pre
            style="
              white-space:pre-wrap;
              margin-top:10px;
              font-size:12px;
            "
          >${escapeHTML(
            error?.message ||
            String(error)
          )}</pre>

        </details>

      </div>

    </section>
  `;
}


/* =========================================================
   DATABASE
   ========================================================= */

function initDB() {

  return new Promise((resolve, reject) => {

    if (!("indexedDB" in window)) {

      dbAvailable = false;

      reject(
        new Error(
          "IndexedDB is not supported by this browser."
        )
      );

      return;
    }


    let request;

    try {

      request = indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

    } catch (error) {

      dbAvailable = false;
      reject(error);
      return;
    }


    request.onupgradeneeded = function(event) {

      const database =
        event.target.result;

      /*
       * Main data store
       */

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


      /*
       * File store
       */

      let fileStore;

      if (
        !database.objectStoreNames.contains(
          FILE_STORE
        )
      ) {

        fileStore =
          database.createObjectStore(
            FILE_STORE,
            {
              keyPath: "id"
            }
          );

      } else {

        fileStore =
          event.target.transaction
            .objectStore(FILE_STORE);
      }


      /*
       * Chapter index
       */

      if (
        fileStore &&
        !fileStore.indexNames.contains(
          "chapterId"
        )
      ) {

        fileStore.createIndex(
          "chapterId",
          "chapterId",
          {
            unique: false
          }
        );
      }
    };


    request.onsuccess = function(event) {

      db = event.target.result;

      dbAvailable = true;

      db.onversionchange = function() {

        db.close();

        dbAvailable = false;
      };

      resolve();

    };


    request.onerror = function() {

      dbAvailable = false;

      reject(
        request.error ||
        new Error(
          "Unable to open IndexedDB."
        )
      );
    };


    request.onblocked = function() {

      console.warn(
        "IndexedDB upgrade is blocked."
      );
    };
  });
}


/* =========================================================
   DATABASE PUT
   ========================================================= */

function dbPut(storeName, value) {

  return new Promise((resolve, reject) => {

    if (!db || !dbAvailable) {

      reject(
        new Error(
          "Database is not available."
        )
      );

      return;
    }


    let transaction;

    try {

      transaction =
        db.transaction(
          storeName,
          "readwrite"
        );

    } catch (error) {

      reject(error);
      return;
    }


    transaction
      .objectStore(storeName)
      .put(value);


    transaction.oncomplete =
      function() {

        resolve();
      };


    transaction.onerror =
      function() {

        reject(
          transaction.error ||
          new Error(
            "Database write failed."
          )
        );
      };


    transaction.onabort =
      function() {

        reject(
          transaction.error ||
          new Error(
            "Database transaction aborted."
          )
        );
      };
  });
}


/* =========================================================
   DATABASE GET
   ========================================================= */

function dbGet(storeName, key) {

  return new Promise((resolve, reject) => {

    if (!db || !dbAvailable) {

      reject(
        new Error(
          "Database is not available."
        )
      );

      return;
    }


    let transaction;

    try {

      transaction =
        db.transaction(
          storeName,
          "readonly"
        );

    } catch (error) {

      reject(error);
      return;
    }


    const request =
      transaction
        .objectStore(storeName)
        .get(key);


    request.onsuccess =
      function() {

        resolve(
          request.result
        );
      };


    request.onerror =
      function() {

        reject(
          request.error ||
          new Error(
            "Database read failed."
          )
        );
      };
  });
}


/* =========================================================
   DATABASE GET ALL
   ========================================================= */

function dbGetAll(storeName) {

  return new Promise((resolve, reject) => {

    if (!db || !dbAvailable) {

      reject(
        new Error(
          "Database is not available."
        )
      );

      return;
    }


    let transaction;

    try {

      transaction =
        db.transaction(
          storeName,
          "readonly"
        );

    } catch (error) {

      reject(error);
      return;
    }


    const request =
      transaction
        .objectStore(storeName)
        .getAll();


    request.onsuccess =
      function() {

        resolve(
          request.result || []
        );
      };


    request.onerror =
      function() {

        reject(
          request.error ||
          new Error(
            "Database read failed."
          )
        );
      };
  });
}


/* =========================================================
   DATABASE DELETE
   ========================================================= */

function dbDelete(storeName, key) {

  return new Promise((resolve, reject) => {

    if (!db || !dbAvailable) {

      reject(
        new Error(
          "Database is not available."
        )
      );

      return;
    }


    let transaction;

    try {

      transaction =
        db.transaction(
          storeName,
          "readwrite"
        );

    } catch (error) {

      reject(error);
      return;
    }


    transaction
      .objectStore(storeName)
      .delete(key);


    transaction.oncomplete =
      function() {

        resolve();
      };


    transaction.onerror =
      function() {

        reject(
          transaction.error ||
          new Error(
            "Database delete failed."
          )
        );
      };
  });
}


/* =========================================================
   DATABASE FILES BY CHAPTER
   ========================================================= */

function dbGetByChapter(chapterId) {

  return new Promise((resolve, reject) => {

    if (!db || !dbAvailable) {

      reject(
        new Error(
          "Database is not available."
        )
      );

      return;
    }


    let transaction;

    try {

      transaction =
        db.transaction(
          FILE_STORE,
          "readonly"
        );

    } catch (error) {

      reject(error);
      return;
    }


    const store =
      transaction.objectStore(
        FILE_STORE
      );


    let request;


    if (
      store.indexNames.contains(
        "chapterId"
      )
    ) {

      request =
        store
          .index("chapterId")
          .getAll(chapterId);

    } else {

      request =
        store.getAll();
    }


    request.onsuccess =
      function() {

        const result =
          request.result || [];


        if (
          store.indexNames.contains(
            "chapterId"
          )
        ) {

          resolve(result);

        } else {

          resolve(
            result.filter(
              file =>
                file.chapterId ===
                chapterId
            )
          );
        }
      };


    request.onerror =
      function() {

        reject(
          request.error ||
          new Error(
            "Unable to read files."
          )
        );
      };
  });
}


/* =========================================================
   STATE
   ========================================================= */

async function saveState() {

  /*
   * Always keep state in memory.
   */

  if (!dbAvailable) {

    return;
  }


  try {

    await dbPut(
      DATA_STORE,
      {
        id: "main",
        value: state
      }
    );

  } catch (error) {

    console.error(
      "saveState error:",
      error
    );

    dbAvailable = false;

    toast(
      "Data could not be saved locally."
    );
  }
}


async function loadState() {

  if (!dbAvailable) {
    return;
  }


  const saved =
    await dbGet(
      DATA_STORE,
      "main"
    );


  if (
    saved &&
    saved.value &&
    typeof saved.value === "object"
  ) {

    state = saved.value;
  }


  normalizeState();
}


/* =========================================================
   NORMALIZE STATE
   ========================================================= */

function normalizeState() {

  if (
    !state ||
    typeof state !== "object"
  ) {

    state =
      createDefaultState();
  }


  if (
    !Array.isArray(
      state.subjects
    )
  ) {

    state.subjects = [];
  }


  state.subjects =
    state.subjects.filter(
      subject =>
        subject &&
        typeof subject === "object"
    );


  state.subjects.forEach(
    subject => {

      if (!subject.id) {
        subject.id = uid();
      }

      if (
        typeof subject.name !==
        "string"
      ) {

        subject.name =
          "Untitled Subject";
      }


      if (
        !Array.isArray(
          subject.chapters
        )
      ) {

        subject.chapters = [];
      }


      subject.chapters =
        subject.chapters.filter(
          chapter =>
            chapter &&
            typeof chapter ===
              "object"
        );


      subject.chapters.forEach(
        chapter => {

          if (!chapter.id) {
            chapter.id = uid();
          }

          if (
            typeof chapter.name !==
            "string"
          ) {

            chapter.name =
              "Untitled Chapter";
          }


          if (
            !chapter.startDate
          ) {

            chapter.startDate =
              todayISO();
          }


          if (
            !chapter.revisions ||
            typeof chapter.revisions !==
              "object"
          ) {

            chapter.revisions = {};
          }
        }
      );
    }
  );


  if (
    !Array.isArray(
      state.revisionSystem
    ) ||
    !state.revisionSystem.length
  ) {

    state.revisionSystem =
      createDefaultRevisionSystem();
  }


  state.revisionSystem =
    state.revisionSystem.filter(
      rule =>
        rule &&
        typeof rule ===
          "object"
    );


  if (
    !state.revisionSystem.length
  ) {

    state.revisionSystem =
      createDefaultRevisionSystem();
  }


  state.revisionSystem.forEach(
    rule => {

      if (!rule.id) {
        rule.id = uid();
      }

      if (
        typeof rule.name !==
        "string"
      ) {

        rule.name =
          "Revision";
      }

      rule.day =
        Math.max(
          1,
          Number(rule.day) || 1
        );
    }
  );


  if (
    !state.settings ||
    typeof state.settings !==
      "object"
  ) {

    state.settings = {};
  }


  if (
    typeof state.settings.notifications !==
      "boolean"
  ) {

    state.settings.notifications =
      true;
  }


  if (
    typeof state.settings.examDate !==
      "string"
  ) {

    state.settings.examDate =
      "";
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
      .then(
        () => {
          console.log(
            "Service Worker registered."
          );
        }
      )
      .catch(
        error => {

          console.warn(
            "Service Worker registration failed:",
            error
          );
        }
      );
  }
}


/* =========================================================
   HELPERS
   ========================================================= */

function uid() {

  try {

    if (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
    ) {

      return crypto.randomUUID();
    }

  } catch (error) {
    console.warn(
      "crypto.randomUUID unavailable."
    );
  }


  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2)
  );
}


function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function todayISO() {

  const d =
    new Date();

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
    String(value)
      .split("-")
      .map(Number);


  if (
    parts.length !== 3 ||
    parts.some(
      number =>
        !Number.isFinite(number)
    )
  ) {

    return new Date();
  }


  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  );
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


function formatDate(value) {

  if (!value) {
    return "-";
  }


  const date =
    dateFromISO(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "-";
  }


  return date.toLocaleDateString(
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


  const date =
    dateFromISO(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "-";
  }


  return date.toLocaleDateString(
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


/* =========================================================
   TOAST
   ========================================================= */

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


  element.className =
    "toast";


  element.textContent =
    message;


  document.body.appendChild(
    element
  );


  setTimeout(
    function() {

      if (
        element &&
        element.parentNode
      ) {

        element.remove();
      }

    },
    2500
  );
}


/* =========================================================
   FATAL ERROR
   ========================================================= */

function showFatalError(error) {

  const main =
    document.getElementById(
      "mainContent"
    );


  if (!main) {
    return;
  }


  main.innerHTML = `
    <section>

      <div class="card">

        <h2>
          ⚠️ Revision Tracker
        </h2>

        <p
          class="muted"
          style="margin-top:10px"
        >
          App सुरू करताना समस्या आली.
        </p>

        <p
          class="muted"
          style="
            margin-top:10px;
            font-size:12px;
            word-break:break-word;
          "
        >
          ${escapeHTML(
            error?.message ||
            "Unknown error"
          )}
        </p>

        <button
          class="btn full"
          style="margin-top:15px"
          onclick="location.reload()"
        >
          🔄 Reload App
        </button>

      </div>

    </section>
  `;
}


/* =========================================================
   PROGRESS
   ========================================================= */

function totalRevisionCount() {

  return Math.max(
    0,
    state.revisionSystem.length - 1
  );
}


function completedCount(chapter) {

  if (
    !chapter ||
    !chapter.revisions
  ) {

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
      ) *
      100
    )
  );
}


function subjectProgress(subject) {

  const chapters =
    subject?.chapters || [];


  if (!chapters.length) {
    return 0;
  }


  const total =
    chapters.reduce(
      function(sum, chapter) {

        return (
          sum +
          chapterProgress(
            chapter
          )
        );

      },
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
        subject.chapters ||
        []
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
      function(sum, chapter) {

        return (
          sum +
          chapterProgress(
            chapter
          )
        );

      },
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
    <div class="progress ${escapeHTML(extraClass)}">
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
    dateFromISO(
      examDate
    );


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
      (
        exam - today
      ) /
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
    .forEach(
      button => {

        button.addEventListener(
          "click",
          function() {

            goPage(
              button.dataset.page
            );
          }
        );
      }
    );
}


function setupSettingsButton() {

  const button =
    document.getElementById(
      "settingsBtn"
    );


  if (button) {

    button.addEventListener(
      "click",
      function() {

        goPage("settings");
      }
    );
  }
}


function goPage(page) {

  const allowedPages = [
    "home",
    "subjects",
    "today",
    "planner",
    "settings"
  ];


  if (
    !allowedPages.includes(page)
  ) {

    page = "home";
  }


  currentPage =
    page;


  render();


  try {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {

    window.scrollTo(
      0,
      0
    );
  }
}


/* =========================================================
   REVISION DATES
   ========================================================= */

function getRevisionDates(chapter) {

  if (
    !chapter ||
    !chapter.startDate
  ) {

    return [];
  }


  return state.revisionSystem
    .map(
      rule => {

        const date =
          dateFromISO(
            chapter.startDate
          );


        date.setDate(
          date.getDate() +
          Number(rule.day) -
          1
        );


        return {
          rule,
          date:
            dateToISO(date)
        };
      }
    );
}


function getRevisionItems() {

  const result = [];


  for (
    const subject of state.subjects
  ) {

    for (
      const chapter of
        subject.chapters
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
          completion:
            completion || null
        });
      }
    }
  }


  return result;
}


function getPlannerItems() {

  const result = [];


  for (
    const subject of state.subjects
  ) {

    for (
      const chapter of
        subject.chapters
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
      (a, b) =>
        Number(a.rule.day) -
        Number(b.rule.day)
    );
}


function getCompletedOnDate(
  selectedDate
) {

  const result = [];


  for (
    const subject of state.subjects
  ) {

    for (
      const chapter of
        subject.chapters
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
          String(
            completion.submittedAt
          ).slice(0, 10);


        if (
          completedDate !==
          selectedDate
        ) {

          continue;
        }


        const rule =
          state.revisionSystem.find(
            item =>
              item.id === ruleId
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


function dueTodayItems() {

  const today =
    todayISO();


  return getRevisionItems()
    .filter(
      item =>
        item.date === today &&
        !item.completion?.submitted
    );
}


function incompleteItems() {

  const today =
    todayISO();


  return getRevisionItems()
    .filter(
      item =>
        item.date < today &&
        !item.completion?.submitted
    );
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  try {

    renderMain();
    updateNav();

  } catch (error) {

    console.error(
      "Render error:",
      error
    );

    showFatalError(error);
  }
}


function updateNav() {

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.page ===
            currentPage
        );
      }
    );
}


function renderMain() {

  const main =
    document.getElementById(
      "mainContent"
    );


  if (!main) {
    return;
  }


  switch (currentPage) {

    case "home":

      main.innerHTML =
        renderHome();

      break;


    case "subjects":

      main.innerHTML =
        renderSubjects();

      break;


    case "today":

      main.innerHTML =
        renderToday();

      break;


    case "planner":

      main.innerHTML =
        renderPlanner();

      break;


    case "settings":

      main.innerHTML =
        renderSettings();

      break;


    default:

      currentPage =
        "home";

      main.innerHTML =
        renderHome();
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
        (
          subject.chapters?.length ||
          0
        ),
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
                            state.settings.examDate
                          )} • ${exam.label}`
                        : `${formatDate(
                            state.settings.examDate
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
                  style="margin-top:8px"
                >
                  Set Exam Date
                </button>
              `
          }

        </div>

      </div>


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

        ${progressBarHTML(progress)}

      </div>


      <div
        class="card"
        style="margin-top:14px"
      >

        <div class="title">
          📚 Subject-wise Progress
        </div>

        <div class="muted">
          Progress of each subject
        </div>

        <div
          class="subject-progress-list"
          style="margin-top:14px"
        >

          ${
            state.subjects.length
              ? state.subjects
                  .map(
                    subject => {

                      const p =
                        subjectProgress(
                          subject
                        );


                      return `
                        <div
                          class="subject-progress-item"
                        >

                          <div class="row">

                            <div
                              class="progress-name"
                            >
                              ${escapeHTML(
                                subject.name
                              )}
                            </div>

                            <div
                              class="progress-percent"
                            >
                              ${p}%
                            </div>

                          </div>

                          ${progressBarHTML(p)}

                          <div class="muted">

                            ${
                              subject.chapters.length
                            }
                            chapter${
                              subject.chapters.length === 1
                                ? ""
                                : "s"
                            }

                          </div>

                        </div>
                      `;
                    }
                  )
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
            Add subjects and chapters.
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
          class="subject-progress-circle"
        >
          ${progress}%
        </div>

      </div>


      <div
        class="subject-card-progress"
      >

        <div class="row">

          <div class="muted">
            Subject Progress
          </div>

          <div class="progress-percent">
            ${progress}%
          </div>

        </div>

        ${progressBarHTML(progress)}

      </div>


      <div
        class="actions"
        style="margin-top:12px"
      >

        <button
          class="btn small secondary"
          onclick="openSubjectModal(
            '${escapeHTML(subject.id)}'
          )"
        >
          Edit
        </button>

        <button
          class="btn small danger"
          onclick="deleteSubject(
            '${escapeHTML(subject.id)}'
          )"
        >
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
          '${escapeHTML(subject.id)}'
        )"
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
          class="chapter-progress-number"
        >
          ${progress}%
        </div>

      </div>


      <div class="chapter-progress">

        <div class="row">

          <div class="muted">
            📖 Chapter Progress
          </div>

          <div class="progress-percent">
            ${progress}%
          </div>

        </div>

        ${progressBarHTML(progress)}

        <div
          class="badge"
          style="margin-top:7px"
        >
          ${completed}/${total}
          revisions
        </div>

      </div>


      <div
        class="actions"
        style="margin-top:10px"
      >

        <button
          class="btn small secondary"
          onclick="openChapterModal(
            '${escapeHTML(subject.id)}',
            '${escapeHTML(chapter.id)}'
          )"
        >
          Edit
        </button>

        <button
          class="btn small secondary"
          onclick="openNotes(
            '${escapeHTML(chapter.id)}'
          )"
        >
          📝 Notes
        </button>

      </div>


      <div
        class="actions"
        style="margin-top:10px"
      >

        <button
          class="btn small secondary"
          onclick="openMoveModal(
            '${escapeHTML(chapter.id)}'
          )"
        >
          Move
        </button>

        <button
          class="btn small danger"
          onclick="deleteChapter(
            '${escapeHTML(chapter.id)}'
          )"
        >
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
        style="margin-top:15px"
      >

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
    !!item.completion?.checked;


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
            style="margin-top:7px"
          >
            ${escapeHTML(
              item.rule.name
            )}
          </div>

          ${
            lateDays > 0
              ? `
                <div
                  class="late"
                  style="margin-top:7px"
                >
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
            '${escapeHTML(item.chapter.id)}',
            '${escapeHTML(item.rule.id)}'
          )"
        >
          ${
            checked
              ? "✓"
              : ""
          }
        </button>

      </div>


      <div
        class="muted"
        style="margin-top:10px"
      >
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
          '${escapeHTML(item.chapter.id)}',
          '${escapeHTML(item.rule.id)}'
        )"
      >
        ✓ Submit Revision
      </button>

    </div>
  `;
}


/* =========================================================
   PLANNER
   ========================================================= */

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


      <div class="card">

        <div class="title">
          📅 Select Date
        </div>

        <div
          class="form-group"
          style="margin-top:12px"
        >

          <label>
            Date
          </label>

          <input
            id="plannerDateInput"
            type="date"
            value="${escapeHTML(
              selectedDate
            )}"
            onchange="changePlannerDate(
              this.value
            )"
          >

        </div>


        <div
          class="actions"
          style="margin-top:5px"
        >

          <button
            class="btn small secondary"
            onclick="plannerPreviousDay()"
          >
            ← Previous
          </button>

          <button
            class="btn small"
            onclick="plannerToday()"
          >
            Today
          </button>

          <button
            class="btn small secondary"
            onclick="plannerNextDay()"
          >
            Next →
          </button>

        </div>

      </div>


      <div
        class="card hero"
        style="margin-top:14px"
      >

        <div class="muted">
          Selected Date
        </div>

        <div
          class="title"
          style="
            font-size:18px;
            margin-top:4px;
          "
        >
          ${formatDateLong(
            selectedDate
          )}
        </div>

        <div
          class="badge"
          style="margin-top:9px"
        >
          ${
            relation < 0
              ? "Past"
              : relation === 0
                ? "Today"
                : "Future"
          }
        </div>

      </div>


      <div
        class="card"
        style="margin-top:14px"
      >

        <div class="row">

          <div>

            <div class="title">
              📚 ${relationTitle}
            </div>

            <div class="muted">
              ${scheduled.length}
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


        <div style="margin-top:12px">

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


      ${
        relation <= 0
          ? `
            <div
              class="card"
              style="margin-top:14px"
            >

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
                style="margin-top:12px"
              >

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


function renderPlannerItem(
  item
) {

  const submitted =
    !!item.completion?.submitted;


  const isStudy =
    item.type === "study";


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
      style="margin-bottom:10px"
    >

      <div class="row">

        <div style="flex:1">

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
            style="margin-top:7px"
          >
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
          class="badge ${statusClass}"
        >
          ${statusText}
        </span>

      </div>


      <div
        class="muted"
        style="margin-top:9px"
      >
        Scheduled:
        ${formatDate(
          item.date
        )}
      </div>


      ${
        submitted &&
        item.completion?.submittedAt
          ? `
            <div
              class="muted"
              style="margin-top:5px"
            >
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
        plannerDateRelation(
          item.date
        ) === 0 &&
        !isStudy &&
        !submitted
          ? `
            <div
              class="actions"
              style="margin-top:10px"
            >

              <button
                class="btn small"
                onclick="goPage('today')"
              >
                Open Today's Revision
              </button>

            </div>
          `
          : ""
      }

    </div>
  `;
}


function renderCompletedHistoryItem(
  item
) {

  const completedDate =
    item.completion?.submittedAt
      ? item.completion
          .submittedAt
          .slice(0, 10)
      : "";


  return `
    <div
      class="card"
      style="margin-bottom:10px"
    >

      <div class="row">

        <div style="flex:1">

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
            style="margin-top:7px"
          >
            ✓ ${escapeHTML(
              item.rule.name
            )}
          </div>

        </div>

        <div
          style="font-size:25px"
        >
          ✓
        </div>

      </div>


      <div
        class="muted"
        style="margin-top:9px"
      >
        Completed on:
        ${formatDate(
          completedDate
        )}
      </div>

    </div>
  `;
}


/* =========================================================
   PLANNER ACTIONS
   ========================================================= */

function changePlannerDate(
  value
) {

  plannerSelectedDate =
    value ||
    todayISO();


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


      <div
        class="card exam-settings-card"
      >

        <div class="title">
          🎯 Exam Countdown
        </div>

        <p
          class="muted"
          style="margin-top:7px"
        >
          Choose your exam date.
          You can change it anytime.
        </p>


        <div
          class="form-group"
          style="margin-top:13px"
        >

          <label>
            Exam Date
          </label>

          <input
            id="examDateInput"
            type="date"
            value="${escapeHTML(
              state.settings.examDate ||
              ""
            )}"
          >

        </div>


        <div class="actions">

          <button
            class="btn"
            onclick="saveExamDate()"
          >
            Save Exam Date
          </button>

          ${
            state.settings.examDate
              ? `
                <button
                  class="btn secondary"
                  onclick="clearExamDate()"
                >
                  Remove Date
                </button>
              `
              : ""
          }

        </div>

      </div>


      <div
        class="card"
        style="margin-top:14px"
      >

        <div class="title">
          Revision System
        </div>


        <div
          style="margin-top:12px"
        >

          ${state.revisionSystem
            .map(
              rule => `
                <div
                  class="system-row"
                >

                  <input
                    value="${escapeHTML(
                      rule.name
                    )}"
                    data-rule-name="${
                      escapeHTML(rule.id)
                    }"
                  >

                  <input
                    class="day-input"
                    type="number"
                    min="1"
                    value="${Number(
                      rule.day
                    )}"
                    data-rule-day="${
                      escapeHTML(rule.id)
                    }"
                  >

                </div>
              `
            )
            .join("")}

        </div>


        <button
          class="btn full"
          onclick="saveRevisionSystem()"
        >
          Save Revision System
        </button>

      </div>


      <div
        class="card"
        style="margin-top:14px"
      >

        <div class="title">
          Notifications
        </div>

        <label
          style="
            display:flex;
            align-items:center;
            gap:10px;
            margin-top:12px;
          "
        >

          <input
            type="checkbox"
            ${
              state.settings.notifications
                ? "checked"
                : ""
            }
            onchange="toggleNotifications(
              this.checked
            )"
          >

          Enable notifications

        </label>

      </div>


      <div
        class="card"
        style="margin-top:14px"
      >

        <div class="title">
          Data
        </div>

        <p
          class="muted"
          style="margin-top:7px"
        >
          Your study data and uploaded
          files are stored locally on
          this device.
        </p>

        <button
          class="btn danger full"
          style="margin-top:12px"
          onclick="clearAllData()"
        >
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
   MODAL
   ========================================================= */

function openModal(html) {

  const root =
    document.getElementById(
      "modalRoot"
    );


  if (!root) {
    return;
  }


  root.innerHTML = `
    <div
      class="modal-bg"
      onclick="closeModal(event)"
    >

      <div
        class="modal"
        onclick="event.stopPropagation()"
      >

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


  const root =
    document.getElementById(
      "modalRoot"
    );


  if (root) {
    root.innerHTML = "";
  }
}


/* =========================================================
   SUBJECT MODAL
   ========================================================= */

function openSubjectModal(
  subjectId = null
) {

  const subject =
    subjectId
      ? findSubject(subjectId)
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
        placeholder="e.g. Physics"
      >

    </div>


    <div class="actions">

      <button
        class="btn secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn"
        onclick="saveSubject(
          ${
            subjectId
              ? `'${escapeHTML(subjectId)}'`
              : "null"
          }
        )"
      >
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
    input?.value.trim() || "";


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


  if (dbAvailable) {

    for (
      const chapter of
        subject.chapters
    ) {

      try {

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

      } catch (error) {

        console.warn(
          "Could not delete chapter files:",
          error
        );
      }
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
        placeholder="e.g. Rotational Dynamics"
      >

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
        }"
      >

    </div>


    <div class="actions">

      <button
        class="btn secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn"
        onclick="saveChapter(
          '${escapeHTML(subjectId)}',
          ${
            chapterId
              ? `'${escapeHTML(chapterId)}'`
              : "null"
          }
        )"
      >
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
      ?.value.trim() || "";


  const startDate =
    document
      .getElementById(
        "chapterDateInput"
      )
      ?.value || "";


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


  if (dbAvailable) {

    try {

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

    } catch (error) {

      console.warn(
        "File deletion failed:",
        error
      );
    }
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
            value="${escapeHTML(
              subject.id
            )}"
          >
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
        id="moveSubjectInput"
      >

        ${options}

      </select>

    </div>


    <div class="actions">

      <button
        class="btn secondary"
        onclick="closeModal()"
      >
        Cancel
      </button>

      <button
        class="btn"
        onclick="moveChapter(
          '${escapeHTML(chapterId)}'
        )"
      >
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


  let files = [];


  if (dbAvailable) {

    try {

      files =
        await dbGetByChapter(
          chapterId
        );

    } catch (error) {

      console.error(
        "Could not load files:",
        error
      );
    }
  }


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
        onclick="closeModal()"
      >
        Close
      </button>

    </div>


    <div
      class="card"
      style="margin-top:12px"
    >

      <div class="form-group">

        <label>
          Add file
        </label>

        <input
          id="fileInput"
          type="file"
          accept=".pdf,image/*,video/*,.txt,.doc,.docx"
          multiple
        >

      </div>


      <button
        class="btn full"
        onclick="uploadChapterFiles(
          '${escapeHTML(chapterId)}'
        )"
      >
        Upload Files
      </button>

    </div>


    <div
      id="filesContainer"
      style="margin-top:12px"
    >

      ${renderFiles(files)}

    </div>

  `);
}


/* =========================================================
   FILE LIST
   ========================================================= */

function renderFiles(files) {

  if (
    !Array.isArray(files) ||
    !files.length
  ) {

    return `
      <div class="card empty">
        No files uploaded yet.
      </div>
    `;
  }


  return `
    <div class="file-grid">

      ${files
        .map(
          file => {

            const type =
              file.type || "";


            const name =
              file.name ||
              "Unnamed file";


            const lowerName =
              name.toLowerCase();


            const isPDF =
              type ===
                "application/pdf" ||
              lowerName.endsWith(
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


            const icon =
              isPDF
                ? "📄"
                : isImage
                  ? "🖼️"
                  : isVideo
                    ? "🎥"
                    : "📎";


            const buttonLabel =
              isPDF
                ? "Open PDF"
                : "Open";


            return `

              <div class="media-box">

                <div class="pdf-preview">
                  ${icon}
                </div>


                <div class="media-info">

                  <div class="title">
                    ${escapeHTML(
                      name
                    )}
                  </div>


                  <div
                    class="muted"
                    style="margin-top:4px"
                  >
                    ${formatFileSize(
                      file.size
                    )}
                  </div>


                  <div
                    class="actions"
                    style="margin-top:7px"
                  >

                    <button
                      class="btn small"
                      onclick="viewStoredFile(
                        '${escapeHTML(file.id)}'
                      )"
                    >
                      ${buttonLabel}
                    </button>


                    <button
                      class="btn small danger"
                      onclick="deleteStoredFile(
                        '${escapeHTML(file.id)}'
                      )"
                    >
                      Delete
                    </button>

                  </div>

                </div>

              </div>

            `;
          }
        )
        .join("")}

    </div>
  `;
}


function formatFileSize(
  bytes
) {

  const size =
    Number(bytes);


  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {

    return "";
  }


  if (size < 1024) {

    return `${size} B`;
  }


  if (
    size <
    1024 * 1024
  ) {

    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }


  if (
    size <
    1024 * 1024 * 1024
  ) {

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }


  return `${(
    size /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}


/* =========================================================
   FILE STORAGE
   ========================================================= */

async function uploadChapterFiles(
  chapterId
) {

  const input =
    document.getElementById(
      "fileInput"
    );


  const files =
    input?.files
      ? Array.from(
          input.files
        )
      : [];


  if (!files.length) {

    toast(
      "Please select a file first."
    );

    return;
  }


  if (!findChapter(chapterId)) {

    toast(
      "Chapter not found."
    );

    return;
  }


  if (!dbAvailable) {

    toast(
      "File storage is unavailable. Please reload the app."
    );

    return;
  }


  try {

    for (
      const file of files
    ) {

      const record = {

        id: uid(),

        chapterId,

        name:
          file.name,

        type:
          file.type ||
          "application/octet-stream",

        size:
          file.size,

        lastModified:
          file.lastModified ||
          Date.now(),

        createdAt:
          new Date().toISOString(),

        blob:
          file
      };


      await dbPut(
        FILE_STORE,
        record
      );
    }


    const updatedFiles =
      await dbGetByChapter(
        chapterId
      );


    const container =
      document.getElementById(
        "filesContainer"
      );


    if (container) {

      container.innerHTML =
        renderFiles(
          updatedFiles
        );
    }


    if (input) {
      input.value = "";
    }


    toast(
      files.length === 1
        ? "File uploaded ✓"
        : `${files.length} files uploaded ✓`
    );

  } catch (error) {

    console.error(
      "File upload error:",
      error
    );


    toast(
      "File could not be saved. Storage may be full."
    );
  }
}


/* =========================================================
   OPEN STORED FILE
   ========================================================= */

async function viewStoredFile(
  fileId
) {

  if (!dbAvailable) {

    toast(
      "File storage is unavailable."
    );

    return;
  }


  try {

    const record =
      await dbGet(
        FILE_STORE,
        fileId
      );


    if (
      !record ||
      !record.blob
    ) {

      toast(
        "File not found."
      );

      return;
    }


    const blob =
      record.blob instanceof Blob
        ? record.blob
        : new Blob(
            [record.blob],
            {
              type:
                record.type ||
                "application/octet-stream"
            }
          );


    const url =
      URL.createObjectURL(
        blob
      );


    const type =
      record.type ||
      blob.type ||
      "";


    const lowerName =
      String(
        record.name || ""
      ).toLowerCase();


    const isText =
      type.startsWith(
        "text/"
      ) ||
      lowerName.endsWith(
        ".txt"
      );


    const isPDF =
      type ===
        "application/pdf" ||
      lowerName.endsWith(
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


    if (
      isPDF ||
      isImage ||
      isVideo ||
      isText
    ) {

      const opened =
        window.open(
          url,
          "_blank"
        );


      if (!opened) {

        toast(
          "Please allow pop-ups to open the file."
        );


        URL.revokeObjectURL(
          url
        );

      } else {

        setTimeout(
          function() {

            URL.revokeObjectURL(
              url
            );

          },
          60000
        );
      }


      return;
    }


    const link =
      document.createElement(
        "a"
      );


    link.href =
      url;


    link.download =
      record.name ||
      "file";


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    setTimeout(
      function() {

        URL.revokeObjectURL(
          url
        );

      },
      1000
    );

  } catch (error) {

    console.error(
      "File open error:",
      error
    );


    toast(
      "File could not be opened."
    );
  }
}


/* =========================================================
   DELETE STORED FILE
   ========================================================= */

async function deleteStoredFile(
  fileId
) {

  if (!dbAvailable) {

    toast(
      "File storage is unavailable."
    );

    return;
  }


  try {

    const record =
      await dbGet(
        FILE_STORE,
        fileId
      );


    if (!record) {

      toast(
        "File not found."
      );

      return;
    }


    const name =
      record.name ||
      "this file";


    if (
      !confirm(
        `Delete "${name}"?`
      )
    ) {

      return;
    }


    await dbDelete(
      FILE_STORE,
      fileId
    );


    const container =
      document.getElementById(
        "filesContainer"
      );


    if (container) {

      const files =
        await dbGetByChapter(
          record.chapterId
        );


      container.innerHTML =
        renderFiles(
          files
        );
    }


    toast(
      "File deleted."
    );

  } catch (error) {

    console.error(
      "File delete error:",
      error
    );


    toast(
      "File could not be deleted."
    );
  }
}


/* =========================================================
   REVISION SYSTEM SETTINGS
   ========================================================= */

async function saveRevisionSystem() {

  const names =
    document.querySelectorAll(
      "[data-rule-name]"
    );


  const days =
    document.querySelectorAll(
      "[data-rule-day]"
    );


  const nameMap =
    new Map();


  names.forEach(
    input => {

      nameMap.set(
        input.dataset.ruleName,
        input.value.trim()
      );
    }
  );


  const dayMap =
    new Map();


  days.forEach(
    input => {

      dayMap.set(
        input.dataset.ruleDay,
        Number(input.value)
      );
    }
  );


  const updated = [];


  for (
    const rule of
      state.revisionSystem
  ) {

    const name =
      nameMap.get(
        rule.id
      ) ||
      rule.name;


    const day =
      dayMap.get(
        rule.id
      );


    if (!name) {

      toast(
        "Revision name cannot be empty."
      );

      return;
    }


    if (
      !Number.isFinite(day) ||
      day < 1
    ) {

      toast(
        "Revision days must be 1 or more."
      );

      return;
    }


    updated.push({
      ...rule,
      name,
      day:
        Math.floor(day)
    });
  }


  updated.sort(
    (a, b) =>
      a.day - b.day
  );


  state.revisionSystem =
    updated;


  await saveState();


  render();


  toast(
    "Revision system saved ✓"
  );
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function toggleNotifications(
  enabled
) {

  state.settings.notifications =
    Boolean(enabled);


  if (
    state.settings.notifications &&
    "Notification" in window &&
    Notification.permission ===
      "default"
  ) {

    try {

      await Notification
        .requestPermission();

    } catch (error) {

      console.warn(
        "Notification permission request failed:",
        error
      );
    }
  }


  await saveState();


  render();


  toast(
    state.settings.notifications
      ? "Notifications enabled."
      : "Notifications disabled."
  );
}


/* =========================================================
   CLEAR ALL DATA
   ========================================================= */

async function clearAllData() {

  if (
    !confirm(
      "Delete all subjects, chapters, revisions, and uploaded files? This cannot be undone."
    )
  ) {

    return;
  }


  try {

    if (dbAvailable) {

      const files =
        await dbGetAll(
          FILE_STORE
        );


      for (
        const file of files
      ) {

        try {

          await dbDelete(
            FILE_STORE,
            file.id
          );

        } catch (error) {

          console.warn(
            "Could not delete file:",
            error
          );
        }
      }
    }


    state =
      createDefaultState();


    plannerSelectedDate =
      todayISO();


    await saveState();


    closeModal();


    currentPage =
      "home";


    render();


    toast(
      "All data deleted."
    );

  } catch (error) {

    console.error(
      "Clear data error:",
      error
    );


    toast(
      "Data could not be deleted."
    );
  }
}


/* =========================================================
   GLOBAL ACTIONS
   ========================================================= */

window.goPage =
  goPage;

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

window.toggleRevisionCheck =
  toggleRevisionCheck;

window.submitRevision =
  submitRevision;

window.openNotes =
  openNotes;

window.changePlannerDate =
  changePlannerDate;

window.plannerToday =
  plannerToday;

window.plannerPreviousDay =
  plannerPreviousDay;

window.plannerNextDay =
  plannerNextDay;

window.viewStoredFile =
  viewStoredFile;

window.deleteStoredFile =
  deleteStoredFile;

window.uploadChapterFiles =
  uploadChapterFiles;

window.saveExamDate =
  saveExamDate;

window.clearExamDate =
  clearExamDate;

window.saveRevisionSystem =
  saveRevisionSystem;

window.toggleNotifications =
  toggleNotifications;

window.clearAllData =
  clearAllData;

window.closeModal =
  closeModal;

window.showFatalError =
  showFatalError;


/* =========================================================
   END
   ========================================================= */
