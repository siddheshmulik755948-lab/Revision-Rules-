/* =========================================================
   REVISION RULES
   MAIN JAVASCRIPT
========================================================= */


/* =========================================================
   REVISION SYSTEM
========================================================= */

/*
   Day 1  = Start Chapter
   Day 2  = Revision 1
   Day 4  = Revision 2
   Day 8  = Revision 3
   Day 16 = Revision 4
   Day 32 = Revision 5
   Day 65 = Final Revision
*/

const REVISION_SCHEDULE = [
  {
    key: "day1",
    label: "Day 1",
    title: "Start Chapter",
    offset: 0
  },
  {
    key: "day2",
    label: "Day 2",
    title: "Revision 1",
    offset: 1
  },
  {
    key: "day4",
    label: "Day 4",
    title: "Revision 2",
    offset: 3
  },
  {
    key: "day8",
    label: "Day 8",
    title: "Revision 3",
    offset: 7
  },
  {
    key: "day16",
    label: "Day 16",
    title: "Revision 4",
    offset: 15
  },
  {
    key: "day32",
    label: "Day 32",
    title: "Revision 5",
    offset: 31
  },
  {
    key: "day65",
    label: "Day 65",
    title: "Final Revision",
    offset: 64
  }
];


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "revision_rules_v2";


/* =========================================================
   DEFAULT DATA
========================================================= */

const DEFAULT_DATA = {
  subjects: [],
  revisions: {},
  xp: 0,
  streak: 0,
  lastRevisionDate: null,
  examDate: null
};


let data = loadData();


/* =========================================================
   LOAD DATA
========================================================= */

function loadData() {

  try {

    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(DEFAULT_DATA);
    }

    const parsed =
      JSON.parse(saved);

    return {
      ...structuredClone(DEFAULT_DATA),
      ...parsed
    };

  } catch (error) {

    console.error(
      "Could not load saved data:",
      error
    );

    return structuredClone(DEFAULT_DATA);
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

    console.error(
      "Could not save data:",
      error
    );

    showToast(
      "Data save होऊ शकला नाही."
    );
  }
}


/* =========================================================
   SAFE ID
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
   DATE HELPERS
========================================================= */

function getTodayKey() {

  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(now.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(now.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function addDays(dateKey, days) {

  const date =
    new Date(dateKey + "T12:00:00");

  date.setDate(
    date.getDate() + days
  );

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function formatDate(dateKey) {

  if (!dateKey) {
    return "";
  }

  const date =
    new Date(dateKey + "T12:00:00");

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
   SUBJECT HELPERS
========================================================= */

function getSubject(subjectId) {

  return data.subjects.find(
    subject =>
      subject.id === subjectId
  );
}


/* =========================================================
   CHAPTER HELPERS
========================================================= */

function getChapter(subjectId, chapterId) {

  const subject =
    getSubject(subjectId);

  if (!subject) {
    return null;
  }

  return subject.chapters.find(
    chapter =>
      chapter.id === chapterId
  );
}


/* =========================================================
   REVISION RECORD
========================================================= */

function getRevisionRecord(
  subjectId,
  chapterId
) {

  const key =
    subjectId + "|" + chapterId;

  if (!data.revisions[key]) {

    data.revisions[key] = {
      day1: false,
      day2: false,
      day4: false,
      day8: false,
      day16: false,
      day32: false,
      day65: false,

      dates: {}
    };

  }

  return data.revisions[key];
}


/* =========================================================
   FIND NEXT REVISION
========================================================= */

function getNextRevision(
  subjectId,
  chapterId
) {

  const record =
    getRevisionRecord(
      subjectId,
      chapterId
    );

  for (
    const stage
    of REVISION_SCHEDULE
  ) {

    if (!record[stage.key]) {

      return {
        stage,
        record
      };

    }

  }

  return null;
}


/* =========================================================
   IS REVISION DUE TODAY?
========================================================= */

function isDueToday(
  subjectId,
  chapterId
) {

  const next =
    getNextRevision(
      subjectId,
      chapterId
    );

  if (!next) {
    return false;
  }

  const today =
    getTodayKey();

  return (
    next.record.dates[next.stage.key] ===
    today
  );
}


/* =========================================================
   GET ALL DUE REVISION
========================================================= */

function getDueRevisions() {

  const today =
    getTodayKey();

  const result = [];

  data.subjects.forEach(
    subject => {

      subject.chapters.forEach(
        chapter => {

          const record =
            getRevisionRecord(
              subject.id,
              chapter.id
            );

          REVISION_SCHEDULE.forEach(
            stage => {

              if (
                !record[stage.key] &&
                record.dates[stage.key] === today
              ) {

                result.push({
                  subject,
                  chapter,
                  stage
                });

              }

            }
          );

        }
      );

    }
  );

  return result;
}


/* =========================================================
   ADD SUBJECT
========================================================= */

function addSubject() {

  const input =
    document.getElementById(
      "subjectInput"
    );

  if (!input) {
    return;
  }

  const name =
    input.value.trim();

  if (!name) {

    showToast(
      "Subject चे नाव टाका."
    );

    input.focus();

    return;
  }


  const subject = {

    id: createId("subject"),

    name: name,

    icon: "📚",

    chapters: []

  };


  data.subjects.push(subject);

  saveData();

  input.value = "";

  renderAll();

  showToast(
    `${name} subject तयार झाला.`
  );
}


/* =========================================================
   ADD CHAPTER
========================================================= */

function addChapter(subjectId) {

  const input =
    document.getElementById(
      "chapterInput_" + subjectId
    );

  if (!input) {
    return;
  }

  const name =
    input.value.trim();

  if (!name) {

    showToast(
      "Chapter चे नाव टाका."
    );

    input.focus();

    return;
  }


  const subject =
    getSubject(subjectId);

  if (!subject) {
    return;
  }


  const chapter = {

    id: createId("chapter"),

    name: name

  };


  subject.chapters.push(
    chapter
  );

  saveData();

  input.value = "";

  renderAll();

  showToast(
    `Chapter "${name}" add झाला.`
  );
}


/* =========================================================
   RENAME SUBJECT
========================================================= */

function renameSubject(subjectId) {

  const subject =
    getSubject(subjectId);

  if (!subject) {
    return;
  }


  const newName =
    prompt(
      "Subject चे नवीन नाव:",
      subject.name
    );


  if (
    newName === null
  ) {
    return;
  }


  const name =
    newName.trim();


  if (!name) {

    showToast(
      "नाव रिकामे ठेवता येणार नाही."
    );

    return;
  }


  subject.name = name;

  saveData();

  renderAll();

  showToast(
    "Subject rename झाला."
  );
}


/* =========================================================
   RENAME CHAPTER
========================================================= */

function renameChapter(
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
      "Chapter चे नवीन नाव:",
      chapter.name
    );


  if (
    newName === null
  ) {
    return;
  }


  const name =
    newName.trim();


  if (!name) {

    showToast(
      "नाव रिकामे ठेवता येणार नाही."
    );

    return;
  }


  chapter.name = name;

  saveData();

  renderAll();

  showToast(
    "Chapter rename झाला."
  );
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


  const confirmed =
    confirm(
      `तुला "${subject.name}" पूर्ण Subject delete करायचा आहे का?`
    );


  if (!confirmed) {
    return;
  }


  subject.chapters.forEach(
    chapter => {

      const key =
        subject.id +
        "|" +
        chapter.id;

      delete data.revisions[key];

    }
  );


  data.subjects =
    data.subjects.filter(
      item =>
        item.id !== subjectId
    );


  saveData();

  renderAll();

  showToast(
    "Subject delete झाला."
  );
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
      item =>
        item.id !== chapterId
    );


  delete data.revisions[
    subjectId + "|" + chapterId
  ];


  saveData();

  renderAll();

  showToast(
    "Chapter delete झाला."
  );
}


/* =========================================================
   MOVE CHAPTER
========================================================= */

function moveChapter(
  subjectId,
  chapterId,
  direction
) {

  const subject =
    getSubject(subjectId);

  if (!subject) {
    return;
  }


  const index =
    subject.chapters.findIndex(
      chapter =>
        chapter.id === chapterId
    );


  if (index === -1) {
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
   START / COMPLETE REVISION
========================================================= */

function completeRevision(
  subjectId,
  chapterId,
  revisionKey
) {

  const subject =
    getSubject(subjectId);

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );


  if (!subject || !chapter) {

    showToast(
      "Chapter सापडला नाही."
    );

    return;
  }


  const stage =
    REVISION_SCHEDULE.find(
      item =>
        item.key === revisionKey
    );


  if (!stage) {

    showToast(
      "Revision stage सापडला नाही."
    );

    return;
  }


  const record =
    getRevisionRecord(
      subjectId,
      chapterId
    );


  if (record[revisionKey]) {

    showToast(
      "ही revision आधीच complete आहे."
    );

    return;
  }


  /* Day 1 starts the revision cycle */

  if (
    revisionKey !== "day1"
  ) {

    const previousIndex =
      REVISION_SCHEDULE.findIndex(
        item =>
          item.key === revisionKey
      );

    const previous =
      REVISION_SCHEDULE[
        previousIndex - 1
      ];


    if (
      previous &&
      !record[previous.key]
    ) {

      showToast(
        `आधी ${previous.label} complete कर.`
      );

      return;
    }

  }


  const today =
    getTodayKey();


  record[revisionKey] = true;

  record.dates[revisionKey] =
    today;


  /*
    After completing a revision,
    the next revision date is
    automatically calculated.
  */

  const currentIndex =
    REVISION_SCHEDULE.findIndex(
      item =>
        item.key === revisionKey
    );


  const next =
    REVISION_SCHEDULE[
      currentIndex + 1
    ];


  if (next) {

    record.dates[next.key] =
      addDays(
        today,
        next.offset -
        stage.offset
      );

  }


  data.xp += 10;


  updateStreak();


  saveData();

  renderAll();

  showToast(
    `✅ ${stage.title} complete! +10 XP`
  );
}


/* =========================================================
   STREAK
========================================================= */

function updateStreak() {

  const today =
    getTodayKey();


  if (
    data.lastRevisionDate === today
  ) {

    return;
  }


  if (
    !data.lastRevisionDate
  ) {

    data.streak = 1;

  } else {

    const yesterday =
      addDays(
        today,
        -1
      );


    if (
      data.lastRevisionDate ===
      yesterday
    ) {

      data.streak += 1;

    } else {

      data.streak = 1;

    }

  }


  data.lastRevisionDate =
    today;
}


/* =========================================================
   SUBJECT PROGRESS
========================================================= */

function getSubjectProgress(
  subject
) {

  if (
    subject.chapters.length === 0
  ) {

    return 0;
  }


  let total =
    subject.chapters.length *
    REVISION_SCHEDULE.length;


  let done = 0;


  subject.chapters.forEach(
    chapter => {

      const record =
        getRevisionRecord(
          subject.id,
          chapter.id
        );


      REVISION_SCHEDULE.forEach(
        stage => {

          if (
            record[stage.key]
          ) {

            done++;
          }

        }
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


  data.subjects.forEach(
    subject => {

      subject.chapters.forEach(
        chapter => {

          total +=
            REVISION_SCHEDULE.length;


          const record =
            getRevisionRecord(
              subject.id,
              chapter.id
            );


          REVISION_SCHEDULE.forEach(
            stage => {

              if (
                record[stage.key]
              ) {

                done++;

              }

            }
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
   SHOW PAGE
========================================================= */

function showPage(
  pageId,
  button
) {

  const page =
    document.getElementById(
      pageId
    );


  if (!page) {

    console.error(
      "Page not found:",
      pageId
    );

    showToast(
      "Page सापडला नाही."
    );

    return;
  }


  document
    .querySelectorAll(".page")
    .forEach(
      item => {

        item.classList.remove(
          "active"
        );

      }
    );


  page.classList.add(
    "active"
  );


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
    pageId === "revisionPage"
  ) {

    renderTodayRevisions();

  }


  if (
    pageId === "progressPage"
  ) {

    renderProgress();

  }


  if (
    pageId === "managePage"
  ) {

    renderManage();

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   RENDER HOME
========================================================= */

function renderHome() {

  const percent =
    getOverallProgress();


  const percentElement =
    document.getElementById(
      "overallPercent"
    );


  if (percentElement) {

    percentElement.textContent =
      percent + "%";

  }


  const subjectsContainer =
    document.getElementById(
      "homeSubjects"
    );


  if (!subjectsContainer) {
    return;
  }


  subjectsContainer.innerHTML = "";


  if (
    data.subjects.length === 0
  ) {

    subjectsContainer.innerHTML = `
      <div class="white-card">
        <p class="empty-text">
          अजून कोणताही Subject नाही.
          ⚙️ Manage मध्ये जाऊन Subject add कर.
        </p>
      </div>
    `;

  } else {

    data.subjects.forEach(
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
          "subject-home-card";


        card.innerHTML = `
          <h3>
            ${escapeHTML(subject.icon)}
            ${escapeHTML(subject.name)}
          </h3>

          <p>
            ${subject.chapters.length}
            chapters • ${percent}% complete
          </p>

          <div class="mini-progress">
            <div
              class="mini-progress-fill"
              style="width:${percent}%"
            ></div>
          </div>
        `;


        card.addEventListener(
          "click",
          () => {

            showPage(
              "managePage",
              document.querySelectorAll(
                ".nav-btn"
              )[3]
            );

          }
        );


        subjectsContainer.appendChild(
          card
        );

      }
    );

  }


  const due =
    getDueRevisions();


  const count =
    document.getElementById(
      "todayRevisionCount"
    );


  if (count) {

    count.textContent =
      `${due.length} revisions today`;

  }


  updateXP();

  updateStreakDisplay();

  updateExamCountdown();
}


/* =========================================================
   RENDER TODAY REVISIONS
========================================================= */

function renderTodayRevisions() {

  const list =
    document.getElementById(
      "todayRevisionList"
    );


  if (!list) {
    return;
  }


  list.innerHTML = "";


  const due =
    getDueRevisions();


  if (due.length === 0) {

    list.innerHTML = `
      <div class="white-card">
        <p class="empty-text">
          🎉 आज कोणतीही revision due नाही.
          <br><br>
          नवीन chapter सुरू करायचा असल्यास
          Manage मध्ये जाऊन chapter तयार कर.
        </p>
      </div>
    `;

    return;
  }


  due.forEach(
    item => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "revision-card";


      card.innerHTML = `
        <span class="revision-stage">
          ${escapeHTML(item.stage.label)}
          •
          ${escapeHTML(item.stage.title)}
        </span>

        <h3>
          ${escapeHTML(item.subject.icon)}
          ${escapeHTML(item.subject.name)}
        </h3>

        <p>
          ${escapeHTML(item.chapter.name)}
        </p>

        <button
          class="revision-complete-btn"
          type="button"
          data-subject="${item.subject.id}"
          data-chapter="${item.chapter.id}"
          data-revision="${item.stage.key}"
        >
          Complete ${escapeHTML(item.stage.title)}
        </button>
      `;


      const button =
        card.querySelector(
          ".revision-complete-btn"
        );


      button.addEventListener(
        "click",
        () => {

          completeRevision(
            item.subject.id,
            item.chapter.id,
            item.stage.key
          );

        }
      );


      list.appendChild(card);

    }
  );
}


/* =========================================================
   RENDER PROGRESS
========================================================= */

function renderProgress() {

  const overall =
    getOverallProgress();


  const text =
    document.getElementById(
      "progressOverallText"
    );


  const bar =
    document.getElementById(
      "progressOverallBar"
    );


  if (text) {
    text.textContent =
      overall + "%";
  }


  if (bar) {
    bar.style.width =
      overall + "%";
  }


  const container =
    document.getElementById(
      "progressSubjects"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (
    data.subjects.length === 0
  ) {

    container.innerHTML = `
      <div class="white-card">
        <p class="empty-text">
          अजून progress दाखवण्यासाठी
          subjects/chapters नाहीत.
        </p>
      </div>
    `;

    return;
  }


  data.subjects.forEach(
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
        "progress-subject-card";


      let chaptersHTML = "";


      subject.chapters.forEach(
        chapter => {

          const record =
            getRevisionRecord(
              subject.id,
              chapter.id
            );


          const completed =
            REVISION_SCHEDULE.filter(
              stage =>
                record[stage.key]
            ).length;


          const chapterPercent =
            Math.round(
              (
                completed /
                REVISION_SCHEDULE.length
              ) * 100
            );


          chaptersHTML += `
            <div class="chapter-progress-row">

              <span>
                ${escapeHTML(chapter.name)}
              </span>

              <strong>
                ${chapterPercent}%
              </strong>

            </div>

            <div class="mini-progress">

              <div
                class="mini-progress-fill"
                style="width:${chapterPercent}%"
              ></div>

            </div>
          `;

        }
      );


      if (!chaptersHTML) {

        chaptersHTML = `
          <p class="empty-text">
            No chapters yet.
          </p>
        `;

      }


      card.innerHTML = `

        <div class="progress-subject-header">

          <h3>
            ${escapeHTML(subject.icon)}
            ${escapeHTML(subject.name)}
          </h3>

          <strong>
            ${percent}%
          </strong>

        </div>

        <div class="mini-progress">

          <div
            class="mini-progress-fill"
            style="width:${percent}%"
          ></div>

        </div>

        <div class="chapter-progress-list">

          ${chaptersHTML}

        </div>

      `;


      container.appendChild(card);

    }
  );
}


/* =========================================================
   RENDER MANAGE
========================================================= */

function renderManage() {

  const container =
    document.getElementById(
      "manageSubjects"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (
    data.subjects.length === 0
  ) {

    container.innerHTML = `
      <div class="white-card">
        <p class="empty-text">
          📚 अजून Subject नाही.
          <br><br>
          वरून तुमचा पहिला Subject add करा.
        </p>
      </div>
    `;

    return;
  }


  data.subjects.forEach(
    subject => {

      const subjectCard =
        document.createElement(
          "div"
        );


      subjectCard.className =
        "manage-subject";


      let chaptersHTML = "";


      subject.chapters.forEach(
        (chapter, index) => {

          chaptersHTML += `

            <div class="manage-chapter">

              <div class="chapter-name">

                ${index + 1}.
                ${escapeHTML(chapter.name)}

              </div>

              <div class="chapter-actions">

                <button
                  class="icon-btn"
                  type="button"
                  title="Move Up"
                  onclick="moveChapter(
                    '${subject.id}',
                    '${chapter.id}',
                    -1
                  )"
                >
                  ↑
                </button>

                <button
                  class="icon-btn"
                  type="button"
                  title="Move Down"
                  onclick="moveChapter(
                    '${subject.id}',
                    '${chapter.id}',
                    1
                  )"
                >
                  ↓
                </button>

                <button
                  class="icon-btn"
                  type="button"
                  title="Rename"
                  onclick="renameChapter(
                    '${subject.id}',
                    '${chapter.id}'
                  )"
                >
                  ✏️
                </button>

                <button
                  class="icon-btn danger"
                  type="button"
                  title="Delete"
                  onclick="deleteChapter(
                    '${subject.id}',
                    '${chapter.id}'
                  )"
                >
                  🗑️
                </button>

              </div>

            </div>

          `;

        }
      );


      if (!chaptersHTML) {

        chaptersHTML = `
          <p class="empty-text">
            या Subject मध्ये अजून chapter नाही.
          </p>
        `;

      }


      subjectCard.innerHTML = `

        <div class="manage-subject-header">

          <div class="manage-subject-title">

            <h3>
              ${escapeHTML(subject.icon)}
              ${escapeHTML(subject.name)}
            </h3>

          </div>

          <div class="subject-actions">

            <button
              class="icon-btn"
              type="button"
              title="Rename Subject"
              onclick="renameSubject(
                '${subject.id}'
              )"
            >
              ✏️
            </button>

            <button
              class="icon-btn danger"
              type="button"
              title="Delete Subject"
              onclick="deleteSubject(
                '${subject.id}'
              )"
            >
              🗑️
            </button>

          </div>

        </div>


        <div class="chapter-list">

          ${chaptersHTML}

        </div>


        <div class="add-chapter-box">

          <input
            id="chapterInput_${subject.id}"
            type="text"
            placeholder="New chapter name"
            maxlength="120"
          >

          <button
            class="primary-btn"
            type="button"
            onclick="addChapter(
              '${subject.id}'
            )"
          >
            + Add
          </button>

        </div>

      `;


      container.appendChild(
        subjectCard
      );

    }
  );
}


/* =========================================================
   XP
========================================================= */

function updateXP() {

  const xp =
    Number(data.xp) || 0;


  const xpElement =
    document.getElementById(
      "xpValue"
    );


  if (xpElement) {

    xpElement.textContent =
      xp + " XP";

  }


  const fill =
    document.getElementById(
      "xpProgress"
    );


  if (fill) {

    const percentage =
      xp % 100;

    fill.style.width =
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
      "badgesContainer"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  const badges = [];


  if (
    data.xp >= 10
  ) {

    badges.push(
      "🌱 First Revision"
    );

  }


  if (
    data.xp >= 50
  ) {

    badges.push(
      "🔥 5 Revisions"
    );

  }


  if (
    data.xp >= 100
  ) {

    badges.push(
      "⭐ 100 XP"
    );

  }


  if (
    data.xp >= 250
  ) {

    badges.push(
      "🏆 Revision Master"
    );

  }


  if (
    data.streak >= 7
  ) {

    badges.push(
      "🔥 7 Day Streak"
    );

  }


  if (
    badges.length === 0
  ) {

    container.innerHTML = `
      <span class="muted">
        Complete revisions to unlock badges.
      </span>
    `;

    return;
  }


  badges.forEach(
    badgeText => {

      const badge =
        document.createElement(
          "span"
        );


      badge.className =
        "badge";


      badge.textContent =
        badgeText;


      container.appendChild(
        badge
      );

    }
  );
}


/* =========================================================
   STREAK DISPLAY
========================================================= */

function updateStreakDisplay() {

  const element =
    document.getElementById(
      "streakValue"
    );


  if (element) {

    element.textContent =
      data.streak || 0;

  }
}


/* =========================================================
   EXAM DATE
========================================================= */

function setExamDate() {

  const current =
    data.examDate || "";


  const input =
    prompt(
      "HSC Exam Date टाका.\nFormat: YYYY-MM-DD",
      current
    );


  if (
    input === null
  ) {
    return;
  }


  const value =
    input.trim();


  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {

    showToast(
      "Date format चुकीचा आहे. YYYY-MM-DD वापरा."
    );

    return;
  }


  const test =
    new Date(
      value + "T00:00:00"
    );


  if (
    Number.isNaN(
      test.getTime()
    )
  ) {

    showToast(
      "Valid date टाका."
    );

    return;
  }


  data.examDate =
    value;


  saveData();

  updateExamCountdown();

  showToast(
    "Exam date save झाली."
  );
}


/* =========================================================
   EXAM COUNTDOWN
========================================================= */

function updateExamCountdown() {

  const days =
    document.getElementById(
      "countDays"
    );

  const hours =
    document.getElementById(
      "countHours"
    );

  const minutes =
    document.getElementById(
      "countMinutes"
    );

  const text =
    document.getElementById(
      "examDateText"
    );


  if (
    !days ||
    !hours ||
    !minutes ||
    !text
  ) {

    return;
  }


  if (!data.examDate) {

    days.textContent = "--";
    hours.textContent = "--";
    minutes.textContent = "--";

    text.textContent =
      "Exam date not set";

    return;
  }


  const exam =
    new Date(
      data.examDate +
      "T00:00:00"
    );


  const now =
    new Date();


  const difference =
    exam.getTime() -
    now.getTime();


  if (
    difference <= 0
  ) {

    days.textContent = "0";
    hours.textContent = "0";
    minutes.textContent = "0";

    text.textContent =
      "🎯 Exam Day!";

    return;
  }


  const totalMinutes =
    Math.floor(
      difference /
      60000
    );


  const totalHours =
    Math.floor(
      totalMinutes /
      60
    );


  const remainingMinutes =
    totalMinutes %
    60;


  const remainingDays =
    Math.floor(
      totalHours /
      24
    );


  const remainingHours =
    totalHours %
    24;


  days.textContent =
    remainingDays;


  hours.textContent =
    remainingHours;


  minutes.textContent =
    remainingMinutes;


  text.textContent =
    "Exam: " +
    formatDate(
      data.examDate
    );
}


/* =========================================================
   MODAL
========================================================= */

function openModal(html) {

  const modal =
    document.getElementById(
      "modal"
    );

  const content =
    document.getElementById(
      "modalContent"
    );


  if (!modal || !content) {
    return;
  }


  content.innerHTML =
    html;


  modal.classList.remove(
    "hidden"
  );
}


function closeModal() {

  const modal =
    document.getElementById(
      "modal"
    );


  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );


  if (!toast) {
    return;
  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2500
    );
}


/* =========================================================
   HTML ESCAPE
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

  renderTodayRevisions();

  renderProgress();

  renderManage();

  updateXP();

  updateStreakDisplay();

  updateExamCountdown();
}


/* =========================================================
   AUTO REFRESH COUNTDOWN
========================================================= */

setInterval(
  updateExamCountdown,
  30000
);


/* =========================================================
   CLOSE MODAL ON BACKGROUND TAP
========================================================= */

document.addEventListener(
  "click",
  event => {

    const modal =
      document.getElementById(
        "modal"
      );


    if (
      modal &&
      event.target === modal
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   ENTER KEY - ADD SUBJECT
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !== "Enter"
    ) {
      return;
    }


    const active =
      document.activeElement;


    if (
      active &&
      active.id === "subjectInput"
    ) {

      addSubject();

    }


    if (
      active &&
      active.id.startsWith(
        "chapterInput_"
      )
    ) {

      const subjectId =
        active.id.replace(
          "chapterInput_",
          ""
        );


      addChapter(
        subjectId
      );

    }

  }
);


/* =========================================================
   START APP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    renderAll();

    showPage(
      "homePage",
      document.querySelector(
        ".nav-btn"
      )
    );

  }
);
