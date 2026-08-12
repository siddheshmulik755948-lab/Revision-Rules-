/* =========================================================
   REVISION RULES
   HSC SMART REVISION TRACKER
   Complete script.js
   ========================================================= */

"use strict";

/* =========================================================
   SETTINGS
   ========================================================= */

const APP_VERSION = "3.0";

const REVISION_DAYS = [1, 3, 7];

const STORAGE_KEY = "revision_rules_v3";

const DEFAULT_SUBJECTS = [
  {
    id: "physics",
    name: "Physics",
    icon: "⚡",
    chapters: []
  },
  {
    id: "chemistry",
    name: "Chemistry",
    icon: "🧪",
    chapters: []
  },
  {
    id: "math1",
    name: "Mathematics Part 1",
    icon: "📐",
    chapters: []
  },
  {
    id: "math2",
    name: "Mathematics Part 2",
    icon: "📘",
    chapters: []
  },
  {
    id: "biology",
    name: "Biology",
    icon: "🧬",
    chapters: []
  },
  {
    id: "english",
    name: "English",
    icon: "📖",
    chapters: []
  },
  {
    id: "marathi",
    name: "Marathi",
    icon: "📚",
    chapters: []
  }
];

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let data = loadData();

let selectedSubjectId = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}


function createId(prefix = "id") {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substring(2, 8)
  );
}


function todayString() {
  return new Date().toISOString().split("T")[0];
}


function formatDate(dateString) {
  if (!dateString) {
    return "--";
  }

  const date = new Date(dateString + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


function addDays(dateString, days) {
  const date = new Date(dateString + "T00:00:00");

  date.setDate(date.getDate() + Number(days));

  return date.toISOString().split("T")[0];
}


function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   DEFAULT DATA
   ========================================================= */

function createDefaultData() {
  return {
    version: APP_VERSION,

    subjects: DEFAULT_SUBJECTS.map(subject => ({
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      chapters: []
    })),

    revisions: {},

    xp: 0,

    streak: {
      current: 0,
      best: 0,
      lastDate: null
    },

    settings: {
      examDate: ""
    }
  };
}


/* =========================================================
   LOAD DATA
   ========================================================= */

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createDefaultData();
    }

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return createDefaultData();
    }

    if (!Array.isArray(parsed.subjects)) {
      parsed.subjects = createDefaultData().subjects;
    }

    if (!parsed.revisions || typeof parsed.revisions !== "object") {
      parsed.revisions = {};
    }

    if (typeof parsed.xp !== "number") {
      parsed.xp = 0;
    }

    if (!parsed.streak || typeof parsed.streak !== "object") {
      parsed.streak = {
        current: 0,
        best: 0,
        lastDate: null
      };
    }

    if (!parsed.settings || typeof parsed.settings !== "object") {
      parsed.settings = {
        examDate: ""
      };
    }

    parsed.version = APP_VERSION;

    return parsed;

  } catch (error) {

    console.error("Data loading error:", error);

    return createDefaultData();
  }
}


/* =========================================================
   SAVE DATA
   ========================================================= */

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

    return true;

  } catch (error) {

    console.error("Data saving error:", error);

    alert(
      "⚠️ Data save होऊ शकला नाही.\n\n" +
      "Browser storage भरलेले असू शकते."
    );

    return false;
  }
}


/* =========================================================
   SUBJECT HELPERS
   ========================================================= */

function getSubjectById(subjectId) {

  return data.subjects.find(
    subject => subject.id === subjectId
  ) || null;
}


function getSubjectByName(subjectName) {

  return data.subjects.find(
    subject => subject.name === subjectName
  ) || null;
}


function getChapter(subjectId, chapterId) {

  const subject = getSubjectById(subjectId);

  if (!subject) {
    return null;
  }

  return (
    subject.chapters.find(
      chapter => chapter.id === chapterId
    ) || null
  );
}


function getRevisionKey(subjectId, chapterId) {

  return subjectId + "__" + chapterId;
}


function getRevision(subjectId, chapterId) {

  const key = getRevisionKey(
    subjectId,
    chapterId
  );

  if (!data.revisions[key]) {

    data.revisions[key] = {
      day1: false,
      day3: false,
      day7: false,

      dates: {
        day1: null,
        day3: null,
        day7: null
      },

      startedDate: null
    };
  }

  return data.revisions[key];
}


/* =========================================================
   REVISION PROGRESS
   ========================================================= */

function getChapterCompletedCount(subjectId, chapterId) {

  const revision = getRevision(
    subjectId,
    chapterId
  );

  return [
    revision.day1,
    revision.day3,
    revision.day7
  ].filter(Boolean).length;
}


function getChapterPercent(subjectId, chapterId) {

  const completed =
    getChapterCompletedCount(
      subjectId,
      chapterId
    );

  return Math.round(
    (completed / REVISION_DAYS.length) * 100
  );
}


function getSubjectProgress(subjectId) {

  const subject = getSubjectById(subjectId);

  if (!subject || subject.chapters.length === 0) {
    return 0;
  }

  let total = 0;
  let completed = 0;

  subject.chapters.forEach(chapter => {

    total += REVISION_DAYS.length;

    completed += getChapterCompletedCount(
      subjectId,
      chapter.id
    );
  });

  if (total === 0) {
    return 0;
  }

  return Math.round(
    (completed / total) * 100
  );
}


function getOverallProgress() {

  let total = 0;
  let completed = 0;

  data.subjects.forEach(subject => {

    subject.chapters.forEach(chapter => {

      total += REVISION_DAYS.length;

      completed += getChapterCompletedCount(
        subject.id,
        chapter.id
      );
    });
  });

  if (total === 0) {
    return 0;
  }

  return Math.round(
    (completed / total) * 100
  );
}


/* =========================================================
   DUE REVISION
   ========================================================= */

function isRevisionDue(
  subjectId,
  chapterId,
  revisionDay
) {

  const revision = getRevision(
    subjectId,
    chapterId
  );

  const dateKey = "day" + revisionDay;

  if (revision[dateKey]) {
    return false;
  }

  const date = revision.dates[dateKey];

  if (!date) {
    return false;
  }

  return date <= todayString();
}


function getDueRevisions() {

  const due = [];

  data.subjects.forEach(subject => {

    subject.chapters.forEach(chapter => {

      const revision =
        getRevision(
          subject.id,
          chapter.id
        );

      REVISION_DAYS.forEach(day => {

        const key = "day" + day;

        if (
          !revision[key] &&
          revision.dates[key] &&
          revision.dates[key] <= todayString()
        ) {

          due.push({
            subjectId: subject.id,
            subjectName: subject.name,
            subjectIcon: subject.icon,
            chapterId: chapter.id,
            chapterName: chapter.name,
            day: day,
            date: revision.dates[key]
          });
        }
      });

    });

  });

  return due;
}


/* =========================================================
   START REVISION
   ========================================================= */

function startRevision(subjectId, chapterId) {

  const subject =
    getSubjectById(subjectId);

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );

  if (!subject || !chapter) {
    return;
  }

  const revision =
    getRevision(
      subjectId,
      chapterId
    );

  if (revision.startedDate) {

    alert(
      "ℹ️ हा chapter आधीच Revision System मध्ये आहे."
    );

    return;
  }

  const today = todayString();

  revision.startedDate = today;

  revision.day1 = false;
  revision.day3 = false;
  revision.day7 = false;

  revision.dates = {
    day1: today,
    day3: addDays(today, 2),
    day7: addDays(today, 6)
  };

  saveData();

  alert(
    "✅ Revision Started!\n\n" +
    chapter.name +
    "\n\n" +
    "Day 1: " +
    formatDate(revision.dates.day1) +
    "\n" +
    "Day 3: " +
    formatDate(revision.dates.day3) +
    "\n" +
    "Day 7: " +
    formatDate(revision.dates.day7)
  );

  renderSubject();
  renderToday();
  renderHome();
  renderProgress();
}


/* =========================================================
   COMPLETE REVISION
   ========================================================= */

function completeRevision(
  subjectId,
  chapterId,
  revisionDay
) {

  const revision =
    getRevision(
      subjectId,
      chapterId
    );

  const key = "day" + revisionDay;

  if (revision[key]) {
    return;
  }

  revision[key] = true;

  revision.dates[key] =
    todayString();

  data.xp += 10;

  updateStreak();

  saveData();

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );

  const chapterName =
    chapter ? chapter.name : "Chapter";

  alert(
    "🎉 Revision Completed!\n\n" +
    chapterName +
    "\n" +
    "Day " +
    revisionDay +
    " completed.\n\n" +
    "+10 XP ⭐"
  );

  renderSubject();
  renderToday();
  renderHome();
  renderProgress();
}


/* =========================================================
   STREAK
   ========================================================= */

function updateStreak() {

  const today = todayString();

  const last =
    data.streak.lastDate;

  if (!last) {

    data.streak.current = 1;
    data.streak.best = 1;
    data.streak.lastDate = today;

    return;
  }

  if (last === today) {
    return;
  }

  const yesterday =
    addDays(today, -1);

  if (last === yesterday) {

    data.streak.current += 1;

  } else {

    data.streak.current = 1;
  }

  if (
    data.streak.current >
    data.streak.best
  ) {

    data.streak.best =
      data.streak.current;
  }

  data.streak.lastDate = today;
}


/* =========================================================
   BADGES
   ========================================================= */

function getBadges() {

  const badges = [];

  if (data.xp >= 10) {
    badges.push("🌱 First Revision");
  }

  if (data.xp >= 50) {
    badges.push("⭐ 50 XP");
  }

  if (data.xp >= 100) {
    badges.push("🏆 100 XP");
  }

  if (data.streak.current >= 3) {
    badges.push("🔥 3 Day Streak");
  }

  if (data.streak.current >= 7) {
    badges.push("🔥 7 Day Streak");
  }

  if (getOverallProgress() >= 50) {
    badges.push("📚 Half Way");
  }

  if (getOverallProgress() === 100) {
    badges.push("👑 Revision Master");
  }

  return badges;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showPage(pageId, button) {

  const pages =
    document.querySelectorAll(".page");

  pages.forEach(page => {
    page.classList.remove("active");
  });

  const target =
    document.getElementById(pageId);

  if (target) {
    target.classList.add("active");
  }

  const navButtons =
    document.querySelectorAll(".nav-btn");

  navButtons.forEach(btn => {
    btn.classList.remove("active");
  });

  if (button) {
    button.classList.add("active");
  }

  if (pageId === "homePage") {
    renderHome();
  }

  if (pageId === "subjectPage") {
    renderSubject();
  }

  if (pageId === "todayPage") {
    renderToday();
  }

  if (pageId === "progressPage") {
    renderProgress();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {

  const percent =
    getOverallProgress();

  const progressElements = [
    $("overallPercent"),
    $("homePercent"),
    $("overallProgressText")
  ];

  progressElements.forEach(element => {

    if (element) {
      element.textContent =
        percent + "%";
    }
  });

  const progressBars = [
    $("overallProgressBar"),
    $("homeProgressBar")
  ];

  progressBars.forEach(element => {

    if (element) {
      element.style.width =
        percent + "%";
    }
  });

  const streakElement =
    $("streak");

  if (streakElement) {

    streakElement.textContent =
      data.streak.current;
  }

  const xpElement =
    $("xp");

  if (xpElement) {

    xpElement.textContent =
      data.xp + " XP";
  }

  const todayCount =
    getDueRevisions().length;

  const todayElements = [
    $("todayCount"),
    $("todayRevisionCount")
  ];

  todayElements.forEach(element => {

    if (element) {

      element.textContent =
        todayCount +
        " revisions today";
    }
  });

  renderSubjectCardsHome();
  renderCountdown();
  renderBadges();
}


/* =========================================================
   HOME SUBJECT CARDS
   ========================================================= */

function renderSubjectCardsHome() {

  const container =
    $("subjectList");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  data.subjects.forEach(subject => {

    const percent =
      getSubjectProgress(
        subject.id
      );

    const card =
      document.createElement("div");

    card.className =
      "subject-card";

    card.innerHTML = `
      <div class="subject-card-top">

        <div>
          <span class="subject-icon">
            ${escapeHTML(subject.icon)}
          </span>

          <strong>
            ${escapeHTML(subject.name)}
          </strong>
        </div>

        <span>
          ${percent}%
        </span>

      </div>

      <div class="progress-bar">
        <div
          class="progress-fill"
          style="width:${percent}%"
        ></div>
      </div>

      <button
        class="subject-open-btn"
        onclick="openSubject('${subject.id}')"
      >
        Open Subject
      </button>
    `;

    container.appendChild(card);
  });
}


/* =========================================================
   OPEN SUBJECT
   ========================================================= */

function openSubject(subjectId) {

  const subject =
    getSubjectById(subjectId);

  if (!subject) {
    return;
  }

  selectedSubjectId =
    subjectId;

  showPage(
    "subjectPage",
    null
  );

  renderSubject();
}


/* =========================================================
   SUBJECT PAGE
   ========================================================= */

function renderSubject() {

  const page =
    $("subjectPage");

  if (!page) {
    return;
  }

  if (!selectedSubjectId) {

    selectedSubjectId =
      data.subjects.length
        ? data.subjects[0].id
        : null;
  }

  if (!selectedSubjectId) {

    page.innerHTML = `
      <div class="empty-state">
        No subjects available.
      </div>
    `;

    return;
  }

  const subject =
    getSubjectById(
      selectedSubjectId
    );

  if (!subject) {
    return;
  }

  page.innerHTML = `
    <div class="subject-header">

      <div>
        <h2>
          ${escapeHTML(subject.icon)}
          ${escapeHTML(subject.name)}
        </h2>

        <p>
          ${subject.chapters.length}
          chapters
        </p>
      </div>

      <button
        class="manage-btn"
        onclick="manageChapters()"
      >
        ⚙️ Manage Chapters
      </button>

    </div>

    <div class="subject-progress-box">

      <div>
        <strong>Subject Progress</strong>
      </div>

      <div class="progress-bar">
        <div
          class="progress-fill"
          style="width:${getSubjectProgress(subject.id)}%"
        ></div>
      </div>

      <strong>
        ${getSubjectProgress(subject.id)}%
      </strong>

    </div>

    <div class="chapter-list" id="chapterList"></div>
  `;

  const list =
    $("chapterList");

  if (!list) {
    return;
  }

  if (subject.chapters.length === 0) {

    list.innerHTML = `
      <div class="empty-state">

        <h3>📚 No Chapters Yet</h3>

        <p>
          तुझ्या मते chapter add करण्यासाठी
          खालील button वापर.
        </p>

        <button
          class="add-chapter-btn"
          onclick="addChapter()"
        >
          ➕ Add First Chapter
        </button>

      </div>
    `;

    return;
  }

  subject.chapters.forEach(
    (chapter, index) => {

      list.appendChild(
        createChapterCard(
          subject,
          chapter,
          index
        )
      );
    }
  );
}


/* =========================================================
   CHAPTER CARD
   ========================================================= */

function createChapterCard(
  subject,
  chapter,
  index
) {

  const revision =
    getRevision(
      subject.id,
      chapter.id
    );

  const percent =
    getChapterPercent(
      subject.id,
      chapter.id
    );

  const card =
    document.createElement("div");

  card.className =
    "chapter-card";

  const started =
    Boolean(revision.startedDate);

  card.innerHTML = `

    <div class="chapter-top">

      <div class="chapter-name">
        ${index + 1}.
        ${escapeHTML(chapter.name)}
      </div>

      <div class="chapter-percent">
        ${percent}%
      </div>

    </div>

    <div class="chapter-progress">

      <div
        class="chapter-progress-fill"
        style="width:${percent}%"
      ></div>

    </div>

    <div class="revision-info">

      <div>
        Revision:
      </div>

      <div>
        ${revision.day1
          ? "✅ Day 1"
          : "⬜ Day 1"}
      </div>

      <div>
        ${revision.day3
          ? "✅ Day 3"
          : "⬜ Day 3"}
      </div>

      <div>
        ${revision.day7
          ? "✅ Day 7"
          : "⬜ Day 7"}
      </div>

    </div>

    <div class="revision-buttons">

      ${
        !started
        ? `
          <button
            onclick="
              startRevision(
                '${subject.id}',
                '${chapter.id}'
              )
            "
          >
            ▶️ Start Revision
          </button>
        `
        : ""
      }

      ${
        started
        ? `
          <button
            class="${revision.day1 ? "done" : ""}"
            ${
              revision.day1
                ? "disabled"
                : `
                  onclick="
                    completeRevision(
                      '${subject.id}',
                      '${chapter.id}',
                      1
                    )
                  "
                `
            }
          >
            Day 1
          </button>

          <button
            class="${revision.day3 ? "done" : ""}"
            ${
              revision.day3
                ? "disabled"
                : `
                  onclick="
                    completeRevision(
                      '${subject.id}',
                      '${chapter.id}',
                      3
                    )
                  "
                `
            }
          >
            Day 3
          </button>

          <button
            class="${revision.day7 ? "done" : ""}"
            ${
              revision.day7
                ? "disabled"
                : `
                  onclick="
                    completeRevision(
                      '${subject.id}',
                      '${chapter.id}',
                      7
                    )
                  "
                `
            }
          >
            Day 7
          </button>
        `
        : ""
      }

    </div>

  `;

  return card;
}


/* =========================================================
   CHAPTER MANAGEMENT
   ========================================================= */

function manageChapters() {

  const subject =
    getSubjectById(
      selectedSubjectId
    );

  if (!subject) {
    return;
  }

  const page =
    $("subjectPage");

  if (!page) {
    return;
  }

  page.innerHTML = `
    <div class="manage-header">

      <button
        onclick="renderSubject()"
      >
        ← Back
      </button>

      <h2>
        ⚙️ Manage Chapters
      </h2>

    </div>

    <div class="manage-info">

      <p>
        ${escapeHTML(subject.name)}
      </p>

      <p>
        Chapter चा क्रम पूर्णपणे तुझ्या हातात आहे.
      </p>

    </div>

    <button
      class="add-chapter-btn"
      onclick="addChapter()"
    >
      ➕ Add Chapter
    </button>

    <div id="manageChapterList"></div>
  `;

  renderManageChapterList();
}


/* =========================================================
   MANAGE CHAPTER LIST
   ========================================================= */

function renderManageChapterList() {

  const container =
    $("manageChapterList");

  if (!container) {
    return;
  }

  const subject =
    getSubjectById(
      selectedSubjectId
    );

  if (!subject) {
    return;
  }

  container.innerHTML = "";

  if (subject.chapters.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        अजून chapter नाही.
      </div>
    `;

    return;
  }

  subject.chapters.forEach(
    (chapter, index) => {

      const row =
        document.createElement("div");

      row.className =
        "manage-chapter-row";

      row.innerHTML = `

        <div class="chapter-order">
          ${index + 1}
        </div>

        <div class="manage-chapter-name">
          ${escapeHTML(chapter.name)}
        </div>

        <button
          onclick="
            moveChapterUp(${index})
          "
          ${index === 0 ? "disabled" : ""}
        >
          ⬆️
        </button>

        <button
          onclick="
            moveChapterDown(${index})
          "
          ${
            index === subject.chapters.length - 1
              ? "disabled"
              : ""
          }
        >
          ⬇️
        </button>

        <button
          onclick="
            renameChapter('${chapter.id}')
          "
        >
          ✏️
        </button>

        <button
          onclick="
            deleteChapter('${chapter.id}')
          "
        >
          🗑️
        </button>

      `;

      container.appendChild(row);
    }
  );
}


/* =========================================================
   ADD CHAPTER
   ========================================================= */

function addChapter() {

  const subject =
    getSubjectById(
      selectedSubjectId
    );

  if (!subject) {
    return;
  }

  const name =
    prompt(
      "नवीन Chapter चे नाव टाका:"
    );

  if (name === null) {
    return;
  }

  const chapterName =
    name.trim();

  if (!chapterName) {

    alert(
      "⚠️ Chapter चे नाव रिकामे ठेवू नका."
    );

    return;
  }

  const chapter = {
    id: createId("chapter"),
    name: chapterName
  };

  subject.chapters.push(chapter);

  saveData();

  manageChapters();
}


/* =========================================================
   RENAME CHAPTER
   ========================================================= */

function renameChapter(chapterId) {

  const chapter =
    getChapter(
      selectedSubjectId,
      chapterId
    );

  if (!chapter) {
    return;
  }

  const newName =
    prompt(
      "Chapter चे नवीन नाव:",
      chapter.name
    );

  if (newName === null) {
    return;
  }

  const cleanName =
    newName.trim();

  if (!cleanName) {

    alert(
      "⚠️ Chapter चे नाव रिकामे ठेवता येणार नाही."
    );

    return;
  }

  chapter.name =
    cleanName;

  saveData();

  manageChapters();
}


/* =========================================================
   DELETE CHAPTER
   ========================================================= */

function deleteChapter(chapterId) {

  const subject =
    getSubjectById(
      selectedSubjectId
    );

  if (!subject) {
    return;
  }

  const chapter =
    getChapter(
      selectedSubjectId,
      chapterId
    );

  if (!chapter) {
    return;
  }

  const confirmed =
    confirm(
      "⚠️ हा chapter delete करायचा आहे का?\n\n" +
      chapter.name +
      "\n\n" +
      त्याचा revision progress देखील delete होईल."
    );

  if (!confirmed) {
    return;
  }

  subject.chapters =
    subject.chapters.filter(
      item => item.id !== chapterId
    );

  delete data.revisions[
    getRevisionKey(
      selectedSubjectId,
      chapterId
    )
  ];

  saveData();

  manageChapters();
}


/* =========================================================
   MOVE CHAPTER UP
   ========================================================= */

function moveChapterUp(index) {

  const subject =
    getSubjectById(
      selectedSubjectId
    );

  if (!subject) {
    return;
  }

  if (index <= 0) {
    return;
  }

  const temp =
    subject.chapters[index - 1];

  subject.chapters[index - 1] =
    subject.chapters[index];

  subject.chapters[index] =
    temp;

  saveData();

  renderManageChapterList();
}


/* =========================================================
   MOVE CHAPTER DOWN
   ========================================================= */

function moveChapterDown(index) {

  const subject =
    getSubjectById(
      selectedSubjectId
    );

  if (!subject) {
    return;
  }

  if (
    index >=
    subject.chapters.length - 1
  ) {
    return;
  }

  const temp =
    subject.chapters[index + 1];

  subject.chapters[index + 1] =
    subject.chapters[index];

  subject.chapters[index] =
    temp;

  saveData();

  renderManageChapterList();
}


/* =========================================================
   TODAY PAGE
   ========================================================= */

function renderToday() {

  const list =
    $("todayList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  const due =
    getDueRevisions();

  const countElement =
    $("todayCount");

  if (countElement) {

    countElement.textContent =
      due.length +
      " revisions today";
  }

  if (due.length === 0) {

    list.innerHTML = `
      <div class="empty-state">

        <h3>🎉 No Revision Due Today!</h3>

        <p>
          आजची सर्व revision पूर्ण झाली आहेत
          किंवा अजून revision due नाही.
        </p>

      </div>
    `;

    return;
  }

  due.forEach(item => {

    const card =
      document.createElement("div");

    card.className =
      "today-card";

    card.innerHTML = `

      <h3>
        ${escapeHTML(item.subjectIcon)}
        ${escapeHTML(item.subjectName)}
      </h3>

      <p>
        ${escapeHTML(item.chapterName)}
      </p>

      <strong>
        📅 Day ${item.day}
      </strong>

      <button
        class="today-btn"
        onclick="
          completeRevision(
            '${item.subjectId}',
            '${item.chapterId}',
            ${item.day}
          )
        "
      >
        ✅ Complete Revision
      </button>

    `;

    list.appendChild(card);
  });
}


/* =========================================================
   PROGRESS PAGE
   ========================================================= */

function renderProgress() {

  const overall =
    getOverallProgress();

  const overallElements = [
    $("progressPercent"),
    $("overallProgress"),
    $("progressPagePercent")
  ];

  overallElements.forEach(element => {

    if (element) {
      element.textContent =
        overall + "%";
    }
  });

  const list =
    $("progressList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  data.subjects.forEach(subject => {

    const percent =
      getSubjectProgress(
        subject.id
      );

    const card =
      document.createElement("div");

    card.className =
      "progress-subject-card";

    card.innerHTML = `

      <div class="progress-subject-top">

        <strong>
          ${escapeHTML(subject.icon)}
          ${escapeHTML(subject.name)}
        </strong>

        <strong>
          ${percent}%
        </strong>

      </div>

      <div class="progress-bar">

        <div
          class="progress-fill"
          style="width:${percent}%"
        ></div>

      </div>

      <p>
        ${subject.chapters.length}
        chapters
      </p>

    `;

    list.appendChild(card);

    renderChapterProgress(
      subject,
      card
    );
  });
}


/* =========================================================
   CHAPTER PROGRESS
   ========================================================= */

function renderChapterProgress(
  subject,
  parent
) {

  if (!subject.chapters.length) {
    return;
  }

  const container =
    document.createElement("div");

  container.className =
    "chapter-progress-list";

  subject.chapters.forEach(
    (chapter, index) => {

      const percent =
        getChapterPercent(
          subject.id,
          chapter.id
        );

      const row =
        document.createElement("div");

      row.className =
        "chapter-progress-row";

      row.innerHTML = `

        <span>
          ${index + 1}.
          ${escapeHTML(chapter.name)}
        </span>

        <span>
          ${percent}%
        </span>

      `;

      container.appendChild(row);
    }
  );

  parent.appendChild(container);
}


/* =========================================================
   COUNTDOWN
   ========================================================= */

function renderCountdown() {

  const daysElement =
    $("countdownDays");

  const hoursElement =
    $("countdownHours");

  const minutesElement =
    $("countdownMinutes");

  if (
    !daysElement &&
    !hoursElement &&
    !minutesElement
  ) {
    return;
  }

  const examDate =
    data.settings.examDate;

  if (!examDate) {

    if (daysElement) {
      daysElement.textContent = "--";
    }

    if (hoursElement) {
      hoursElement.textContent = "--";
    }

    if (minutesElement) {
      minutesElement.textContent = "--";
    }

    return;
  }

  const target =
    new Date(
      examDate + "T00:00:00"
    ).getTime();

  const now =
    Date.now();

  let difference =
    target - now;

  if (difference < 0) {
    difference = 0;
  }

  const totalMinutes =
    Math.floor(
      difference / 60000
    );

  const days =
    Math.floor(
      totalMinutes / 1440
    );

  const hours =
    Math.floor(
      (totalMinutes % 1440) / 60
    );

  const minutes =
    totalMinutes % 60;

  if (daysElement) {
    daysElement.textContent =
      days;
  }

  if (hoursElement) {
    hoursElement.textContent =
      hours;
  }

  if (minutesElement) {
    minutesElement.textContent =
      minutes;
  }
}


/* =========================================================
   SET EXAM DATE
   ========================================================= */

function setExamDate() {

  const date =
    prompt(
      "HSC Exam Date टाका.\n\n" +
      "Format: YYYY-MM-DD"
    );

  if (date === null) {
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {

    alert(
      "⚠️ Date format चुकीचा आहे."
    );

    return;
  }

  data.settings.examDate =
    date;

  saveData();

  renderCountdown();
}


/* =========================================================
   BADGES
   ========================================================= */

function renderBadges() {

  const container =
    $("badges");

  if (!container) {
    return;
  }

  const badges =
    getBadges();

  container.innerHTML = "";

  if (badges.length === 0) {

    container.innerHTML = `
      <p>
        Complete revisions to unlock badges 🏆
      </p>
    `;

    return;
  }

  badges.forEach(badge => {

    const item =
      document.createElement("div");

    item.className =
      "badge";

    item.textContent =
      badge;

    container.appendChild(item);
  });
}


/* =========================================================
   GLOBAL REFRESH
   ========================================================= */

function refreshApp() {

  renderHome();
  renderSubject();
  renderToday();
  renderProgress();
  renderCountdown();
  renderBadges();
}


/* =========================================================
   RESET ALL DATA
   ========================================================= */

function resetAllData() {

  const confirmed =
    confirm(
      "⚠️ WARNING\n\n" +
      "सगळे chapters, revisions, XP आणि streak delete होतील.\n\n" +
      "हा action undo करता येणार नाही.\n\n" +
      "Continue?"
    );

  if (!confirmed) {
    return;
  }

  localStorage.removeItem(
    STORAGE_KEY
  );

  data =
    createDefaultData();

  selectedSubjectId = null;

  alert(
    "✅ App data reset झाले."
  );

  location.reload();
}


/* =========================================================
   ADD SUBJECT
   ========================================================= */

function addSubject() {

  const name =
    prompt(
      "नवीन Subject चे नाव:"
    );

  if (name === null) {
    return;
  }

  const cleanName =
    name.trim();

  if (!cleanName) {
    return;
  }

  const exists =
    data.subjects.some(
      subject =>
        subject.name.toLowerCase() ===
        cleanName.toLowerCase()
    );

  if (exists) {

    alert(
      "⚠️ हा subject आधीच आहे."
    );

    return;
  }

  data.subjects.push({
    id: createId("subject"),
    name: cleanName,
    icon: "📚",
    chapters: []
  });

  saveData();

  renderHome();
}


/* =========================================================
   DELETE SUBJECT
   ========================================================= */

function deleteSubject(subjectId) {

  const subject =
    getSubjectById(subjectId);

  if (!subject) {
    return;
  }

  const confirmed =
    confirm(
      "⚠️ " +
      subject.name +
      "\n\n" +
      "हा पूर्ण subject आणि त्याचे chapters delete करायचे आहेत का?"
    );

  if (!confirmed) {
    return;
  }

  subject.chapters.forEach(
    chapter => {

      delete data.revisions[
        getRevisionKey(
          subject.id,
          chapter.id
        )
      ];
    }
  );

  data.subjects =
    data.subjects.filter(
      item => item.id !== subjectId
    );

  if (
    selectedSubjectId === subjectId
  ) {
    selectedSubjectId = null;
  }

  saveData();

  renderHome();
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeApp() {

  console.log(
    "Revision Rules " +
    APP_VERSION +
    " loaded successfully."
  );

  if (
    data.subjects.length &&
    !selectedSubjectId
  ) {

    selectedSubjectId =
      data.subjects[0].id;
  }

  renderHome();
  renderToday();
  renderProgress();
  renderCountdown();
  renderBadges();

  setInterval(
    renderCountdown,
    60000
  );
}


/* =========================================================
   SAFE START
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );

} else {

  initializeApp();
}


/* =========================================================
   GLOBAL FUNCTIONS
   Required because index.html uses onclick=""
   ========================================================= */

window.showPage =
  showPage;

window.openSubject =
  openSubject;

window.startRevision =
  startRevision;

window.completeRevision =
  completeRevision;

window.renderSubject =
  renderSubject;

window.renderToday =
  renderToday;

window.renderProgress =
  renderProgress;

window.manageChapters =
  manageChapters;

window.addChapter =
  addChapter;

window.renameChapter =
  renameChapter;

window.deleteChapter =
  deleteChapter;

window.moveChapterUp =
  moveChapterUp;

window.moveChapterDown =
  moveChapterDown;

window.setExamDate =
  setExamDate;

window.addSubject =
  addSubject;

window.deleteSubject =
  deleteSubject;

window.resetAllData =
  resetAllData;


/* =========================================================
   END
   ========================================================= */
