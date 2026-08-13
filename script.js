/* =========================================================
   REVISION RULES
   HSC SMART REVISION TRACKER
   =========================================================

   REVISION SYSTEM

   Day 1  -> Start Chapter
   Day 2  -> Revision 1
   Day 4  -> Revision 2
   Day 8  -> Revision 3
   Day 16 -> Revision 4
   Day 32 -> Revision 5
   Day 65 -> Final Revision

   Data is stored in localStorage.
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const REVISION_DAYS = [1, 2, 4, 8, 16, 32, 65];

const STORAGE_KEY = "revision_rules_data_v2";
const SUBJECTS_KEY = "revision_rules_subjects_v2";
const EXAM_DATE_KEY = "revision_rules_exam_date_v2";


/* =========================================================
   DEFAULT SUBJECTS
   =========================================================
   
   येथे फक्त subjects ची नावे आहेत.
   Chapters app मधून add करता येतील.
   ========================================================= */

const DEFAULT_SUBJECTS = [
  {
    name: "Physics",
    icon: "⚛️",
    chapters: []
  },
  {
    name: "Chemistry",
    icon: "🧪",
    chapters: []
  },
  {
    name: "Mathematics Part 1",
    icon: "📐",
    chapters: []
  },
  {
    name: "Mathematics Part 2",
    icon: "📐",
    chapters: []
  },
  {
    name: "Biology",
    icon: "🧬",
    chapters: []
  },
  {
    name: "English",
    icon: "📖",
    chapters: []
  },
  {
    name: "Marathi",
    icon: "📚",
    chapters: []
  }
];


/* =========================================================
   GLOBAL DATA
   ========================================================= */

let subjects = [];
let data = {
  revisions: {},
  xp: 0,
  streak: 0,
  lastActivity: null
};

let currentSubjectName = null;


/* =========================================================
   DATE HELPERS
   ========================================================= */

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function parseDate(dateString) {
  if (!dateString) return null;

  const parts = dateString.split("-");

  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  return new Date(year, month, day);
}


function addDays(dateString, days) {
  const date = parseDate(dateString);

  if (!date) return null;

  date.setDate(date.getDate() + Number(days));

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function daysBetween(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) return 0;

  const difference = end.getTime() - start.getTime();

  return Math.floor(difference / 86400000);
}


function formatDate(dateString) {
  if (!dateString) return "--";

  const date = parseDate(dateString);

  if (!date) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


/* =========================================================
   STORAGE
   ========================================================= */

function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error("Could not save revision data:", error);
  }
}


function saveSubjects() {
  try {
    localStorage.setItem(
      SUBJECTS_KEY,
      JSON.stringify(subjects)
    );
  } catch (error) {
    console.error("Could not save subjects:", error);
  }
}


function loadData() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (savedData) {
      const parsed = JSON.parse(savedData);

      if (parsed && typeof parsed === "object") {
        data = {
          revisions: parsed.revisions || {},
          xp: Number(parsed.xp) || 0,
          streak: Number(parsed.streak) || 0,
          lastActivity: parsed.lastActivity || null
        };
      }
    }
  } catch (error) {
    console.error("Could not load revision data:", error);

    data = {
      revisions: {},
      xp: 0,
      streak: 0,
      lastActivity: null
    };
  }
}


function loadSubjects() {
  try {
    const savedSubjects = localStorage.getItem(SUBJECTS_KEY);

    if (savedSubjects) {
      const parsed = JSON.parse(savedSubjects);

      if (Array.isArray(parsed)) {
        subjects = parsed;
        return;
      }
    }
  } catch (error) {
    console.error("Could not load subjects:", error);
  }

  subjects = JSON.parse(
    JSON.stringify(DEFAULT_SUBJECTS)
  );

  saveSubjects();
}


/* =========================================================
   SUBJECT HELPERS
   ========================================================= */

function getSubject(subjectName) {
  return subjects.find(
    subject => subject.name === subjectName
  );
}


function getChapter(subjectName, chapterName) {
  const subject = getSubject(subjectName);

  if (!subject) return null;

  return subject.chapters.find(
    chapter => chapter === chapterName
  );
}


function getRevisionKey(subjectName, chapterName) {
  return `${subjectName}|||${chapterName}`;
}


function getRevisionData(subjectName, chapterName) {
  const key = getRevisionKey(
    subjectName,
    chapterName
  );

  if (!data.revisions[key]) {
    data.revisions[key] = {
      day1: false,
      day2: false,
      day4: false,
      day8: false,
      day16: false,
      day32: false,
      day65: false,

      dates: {
        day1: null,
        day2: null,
        day4: null,
        day8: null,
        day16: null,
        day32: null,
        day65: null
      },

      completed: false
    };
  }

  return data.revisions[key];
}


/* =========================================================
   REVISION STATUS
   ========================================================= */

function isRevisionDone(revisionData, day) {
  if (!revisionData) return false;

  return Boolean(
    revisionData[`day${day}`]
  );
}


function getCompletedCount(revisionData) {
  if (!revisionData) return 0;

  return REVISION_DAYS.filter(
    day => revisionData[`day${day}`]
  ).length;
}


function getChapterProgress(
  subjectName,
  chapterName
) {
  const revisionData =
    getRevisionData(
      subjectName,
      chapterName
    );

  const completed =
    getCompletedCount(revisionData);

  return Math.round(
    (completed / REVISION_DAYS.length) * 100
  );
}


/* =========================================================
   START CHAPTER
   ========================================================= */

function startChapter(
  subjectName,
  chapterName
) {
  if (!subjectName || !chapterName) {
    alert("Subject किंवा Chapter missing आहे.");
    return;
  }

  const revisionData =
    getRevisionData(
      subjectName,
      chapterName
    );

  if (revisionData.day1) {
    alert(
      "हा chapter आधीच Revision System मध्ये आहे."
    );
    return;
  }

  const today = getToday();

  revisionData.day1 = true;

  revisionData.dates.day1 =
    today;

  revisionData.dates.day2 =
    addDays(today, 1);

  revisionData.dates.day4 =
    addDays(today, 3);

  revisionData.dates.day8 =
    addDays(today, 7);

  revisionData.dates.day16 =
    addDays(today, 15);

  revisionData.dates.day32 =
    addDays(today, 31);

  revisionData.dates.day65 =
    addDays(today, 64);

  revisionData.completed = false;

  data.xp += 10;

  updateStreak();

  saveData();

  renderAll();

  alert(
    `✅ Revision Started!\n\n${chapterName}\n\n` +
    `Day 1: ${formatDate(revisionData.dates.day1)}\n` +
    `Day 2: ${formatDate(revisionData.dates.day2)}\n` +
    `Day 4: ${formatDate(revisionData.dates.day4)}\n` +
    `Day 8: ${formatDate(revisionData.dates.day8)}\n` +
    `Day 16: ${formatDate(revisionData.dates.day16)}\n` +
    `Day 32: ${formatDate(revisionData.dates.day32)}\n` +
    `Day 65: ${formatDate(revisionData.dates.day65)}`
  );
}


/* =========================================================
   COMPLETE REVISION
   ========================================================= */

function completeRevision(
  subjectName,
  chapterName,
  day
) {
  const revisionData =
    getRevisionData(
      subjectName,
      chapterName
    );

  if (!revisionData) return;

  const revisionDay = Number(day);

  if (
    !REVISION_DAYS.includes(
      revisionDay
    )
  ) {
    return;
  }

  const key =
    `day${revisionDay}`;

  if (revisionData[key]) {
    return;
  }

  /*
    Day 1 = Start Chapter
    Day 2 = Revision 1
    Day 4 = Revision 2
    Day 8 = Revision 3
    Day 16 = Revision 4
    Day 32 = Revision 5
    Day 65 = Final Revision
  */

  revisionData[key] = true;

  revisionData.dates[key] =
    getToday();

  data.xp += 10;

  const completed =
    getCompletedCount(revisionData);

  if (
    completed >=
    REVISION_DAYS.length
  ) {
    revisionData.completed = true;

    data.xp += 25;
  }

  updateStreak();

  saveData();

  renderAll();

  const message =
    revisionDay === 1
      ? "Start Chapter"
      : revisionDay === 65
        ? "Final Revision"
        : `Revision ${getRevisionNumber(revisionDay)}`;

  alert(
    `🎉 Revision Completed!\n\n` +
    `${chapterName}\n\n` +
    `${message}\n\n` +
    `+10 XP`
  );
}


function getRevisionNumber(day) {
  const index =
    REVISION_DAYS.indexOf(
      Number(day)
    );

  if (index <= 0) return 0;

  return index;
}


/* =========================================================
   FIND DUE REVISIONS
   ========================================================= */

function getDueRevisions() {
  const today = getToday();

  const due = [];

  subjects.forEach(subject => {
    subject.chapters.forEach(chapter => {

      const revisionData =
        getRevisionData(
          subject.name,
          chapter
        );

      REVISION_DAYS.forEach(day => {

        const key =
          `day${day}`;

        const dueDate =
          revisionData.dates[key];

        if (
          dueDate === today &&
          !revisionData[key]
        ) {
          due.push({
            subject: subject,
            chapter: chapter,
            day: day
          });
        }

      });

    });
  });

  return due;
}


/* =========================================================
   TODAY PAGE
   ========================================================= */

function renderToday() {
  const list =
    document.getElementById(
      "todayList"
    );

  if (!list) return;

  list.innerHTML = "";

  const due =
    getDueRevisions();

  if (due.length === 0) {

    list.innerHTML = `
      <div class="today-card">
        <h3>🎉 No revisions due today</h3>
        <p>Great! You are up to date.</p>
      </div>
    `;

    return;
  }

  due.forEach(item => {

    const card =
      document.createElement("div");

    card.className =
      "today-card";

    const revisionText =
      item.day === 1
        ? "Start Chapter"
        : item.day === 65
          ? "Final Revision"
          : `Revision ${getRevisionNumber(item.day)}`;

    card.innerHTML = `
      <h3>
        ${item.subject.icon || "📚"}
        ${escapeHTML(item.subject.name)}
      </h3>

      <p>
        ${escapeHTML(item.chapter)}
      </p>

      <strong>
        Day ${item.day} — ${revisionText}
      </strong>

      <br><br>

      <button
        class="today-btn"
        onclick="completeRevision(
          '${escapeJS(item.subject.name)}',
          '${escapeJS(item.chapter)}',
          ${item.day}
        )"
      >
        Complete Revision
      </button>
    `;

    list.appendChild(card);
  });
}


/* =========================================================
   SUBJECT PAGE
   ========================================================= */

function openSubjectByName(
  subjectName
) {
  const subject =
    getSubject(subjectName);

  if (!subject) {
    alert("Subject सापडला नाही.");
    return;
  }

  currentSubjectName =
    subjectName;

  showPage(
    "subjectPage",
    null
  );

  renderSubject();
}


function renderSubject() {

  const subject =
    getSubject(
      currentSubjectName
    );

  if (!subject) return;

  const name =
    document.getElementById(
      "subjectName"
    );

  if (name) {
    name.textContent =
      subject.name;
  }

  const icon =
    document.getElementById(
      "subjectIcon"
    );

  if (icon) {
    icon.textContent =
      subject.icon || "📚";
  }

  const percent =
    getSubjectProgress(
      subject
    );

  const subjectPercent =
    document.getElementById(
      "subjectPercent"
    );

  if (subjectPercent) {
    subjectPercent.textContent =
      `${percent}%`;
  }

  const subjectProgressText =
    document.getElementById(
      "subjectProgressText"
    );

  if (subjectProgressText) {
    subjectProgressText.textContent =
      `${percent}%`;
  }

  const subjectProgressBar =
    document.getElementById(
      "subjectProgressBar"
    );

  if (subjectProgressBar) {
    subjectProgressBar.style.width =
      `${percent}%`;
  }

  const list =
    document.getElementById(
      "chapterList"
    );

  if (!list) return;

  list.innerHTML = "";

  if (
    subject.chapters.length === 0
  ) {
    list.innerHTML = `
      <div class="chapter-card">
        <h3>📚 No chapters yet</h3>
        <p>Add your first chapter below.</p>
      </div>
    `;

    addChapterManager();
    return;
  }

  subject.chapters.forEach(
    (chapter, index) => {

      const revisionData =
        getRevisionData(
          subject.name,
          chapter
        );

      const completed =
        getCompletedCount(
          revisionData
        );

      const percent =
        Math.round(
          (completed /
            REVISION_DAYS.length) *
          100
        );

      const card =
        document.createElement("div");

      card.className =
        "chapter-card";

      card.innerHTML = `
        <div class="chapter-top">

          <div class="chapter-name">
            ${index + 1}.
            ${escapeHTML(chapter)}
          </div>

          <div class="chapter-percent">
            ${percent}%
          </div>

        </div>

        <div class="chapter-progress">
          <div
            style="width:${percent}%"
          ></div>
        </div>

        <div class="revision-info">

          <strong>Revision:</strong>

          <div>
            ${
              revisionData.day1
                ? "✅ Day 1"
                : "⬜ Day 1"
            }
          </div>

          <div>
            ${
              revisionData.day2
                ? "✅ Day 2"
                : "⬜ Day 2"
            }
          </div>

          <div>
            ${
              revisionData.day4
                ? "✅ Day 4"
                : "⬜ Day 4"
            }
          </div>

          <div>
            ${
              revisionData.day8
                ? "✅ Day 8"
                : "⬜ Day 8"
            }
          </div>

          <div>
            ${
              revisionData.day16
                ? "✅ Day 16"
                : "⬜ Day 16"
            }
          </div>

          <div>
            ${
              revisionData.day32
                ? "✅ Day 32"
                : "⬜ Day 32"
            }
          </div>

          <div>
            ${
              revisionData.day65
                ? "✅ Day 65"
                : "⬜ Day 65"
            }
          </div>

        </div>

        <div class="revision-buttons">

          ${createRevisionButton(
            subject.name,
            chapter,
            1,
            revisionData
          )}

          ${createRevisionButton(
            subject.name,
            chapter,
            2,
            revisionData
          )}

          ${createRevisionButton(
            subject.name,
            chapter,
            4,
            revisionData
          )}

          ${createRevisionButton(
            subject.name,
            chapter,
            8,
            revisionData
          )}

          ${createRevisionButton(
            subject.name,
            chapter,
            16,
            revisionData
          )}

          ${createRevisionButton(
            subject.name,
            chapter,
            32,
            revisionData
          )}

          ${createRevisionButton(
            subject.name,
            chapter,
            65,
            revisionData
          )}

        </div>

        <div class="chapter-management">

          <button
            onclick="moveChapterUp(${index})"
          >
            ↑
          </button>

          <button
            onclick="moveChapterDown(${index})"
          >
            ↓
          </button>

          <button
            onclick="renameChapter(${index})"
          >
            ✏️
          </button>

          <button
            onclick="deleteChapter(${index})"
          >
            🗑️
          </button>

        </div>
      `;

      list.appendChild(card);
    }
  );

  addChapterManager();
}


/* =========================================================
   REVISION BUTTON
   ========================================================= */

function createRevisionButton(
  subjectName,
  chapter,
  day,
  revisionData
) {
  const key =
    `day${day}`;

  const done =
    Boolean(
      revisionData[key]
    );

  let label = "";

  if (day === 1) {
    label = "Start Chapter";
  } else if (day === 65) {
    label = "Final Revision";
  } else {
    label =
      `Revision ${getRevisionNumber(day)}`;
  }

  return `
    <button
      class="${done ? "done" : ""}"
      ${done ? "disabled" : ""}
      onclick="
        completeRevision(
          '${escapeJS(subjectName)}',
          '${escapeJS(chapter)}',
          ${day}
        )
      "
    >
      ${done ? "✅ " : ""}
      ${label}
    </button>
  `;
}


/* =========================================================
   SUBJECT PROGRESS
   ========================================================= */

function getSubjectProgress(
  subject
) {
  const total =
    subject.chapters.length *
    REVISION_DAYS.length;

  if (total === 0) {
    return 0;
  }

  let done = 0;

  subject.chapters.forEach(
    chapter => {

      const revisionData =
        getRevisionData(
          subject.name,
          chapter
        );

      done +=
        getCompletedCount(
          revisionData
        );
    }
  );

  return Math.round(
    (done / total) * 100
  );
}


/* =========================================================
   OVERALL PROGRESS
   ========================================================= */

function getOverallProgress() {

  let total = 0;
  let done = 0;

  subjects.forEach(
    subject => {

      subject.chapters.forEach(
        chapter => {

          total +=
            REVISION_DAYS.length;

          const revisionData =
            getRevisionData(
              subject.name,
              chapter
            );

          done +=
            getCompletedCount(
              revisionData
            );
        }
      );
    }
  );

  if (total === 0) {
    return 0;
  }

  return Math.round(
    (done / total) * 100
  );
}


/* =========================================================
   PROGRESS PAGE
   ========================================================= */

function renderProgress() {

  const overall =
    getOverallProgress();

  const overallElements =
    [
      "overallPercent",
      "progressPercent",
      "homePercent"
    ];

  overallElements.forEach(
    id => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent =
          `${overall}%`;
      }
    }
  );

  const overallBar =
    document.getElementById(
      "overallProgressBar"
    );

  if (overallBar) {
    overallBar.style.width =
      `${overall}%`;
  }

  const progressList =
    document.getElementById(
      "progressList"
    );

  if (!progressList) return;

  progressList.innerHTML = "";

  subjects.forEach(
    subject => {

      const percent =
        getSubjectProgress(
          subject
        );

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "chapter-card";

      card.innerHTML = `
        <div class="chapter-top">

          <div class="chapter-name">
            ${subject.icon || "📚"}
            ${escapeHTML(subject.name)}
          </div>

          <div class="chapter-percent">
            ${percent}%
          </div>

        </div>

        <div class="chapter-progress">
          <div
            style="width:${percent}%"
          ></div>
        </div>

        <p>
          ${subject.chapters.length}
          chapters
        </p>
      `;

      progressList.appendChild(
        card
      );
    }
  );
}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {

  const overall =
    getOverallProgress();

  const percent =
    document.getElementById(
      "overallPercent"
    );

  if (percent) {
    percent.textContent =
      `${overall}%`;
  }

  const homeProgress =
    document.getElementById(
      "homeProgress"
    );

  if (homeProgress) {
    homeProgress.style.width =
      `${overall}%`;
  }

  const xp =
    document.getElementById(
      "xp"
    );

  if (xp) {
    xp.textContent =
      `${data.xp} XP`;
  }

  const streak =
    document.getElementById(
      "streak"
    );

  if (streak) {
    streak.textContent =
      `🔥 ${data.streak}`;
  }

  const todayCount =
    getDueRevisions().length;

  const todayRevisionCount =
    document.getElementById(
      "todayRevisionCount"
    );

  if (todayRevisionCount) {
    todayRevisionCount.textContent =
      `${todayCount} revisions today`;
  }

  renderExamCountdown();
}


/* =========================================================
   STREAK
   ========================================================= */

function updateStreak() {

  const today =
    getToday();

  if (!data.lastActivity) {

    data.streak = 1;
    data.lastActivity = today;

    return;
  }

  if (
    data.lastActivity === today
  ) {
    return;
  }

  const difference =
    daysBetween(
      data.lastActivity,
      today
    );

  if (difference === 1) {

    data.streak += 1;

  } else if (difference > 1) {

    data.streak = 1;
  }

  data.lastActivity =
    today;
}


/* =========================================================
   CHAPTER MANAGEMENT
   ========================================================= */

function addChapter() {

  const subject =
    getSubject(
      currentSubjectName
    );

  if (!subject) return;

  const chapter =
    prompt(
      `Enter new chapter name for ${subject.name}:`
    );

  if (!chapter) return;

  const cleanName =
    chapter.trim();

  if (!cleanName) return;

  if (
    subject.chapters.includes(
      cleanName
    )
  ) {
    alert(
      "हा chapter आधीपासून आहे."
    );
    return;
  }

  subject.chapters.push(
    cleanName
  );

  saveSubjects();

  renderAll();

  alert(
    "✅ Chapter added successfully."
  );
}


function renameChapter(index) {

  const subject =
    getSubject(
      currentSubjectName
    );

  if (!subject) return;

  const oldName =
    subject.chapters[index];

  if (!oldName) return;

  const newName =
    prompt(
      "Enter new chapter name:",
      oldName
    );

  if (!newName) return;

  const cleanName =
    newName.trim();

  if (!cleanName) return;

  if (
    cleanName !== oldName &&
    subject.chapters.includes(
      cleanName
    )
  ) {
    alert(
      "या नावाचा chapter आधीपासून आहे."
    );
    return;
  }

  const oldKey =
    getRevisionKey(
      subject.name,
      oldName
    );

  const newKey =
    getRevisionKey(
      subject.name,
      cleanName
    );

  if (data.revisions[oldKey]) {

    data.revisions[newKey] =
      data.revisions[oldKey];

    delete data.revisions[
      oldKey
    ];
  }

  subject.chapters[index] =
    cleanName;

  saveSubjects();
  saveData();

  renderAll();
}


function deleteChapter(index) {

  const subject =
    getSubject(
      currentSubjectName
    );

  if (!subject) return;

  const chapter =
    subject.chapters[index];

  if (!chapter) return;

  const confirmed =
    confirm(
      `Delete "${chapter}"?\n\n` +
      `या chapter चा revision data सुद्धा delete होईल.`
    );

  if (!confirmed) return;

  const key =
    getRevisionKey(
      subject.name,
      chapter
    );

  delete data.revisions[key];

  subject.chapters.splice(
    index,
    1
  );

  saveSubjects();
  saveData();

  renderAll();
}


function moveChapterUp(index) {

  const subject =
    getSubject(
      currentSubjectName
    );

  if (!subject) return;

  if (index <= 0) return;

  const temp =
    subject.chapters[index];

  subject.chapters[index] =
    subject.chapters[index - 1];

  subject.chapters[index - 1] =
    temp;

  saveSubjects();

  renderAll();
}


function moveChapterDown(index) {

  const subject =
    getSubject(
      currentSubjectName
    );

  if (!subject) return;

  if (
    index >=
    subject.chapters.length - 1
  ) {
    return;
  }

  const temp =
    subject.chapters[index];

  subject.chapters[index] =
    subject.chapters[index + 1];

  subject.chapters[index + 1] =
    temp;

  saveSubjects();

  renderAll();
}


/* =========================================================
   CHAPTER MANAGER UI
   ========================================================= */

function addChapterManager() {

  const list =
    document.getElementById(
      "chapterList"
    );

  if (!list) return;

  const existing =
    document.getElementById(
      "chapterManager"
    );

  if (existing) {
    existing.remove();
  }

  const manager =
    document.createElement(
      "div"
    );

  manager.id =
    "chapterManager";

  manager.style.margin =
    "20px 0";

  manager.innerHTML = `
    <button
      class="today-btn"
      onclick="addChapter()"
    >
      ➕ Add Chapter
    </button>
  `;

  list.appendChild(
    manager
  );
}


/* =========================================================
   SUBJECT MANAGEMENT
   ========================================================= */

function addSubject() {

  const name =
    prompt(
      "Enter subject name:"
    );

  if (!name) return;

  const cleanName =
    name.trim();

  if (!cleanName) return;

  if (
    getSubject(cleanName)
  ) {
    alert(
      "हा subject आधीपासून आहे."
    );
    return;
  }

  const icon =
    prompt(
      "Enter an emoji for the subject:",
      "📚"
    ) || "📚";

  subjects.push({
    name: cleanName,
    icon: icon,
    chapters: []
  });

  saveSubjects();

  renderAll();

  alert(
    "✅ Subject added."
  );
}


/* =========================================================
   SUBJECT LIST
   ========================================================= */

function renderSubjects() {

  const list =
    document.getElementById(
      "subjectList"
    );

  if (!list) return;

  list.innerHTML = "";

  subjects.forEach(
    subject => {

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "subject-card";

      const percent =
        getSubjectProgress(
          subject
        );

      card.innerHTML = `
        <div
          onclick="
            openSubjectByName(
              '${escapeJS(subject.name)}'
            )
          "
        >

          <h3>
            ${subject.icon || "📚"}
            ${escapeHTML(subject.name)}
          </h3>

          <p>
            ${subject.chapters.length}
            chapters
          </p>

          <strong>
            ${percent}%
          </strong>

        </div>
      `;

      list.appendChild(
        card
      );
    }
  );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showPage(
  pageId,
  button
) {

  document
    .querySelectorAll(".page")
    .forEach(
      page => {
        page.classList.remove(
          "active"
        );
      }
    );

  const page =
    document.getElementById(
      pageId
    );

  if (page) {
    page.classList.add(
      "active"
    );
  }

  document
    .querySelectorAll(".nav-btn")
    .forEach(
      btn => {
        btn.classList.remove(
          "active"
        );
      }
    );

  if (button) {
    button.classList.add(
      "active"
    );
  }

  if (
    pageId ===
    "todayPage"
  ) {
    renderToday();
  }

  if (
    pageId ===
    "progressPage"
  ) {
    renderProgress();
  }

  if (
    pageId ===
    "homePage"
  ) {
    renderHome();
  }
}


function goHome() {

  currentSubjectName =
    null;

  showPage(
    "homePage",
    null
  );

  renderHome();
}


/* =========================================================
   EXAM COUNTDOWN
   ========================================================= */

function getExamDate() {

  try {
    return localStorage.getItem(
      EXAM_DATE_KEY
    );
  } catch (error) {
    return null;
  }
}


function setExamDate() {

  const current =
    getExamDate() || "";

  const date =
    prompt(
      "Enter HSC Exam Date (YYYY-MM-DD):",
      current
    );

  if (!date) return;

  const parsed =
    parseDate(date);

  if (!parsed) {
    alert(
      "Invalid date."
    );
    return;
  }

  try {
    localStorage.setItem(
      EXAM_DATE_KEY,
      date
    );
  } catch (error) {
    console.error(error);
  }

  renderExamCountdown();
}


function renderExamCountdown() {

  const examDate =
    getExamDate();

  const daysElement =
    document.getElementById(
      "examDays"
    );

  const hoursElement =
    document.getElementById(
      "examHours"
    );

  const minutesElement =
    document.getElementById(
      "examMinutes"
    );

  if (
    !daysElement &&
    !hoursElement &&
    !minutesElement
  ) {
    return;
  }

  if (!examDate) {

    if (daysElement)
      daysElement.textContent = "--";

    if (hoursElement)
      hoursElement.textContent = "--";

    if (minutesElement)
      minutesElement.textContent = "--";

    return;
  }

  const target =
    parseDate(examDate);

  const now =
    new Date();

  const difference =
    target.getTime() -
    now.getTime();

  if (difference <= 0) {

    if (daysElement)
      daysElement.textContent = "0";

    if (hoursElement)
      hoursElement.textContent = "0";

    if (minutesElement)
      minutesElement.textContent = "0";

    return;
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

  if (daysElement)
    daysElement.textContent =
      String(days);

  if (hoursElement)
    hoursElement.textContent =
      String(hours);

  if (minutesElement)
    minutesElement.textContent =
      String(minutes);
}


/* =========================================================
   XP & BADGES
   ========================================================= */

function getBadge() {

  const xp =
    Number(data.xp) || 0;

  if (xp >= 1000)
    return "🏆 Revision Master";

  if (xp >= 500)
    return "🥇 Memory Expert";

  if (xp >= 250)
    return "🥈 Revision Pro";

  if (xp >= 100)
    return "🥉 Consistent Learner";

  if (xp >= 50)
    return "⭐ Rising Learner";

  return "🌱 Beginner";
}


function renderBadges() {

  const badge =
    document.getElementById(
      "badge"
    );

  if (badge) {
    badge.textContent =
      getBadge();
  }

  const xp =
    document.getElementById(
      "xp"
    );

  if (xp) {
    xp.textContent =
      `${data.xp} XP`;
  }

  const streak =
    document.getElementById(
      "streak"
    );

  if (streak) {
    streak.textContent =
      `🔥 ${data.streak}`;
  }
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function enableNotifications() {

  if (
    !("Notification" in window)
  ) {
    alert(
      "या browser मध्ये notifications supported नाहीत."
    );
    return;
  }

  try {

    const permission =
      await Notification.requestPermission();

    if (
      permission === "granted"
    ) {

      new Notification(
        "Revision Rules",
        {
          body:
            "Revision notifications enabled! 🔔"
        }
      );

      checkRevisionNotifications();

    } else {

      alert(
        "Notification permission दिली नाही."
      );
    }

  } catch (error) {

    console.error(
      "Notification error:",
      error
    );
  }
}


function checkRevisionNotifications() {

  if (
    !("Notification" in window)
  ) {
    return;
  }

  if (
    Notification.permission !==
    "granted"
  ) {
    return;
  }

  const due =
    getDueRevisions();

  if (due.length === 0) {
    return;
  }

  due.forEach(item => {

    const key =
      `revision-notified-${getToday()}-${item.subject.name}-${item.chapter}-${item.day}`;

    if (
      localStorage.getItem(key)
    ) {
      return;
    }

    const title =
      item.day === 65
        ? "Final Revision Due! 🎯"
        : "Revision Due Today! 📚";

    new Notification(
      title,
      {
        body:
          `${item.subject.name} — ${item.chapter}\nDay ${item.day}`
      }
    );

    localStorage.setItem(
      key,
      "true"
    );
  });
}


/* =========================================================
   SAFE HTML / JS
   ========================================================= */

function escapeHTML(value) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


function escapeJS(value) {

  return String(value)
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /'/g,
      "\\'"
    )
    .replace(
      /\n/g,
      "\\n"
    )
    .replace(
      /\r/g,
      "\\r"
    );
}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderAll() {

  renderHome();

  renderSubjects();

  renderToday();

  renderProgress();

  renderBadges();

  if (
    currentSubjectName
  ) {
    renderSubject();
  }
}


/* =========================================================
   INITIALIZE APP
   ========================================================= */

function initApp() {

  loadData();

  loadSubjects();

  renderAll();

  /*
    Default Home page
  */

  const homePage =
    document.getElementById(
      "homePage"
    );

  if (homePage) {
    showPage(
      "homePage",
      null
    );
  }

  /*
    Check notifications
    when app is opened.
  */

  checkRevisionNotifications();

  /*
    Countdown refresh
  */

  setInterval(
    renderExamCountdown,
    60000
  );
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.showPage =
  showPage;

window.goHome =
  goHome;

window.openSubjectByName =
  openSubjectByName;

window.startChapter =
  startChapter;

window.completeRevision =
  completeRevision;

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

window.addSubject =
  addSubject;

window.setExamDate =
  setExamDate;

window.enableNotifications =
  enableNotifications;

window.renderSubject =
  renderSubject;

window.renderToday =
  renderToday;

window.renderProgress =
  renderProgress;


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initApp
  );

} else {

  initApp();
}
