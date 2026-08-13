/* =====================================================
   REVISION RULES
   MAIN JAVASCRIPT
===================================================== */

"use strict";


/* =====================================================
   REVISION SYSTEM
===================================================== */

const REVISION_DAYS = [
  1,
  2,
  4,
  8,
  16,
  32,
  65
];


const REVISION_NAMES = [
  "Day 1",
  "Day 2",
  "Day 4",
  "Day 8",
  "Day 16",
  "Day 32",
  "Day 65"
];


/* =====================================================
   STORAGE
===================================================== */

const STORAGE_KEY =
  "revision_rules_data_v2";


/* =====================================================
   DEFAULT DATA
===================================================== */

const DEFAULT_DATA = {

  subjects: [],

  revisions: {},

  xp: 0,

  streak: 0,

  lastRevisionDate: null,

  examDate: null

};


let data =
  loadData();


/* =====================================================
   LOAD DATA
===================================================== */

function loadData() {

  try {

    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!saved) {

      return {
        ...DEFAULT_DATA
      };

    }

    const parsed =
      JSON.parse(saved);

    return {

      ...DEFAULT_DATA,

      ...parsed,

      subjects:
        Array.isArray(parsed.subjects)
          ? parsed.subjects
          : [],

      revisions:
        parsed.revisions &&
        typeof parsed.revisions === "object"
          ? parsed.revisions
          : {}

    };

  } catch (error) {

    console.error(
      "Data loading error:",
      error
    );

    return {
      ...DEFAULT_DATA
    };

  }

}


/* =====================================================
   SAVE DATA
===================================================== */

function saveData() {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

  } catch (error) {

    console.error(
      "Data saving error:",
      error
    );

  }

}


/* =====================================================
   DOM READY
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    setupNavigation();

    setupButtons();

    renderEverything();

    startCountdown();

  }
);


/* =====================================================
   NAVIGATION
   IMPORTANT FIX
===================================================== */

function setupNavigation() {

  const navButtons =
    document.querySelectorAll(
      ".nav-btn"
    );


  navButtons.forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          const pageId =
            button.getAttribute(
              "data-page"
            );

          if (!pageId) {
            return;
          }

          showPage(pageId);

        }
      );

    }
  );

}


/* =====================================================
   SHOW PAGE
===================================================== */

function showPage(pageId) {

  const pages =
    document.querySelectorAll(
      ".page"
    );


  pages.forEach(
    function (page) {

      page.classList.remove(
        "active"
      );

    }
  );


  const target =
    document.getElementById(
      pageId
    );


  if (!target) {

    console.error(
      "Page not found:",
      pageId
    );

    return;

  }


  target.classList.add(
    "active"
  );


  const buttons =
    document.querySelectorAll(
      ".nav-btn"
    );


  buttons.forEach(
    function (button) {

      button.classList.remove(
        "active"
      );

      if (
        button.getAttribute(
          "data-page"
        ) === pageId
      ) {

        button.classList.add(
          "active"
        );

      }

    }
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  if (
    pageId === "homePage"
  ) {

    renderHome();

  }


  if (
    pageId === "revisionPage"
  ) {

    renderRevision();

  }


  if (
    pageId === "progressPage"
  ) {

    renderProgress();

  }

}


/* =====================================================
   BUTTON SETUP
===================================================== */

function setupButtons() {

  const addSubjectBtn =
    document.getElementById(
      "addSubjectBtn"
    );


  if (addSubjectBtn) {

    addSubjectBtn.addEventListener(
      "click",
      addSubject
    );

  }


  const setExamBtn =
    document.getElementById(
      "setExamBtn"
    );


  if (setExamBtn) {

    setExamBtn.addEventListener(
      "click",
      setExamDate
    );

  }


  const closeModal =
    document.getElementById(
      "closeModal"
    );


  if (closeModal) {

    closeModal.addEventListener(
      "click",
      closeModalWindow
    );

  }


  const modal =
    document.getElementById(
      "modal"
    );


  if (modal) {

    modal.addEventListener(
      "click",
      function (event) {

        if (
          event.target === modal
        ) {

          closeModalWindow();

        }

      }
    );

  }

}


/* =====================================================
   ADD SUBJECT
===================================================== */

function addSubject() {

  openModal(`
    
    <h2>📚 Add Subject</h2>

    <input
      id="subjectInput"
      type="text"
      placeholder="Subject name"
      autocomplete="off"
    >

    <button
      id="saveSubjectBtn"
      class="modal-action"
    >
      Add Subject
    </button>

  `);


  const input =
    document.getElementById(
      "subjectInput"
    );


  const button =
    document.getElementById(
      "saveSubjectBtn"
    );


  if (input) {

    input.focus();

  }


  if (button) {

    button.addEventListener(
      "click",
      function () {

        const name =
          input.value.trim();


        if (!name) {

          alert(
            "Please enter subject name."
          );

          return;

        }


        const exists =
          data.subjects.some(
            function (subject) {

              return (
                subject.name
                  .toLowerCase() ===
                name.toLowerCase()
              );

            }
          );


        if (exists) {

          alert(
            "This subject already exists."
          );

          return;

        }


        data.subjects.push({

          id: createId(),

          name: name,

          chapters: []

        });


        saveData();

        closeModalWindow();

        renderEverything();

      }
    );

  }

}


/* =====================================================
   ADD CHAPTER
===================================================== */

function addChapter(subjectId) {

  const subject =
    getSubject(subjectId);


  if (!subject) {
    return;
  }


  openModal(`

    <h2>📖 Add Chapter</h2>

    <p style="margin-bottom:15px;color:#777">
      ${escapeHTML(subject.name)}
    </p>

    <input
      id="chapterInput"
      type="text"
      placeholder="Chapter name"
      autocomplete="off"
    >

    <button
      id="saveChapterBtn"
      class="modal-action"
    >
      Add Chapter
    </button>

  `);


  const input =
    document.getElementById(
      "chapterInput"
    );


  const button =
    document.getElementById(
      "saveChapterBtn"
    );


  if (input) {

    input.focus();

  }


  if (button) {

    button.addEventListener(
      "click",
      function () {

        const name =
          input.value.trim();


        if (!name) {

          alert(
            "Please enter chapter name."
          );

          return;

        }


        subject.chapters.push({

          id: createId(),

          name: name,

          order:
            subject.chapters.length + 1

        });


        saveData();

        closeModalWindow();

        renderEverything();

      }
    );

  }

}


/* =====================================================
   DELETE SUBJECT
===================================================== */

function deleteSubject(subjectId) {

  const subject =
    getSubject(subjectId);


  if (!subject) {
    return;
  }


  const confirmed =
    confirm(
      `Delete "${subject.name}" and all its chapters?`
    );


  if (!confirmed) {
    return;
  }


  subject.chapters.forEach(
    function (chapter) {

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
      function (item) {

        return item.id !== subjectId;

      }
    );


  saveData();

  renderEverything();

}


/* =====================================================
   DELETE CHAPTER
===================================================== */

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
    subject.chapters.find(
      function (item) {

        return item.id === chapterId;

      }
    );


  if (!chapter) {
    return;
  }


  const confirmed =
    confirm(
      `Delete "${chapter.name}"?`
    );


  if (!confirmed) {
    return;
  }


  subject.chapters =
    subject.chapters.filter(
      function (item) {

        return item.id !== chapterId;

      }
    );


  delete data.revisions[
    getRevisionKey(
      subject.id,
      chapter.id
    )
  ];


  saveData();

  renderEverything();

}


/* =====================================================
   MOVE CHAPTER UP
===================================================== */

function moveChapterUp(
  subjectId,
  chapterId
) {

  const subject =
    getSubject(subjectId);


  if (!subject) {
    return;
  }


  const index =
    subject.chapters.findIndex(
      function (chapter) {

        return chapter.id === chapterId;

      }
    );


  if (index <= 0) {
    return;
  }


  const temp =
    subject.chapters[index - 1];


  subject.chapters[index - 1] =
    subject.chapters[index];


  subject.chapters[index] =
    temp;


  updateChapterOrder(
    subject
  );

  saveData();

  renderEverything();

}


/* =====================================================
   MOVE CHAPTER DOWN
===================================================== */

function moveChapterDown(
  subjectId,
  chapterId
) {

  const subject =
    getSubject(subjectId);


  if (!subject) {
    return;
  }


  const index =
    subject.chapters.findIndex(
      function (chapter) {

        return chapter.id === chapterId;

      }
    );


  if (
    index === -1 ||
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


  updateChapterOrder(
    subject
  );

  saveData();

  renderEverything();

}


/* =====================================================
   UPDATE CHAPTER ORDER
===================================================== */

function updateChapterOrder(
  subject
) {

  subject.chapters.forEach(
    function (chapter, index) {

      chapter.order =
        index + 1;

    }
  );

}


/* =====================================================
   GET SUBJECT
===================================================== */

function getSubject(subjectId) {

  return data.subjects.find(
    function (subject) {

      return subject.id === subjectId;

    }
  );

}


/* =====================================================
   GET REVISION
===================================================== */

function getRevision(
  subjectId,
  chapterId
) {

  const key =
    getRevisionKey(
      subjectId,
      chapterId
    );


  if (!data.revisions[key]) {

    data.revisions[key] = {

      completed: {},

      dates: {}

    };

  }


  return data.revisions[key];

}


/* =====================================================
   REVISION KEY
===================================================== */

function getRevisionKey(
  subjectId,
  chapterId
) {

  return (
    subjectId +
    "::" +
    chapterId
  );

}


/* =====================================================
   START CHAPTER
   DAY 1
===================================================== */

function startChapter(
  subjectId,
  chapterId
) {

  const revision =
    getRevision(
      subjectId,
      chapterId
    );


  if (
    revision.completed.day1
  ) {

    return;

  }


  revision.completed.day1 =
    true;


  revision.dates.day1 =
    todayString();


  addXP(10);

  updateStreak();

  saveData();

  renderEverything();

}


/* =====================================================
   COMPLETE REVISION
===================================================== */

function completeRevision(
  subjectId,
  chapterId,
  revisionIndex
) {

  const revision =
    getRevision(
      subjectId,
      chapterId
    );


  const key =
    "day" +
    REVISION_DAYS[
      revisionIndex
    ];


  if (
    revision.completed[key]
  ) {

    return;

  }


  revision.completed[key] =
    true;


  revision.dates[key] =
    todayString();


  addXP(10);

  updateStreak();

  saveData();

  renderEverything();

}


/* =====================================================
   XP
===================================================== */

function addXP(amount) {

  data.xp =
    Number(data.xp || 0) +
    amount;

}


/* =====================================================
   STREAK
===================================================== */

function updateStreak() {

  const today =
    todayString();


  if (
    data.lastRevisionDate ===
    today
  ) {

    return;

  }


  if (
    data.lastRevisionDate
  ) {

    const yesterday =
      getDateStringOffset(
        -1
      );


    if (
      data.lastRevisionDate ===
      yesterday
    ) {

      data.streak =
        Number(data.streak || 0) +
        1;

    } else {

      data.streak = 1;

    }

  } else {

    data.streak = 1;

  }


  data.lastRevisionDate =
    today;

}


/* =====================================================
   TODAY STRING
===================================================== */

function todayString() {

  const date =
    new Date();


  return date
    .toISOString()
    .split("T")[0];

}


/* =====================================================
   DATE OFFSET
===================================================== */

function getDateStringOffset(
  offset
) {

  const date =
    new Date();


  date.setDate(
    date.getDate() + offset
  );


  return date
    .toISOString()
    .split("T")[0];

}


/* =====================================================
   REVISION DUE
===================================================== */

function isRevisionDue(
  revision,
  index
) {

  const date =
    revision.dates[
      "day" +
      REVISION_DAYS[index]
    ];


  if (!date) {
    return false;
  }


  const start =
    new Date(
      date + "T00:00:00"
    );


  const due =
    new Date(start);


  due.setDate(
    due.getDate() +
    (
      index === 0
        ? 0
        : REVISION_DAYS[index] -
          REVISION_DAYS[index - 1]
    )
  );


  const today =
    new Date(
      todayString() +
      "T00:00:00"
    );


  return (
    today >= due &&
    !revision.completed[
      "day" +
      REVISION_DAYS[index]
    ]
  );

}


/* =====================================================
   RENDER EVERYTHING
===================================================== */

function renderEverything() {

  renderHome();

  renderRevision();

  renderProgress();

  updateStreakUI();

}


/* =====================================================
   HOME
===================================================== */

function renderHome() {

  const percent =
    getOverallProgress();


  const overall =
    document.getElementById(
      "overallPercent"
    );


  if (overall) {

    overall.textContent =
      percent + "%";

  }


  const list =
    document.getElementById(
      "homeSubjects"
    );


  if (!list) {
    return;
  }


  list.innerHTML = "";


  data.subjects.forEach(
    function (subject) {

      const percent =
        getSubjectProgress(
          subject
        );


      const card =
        document.createElement(
          "div"
        );


      card.className =
        "subject-card";


      card.innerHTML = `

        <div class="subject-header">

          <span class="subject-name">
            ${escapeHTML(subject.name)}
          </span>

          <span class="subject-percent">
            ${percent}%
          </span>

        </div>

        <div class="progress-track">

          <div
            class="progress-fill"
            style="width:${percent}%"
          ></div>

        </div>

      `;


      list.appendChild(card);

    }
  );


  renderToday();

  renderCountdown();

  renderXP();

}


/* =====================================================
   REVISION PAGE
===================================================== */

function renderRevision() {

  const container =
    document.getElementById(
      "revisionSubjects"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (
    data.subjects.length === 0
  ) {

    container.innerHTML = `

      <div class="white-card empty-message">

        <h2>No subjects yet 📚</h2>

        <p>
          Tap "+ Subject" to create your first subject.
        </p>

      </div>

    `;

    return;

  }


  data.subjects.forEach(
    function (subject) {

      const box =
        document.createElement(
          "div"
        );


      box.className =
        "manage-subject";


      box.innerHTML = `

        <div class="manage-subject-header">

          <h3>
            📚 ${escapeHTML(subject.name)}
          </h3>

          <button
            class="small-btn delete-subject"
            data-subject="${subject.id}"
          >
            Delete
          </button>

        </div>


        <div class="chapter-add">

          <input
            type="text"
            class="chapter-input"
            data-subject="${subject.id}"
            placeholder="Add chapter..."
          >

          <button
            class="add-chapter-btn"
            data-subject="${subject.id}"
          >
            + Add
          </button>

        </div>


        <div class="chapter-container"></div>

      `;


      const chapterContainer =
        box.querySelector(
          ".chapter-container"
        );


      subject.chapters.forEach(
        function (chapter, index) {

          const revision =
            getRevision(
              subject.id,
              chapter.id
            );


          const percent =
            getChapterProgress(
              revision
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

                ${index + 1}.
                ${escapeHTML(chapter.name)}

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

              Revision:

              ${getRevisionStatus(
                revision
              )}

            </div>


            <div class="revision-buttons">

              ${createRevisionButtons(
                subject.id,
                chapter.id,
                revision
              )}

              <button
                class="move-up"
                data-subject="${subject.id}"
                data-chapter="${chapter.id}"
              >
                ↑
              </button>

              <button
                class="move-down"
                data-subject="${subject.id}"
                data-chapter="${chapter.id}"
              >
                ↓
              </button>

              <button
                class="delete-chapter"
                data-subject="${subject.id}"
                data-chapter="${chapter.id}"
              >
                Delete
              </button>

            </div>

          `;


          chapterContainer.appendChild(
            card
          );

        }
      );


      container.appendChild(
        box
      );

    }
  );


  attachRevisionEvents();

}


/* =====================================================
   REVISION BUTTONS HTML
===================================================== */

function createRevisionButtons(
  subjectId,
  chapterId,
  revision
) {

  let html = "";


  REVISION_DAYS.forEach(
    function (day, index) {

      const key =
        "day" + day;


      const completed =
        revision.completed[key];


      const isDue =
        index > 0
          ? isRevisionDue(
              revision,
              index
            )
          : false;


      let label =
        REVISION_NAMES[index];


      if (
        index === 0 &&
        !revision.completed.day1
      ) {

        label =
          "Start Chapter";

      }


      html += `

        <button

          class="${completed ? "done" : ""}"

          data-revision-index="${index}"

          data-subject="${subjectId}"

          data-chapter="${chapterId}"

        >

          ${completed ? "✓ " : ""}${label}

        </button>

      `;

    }
  );


  return html;

}


/* =====================================================
   REVISION STATUS
===================================================== */

function getRevisionStatus(
  revision
) {

  return REVISION_DAYS.map(
    function (day, index) {

      const key =
        "day" + day;


      return (
        revision.completed[key]
          ? "✅ " + REVISION_NAMES[index]
          : "⬜ " + REVISION_NAMES[index]
      );

    }
  ).join("<br>");

}


/* =====================================================
   ATTACH REVISION EVENTS
===================================================== */

function attachRevisionEvents() {

  document
    .querySelectorAll(
      ".add-chapter-btn"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const subjectId =
              button.dataset.subject;


            const input =
              document.querySelector(
                `.chapter-input[data-subject="${subjectId}"]`
              );


            const name =
              input
                ? input.value.trim()
                : "";


            if (!name) {

              alert(
                "Enter chapter name."
              );

              return;

            }


            const subject =
              getSubject(
                subjectId
              );


            if (!subject) {
              return;
            }


            subject.chapters.push({

              id: createId(),

              name: name,

              order:
                subject.chapters.length + 1

            });


            input.value = "";


            saveData();

            renderEverything();

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".delete-subject"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            deleteSubject(
              button.dataset.subject
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".delete-chapter"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            deleteChapter(
              button.dataset.subject,
              button.dataset.chapter
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".move-up"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            moveChapterUp(
              button.dataset.subject,
              button.dataset.chapter
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".move-down"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            moveChapterDown(
              button.dataset.subject,
              button.dataset.chapter
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".revision-buttons button"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const index =
              Number(
                button.dataset.revisionIndex
              );


            const subjectId =
              button.dataset.subject;


            const chapterId =
              button.dataset.chapter;


            if (index === 0) {

              startChapter(
                subjectId,
                chapterId
              );

            } else {

              completeRevision(
                subjectId,
                chapterId,
                index
              );

            }

          }
        );

      }
    );

}


/* =====================================================
   CHAPTER PROGRESS
===================================================== */

function getChapterProgress(
  revision
) {

  let done = 0;


  REVISION_DAYS.forEach(
    function (day) {

      if (
        revision.completed[
          "day" + day
        ]
      ) {

        done++;

      }

    }
  );


  return Math.round(
    (
      done /
      REVISION_DAYS.length
    ) * 100
  );

}


/* =====================================================
   SUBJECT PROGRESS
===================================================== */

function getSubjectProgress(
  subject
) {

  const total =
    subject.chapters.length *
    REVISION_DAYS.length;


  if (!total) {
    return 0;
  }


  let done = 0;


  subject.chapters.forEach(
    function (chapter) {

      const revision =
        getRevision(
          subject.id,
          chapter.id
        );


      REVISION_DAYS.forEach(
        function (day) {

          if (
            revision.completed[
              "day" + day
            ]
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


/* =====================================================
   OVERALL PROGRESS
===================================================== */

function getOverallProgress() {

  let total = 0;

  let done = 0;


  data.subjects.forEach(
    function (subject) {

      subject.chapters.forEach(
        function (chapter) {

          total +=
            REVISION_DAYS.length;


          const revision =
            getRevision(
              subject.id,
              chapter.id
            );


          REVISION_DAYS.forEach(
            function (day) {

              if (
                revision.completed[
                  "day" + day
                ]
              ) {

                done++;

              }

            }
          );

        }
      );

    }
  );


  if (!total) {
    return 0;
  }


  return Math.round(
    (done / total) * 100
  );

}


/* =====================================================
   TODAY REVISION
===================================================== */

function renderToday() {

  const list =
    document.getElementById(
      "todayList"
    );


  const count =
    document.getElementById(
      "todayCount"
    );


  if (!list) {
    return;
  }


  list.innerHTML = "";


  let found = 0;


  data.subjects.forEach(
    function (subject) {

      subject.chapters.forEach(
        function (chapter) {

          const revision =
            getRevision(
              subject.id,
              chapter.id
            );


          REVISION_DAYS.forEach(
            function (day, index) {

              if (
                index === 0 &&
                !revision.completed.day1
              ) {

                found++;

                addTodayCard(
                  list,
                  subject,
                  chapter,
                  index,
                  "Start Chapter"
                );

                return;

              }


              if (
                index > 0 &&
                isRevisionDue(
                  revision,
                  index
                )
              ) {

                found++;

                addTodayCard(
                  list,
                  subject,
                  chapter,
                  index,
                  REVISION_NAMES[index]
                );

              }

            }
          );

        }
      );

    }
  );


  if (!found) {

    list.innerHTML = `

      <div class="empty-message">

        🎉 No revisions due today!

      </div>

    `;

  }


  if (count) {

    count.textContent =
      found +
      (
        found === 1
          ? " revision today"
          : " revisions today"
      );

  }

}


/* =====================================================
   TODAY CARD
===================================================== */

function addTodayCard(
  list,
  subject,
  chapter,
  index,
  title
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "today-card";


  card.innerHTML = `

    <h3>
      ${escapeHTML(subject.name)}
    </h3>

    <p>
      ${escapeHTML(chapter.name)}
      — ${title}
    </p>

    <button
      class="today-btn"
    >
      Complete
    </button>

  `;


  card
    .querySelector(
      ".today-btn"
    )
    .addEventListener(
      "click",
      function () {

        if (index === 0) {

          startChapter(
            subject.id,
            chapter.id
          );

        } else {

          completeRevision(
            subject.id,
            chapter.id,
            index
          );

        }

      }
    );


  list.appendChild(card);

}


/* =====================================================
   PROGRESS PAGE
===================================================== */

function renderProgress() {

  const percent =
    getOverallProgress();


  const percentText =
    document.getElementById(
      "progressPercent"
    );


  const circle =
    document.getElementById(
      "progressCircle"
    );


  if (percentText) {

    percentText.textContent =
      percent + "%";

  }


  if (circle) {

    circle.style.borderColor =
      "#6266e8";

  }


  const container =
    document.getElementById(
      "progressSubjects"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  data.subjects.forEach(
    function (subject) {

      const percent =
        getSubjectProgress(
          subject
        );


      const card =
        document.createElement(
          "div"
        );


      card.className =
        "white-card";


      card.innerHTML = `

        <div class="subject-header">

          <span class="subject-name">

            📚
            ${escapeHTML(subject.name)}

          </span>

          <span class="subject-percent">

            ${percent}%

          </span>

        </div>

        <div class="progress-track">

          <div
            class="progress-fill"
            style="width:${percent}%"
          ></div>

        </div>

      `;


      container.appendChild(card);

    }
  );

}


/* =====================================================
   XP UI
===================================================== */

function renderXP() {

  const xp =
    Number(data.xp || 0);


  const xpValue =
    document.getElementById(
      "xpValue"
    );


  const xpBar =
    document.getElementById(
      "xpBar"
    );


  if (xpValue) {

    xpValue.textContent =
      xp;

  }


  if (xpBar) {

    const progress =
      xp % 100;

    xpBar.style.width =
      progress + "%";

  }


  const badges =
    document.getElementById(
      "badges"
    );


  if (!badges) {
    return;
  }


  badges.innerHTML = "";


  const badgeList = [];


  if (xp >= 10) {

    badgeList.push(
      "🌱 First Revision"
    );

  }


  if (xp >= 50) {

    badgeList.push(
      "⭐ 50 XP"
    );

  }


  if (xp >= 100) {

    badgeList.push(
      "🏆 100 XP"
    );

  }


  if (data.streak >= 3) {

    badgeList.push(
      "🔥 3 Day Streak"
    );

  }


  if (data.streak >= 7) {

    badgeList.push(
      "🔥 7 Day Streak"
    );

  }


  if (
    badgeList.length === 0
  ) {

    badgeList.push(
      "🔒 Keep studying to unlock badges"
    );

  }


  badgeList.forEach(
    function (badge) {

      const span =
        document.createElement(
          "span"
        );


      span.className =
        "badge";


      span.textContent =
        badge;


      badges.appendChild(span);

    }
  );

}


/* =====================================================
   STREAK UI
===================================================== */

function updateStreakUI() {

  const element =
    document.getElementById(
      "streakValue"
    );


  if (element) {

    element.textContent =
      data.streak || 0;

  }

}


/* =====================================================
   EXAM DATE
===================================================== */

function setExamDate() {

  openModal(`

    <h2>🎯 HSC Exam Date</h2>

    <input
      id="examInput"
      type="date"
      value="${data.examDate || ""}"
    >

    <button
      id="saveExamBtn"
      class="modal-action"
    >
      Save Exam Date
    </button>

  `);


  const input =
    document.getElementById(
      "examInput"
    );


  const button =
    document.getElementById(
      "saveExamBtn"
    );


  button.addEventListener(
    "click",
    function () {

      if (!input.value) {

        alert(
          "Please select a date."
        );

        return;

      }


      data.examDate =
        input.value;


      saveData();

      closeModalWindow();

      renderCountdown();

    }
  );

}


/* =====================================================
   COUNTDOWN
===================================================== */

function renderCountdown() {

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


  if (
    !days ||
    !hours ||
    !minutes
  ) {

    return;

  }


  if (!data.examDate) {

    days.textContent = "--";
    hours.textContent = "--";
    minutes.textContent = "--";

    return;

  }


  const target =
    new Date(
      data.examDate +
      "T00:00:00"
    );


  const now =
    new Date();


  const difference =
    target.getTime() -
    now.getTime();


  if (difference <= 0) {

    days.textContent = "0";
    hours.textContent = "0";
    minutes.textContent = "0";

    return;

  }


  const totalMinutes =
    Math.floor(
      difference /
      (1000 * 60)
    );


  const d =
    Math.floor(
      totalMinutes /
      (60 * 24)
    );


  const h =
    Math.floor(
      (
        totalMinutes %
        (60 * 24)
      ) / 60
    );


  const m =
    totalMinutes % 60;


  days.textContent = d;
  hours.textContent = h;
  minutes.textContent = m;

}


/* =====================================================
   COUNTDOWN TIMER
===================================================== */

function startCountdown() {

  renderCountdown();


  setInterval(
    renderCountdown,
    60000
  );

}


/* =====================================================
   MODAL
===================================================== */

function openModal(
  content
) {

  const modal =
    document.getElementById(
      "modal"
    );


  const modalContent =
    document.getElementById(
      "modalContent"
    );


  if (!modal || !modalContent) {

    return;

  }


  modalContent.innerHTML =
    content;


  modal.classList.remove(
    "hidden"
  );

}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeModalWindow() {

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


/* =====================================================
   CREATE ID
===================================================== */

function createId() {

  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .substring(2, 8)
  );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
  value
) {

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


/* =====================================================
   GLOBAL SAFETY
===================================================== */

window.addEventListener(
  "error",
  function (event) {

    console.error(
      "Application error:",
      event.error
    );

  }
);
