/* =========================================================
   REVISION RULES
   HSC SMART REVISION TRACKER
   ---------------------------------------------------------
   Revision System:
   Day 1 → Day 3 → Day 7

   Features:
   - Unlimited chapters
   - Custom chapter names
   - Custom chapter order
   - Add / Delete / Move chapters
   - Progress tracking
   - XP
   - Streak
   - Badges
   - Today's revision
   - HSC countdown
   - LocalStorage
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = {
  storageKey: "revision_rules_data_v3",

  /*
    HSC EXAM DATE

    Change this date whenever the official HSC date is known.

    Format:
    YYYY-MM-DDTHH:MM:SS

    Example:
    "2027-02-10T10:30:00"
  */
  examDate: "2027-02-10T10:30:00"
};


/* =========================================================
   DEFAULT SUBJECTS
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
    id: "mathematics1",
    name: "Mathematics 1",
    icon: "📐",
    chapters: []
  },

  {
    id: "mathematics2",
    name: "Mathematics 2",
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
    icon: "📚",
    chapters: []
  },

  {
    id: "marathi",
    name: "Marathi",
    icon: "📖",
    chapters: []
  }
];


/* =========================================================
   DATA
========================================================= */

let data = loadData();

let currentSubjectId = null;


/* =========================================================
   CREATE DEFAULT DATA
========================================================= */

function createDefaultData() {

  return {
    subjects: JSON.parse(JSON.stringify(DEFAULT_SUBJECTS)),

    revisions: {},

    xp: 0,

    completedDates: [],

    lastRevisionDate: null,

    streak: 0
  };
}


/* =========================================================
   LOAD DATA
========================================================= */

function loadData() {

  try {

    const saved = localStorage.getItem(CONFIG.storageKey);

    if (!saved) {
      return createDefaultData();
    }

    const parsed = JSON.parse(saved);

    if (!parsed.subjects) {
      parsed.subjects = JSON.parse(
        JSON.stringify(DEFAULT_SUBJECTS)
      );
    }

    if (!parsed.revisions) {
      parsed.revisions = {};
    }

    if (typeof parsed.xp !== "number") {
      parsed.xp = 0;
    }

    if (!Array.isArray(parsed.completedDates)) {
      parsed.completedDates = [];
    }

    if (typeof parsed.streak !== "number") {
      parsed.streak = 0;
    }

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
      CONFIG.storageKey,
      JSON.stringify(data)
    );

  } catch (error) {

    console.error("Data saving error:", error);
  }
}


/* =========================================================
   DATE HELPERS
========================================================= */

function getToday() {

  const now = new Date();

  return now.toISOString().split("T")[0];
}


function addDays(dateString, days) {

  const date = new Date(dateString + "T00:00:00");

  date.setDate(date.getDate() + days);

  return date.toISOString().split("T")[0];
}


function isToday(dateString) {

  return dateString === getToday();
}


function datePassed(dateString) {

  if (!dateString) {
    return false;
  }

  return dateString <= getToday();
}


/* =========================================================
   SUBJECT HELPERS
========================================================= */

function getSubject(subjectId) {

  return data.subjects.find(
    subject => subject.id === subjectId
  );
}


function getSubjectByName(name) {

  return data.subjects.find(
    subject => subject.name === name
  );
}


/* =========================================================
   CHAPTER DATA
========================================================= */

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

  const key = subjectId + "|" + chapterId;

  if (!data.revisions[key]) {

    data.revisions[key] = {

      day1: false,

      day3: false,

      day7: false,

      dates: {

        day1: null,

        day3: null,

        day7: null

      }

    };

  }

  return data.revisions[key];
}


/* =========================================================
   GENERATE UNIQUE ID
========================================================= */

function createId(prefix) {

  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 9)
  );
}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(pageId, button) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove("active");

    });


  const page = document.getElementById(pageId);

  if (page) {

    page.classList.add("active");

  }


  document
    .querySelectorAll(".nav-btn")
    .forEach(btn => {

      btn.classList.remove("active");

    });


  if (button) {

    button.classList.add("active");

  }


  if (pageId === "todayPage") {

    renderToday();

  }


  if (pageId === "progressPage") {

    renderProgress();

  }


  if (pageId === "homePage") {

    renderHome();

  }
}


/* =========================================================
   GO HOME
========================================================= */

function goHome() {

  const homeButton =
    document.querySelector(
      ".bottom-nav .nav-btn:first-child"
    );

  showPage("homePage", homeButton);
}


/* =========================================================
   OPEN SUBJECT
========================================================= */

function openSubject(subjectId) {

  const subject = getSubject(subjectId);

  if (!subject) {
    return;
  }

  currentSubjectId = subjectId;

  const title =
    document.getElementById("subjectTitle");

  if (title) {
    title.textContent = subject.name;
  }

  renderSubject();

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove("active");

    });


  const subjectPage =
    document.getElementById("subjectPage");

  if (subjectPage) {

    subjectPage.classList.add("active");

  }
}


/* =========================================================
   OPEN SUBJECT BY NAME
   ---------------------------------------------------------
   Kept for compatibility with old HTML.
========================================================= */

function openSubjectByName(name) {

  const subject = getSubjectByName(name);

  if (!subject) {
    return;
  }

  openSubject(subject.id);
}


/* =========================================================
   HOME RENDER
========================================================= */

function renderHome() {

  renderSubjects();

  updateOverallProgress();

  updateTodayCount();

  updateCountdown();

  updateXP();

  updateStreak();
}


/* =========================================================
   SUBJECT GRID
========================================================= */

function renderSubjects() {

  const grid =
    document.getElementById("subjectGrid");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";


  data.subjects.forEach(subject => {

    const percent =
      getSubjectProgress(subject.id);


    const card =
      document.createElement("div");

    card.className = "subject-card";

    card.style.cursor = "pointer";


    card.innerHTML = `

      <div class="subject-icon">
        ${subject.icon}
      </div>

      <div class="subject-info">

        <h3>
          ${escapeHTML(subject.name)}
        </h3>

        <p>
          ${subject.chapters.length} chapters
        </p>

        <div class="mini-progress">
          <div
            style="width:${percent}%">
          </div>
        </div>

        <strong>
          ${percent}%
        </strong>

      </div>
    `;


    card.addEventListener(
      "click",
      function () {

        openSubject(subject.id);

      }
    );


    grid.appendChild(card);

  });
}


/* =========================================================
   SUBJECT RENDER
========================================================= */

function renderSubject() {

  if (!currentSubjectId) {
    return;
  }

  const subject =
    getSubject(currentSubjectId);

  if (!subject) {
    return;
  }


  const title =
    document.getElementById("subjectTitle");

  if (title) {

    title.textContent =
      subject.icon + " " + subject.name;

  }


  const percent =
    getSubjectProgress(subject.id);


  const percentElement =
    document.getElementById("subjectPercent");

  if (percentElement) {

    percentElement.textContent =
      percent + "%";

  }


  const progressText =
    document.getElementById(
      "subjectProgressText"
    );

  if (progressText) {

    progressText.textContent =
      percent + "%";

  }


  const progressBar =
    document.getElementById(
      "subjectProgressBar"
    );

  if (progressBar) {

    progressBar.style.width =
      percent + "%";

  }


  renderChapterList(subject);
}


/* =========================================================
   CHAPTER LIST
========================================================= */

function renderChapterList(subject) {

  const list =
    document.getElementById("chapterList");

  if (!list) {
    return;
  }


  list.innerHTML = "";


  /*
    ADD CHAPTER BUTTON
  */

  const controls =
    document.createElement("div");

  controls.className =
    "chapter-controls";


  controls.innerHTML = `

    <button
      type="button"
      class="add-chapter-btn">
      ➕ Add Chapter
    </button>

  `;


  controls
    .querySelector(".add-chapter-btn")
    .addEventListener(
      "click",
      function () {

        addChapter(subject.id);

      }
    );


  list.appendChild(controls);


  /*
    NO CHAPTERS
  */

  if (subject.chapters.length === 0) {

    const empty =
      document.createElement("div");

    empty.className =
      "empty-chapters";


    empty.innerHTML = `

      <p>📚 No chapters added yet.</p>

      <p>
        Tap <strong>➕ Add Chapter</strong>
        to add your first chapter.
      </p>

    `;


    list.appendChild(empty);

    return;
  }


  /*
    CHAPTERS
  */

  subject.chapters.forEach(
    (chapter, index) => {

      const card =
        document.createElement("div");

      card.className =
        "chapter-card";


      const revision =
        getRevision(
          subject.id,
          chapter.id
        );


      const completed =
        [
          revision.day1,
          revision.day3,
          revision.day7
        ].filter(Boolean).length;


      const percent =
        Math.round(
          (completed / 3) * 100
        );


      card.innerHTML = `

        <div class="chapter-top">

          <div class="chapter-name">

            <span class="chapter-number">
              ${index + 1}.
            </span>

            ${escapeHTML(chapter.name)}

          </div>

          <div class="chapter-percent">
            ${percent}%
          </div>

        </div>


        <div class="chapter-progress">

          <div
            style="width:${percent}%">
          </div>

        </div>


        <div class="revision-info">

          <div>
            Revision
          </div>

          <div class="revision-status">

            <span
              class="${revision.day1 ? "completed" : ""}">
              ${revision.day1 ? "✅" : "⬜"}
              Day 1
            </span>

            <span
              class="${revision.day3 ? "completed" : ""}">
              ${revision.day3 ? "✅" : "⬜"}
              Day 3
            </span>

            <span
              class="${revision.day7 ? "completed" : ""}">
              ${revision.day7 ? "✅" : "⬜"}
              Day 7
            </span>

          </div>

        </div>


        <div class="revision-buttons">

          ${
            !revision.day1
            ? `
              <button
                type="button"
                class="revision-btn"
                data-revision="day1">
                Day 1
              </button>
            `
            : `
              <button
                type="button"
                class="revision-btn done"
                disabled>
                ✅ Day 1
              </button>
            `
          }


          ${
            revision.day1 && !revision.day3
            ? `
              <button
                type="button"
                class="revision-btn"
                data-revision="day3">
                Day 3
              </button>
            `
            : `
              <button
                type="button"
                class="revision-btn ${revision.day3 ? "done" : ""}"
                ${revision.day3 ? "disabled" : "disabled"}>
                ${revision.day3 ? "✅" : "🔒"}
                Day 3
              </button>
            `
          }


          ${
            revision.day3 && !revision.day7
            ? `
              <button
                type="button"
                class="revision-btn"
                data-revision="day7">
                Day 7
              </button>
            `
            : `
              <button
                type="button"
                class="revision-btn ${revision.day7 ? "done" : ""}"
                disabled>
                ${revision.day7 ? "✅" : "🔒"}
                Day 7
              </button>
            `
          }

        </div>


        <div class="chapter-management">

          <button
            type="button"
            class="small-action edit">
            ✏️ Edit
          </button>

          <button
            type="button"
            class="small-action up">
            ⬆️
          </button>

          <button
            type="button"
            class="small-action down">
            ⬇️
          </button>

          <button
            type="button"
            class="small-action delete">
            🗑️
          </button>

        </div>

      `;


      /*
        REVISION BUTTONS
      */

      card
        .querySelectorAll(
          "[data-revision]"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            function () {

              completeRevision(
                subject.id,
                chapter.id,
                button.dataset.revision
              );

            }
          );

        });


      /*
        EDIT
      */

      card
        .querySelector(".edit")
        .addEventListener(
          "click",
          function () {

            editChapter(
              subject.id,
              chapter.id
            );

          }
        );


      /*
        MOVE UP
      */

      card
        .querySelector(".up")
        .addEventListener(
          "click",
          function () {

            moveChapter(
              subject.id,
              index,
              -1
            );

          }
        );


      /*
        MOVE DOWN
      */

      card
        .querySelector(".down")
        .addEventListener(
          "click",
          function () {

            moveChapter(
              subject.id,
              index,
              1
            );

          }
        );


      /*
        DELETE
      */

      card
        .querySelector(".delete")
        .addEventListener(
          "click",
          function () {

            deleteChapter(
              subject.id,
              chapter.id
            );

          }
        );


      list.appendChild(card);

    }
  );
}


/* =========================================================
   ADD CHAPTER
========================================================= */

function addChapter(subjectId) {

  const subject =
    getSubject(subjectId);

  if (!subject) {
    return;
  }


  const name =
    prompt(
      "Chapter चे नाव टाका:"
    );


  if (name === null) {
    return;
  }


  const cleanName =
    name.trim();


  if (!cleanName) {

    alert(
      "Chapter चे नाव रिकामे ठेवू नका."
    );

    return;
  }


  subject.chapters.push({

    id: createId("chapter"),

    name: cleanName

  });


  saveData();

  renderSubject();

  renderHome();

}


/* =========================================================
   EDIT CHAPTER
========================================================= */

function editChapter(
  subjectId,
  chapterId
) {

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );

  if (!chapter) {
    return;
  }


  const newName =
    prompt(
      "Chapter चे नवीन नाव टाका:",
      chapter.name
    );


  if (newName === null) {
    return;
  }


  const cleanName =
    newName.trim();


  if (!cleanName) {

    alert(
      "Chapter चे नाव रिकामे ठेवता येणार नाही."
    );

    return;
  }


  chapter.name = cleanName;


  saveData();

  renderSubject();

  renderHome();

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


  const confirmed =
    confirm(
      `"${chapter.name}" delete करायचा आहे का?`
    );


  if (!confirmed) {
    return;
  }


  subject.chapters =
    subject.chapters.filter(
      item => item.id !== chapterId
    );


  /*
    Delete revision data too
  */

  const key =
    subjectId + "|" + chapterId;

  delete data.revisions[key];


  saveData();

  renderSubject();

  renderHome();

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

  renderSubject();

}


/* =========================================================
   COMPLETE REVISION
========================================================= */

function completeRevision(
  subjectId,
  chapterId,
  revision
) {

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );

  if (!chapter) {
    return;
  }


  const r =
    getRevision(
      subjectId,
      chapterId
    );


  /*
    Prevent duplicate completion
  */

  if (r[revision]) {
    return;
  }


  /*
    Check revision order
  */

  if (
    revision === "day3" &&
    !r.day1
  ) {

    alert(
      "आधी Day 1 revision पूर्ण करा."
    );

    return;
  }


  if (
    revision === "day7" &&
    !r.day3
  ) {

    alert(
      "आधी Day 3 revision पूर्ण करा."
    );

    return;
  }


  /*
    Check due date
  */

  const today =
    getToday();


  if (revision === "day3") {

    const due =
      r.dates.day3;


    if (
      due &&
      due > today
    ) {

      alert(
        "Day 3 revision अजून due झालेली नाही.\n\nDue date: " +
        due
      );

      return;
    }
  }


  if (revision === "day7") {

    const due =
      r.dates.day7;


    if (
      due &&
      due > today
    ) {

      alert(
        "Day 7 revision अजून due झालेली नाही.\n\nDue date: " +
        due
      );

      return;
    }
  }


  /*
    Mark complete
  */

  r[revision] = true;

  r.dates[revision] = today;


  /*
    Set next revision date
  */

  if (revision === "day1") {

    r.dates.day3 =
      addDays(today, 2);

    r.dates.day7 =
      addDays(today, 6);

  }


  if (revision === "day3") {

    /*
      Day 7 remains based on Day 1.
      If Day 7 date doesn't exist,
      create it.
    */

    if (!r.dates.day7) {

      r.dates.day7 =
        addDays(today, 4);

    }

  }


  /*
    XP
  */

  data.xp += 10;


  /*
    Streak
  */

  updateStreakAfterRevision();


  /*
    Save
  */

  saveData();


  /*
    Refresh UI
  */

  renderAll();


  /*
    Success message
  */

  alert(
    "🎉 " +
    chapter.name +
    "\n\n" +
    revisionLabel(revision) +
    " Revision Complete!\n\n" +
    "+10 XP ⭐"
  );
}


/* =========================================================
   REVISION LABEL
========================================================= */

function revisionLabel(revision) {

  if (revision === "day1") {
    return "Day 1";
  }

  if (revision === "day3") {
    return "Day 3";
  }

  if (revision === "day7") {
    return "Day 7";
  }

  return revision;
}


/* =========================================================
   SUBJECT PROGRESS
========================================================= */

function getSubjectProgress(subjectId) {

  const subject =
    getSubject(subjectId);

  if (
    !subject ||
    subject.chapters.length === 0
  ) {

    return 0;
  }


  let total = 0;

  let completed = 0;


  subject.chapters.forEach(
    chapter => {

      total += 3;


      const r =
        getRevision(
          subject.id,
          chapter.id
        );


      if (r.day1) {
        completed++;
      }

      if (r.day3) {
        completed++;
      }

      if (r.day7) {
        completed++;
      }

    }
  );


  if (total === 0) {
    return 0;
  }


  return Math.round(
    (completed / total) * 100
  );
}


/* =========================================================
   OVERALL PROGRESS
========================================================= */

function getOverallProgress() {

  let total = 0;

  let completed = 0;


  data.subjects.forEach(
    subject => {

      subject.chapters.forEach(
        chapter => {

          total += 3;


          const r =
            getRevision(
              subject.id,
              chapter.id
            );


          if (r.day1) {
            completed++;
          }

          if (r.day3) {
            completed++;
          }

          if (r.day7) {
            completed++;
          }

        }
      );

    }
  );


  if (total === 0) {
    return 0;
  }


  return Math.round(
    (completed / total) * 100
  );
}


/* =========================================================
   UPDATE OVERALL PROGRESS
========================================================= */

function updateOverallProgress() {

  const percent =
    getOverallProgress();


  const element =
    document.getElementById(
      "overallProgress"
    );


  if (element) {

    element.textContent =
      percent + "%";

  }
}


/* =========================================================
   TODAY'S REVISION
========================================================= */

function getTodayRevisions() {

  const result = [];

  const today =
    getToday();


  data.subjects.forEach(
    subject => {

      subject.chapters.forEach(
        chapter => {

          const r =
            getRevision(
              subject.id,
              chapter.id
            );


          /*
            Day 1:
            It is immediately available
            only if not completed.
          */

          if (
            !r.day1
          ) {

            result.push({

              subjectId: subject.id,

              subjectName: subject.name,

              subjectIcon: subject.icon,

              chapterId: chapter.id,

              chapterName: chapter.name,

              revision: "day1"

            });

            return;
          }


          /*
            Day 3
          */

          if (
            r.day1 &&
            !r.day3 &&
            r.dates.day3 &&
            r.dates.day3 <= today
          ) {

            result.push({

              subjectId: subject.id,

              subjectName: subject.name,

              subjectIcon: subject.icon,

              chapterId: chapter.id,

              chapterName: chapter.name,

              revision: "day3"

            });

            return;
          }


          /*
            Day 7
          */

          if (
            r.day3 &&
            !r.day7 &&
            r.dates.day7 &&
            r.dates.day7 <= today
          ) {

            result.push({

              subjectId: subject.id,

              subjectName: subject.name,

              subjectIcon: subject.icon,

              chapterId: chapter.id,

              chapterName: chapter.name,

              revision: "day7"

            });

          }

        }
      );

    }
  );


  return result;
}


/* =========================================================
   RENDER TODAY
========================================================= */

function renderToday() {

  const list =
    document.getElementById(
      "todayList"
    );


  if (!list) {
    return;
  }


  list.innerHTML = "";


  const revisions =
    getTodayRevisions();


  if (revisions.length === 0) {

    list.innerHTML = `

      <div class="empty-today">

        <h2>🎉 All caught up!</h2>

        <p>
          आजची कोणतीही revision बाकी नाही.
        </p>

      </div>

    `;

    return;
  }


  revisions.forEach(
    item => {

      const card =
        document.createElement("div");


      card.className =
        "today-card";


      card.innerHTML = `

        <h3>
          ${item.subjectIcon}
          ${escapeHTML(item.subjectName)}
        </h3>

        <p>
          ${escapeHTML(item.chapterName)}
        </p>

        <div class="today-revision-label">
          🔄 ${revisionLabel(item.revision)}
        </div>

        <button
          type="button"
          class="today-btn">
          Complete Revision
        </button>

      `;


      card
        .querySelector(".today-btn")
        .addEventListener(
          "click",
          function () {

            completeRevision(
              item.subjectId,
              item.chapterId,
              item.revision
            );

          }
        );


      list.appendChild(card);

    }
  );
}


/* =========================================================
   TODAY COUNT
========================================================= */

function updateTodayCount() {

  const element =
    document.getElementById(
      "todayCount"
    );


  if (!element) {
    return;
  }


  const count =
    getTodayRevisions().length;


  element.textContent =
    count === 1
      ? "1 revision today"
      : count + " revisions today";
}


/* =========================================================
   PROGRESS PAGE
========================================================= */

function renderProgress() {

  const list =
    document.getElementById(
      "progressList"
    );


  if (!list) {
    return;
  }


  list.innerHTML = "";


  data.subjects.forEach(
    subject => {

      const percent =
        getSubjectProgress(
          subject.id
        );


      const card =
        document.createElement("div");


      card.className =
        "progress-card";


      card.innerHTML = `

        <div class="progress-info">

          <strong>
            ${subject.icon}
            ${escapeHTML(subject.name)}
          </strong>

          <span>
            ${percent}%
          </span>

        </div>

        <div class="large-progress">

          <div
            style="width:${percent}%">
          </div>

        </div>

        <p>
          ${subject.chapters.length}
          chapters
        </p>

      `;


      list.appendChild(card);

    }
  );
}


/* =========================================================
   XP
========================================================= */

function updateXP() {

  const xp =
    data.xp;


  const text =
    document.getElementById(
      "xpText"
    );


  if (text) {

    text.textContent =
      xp + " XP";

  }


  const bar =
    document.getElementById(
      "xpBar"
    );


  if (bar) {

    /*
      Every 100 XP = full bar.
    */

    const percentage =
      xp % 100;


    bar.style.width =
      percentage + "%";

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


  container.innerHTML = "";


  const xp =
    data.xp;


  const badges = [];


  if (xp >= 10) {

    badges.push(
      "🌱 First Revision"
    );

  }


  if (xp >= 50) {

    badges.push(
      "🔥 Getting Started"
    );

  }


  if (xp >= 100) {

    badges.push(
      "⭐ 100 XP"
    );

  }


  if (xp >= 250) {

    badges.push(
      "🏆 Revision Pro"
    );

  }


  if (xp >= 500) {

    badges.push(
      "👑 Memory Master"
    );

  }


  if (data.streak >= 3) {

    badges.push(
      "🔥 3 Day Streak"
    );

  }


  if (data.streak >= 7) {

    badges.push(
      "💎 7 Day Streak"
    );

  }


  if (badges.length === 0) {

    container.innerHTML =
      "<span>Complete revisions to unlock badges 🏅</span>";

    return;
  }


  badges.forEach(
    badge => {

      const element =
        document.createElement("span");


      element.className =
        "badge";


      element.textContent =
        badge;


      container.appendChild(
        element
      );

    }
  );
}


/* =========================================================
   STREAK
========================================================= */

function updateStreakAfterRevision() {

  const today =
    getToday();


  if (
    !data.completedDates.includes(today)
  ) {

    data.completedDates.push(today);

  }


  data.completedDates.sort();


  const yesterday =
    addDays(today, -1);


  if (
    data.lastRevisionDate === yesterday
  ) {

    data.streak++;

  }
  else if (
    data.lastRevisionDate !== today
  ) {

    data.streak = 1;

  }


  data.lastRevisionDate =
    today;
}


/* =========================================================
   DISPLAY STREAK
========================================================= */

function updateStreak() {

  const element =
    document.getElementById(
      "streakCount"
    );


  if (element) {

    element.textContent =
      data.streak || 0;

  }
}


/* =========================================================
   COUNTDOWN
========================================================= */

function updateCountdown() {

  const examDate =
    new Date(CONFIG.examDate);


  const now =
    new Date();


  const difference =
    examDate.getTime() -
    now.getTime();


  const days =
    document.getElementById(
      "daysLeft"
    );


  const hours =
    document.getElementById(
      "hoursLeft"
    );


  const minutes =
    document.getElementById(
      "minutesLeft"
    );


  if (
    !days ||
    !hours ||
    !minutes
  ) {

    return;
  }


  if (difference <= 0) {

    days.textContent = "0";

    hours.textContent = "0";

    minutes.textContent = "0";

    return;
  }


  const totalMinutes =
    Math.floor(
      difference / 60000
    );


  const d =
    Math.floor(
      totalMinutes / 1440
    );


  const h =
    Math.floor(
      (totalMinutes % 1440) / 60
    );


  const m =
    totalMinutes % 60;


  days.textContent = d;

  hours.textContent = h;

  minutes.textContent = m;
}


/* =========================================================
   ESCAPE HTML
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


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {

  renderHome();

  renderToday();

  renderProgress();


  if (currentSubjectId) {

    renderSubject();

  }
}


/* =========================================================
   INITIALIZE
========================================================= */

function initializeApp() {

  /*
    Make sure all subjects exist.
  */

  DEFAULT_SUBJECTS.forEach(
    defaultSubject => {

      const exists =
        data.subjects.some(
          subject =>
            subject.id ===
            defaultSubject.id
        );


      if (!exists) {

        data.subjects.push(
          JSON.parse(
            JSON.stringify(
              defaultSubject
            )
          )
        );

      }

    }
  );


  saveData();


  renderAll();


  /*
    Update countdown every minute.
  */

  updateCountdown();


  setInterval(
    updateCountdown,
    60000
  );


  /*
    Keep today's count fresh.
  */

  setInterval(
    updateTodayCount,
    60000
  );
}


/* =========================================================
   GLOBAL FUNCTIONS
   ---------------------------------------------------------
   Important because index.html uses onclick=""
========================================================= */

window.showPage =
  showPage;

window.goHome =
  goHome;

window.openSubject =
  openSubject;

window.openSubjectByName =
  openSubjectByName;

window.completeRevision =
  completeRevision;

window.addChapter =
  addChapter;

window.editChapter =
  editChapter;

window.deleteChapter =
  deleteChapter;

window.moveChapter =
  moveChapter;


/* =========================================================
   START APP
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );

}
else {

  initializeApp();

}
