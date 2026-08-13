"use strict";

/* =========================================================
   REVISION RULES
   Day 1 → Day 2 → Day 4 → Day 8 → Day 16 → Day 32 → Day 65
========================================================= */

const REVISION_DAYS = [1, 2, 4, 8, 16, 32, 65];

const STORAGE_KEY = "revision_rules_v2";


/* =========================================================
   DEFAULT DATA
========================================================= */

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
    id: "mathematics",
    name: "Mathematics Part 1",
    icon: "📐",
    chapters: []
  },
  {
    id: "mathematics2",
    name: "Mathematics Part 2",
    icon: "📊",
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


let data = loadData();


/* =========================================================
   DATA STRUCTURE
========================================================= */

function createDefaultData() {

  return {
    subjects: DEFAULT_SUBJECTS.map(subject => ({
      ...subject,
      chapters: []
    })),

    revisions: {},

    xp: 0,

    streak: {
      count: 0,
      lastDate: ""
    },

    examDate: ""
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
      parsed.subjects = [];
    }

    if (!parsed.revisions || typeof parsed.revisions !== "object") {
      parsed.revisions = {};
    }

    if (typeof parsed.xp !== "number") {
      parsed.xp = 0;
    }

    if (!parsed.streak) {
      parsed.streak = {
        count: 0,
        lastDate: ""
      };
    }

    if (typeof parsed.examDate !== "string") {
      parsed.examDate = "";
    }

    return parsed;

  } catch (error) {

    console.error("Could not load data:", error);

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

  } catch (error) {

    console.error("Could not save data:", error);
  }
}


/* =========================================================
   ID GENERATOR
========================================================= */

function createId(prefix = "id") {

  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substring(2, 8)
  );
}


/* =========================================================
   DATE HELPERS
========================================================= */

function getDateKey(date = new Date()) {

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function parseDateKey(key) {

  const parts = key.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  return new Date(year, month, day);
}


function addDays(dateKey, days) {

  const date = parseDateKey(dateKey);

  if (!date) {
    return "";
  }

  date.setDate(date.getDate() + days);

  return getDateKey(date);
}


function daysBetween(date1Key, date2Key) {

  const date1 = parseDateKey(date1Key);
  const date2 = parseDateKey(date2Key);

  if (!date1 || !date2) {
    return 0;
  }

  const diff = date2.getTime() - date1.getTime();

  return Math.round(
    diff / (1000 * 60 * 60 * 24)
  );
}


function formatDate(dateKey) {

  if (!dateKey) {
    return "--";
  }

  const date = parseDateKey(dateKey);

  if (!date) {
    return "--";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}


/* =========================================================
   SUBJECT / CHAPTER HELPERS
========================================================= */

function getSubject(subjectId) {

  return data.subjects.find(
    subject => subject.id === subjectId
  );
}


function getChapter(subjectId, chapterId) {

  const subject = getSubject(subjectId);

  if (!subject) {
    return null;
  }

  return subject.chapters.find(
    chapter => chapter.id === chapterId
  );
}


function getRevision(subjectId, chapterId) {

  const key = `${subjectId}__${chapterId}`;

  if (!data.revisions[key]) {

    data.revisions[key] = {
      started: false,
      startDate: "",
      completed: {}
    };

  }

  return data.revisions[key];
}


/* =========================================================
   REVISION SCHEDULE
========================================================= */

function getSchedule(revision) {

  if (!revision.started || !revision.startDate) {
    return [];
  }

  return REVISION_DAYS.map(day => {

    const offset = day - 1;

    return {
      day,
      date: addDays(
        revision.startDate,
        offset
      )
    };

  });
}


function getRevisionState(revision, day) {

  if (!revision.started) {
    return "waiting";
  }

  if (revision.completed[String(day)]) {
    return "done";
  }

  const today = getDateKey();
  const schedule = getSchedule(revision);

  const item = schedule.find(
    entry => entry.day === day
  );

  if (!item) {
    return "waiting";
  }

  if (item.date <= today) {
    return "due";
  }

  return "waiting";
}


/* =========================================================
   START CHAPTER
========================================================= */

function startChapter(subjectId, chapterId) {

  const chapter = getChapter(
    subjectId,
    chapterId
  );

  if (!chapter) {
    return;
  }

  const revision = getRevision(
    subjectId,
    chapterId
  );

  if (revision.started) {
    alert("This chapter has already been started.");
    return;
  }

  revision.started = true;
  revision.startDate = getDateKey();
  revision.completed = {};

  addXP(10);

  updateStreak();

  saveData();

  renderAll();

  alert(
    `${chapter.name}\n\nDay 1 started today!\n\nNext revision: Day 2`
  );
}


/* =========================================================
   COMPLETE REVISION
========================================================= */

function completeRevision(
  subjectId,
  chapterId,
  day
) {

  const revision = getRevision(
    subjectId,
    chapterId
  );

  if (!revision.started) {
    return;
  }

  const dayKey = String(day);

  if (revision.completed[dayKey]) {
    return;
  }

  const state = getRevisionState(
    revision,
    day
  );

  if (state !== "due") {

    alert(
      `Day ${day} is not due yet.`
    );

    return;
  }

  revision.completed[dayKey] = getDateKey();

  addXP(10);

  updateStreak();

  saveData();

  renderAll();

  alert(
    `Day ${day} revision completed! ✅`
  );
}


/* =========================================================
   PROGRESS CALCULATIONS
========================================================= */

function getChapterProgress(
  subjectId,
  chapterId
) {

  const revision = getRevision(
    subjectId,
    chapterId
  );

  if (!revision.started) {
    return 0;
  }

  let completed = 0;

  REVISION_DAYS.forEach(day => {

    if (revision.completed[String(day)]) {
      completed++;
    }

  });

  return Math.round(
    (completed / REVISION_DAYS.length) * 100
  );
}


function getSubjectProgress(subjectId) {

  const subject = getSubject(subjectId);

  if (!subject || subject.chapters.length === 0) {
    return 0;
  }

  let total = 0;

  subject.chapters.forEach(chapter => {

    total += getChapterProgress(
      subjectId,
      chapter.id
    );

  });

  return Math.round(
    total / subject.chapters.length
  );
}


function getOverallProgress() {

  let total = 0;
  let completed = 0;

  data.subjects.forEach(subject => {

    subject.chapters.forEach(chapter => {

      total += REVISION_DAYS.length;

      const revision = getRevision(
        subject.id,
        chapter.id
      );

      REVISION_DAYS.forEach(day => {

        if (
          revision.started &&
          revision.completed[String(day)]
        ) {
          completed++;
        }

      });

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
   DUE TODAY
========================================================= */

function getDueRevisions() {

  const today = getDateKey();

  const result = [];

  data.subjects.forEach(subject => {

    subject.chapters.forEach(chapter => {

      const revision = getRevision(
        subject.id,
        chapter.id
      );

      if (!revision.started) {
        return;
      }

      REVISION_DAYS.forEach(day => {

        const state = getRevisionState(
          revision,
          day
        );

        const schedule = getSchedule(
          revision
        );

        const item = schedule.find(
          entry => entry.day === day
        );

        if (
          state === "due" &&
          item &&
          item.date === today
        ) {

          result.push({
            subject,
            chapter,
            revision,
            day
          });

        }

      });

    });

  });

  return result;
}


/* =========================================================
   HOME
========================================================= */

function renderHome() {

  const overall = getOverallProgress();

  const percent = document.getElementById(
    "overallPercent"
  );

  if (percent) {
    percent.textContent = `${overall}%`;
  }

  const message = document.getElementById(
    "homeMessage"
  );

  if (message) {

    if (overall === 0) {
      message.textContent = "Start today! 🚀";
    } else if (overall < 30) {
      message.textContent = "Keep going! 💪";
    } else if (overall < 70) {
      message.textContent = "Great progress! 🔥";
    } else if (overall < 100) {
      message.textContent = "Almost there! 🏆";
    } else {
      message.textContent = "Revision Master! 👑";
    }

  }

  renderToday();

  renderHomeSubjects();

  renderExamCountdown();

  renderXP();
}


/* =========================================================
   TODAY LIST
========================================================= */

function renderToday() {

  const list = document.getElementById(
    "todayList"
  );

  const countElement = document.getElementById(
    "todayCount"
  );

  if (!list || !countElement) {
    return;
  }

  const due = getDueRevisions();

  countElement.textContent =
    `${due.length} revision${due.length === 1 ? "" : "s"}`;

  if (due.length === 0) {

    list.innerHTML = `
      <div class="empty-card">
        🎉 No revision due today!
      </div>
    `;

    return;
  }

  list.innerHTML = "";

  due.forEach(item => {

    const card = document.createElement("div");

    card.className = "today-card";

    card.innerHTML = `
      <h3>
        ${escapeHTML(item.subject.icon)}
        ${escapeHTML(item.subject.name)}
      </h3>

      <p>
        ${escapeHTML(item.chapter.name)}
        • Day ${item.day}
      </p>

      <button
        class="today-btn"
        onclick="completeRevision(
          '${item.subject.id}',
          '${item.chapter.id}',
          ${item.day}
        )"
      >
        Complete Day ${item.day} ✅
      </button>
    `;

    list.appendChild(card);

  });
}


/* =========================================================
   HOME SUBJECTS
========================================================= */

function renderHomeSubjects() {

  const container = document.getElementById(
    "homeSubjects"
  );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (data.subjects.length === 0) {

    container.innerHTML = `
      <div class="empty-card">
        No subjects added.
      </div>
    `;

    return;
  }

  data.subjects.forEach(subject => {

    const percent = getSubjectProgress(
      subject.id
    );

    const card = document.createElement(
      "div"
    );

    card.className = "subject-card";

    card.innerHTML = `
      <h3>
        ${escapeHTML(subject.icon)}
        ${escapeHTML(subject.name)}
      </h3>

      <div class="subject-percent">
        ${percent}%
      </div>

      <div class="progress-track">
        <div
          class="progress-fill"
          style="width:${percent}%"
        ></div>
      </div>

      <p class="muted-text">
        ${subject.chapters.length}
        chapter${subject.chapters.length === 1 ? "" : "s"}
      </p>
    `;

    container.appendChild(card);

  });
}


/* =========================================================
   REVISION PAGE
========================================================= */

function populateRevisionFilters() {

  const select = document.getElementById(
    "revisionSubjectFilter"
  );

  if (!select) {
    return;
  }

  const current = select.value;

  select.innerHTML = `
    <option value="all">
      All Subjects
    </option>
  `;

  data.subjects.forEach(subject => {

    const option = document.createElement(
      "option"
    );

    option.value = subject.id;

    option.textContent =
      `${subject.icon} ${subject.name}`;

    select.appendChild(option);

  });

  if (
    [...select.options].some(
      option => option.value === current
    )
  ) {
    select.value = current;
  }
}


function renderRevisionPage() {

  populateRevisionFilters();

  const list = document.getElementById(
    "revisionList"
  );

  if (!list) {
    return;
  }

  const subjectFilter =
    document.getElementById(
      "revisionSubjectFilter"
    ).value;

  const statusFilter =
    document.getElementById(
      "revisionStatusFilter"
    ).value;

  list.innerHTML = "";

  let cards = [];

  data.subjects.forEach(subject => {

    if (
      subjectFilter !== "all" &&
      subject.id !== subjectFilter
    ) {
      return;
    }

    subject.chapters.forEach(chapter => {

      const revision = getRevision(
        subject.id,
        chapter.id
      );

      if (!revision.started) {
        if (
          statusFilter === "active" ||
          statusFilter === "completed" ||
          statusFilter === "due"
        ) {
          return;
        }
      }

      const progress = getChapterProgress(
        subject.id,
        chapter.id
      );

      const allCompleted =
        progress === 100;

      const due = REVISION_DAYS.some(
        day =>
          getRevisionState(
            revision,
            day
          ) === "due"
      );

      if (
        statusFilter === "due" &&
        !due
      ) {
        return;
      }

      if (
        statusFilter === "active" &&
        (
          !revision.started ||
          allCompleted
        )
      ) {
        return;
      }

      if (
        statusFilter === "completed" &&
        !allCompleted
      ) {
        return;
      }

      cards.push({
        subject,
        chapter,
        revision
      });

    });

  });


  if (cards.length === 0) {

    list.innerHTML = `
      <div class="empty-card">
        No chapters found.
      </div>
    `;

    return;
  }


  cards.forEach(item => {

    const card = document.createElement(
      "div"
    );

    card.className =
      "revision-card";

    const revision =
      item.revision;

    let statusClass =
      "status-waiting";

    let statusText =
      "Not Started";

    if (revision.started) {

      const completedCount =
        REVISION_DAYS.filter(
          day =>
            revision.completed[
              String(day)
            ]
        ).length;

      if (
        completedCount ===
        REVISION_DAYS.length
      ) {

        statusClass =
          "status-done";

        statusText =
          "Completed";

      } else if (
        REVISION_DAYS.some(
          day =>
            getRevisionState(
              revision,
              day
            ) === "due"
        )
      ) {

        statusClass =
          "status-due";

        statusText =
          "Revision Due";

      } else {

        statusClass =
          "status-waiting";

        statusText =
          "Active";
      }

    }


    const chips =
      REVISION_DAYS.map(day => {

        const state =
          getRevisionState(
            revision,
            day
          );

        const schedule =
          getSchedule(
            revision
          );

        const itemDate =
          schedule.find(
            entry =>
              entry.day === day
          );

        let chipClass =
          "day-chip";

        if (state === "done") {
          chipClass += " done";
        }

        if (state === "due") {
          chipClass += " due";
        }

        return `
          <span class="${chipClass}">
            D${day}
            ${
              itemDate
                ? ` • ${formatDate(itemDate.date)}`
                : ""
            }
          </span>
        `;

      }).join("");


    let actionHTML = "";

    if (!revision.started) {

      actionHTML = `
        <button
          class="revision-action"
          onclick="startChapter(
            '${item.subject.id}',
            '${item.chapter.id}'
          )"
        >
          Start Chapter • Day 1 🚀
        </button>
      `;

    } else {

      const dueDay =
        REVISION_DAYS.find(
          day =>
            getRevisionState(
              revision,
              day
            ) === "due"
        );

      if (dueDay) {

        actionHTML = `
          <button
            class="revision-action"
            onclick="completeRevision(
              '${item.subject.id}',
              '${item.chapter.id}',
              ${dueDay}
            )"
          >
            Complete Day ${dueDay} ✅
          </button>
        `;

      } else {

        actionHTML = `
          <button
            class="revision-action"
            disabled
          >
            Next revision is scheduled
          </button>
        `;
      }

    }


    card.innerHTML = `

      <div class="revision-card-top">

        <div>
          <h3>
            ${escapeHTML(item.chapter.name)}
          </h3>

          <p class="subject-label">
            ${escapeHTML(item.subject.icon)}
            ${escapeHTML(item.subject.name)}
          </p>
        </div>

        <span class="status ${statusClass}">
          ${statusText}
        </span>

      </div>


      <div class="progress-track">

        <div
          class="progress-fill"
          style="width:${getChapterProgress(
            item.subject.id,
            item.chapter.id
          )}%"
        ></div>

      </div>


      <div class="revision-dates">
        ${chips}
      </div>


      ${actionHTML}

    `;

    list.appendChild(card);

  });
}


/* =========================================================
   PROGRESS PAGE
========================================================= */

function renderProgressPage() {

  const container = document.getElementById(
    "progressList"
  );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (data.subjects.length === 0) {

    container.innerHTML = `
      <div class="empty-card">
        Add subjects to see progress.
      </div>
    `;

    return;
  }


  data.subjects.forEach(subject => {

    const subjectPercent =
      getSubjectProgress(
        subject.id
      );

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "progress-subject";


    let chaptersHTML = "";

    if (subject.chapters.length === 0) {

      chaptersHTML = `
        <p class="muted-text">
          No chapters added yet.
        </p>
      `;

    } else {

      chaptersHTML =
        subject.chapters.map(
          chapter => {

            const percent =
              getChapterProgress(
                subject.id,
                chapter.id
              );

            return `

              <div class="chapter-progress-row">

                <div class="chapter-progress-header">

                  <span>
                    ${escapeHTML(
                      chapter.name
                    )}
                  </span>

                  <span>
                    ${percent}%
                  </span>

                </div>

                <div class="progress-track">

                  <div
                    class="progress-fill"
                    style="width:${percent}%"
                  ></div>

                </div>

              </div>

            `;

          }
        ).join("");

    }


    wrapper.innerHTML = `

      <div class="progress-subject-header">

        <h3>
          ${escapeHTML(subject.icon)}
          ${escapeHTML(subject.name)}
        </h3>

        <strong>
          ${subjectPercent}%
        </strong>

      </div>

      ${chaptersHTML}

    `;

    container.appendChild(wrapper);

  });
}


/* =========================================================
   MANAGE PAGE
========================================================= */

function renderManagePage() {

  const container =
    document.getElementById(
      "manageSubjects"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";


  data.subjects.forEach(
    (subject, subjectIndex) => {

      const wrapper =
        document.createElement("div");

      wrapper.className =
        "manage-subject";


      let chaptersHTML = "";

      if (subject.chapters.length === 0) {

        chaptersHTML = `
          <p class="muted-text">
            No chapters yet.
          </p>
        `;

      } else {

        chaptersHTML =
          subject.chapters.map(
            (chapter, index) => {

              return `

                <div class="chapter-item">

                  <span class="chapter-number">
                    ${index + 1}
                  </span>

                  <span class="chapter-name">
                    ${escapeHTML(
                      chapter.name
                    )}
                  </span>

                  <button
                    class="icon-btn"
                    onclick="moveChapter(
                      '${subject.id}',
                      ${index},
                      -1
                    )"
                    title="Move Up"
                  >
                    ↑
                  </button>

                  <button
                    class="icon-btn"
                    onclick="moveChapter(
                      '${subject.id}',
                      ${index},
                      1
                    )"
                    title="Move Down"
                  >
                    ↓
                  </button>

                  <button
                    class="icon-btn delete-btn"
                    onclick="deleteChapter(
                      '${subject.id}',
                      '${chapter.id}'
                    )"
                    title="Delete"
                  >
                    ✕
                  </button>

                </div>

              `;

            }
          ).join("");

      }


      wrapper.innerHTML = `

        <div class="manage-subject-header">

          <h3>
            ${escapeHTML(subject.icon)}
            ${escapeHTML(subject.name)}
          </h3>

          <div class="subject-actions">

            <button
              class="icon-btn"
              onclick="moveSubject(
                ${subjectIndex},
                -1
              )"
              title="Move Up"
            >
              ↑
            </button>

            <button
              class="icon-btn"
              onclick="moveSubject(
                ${subjectIndex},
                1
              )"
              title="Move Down"
            >
              ↓
            </button>

            <button
              class="icon-btn delete-btn"
              onclick="deleteSubject(
                '${subject.id}'
              )"
              title="Delete Subject"
            >
              ✕
            </button>

          </div>

        </div>


        <div class="chapter-list">
          ${chaptersHTML}
        </div>


        <div class="add-chapter-box">

          <input
            type="text"
            id="chapterInput_${subject.id}"
            placeholder="Add chapter..."
            maxlength="100"
          >

          <button
            class="primary-btn"
            onclick="addChapter(
              '${subject.id}'
            )"
          >
            Add
          </button>

        </div>

      `;

      container.appendChild(wrapper);

    }
  );
}


/* =========================================================
   ADD SUBJECT
========================================================= */

function addSubject() {

  const input =
    document.getElementById(
      "subjectNameInput"
    );

  if (!input) {
    return;
  }

  const name =
    input.value.trim();

  if (!name) {

    alert(
      "Please enter a subject name."
    );

    return;
  }


  const exists =
    data.subjects.some(
      subject =>
        subject.name.toLowerCase() ===
        name.toLowerCase()
    );

  if (exists) {

    alert(
      "This subject already exists."
    );

    return;
  }


  data.subjects.push({

    id: createId("subject"),

    name,

    icon: "📚",

    chapters: []

  });


  input.value = "";

  saveData();

  renderAll();

}


/* =========================================================
   DELETE SUBJECT
========================================================= */

function deleteSubject(subjectId) {

  const subject =
    getSubject(subjectId);

  if (!subject) {
    return;
  }

  const confirmDelete =
    confirm(
      `Delete "${subject.name}" and all its chapters?`
    );

  if (!confirmDelete) {
    return;
  }


  data.subjects =
    data.subjects.filter(
      item =>
        item.id !== subjectId
    );


  Object.keys(data.revisions)
    .forEach(key => {

      if (
        key.startsWith(
          `${subjectId}__`
        )
      ) {
        delete data.revisions[key];
      }

    });


  saveData();

  renderAll();
}


/* =========================================================
   ADD CHAPTER
========================================================= */

function addChapter(subjectId) {

  const input =
    document.getElementById(
      `chapterInput_${subjectId}`
    );

  if (!input) {
    return;
  }

  const name =
    input.value.trim();

  if (!name) {

    alert(
      "Please enter a chapter name."
    );

    return;
  }


  const subject =
    getSubject(subjectId);

  if (!subject) {
    return;
  }


  subject.chapters.push({

    id: createId("chapter"),

    name

  });


  input.value = "";

  saveData();

  renderAll();
}


/* =========================================================
   DELETE CHAPTER
========================================================= */

function deleteChapter(
  subjectId,
  chapterId
) {

  const subject =
    getSubject(subjectId);

  if (!subject) {
    return;
  }

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );

  if (!chapter) {
    return;
  }


  const confirmDelete =
    confirm(
      `Delete chapter "${chapter.name}"?`
    );

  if (!confirmDelete) {
    return;
  }


  subject.chapters =
    subject.chapters.filter(
      item =>
        item.id !== chapterId
    );


  const key =
    `${subjectId}__${chapterId}`;

  delete data.revisions[key];


  saveData();

  renderAll();
}


/* =========================================================
   MOVE CHAPTER
========================================================= */

function moveChapter(
  subjectId,
  index,
  direction
) {

  const subject =
    getSubject(subjectId);

  if (!subject) {
    return;
  }

  const newIndex =
    index + direction;

  if (
    newIndex < 0 ||
    newIndex >= subject.chapters.length
  ) {
    return;
  }


  const temp =
    subject.chapters[index];

  subject.chapters[index] =
    subject.chapters[newIndex];

  subject.chapters[newIndex] =
    temp;


  saveData();

  renderAll();
}


/* =========================================================
   MOVE SUBJECT
========================================================= */

function moveSubject(
  index,
  direction
) {

  const newIndex =
    index + direction;

  if (
    newIndex < 0 ||
    newIndex >= data.subjects.length
  ) {
    return;
  }


  const temp =
    data.subjects[index];

  data.subjects[index] =
    data.subjects[newIndex];

  data.subjects[newIndex] =
    temp;


  saveData();

  renderAll();
}


/* =========================================================
   XP
========================================================= */

function addXP(amount) {

  data.xp += amount;

  if (data.xp < 0) {
    data.xp = 0;
  }
}


function renderXP() {

  const xpElement =
    document.getElementById(
      "xpValue"
    );

  const xpProgress =
    document.getElementById(
      "xpProgress"
    );

  const streakElement =
    document.getElementById(
      "streakValue"
    );

  if (xpElement) {

    xpElement.textContent =
      `${data.xp} XP`;

  }


  if (xpProgress) {

    const levelProgress =
      data.xp % 100;

    xpProgress.style.width =
      `${levelProgress}%`;

  }


  if (streakElement) {

    streakElement.textContent =
      data.streak.count;

  }


  renderBadges();
}


/* =========================================================
   BADGES
========================================================= */

function renderBadges() {

  const container =
    document.getElementById(
      "badges"
    );

  if (!container) {
    return;
  }

  const badges = [];


  if (data.xp >= 10) {
    badges.push("🌱 First Step");
  }

  if (data.xp >= 50) {
    badges.push("🔥 Getting Serious");
  }

  if (data.xp >= 100) {
    badges.push("⭐ 100 XP");
  }

  if (data.xp >= 250) {
    badges.push("🏆 Revision Warrior");
  }

  if (data.xp >= 500) {
    badges.push("👑 Revision Master");
  }

  if (data.streak.count >= 3) {
    badges.push("🔥 3 Day Streak");
  }

  if (data.streak.count >= 7) {
    badges.push("🔥 7 Day Streak");
  }


  if (badges.length === 0) {

    container.innerHTML = `
      <span class="badge">
        🎯 Complete revisions to unlock badges
      </span>
    `;

    return;
  }


  container.innerHTML =
    badges.map(
      badge =>
        `<span class="badge">${badge}</span>`
    ).join("");
}


/* =========================================================
   STREAK
========================================================= */

function updateStreak() {

  const today =
    getDateKey();

  const last =
    data.streak.lastDate;


  if (!last) {

    data.streak.count = 1;

    data.streak.lastDate =
      today;

    return;
  }


  if (last === today) {
    return;
  }


  const difference =
    daysBetween(
      last,
      today
    );


  if (difference === 1) {

    data.streak.count += 1;

  } else {

    data.streak.count = 1;

  }


  data.streak.lastDate =
    today;
}


/* =========================================================
   EXAM COUNTDOWN
========================================================= */

function setExamDate() {

  const current =
    data.examDate ||
    getDateKey();


  const input =
    prompt(
      "Enter HSC exam date (YYYY-MM-DD):",
      current
    );


  if (input === null) {
    return;
  }


  const date =
    parseDateKey(
      input.trim()
    );

  if (!date) {

    alert(
      "Invalid date. Use YYYY-MM-DD."
    );

    return;
  }


  data.examDate =
    input.trim();

  saveData();

  renderExamCountdown();
}


function renderExamCountdown() {

  const container =
    document.getElementById(
      "examCountdown"
    );

  const text =
    document.getElementById(
      "examDateText"
    );

  if (!container || !text) {
    return;
  }


  if (!data.examDate) {

    container.innerHTML = `
      <div><strong>--</strong><span>Days</span></div>
      <div><strong>--</strong><span>Hours</span></div>
      <div><strong>--</strong><span>Minutes</span></div>
    `;

    text.textContent =
      "Exam date not set";

    return;
  }


  const exam =
    parseDateKey(
      data.examDate
    );

  if (!exam) {
    return;
  }


  const now =
    new Date();

  const difference =
    exam.getTime() -
    now.getTime();


  if (difference <= 0) {

    container.innerHTML = `
      <div><strong>0</strong><span>Days</span></div>
      <div><strong>0</strong><span>Hours</span></div>
      <div><strong>0</strong><span>Minutes</span></div>
    `;

    text.textContent =
      "🎯 Exam time has arrived!";

    return;
  }


  const totalMinutes =
    Math.floor(
      difference /
      (1000 * 60)
    );

  const days =
    Math.floor(
      totalMinutes /
      (60 * 24)
    );

  const hours =
    Math.floor(
      (
        totalMinutes %
        (60 * 24)
      ) / 60
    );

  const minutes =
    totalMinutes % 60;


  container.innerHTML = `

    <div>
      <strong>${days}</strong>
      <span>Days</span>
    </div>

    <div>
      <strong>${hours}</strong>
      <span>Hours</span>
    </div>

    <div>
      <strong>${minutes}</strong>
      <span>Minutes</span>
    </div>

  `;


  text.textContent =
    `Exam Date: ${formatDate(data.examDate)}`;
}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(
  pageId,
  button = null
) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove(
        "active"
      );

    });


  const page =
    document.getElementById(
      pageId
    );

  if (!page) {
    return;
  }


  page.classList.add(
    "active"
  );


  document
    .querySelectorAll(".nav-btn")
    .forEach(btn => {

      btn.classList.remove(
        "active"
      );

    });


  const targetButton =
    button ||
    document.querySelector(
      `.nav-btn[data-page="${pageId}"]`
    );


  if (targetButton) {

    targetButton.classList.add(
      "active"
    );

  }


  if (pageId === "revisionPage") {
    renderRevisionPage();
  }

  if (pageId === "progressPage") {
    renderProgressPage();
  }

  if (pageId === "managePage") {
    renderManagePage();
  }

  if (pageId === "homePage") {
    renderHome();
  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {

  renderHome();

  renderRevisionPage();

  renderProgressPage();

  renderManagePage();

  populateRevisionFilters();

}


/* =========================================================
   EXPORT DATA
========================================================= */

function exportData() {

  const backup = {
    ...data,
    exportedAt:
      new Date().toISOString()
  };


  const json =
    JSON.stringify(
      backup,
      null,
      2
    );


  const blob =
    new Blob(
      [json],
      {
        type: "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "revision-rules-backup.json";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


/* =========================================================
   IMPORT DATA
========================================================= */

function importData(event) {

  const file =
    event.target.files[0];

  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload =
    function () {

      try {

        const imported =
          JSON.parse(
            reader.result
          );


        if (
          !imported ||
          !Array.isArray(
            imported.subjects
          )
        ) {

          throw new Error(
            "Invalid backup"
          );

        }


        data = imported;


        if (!data.revisions) {
          data.revisions = {};
        }

        if (
          typeof data.xp !==
          "number"
        ) {
          data.xp = 0;
        }

        if (!data.streak) {

          data.streak = {
            count: 0,
            lastDate: ""
          };

        }

        if (
          typeof data.examDate !==
          "string"
        ) {
          data.examDate = "";
        }


        saveData();

        renderAll();


        alert(
          "Backup restored successfully! ✅"
        );

      } catch (error) {

        console.error(error);

        alert(
          "Invalid backup file."
        );

      }

    };


  reader.readAsText(file);

  event.target.value = "";
}


/* =========================================================
   RESET DATA
========================================================= */

function resetAllData() {

  const confirmReset =
    confirm(
      "This will delete ALL subjects, chapters and revision progress. Continue?"
    );

  if (!confirmReset) {
    return;
  }


  const secondConfirm =
    confirm(
      "Are you absolutely sure? This cannot be undone."
    );

  if (!secondConfirm) {
    return;
  }


  data =
    createDefaultData();

  saveData();

  renderAll();

  alert(
    "All data has been reset."
  );
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

  const div =
    document.createElement("div");

  div.textContent =
    String(value);

  return div.innerHTML;
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    renderAll();

    setInterval(
      renderExamCountdown,
      60000
    );

  }
);
