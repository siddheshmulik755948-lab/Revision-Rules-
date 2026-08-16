"use strict";

(() => {

  const DB_NAME = "RevisionTrackerDB";
  const DB_VERSION = 1;
  const STORE_NAME = "data";

  const REVISION_OFFSETS = [
    0,
    1,
    3,
    7,
    15,
    31,
    64
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

  let database = null;
  let state = null;


  /* =========================
     BASIC HELPERS
  ========================= */

  const $ = (id) => document.getElementById(id);

  function createId(prefix) {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).substring(2, 8)
    );
  }


  function getToday() {

    const d = new Date();

    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }


  function parseDate(value) {

    const parts = value.split("-");

    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );
  }


  function addDays(value, days) {

    const d = parseDate(value);

    d.setDate(d.getDate() + days);

    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }


  function daysBetween(first, second) {

    return Math.round(
      (
        parseDate(second) -
        parseDate(first)
      ) /
      86400000
    );
  }


  function formatDate(value) {

    if (!value) {
      return "—";
    }

    return parseDate(value).toLocaleDateString(
      undefined,
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  }


  function escapeHTML(value) {

    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) => {

        const map = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        };

        return map[character];
      }
    );
  }


  function showToast(message) {

    const toast = $("toast");

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {

      toast.classList.remove("show");

    }, 2200);
  }


  /* =========================
     DEFAULT DATA
  ========================= */

  function defaultState() {

    return {

      subjects: [],

      examDate: "",

      theme: "light",

      xp: 0,

      activity: {}

    };

  }


  /* =========================
     INDEXED DB
  ========================= */

  function openDatabase() {

    return new Promise((resolve, reject) => {

      const request =
        indexedDB.open(
          DB_NAME,
          DB_VERSION
        );


      request.onupgradeneeded = (event) => {

        const db = event.target.result;

        if (
          !db.objectStoreNames.contains(
            STORE_NAME
          )
        ) {

          db.createObjectStore(
            STORE_NAME
          );

        }

      };


      request.onsuccess = () => {

        resolve(request.result);

      };


      request.onerror = () => {

        reject(request.error);

      };

    });

  }


  function loadState() {

    return new Promise((resolve, reject) => {

      const transaction =
        database.transaction(
          STORE_NAME,
          "readonly"
        );

      const request =
        transaction
          .objectStore(STORE_NAME)
          .get("state");


      request.onsuccess = () => {

        resolve(
          request.result || null
        );

      };


      request.onerror = () => {

        reject(request.error);

      };

    });

  }


  function saveState() {

    return new Promise((resolve, reject) => {

      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite"
        );

      transaction
        .objectStore(STORE_NAME)
        .put(
          state,
          "state"
        );


      transaction.oncomplete = () => {

        resolve();

      };


      transaction.onerror = () => {

        reject(transaction.error);

      };

    });

  }


  /* =========================
     DATA NORMALIZATION
  ========================= */

  function normalizeState() {

    if (
      !state ||
      typeof state !== "object"
    ) {

      state = defaultState();

    }


    if (!Array.isArray(state.subjects)) {

      state.subjects = [];

    }


    if (
      typeof state.xp !== "number"
    ) {

      state.xp = 0;

    }


    if (!state.activity) {

      state.activity = {};

    }


    state.subjects.forEach(
      (subject) => {

        if (!subject.id) {

          subject.id =
            createId("subject");

        }


        if (
          typeof subject.name !==
          "string"
        ) {

          subject.name =
            "Subject";

        }


        if (
          !Array.isArray(
            subject.chapters
          )
        ) {

          subject.chapters = [];

        }


        subject.chapters.forEach(
          (chapter) => {

            if (!chapter.id) {

              chapter.id =
                createId("chapter");

            }


            if (
              !chapter.name
            ) {

              chapter.name =
                "Chapter";

            }


            if (
              !chapter.startDate
            ) {

              chapter.startDate =
                getToday();

            }


            if (
              !Array.isArray(
                chapter.done
              )
            ) {

              chapter.done =
                [];

            }


            if (
              !Array.isArray(
                chapter.completedOn
              )
            ) {

              chapter.completedOn =
                [];

            }


            while (
              chapter.done.length < 7
            ) {

              chapter.done.push(false);

            }


            while (
              chapter.completedOn.length < 7
            ) {

              chapter.completedOn.push("");

            }

          }
        );

      }
    );

  }


  /* =========================
     REVISION DATA
  ========================= */

  function getAllRevisions() {

    const result = [];

    state.subjects.forEach(
      (subject) => {

        subject.chapters.forEach(
          (chapter) => {

            REVISION_OFFSETS.forEach(
              (offset, index) => {

                result.push({

                  subjectId:
                    subject.id,

                  subjectName:
                    subject.name,

                  chapterId:
                    chapter.id,

                  chapterName:
                    chapter.name,

                  index,

                  label:
                    REVISION_NAMES[index],

                  due:
                    addDays(
                      chapter.startDate,
                      offset
                    ),

                  done:
                    Boolean(
                      chapter.done[index]
                    ),

                  completedOn:
                    chapter.completedOn[index] ||
                    ""

                });

              }
            );

          }
        );

      }
    );

    return result;

  }


  function getTodayRevisions() {

    return getAllRevisions().filter(
      (revision) =>
        revision.due === getToday()
    );

  }


  function getOverdueRevisions() {

    return getAllRevisions().filter(
      (revision) =>
        !revision.done &&
        revision.due < getToday()
    );

  }


  function chapterProgress(chapter) {

    const completed =
      chapter.done.filter(Boolean).length;

    return Math.round(
      completed / 7 * 100
    );

  }


  function subjectProgress(subject) {

    if (
      subject.chapters.length === 0
    ) {

      return 0;

    }

    const total =
      subject.chapters.reduce(
        (sum, chapter) =>
          sum + chapterProgress(chapter),
        0
      );

    return Math.round(
      total / subject.chapters.length
    );

  }


  function overallProgress() {

    const chapters =
      state.subjects.flatMap(
        (subject) =>
          subject.chapters
      );


    if (chapters.length === 0) {

      return 0;

    }


    const total =
      chapters.reduce(
        (sum, chapter) =>
          sum + chapterProgress(chapter),
        0
      );


    return Math.round(
      total / chapters.length
    );

  }


  /* =========================
     STREAK
  ========================= */

  function calculateStreak() {

    let count = 0;

    let current =
      getToday();


    while (
      state.activity[current]
    ) {

      count++;

      current =
        addDays(
          current,
          -1
        );

    }


    return count;

  }


  /* =========================
     THEME
  ========================= */

  function applyTheme() {

    document.body.classList.toggle(
      "dark",
      state.theme === "dark"
    );


    $("themeBtn").textContent =
      state.theme === "dark"
        ? "☀"
        : "☾";

  }


  /* =========================
     REVISION HTML
  ========================= */

  function revisionHTML(revision) {

    const late =
      !revision.done &&
      revision.due < getToday();


    return `

      <div class="item ${
        revision.done
          ? "completed"
          : ""
      }">

        <button
          class="check-button ${
            revision.done
              ? "done"
              : ""
          }"
          data-toggle="${
            revision.subjectId
          }|${
            revision.chapterId
          }|${
            revision.index
          }"
        >
          ${
            revision.done
              ? "✓"
              : "○"
          }
        </button>


        <div class="item-main">

          <strong>
            ${escapeHTML(
              revision.subjectName
            )}
            •
            ${escapeHTML(
              revision.chapterName
            )}
          </strong>

          <small>
            ${escapeHTML(
              revision.label
            )}
          </small>

          <small class="${
            late
              ? "late"
              : ""
          }">

            ${
              late
                ? `Due ${formatDate(
                    revision.due
                  )}
                  •
                  ${daysBetween(
                    revision.due,
                    getToday()
                  )}
                  day(s) late`
                : `Due ${formatDate(
                    revision.due
                  )}`
            }

          </small>

        </div>

      </div>

    `;

  }


  /* =========================
     HOME
  ========================= */

  function renderHome() {

    const progress =
      overallProgress();


    $("overallProgress")
      .textContent =
      progress + "%";


    $("overallProgress")
      .parentElement
      .style
      .setProperty(
        "--progress",
        progress + "%"
      );


    $("todayCountHome")
      .textContent =
      getTodayRevisions()
        .filter(
          (item) =>
            !item.done
        )
        .length;


    $("overdueCountHome")
      .textContent =
      getOverdueRevisions()
        .length;


    $("streakHome")
      .textContent =
      calculateStreak();


    $("xpHome")
      .textContent =
      state.xp;


    const hour =
      new Date().getHours();


    $("greeting")
      .textContent =
      (
        hour < 12
          ? "Good Morning"
          : hour < 18
            ? "Good Afternoon"
            : "Good Evening"
      ) + " 👋";


    const today =
      getTodayRevisions();


    $("homeTodayList")
      .innerHTML =
      today.length
        ? today
            .slice(0, 5)
            .map(revisionHTML)
            .join("")
        : `<div class="empty">
             आज कोणतीही revision नाही ✨
           </div>`;


    $("homeSubjects")
      .innerHTML =
      state.subjects.length
        ? state.subjects
            .map(
              (subject) => `

                <div class="subject-row">

                  <div class="section-title">

                    <strong>
                      ${escapeHTML(
                        subject.name
                      )}
                    </strong>

                    <span>
                      ${subjectProgress(
                        subject
                      )}%
                    </span>

                  </div>

                  <small class="muted">
                    ${
                      subject.chapters.length
                    }
                    chapters
                  </small>

                  <div class="progress-bar">

                    <div
                      class="progress-fill"
                      style="
                        width:
                        ${subjectProgress(
                          subject
                        )}%
                      "
                    ></div>

                  </div>

                </div>

              `
            )
            .join("")
        : `<div class="empty">
             अजून subject add केलेला नाही.
           </div>`;

  }


  /* =========================
     TODAY PAGE
  ========================= */

  function renderToday() {

    $("todayDate")
      .textContent =
      formatDate(getToday());


    const today =
      getTodayRevisions();


    const overdue =
      getOverdueRevisions();


    $("todayCount")
      .textContent =
      today.filter(
        (item) =>
          !item.done
      ).length;


    $("overdueCount")
      .textContent =
      overdue.length;


    $("todayList")
      .innerHTML =
      today.length
        ? today
            .map(revisionHTML)
            .join("")
        : `<div class="empty">
             आज revision scheduled नाही.
           </div>`;


    $("overdueList")
      .innerHTML =
      overdue.length
        ? overdue
            .map(revisionHTML)
            .join("")
        : `<div class="empty">
             कोणतीही incomplete revision नाही 🎉
           </div>`;

  }


  /* =========================
     SUBJECTS
  ========================= */

  function renderSubjects() {

    if (
      state.subjects.length === 0
    ) {

      $("subjectsList")
        .innerHTML =
        `<div class="card empty">
           अजून subject नाही.
           <br><br>
           + Subject वर tap करा.
         </div>`;

      return;

    }


    $("subjectsList")
      .innerHTML =
      state.subjects
        .map(
          (subject) => `

            <div class="subject-card">

              <div class="subject-head">

                <div>

                  <span class="label">
                    SUBJECT
                  </span>

                  <h3>
                    ${escapeHTML(
                      subject.name
                    )}
                  </h3>

                  <small class="muted">
                    ${
                      subject.chapters.length
                    }
                    chapter(s)
                    •
                    ${subjectProgress(
                      subject
                    )}%
                  </small>

                </div>


                <div class="subject-actions">

                  <button
                    class="mini-button"
                    data-edit-sub="${
                      subject.id
                    }"
                  >
                    ✏️
                  </button>

                  <button
                    class="mini-button danger"
                    data-delete-sub="${
                      subject.id
                    }"
                  >
                    🗑️
                  </button>

                </div>

              </div>


              <div class="progress-bar">

                <div
                  class="progress-fill"
                  style="
                    width:
                    ${subjectProgress(
                      subject
                    )}%
                  "
                ></div>

              </div>


              ${
                subject.chapters.length
                  ? subject.chapters
                      .map(
                        (chapter, index) =>
                          chapterHTML(
                            subject,
                            chapter,
                            index
                          )
                      )
                      .join("")
                  : `<div class="empty">
                       Chapter नाही.
                     </div>`
              }


              <button
                class="secondary-button full-button"
                data-add-chapter="${
                  subject.id
                }"
              >
                + Add Chapter
              </button>

            </div>

          `
        )
        .join("");

  }


  function chapterHTML(
    subject,
    chapter,
    index
  ) {

    return `

      <div class="chapter">

        <div class="chapter-info">

          <strong>
            ${index + 1}.
            ${escapeHTML(
              chapter.name
            )}
          </strong>

          <small>
            Started:
            ${formatDate(
              chapter.startDate
            )}
            •
            ${chapterProgress(
              chapter
            )}%
          </small>


          <div class="progress-bar">

            <div
              class="progress-fill"
              style="
                width:
                ${chapterProgress(
                  chapter
                )}%
              "
            ></div>

          </div>


          <div class="revision-steps">

            ${REVISION_OFFSETS
              .map(
                (offset, index) => {

                  const due =
                    addDays(
                      chapter.startDate,
                      offset
                    );

                  return `

                    <div
                      class="
                        revision-step
                        ${
                          chapter.done[index]
                            ? "done"
                            : ""
                        }
                        ${
                          due === getToday() &&
                          !chapter.done[index]
                            ? "today"
                            : ""
                        }
                      "
                    >

                      <strong>
                        ${
                          chapter.done[index]
                            ? "✓"
                            : REVISION_NAMES[
                                index
                              ]
                        }
                      </strong>

                      ${formatDate(due)}

                    </div>

                  `;

                }
              )
              .join("")}

          </div>

        </div>


        <div class="subject-actions">

          <button
            class="mini-button"
            data-up="${
              subject.id
            }|${
              chapter.id
            }"
          >
            ↑
          </button>

          <button
            class="mini-button"
            data-down="${
              subject.id
            }|${
              chapter.id
            }"
          >
            ↓
          </button>

          <button
            class="mini-button"
            data-edit-chapter="${
              subject.id
            }|${
              chapter.id
            }"
          >
            ✏️
          </button>

          <button
            class="mini-button danger"
            data-delete-chapter="${
              subject.id
            }|${
              chapter.id
            }"
          >
            🗑️
          </button>

        </div>

      </div>

    `;

  }


  /* =========================
     PROGRESS
  ========================= */

  function renderProgress() {

    const chapters =
      state.subjects.flatMap(
        (subject) =>
          subject.chapters.map(
            (chapter) => ({
              subject,
              chapter
            })
          )
      );


    $("progressList")
      .innerHTML =
      chapters.length
        ? chapters
            .map(
              ({ subject, chapter }) => `

                <div class="progress-card">

                  <h3>
                    ${escapeHTML(
                      subject.name
                    )}
                    •
                    ${escapeHTML(
                      chapter.name
                    )}
                  </h3>

                  <p class="muted">
                    Started:
                    ${formatDate(
                      chapter.startDate
                    )}
                    •
                    ${chapterProgress(
                      chapter
                    )}%
                  </p>


                  <div class="revision-steps">

                    ${REVISION_OFFSETS
                      .map(
                        (offset, index) => `

                          <div
                            class="
                              revision-step
                              ${
                                chapter.done[index]
                                  ? "done"
                                  : ""
                              }
                            "
                          >

                            <strong>
                              ${
                                chapter.done[index]
                                  ? "✓"
                                  : REVISION_NAMES[
                                      index
                                    ]
                              }
                            </strong>

                            ${formatDate(
                              addDays(
                                chapter.startDate,
                                offset
                              )
                            )}

                          </div>

                        `
                      )
                      .join("")}

                  </div>

                </div>

              `
            )
            .join("")
        : `<div class="card empty">
             Chapter add केल्यावर
             progress येथे दिसेल.
           </div>`;

  }


  /* =========================
     EXAM
  ========================= */

  function renderExam() {

    if (!state.examDate) {

      $("examCountdown")
        .textContent =
        "No exam date set";

      return;

    }


    const remaining =
      daysBetween(
        getToday(),
        state.examDate
      );


    $("examCountdown")
      .innerHTML = `

        <div class="countdown-number">

          ${Math.abs(remaining)}

          <small>
            ${
              remaining >= 0
                ? "days left"
                : "days ago"
            }
          </small>

        </div>

        <span>
          ${
            remaining >= 0
              ? "until"
              : "was"
          }
          ${formatDate(
            state.examDate
          )}
        </span>

      `;

  }


  /* =========================
     PLANNER
  ========================= */

  function renderPlanner() {

    const from =
      $("plannerFrom").value;

    const to =
      $("plannerTo").value;


    if (!from || !to) {

      $("plannerSummary")
        .innerHTML = "";

      $("plannerResults")
        .innerHTML =
        `<div class="card empty">
           Date select करा.
         </div>`;

      return;

    }


    if (to < from) {

      $("plannerResults")
        .innerHTML =
        `<div class="card empty">
           To date ही From date पेक्षा आधी असू शकत नाही.
         </div>`;

      return;

    }


    const revisions =
      getAllRevisions().filter(
        (revision) =>
          revision.due >= from &&
          revision.due <= to
      );


    const completed =
      revisions.filter(
        (revision) =>
          revision.done
      ).length;


    const days =
      daysBetween(
        from,
        to
      ) + 1;


    $("plannerSummary")
      .innerHTML = `

        <div class="summary">

          <div class="summary-box">
            <strong>${days}</strong>
            <small>Days</small>
          </div>

          <div class="summary-box">
            <strong>${revisions.length}</strong>
            <small>Revisions</small>
          </div>

          <div class="summary-box">
            <strong>${completed}</strong>
            <small>Completed</small>
          </div>

          <div class="summary-box">
            <strong>${
              revisions.length -
              completed
            }</strong>
            <small>Pending</small>
          </div>

        </div>

      `;


    let html = "";


    for (
      let current = from;
      current <= to;
      current = addDays(
        current,
        1
      )
    ) {

      const dayRevisions =
        revisions.filter(
          (revision) =>
            revision.due === current
        );


      html += `

        <div class="day-card">

          <div class="day-header">

            <span>
              ${formatDate(
                current
              )}
            </span>

            <span>
              ${
                dayRevisions.length
              }
              revision(s)
            </span>

          </div>

          <div class="day-body">

            ${
              dayRevisions.length
                ? dayRevisions
                    .map(
                      revisionHTML
                    )
                    .join("")
                : `<div class="empty">
                     No revision scheduled.
                   </div>`
            }

          </div>

        </div>

      `;

    }


    $("plannerResults")
      .innerHTML =
      html;

  }


  /* =========================
     MODAL
  ========================= */

  function openModal(content) {

    $("modalContent")
      .innerHTML =
      content;

    $("modal")
      .classList
      .add("show");

  }


  function closeModal() {

    $("modal")
      .classList
      .remove("show");

    $("modalContent")
      .innerHTML = "";

  }


  /* =========================
     FIND DATA
  ========================= */

  function findSubject(id) {

    return state.subjects.find(
      (subject) =>
        subject.id === id
    );

  }


  function findChapter(
    subjectId,
    chapterId
  ) {

    const subject =
      findSubject(
        subjectId
      );


    if (!subject) {

      return null;

    }


    const chapter =
      subject.chapters.find(
        (item) =>
          item.id === chapterId
      );


    return {
      subject,
      chapter
    };

  }


  /* =========================
     ADD SUBJECT
  ========================= */

  function addSubject() {

    openModal(`

      <h3>Add Subject</h3>

      <form id="subjectForm" class="form">

        <label>
          Subject Name

          <input
            name="name"
            maxlength="80"
            placeholder="e.g. Physics"
            required
          >

        </label>


        <div class="form-actions">

          <button
            type="button"
            class="secondary-button"
            data-close
          >
            Cancel
          </button>

          <button
            class="primary-button"
          >
            Save
          </button>

        </div>

      </form>

    `);


    $("subjectForm")
      .addEventListener(
        "submit",
        async (event) => {

          event.preventDefault();


          const form =
            new FormData(
              event.target
            );


          const name =
            String(
              form.get("name")
            ).trim();


          if (!name) {

            return;

          }


          state.subjects.push({

            id:
              createId(
                "subject"
              ),

            name,

            chapters: []

          });


          await saveState();

          closeModal();

          render();

          showToast(
            "Subject added ✓"
          );

        }
      );

  }


  /* =========================
     EDIT SUBJECT
  ========================= */

  function editSubject(id) {

    const subject =
      findSubject(id);


    if (!subject) {

      return;

    }


    openModal(`

      <h3>Edit Subject</h3>

      <form id="editSubjectForm" class="form">

        <label>

          Subject Name

          <input
            name="name"
            value="${escapeHTML(
              subject.name
            )}"
            maxlength="80"
            required
          >

        </label>


        <div class="form-actions">

          <button
            type="button"
            class="secondary-button"
            data-close
          >
            Cancel
          </button>

          <button
            class="primary-button"
          >
            Save Changes
          </button>

        </div>

      </form>

    `);


    $("editSubjectForm")
      .addEventListener(
        "submit",
        async (event) => {

          event.preventDefault();


          const form =
            new FormData(
              event.target
            );


          subject.name =
            String(
              form.get("name")
            ).trim();


          await saveState();

          closeModal();

          render();

          showToast(
            "Subject updated ✓"
          );

        }
      );

  }


  /* =========================
     DELETE SUBJECT
  ========================= */

  async function deleteSubject(id) {

    const subject =
      findSubject(id);


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


    state.subjects =
      state.subjects.filter(
        (item) =>
          item.id !== id
      );


    await saveState();

    render();

    showToast(
      "Subject deleted"
    );

  }


  /* =========================
     ADD CHAPTER
  ========================= */

  function addChapter(
    subjectId
  ) {

    const subject =
      findSubject(
        subjectId
      );


    if (!subject) {

      return;

    }


    openModal(`

      <h3>Add Chapter</h3>

      <p class="muted">
        Start date ही Day 1 मानली जाईल.
        त्यानंतर Day 2, 4, 8, 16, 32 आणि 65
        revisions automatically तयार होतील.
      </p>


      <form id="chapterForm" class="form">

        <label>

          Chapter Name

          <input
            name="name"
            maxlength="150"
            placeholder="e.g. Rotational Dynamics"
            required
          >

        </label>


        <label>

          Study Start Date

          <input
            type="date"
            name="date"
            value="${getToday()}"
            required
          >

        </label>


        <label>

          Notes

          <textarea
            name="note"
            maxlength="1500"
            placeholder="Optional notes"
          ></textarea>

        </label>


        <div class="form-actions">

          <button
            type="button"
            class="secondary-button"
            data-close
          >
            Cancel
          </button>

          <button
            class="primary-button"
          >
            Add Chapter
          </button>

        </div>

      </form>

    `);


    $("chapterForm")
      .addEventListener(
        "submit",
        async (event) => {

          event.preventDefault();


          const form =
            new FormData(
              event.target
            );


          const name =
            String(
              form.get("name")
            ).trim();


          const startDate =
            String(
              form.get("date")
            );


          if (!name) {

            return;

          }


          subject.chapters.push({

            id:
              createId(
                "chapter"
              ),

            name,

            startDate,

            note:
              String(
                form.get("note") || ""
              ),

            done:
              Array(7).fill(false),

            completedOn:
              Array(7).fill("")

          });


          await saveState();

          closeModal();

          render();

          showToast(
            "Chapter added ✓"
          );

        }
      );

  }


  /* =========================
     EDIT CHAPTER
  ========================= */

  function editChapter(
    subjectId,
    chapterId
  ) {

    const result =
      findChapter(
        subjectId,
        chapterId
      );


    if (
      !result ||
      !result.chapter
    ) {

      return;

    }


    const chapter =
      result.chapter;


    openModal(`

      <h3>Edit Chapter</h3>

      <form id="editChapterForm" class="form">

        <label>

          Chapter Name

          <input
            name="name"
            value="${escapeHTML(
              chapter.name
            )}"
            maxlength="150"
            required
          >

        </label>


        <label>

          Study Start Date

          <input
            type="date"
            name="date"
            value="${chapter.startDate}"
            required
          >

        </label>


        <label>

          Notes

          <textarea
            name="note"
            maxlength="1500"
          >${escapeHTML(
            chapter.note || ""
          )}</textarea>

        </label>


        <label>

          <input
            type="checkbox"
            name="reset"
          >

          Reset revision checkmarks

        </label>


        <div class="form-actions">

          <button
            type="button"
            class="secondary-button"
            data-close
          >
            Cancel
          </button>

          <button
            class="primary-button"
          >
            Save Changes
          </button>

        </div>

      </form>

    `);


    $("editChapterForm")
      .addEventListener(
        "submit",
        async (event) => {

          event.preventDefault();


          const form =
            new FormData(
              event.target
            );


          chapter.name =
            String(
              form.get("name")
            ).trim();


          chapter.startDate =
            String(
              form.get("date")
            );


          chapter.note =
            String(
              form.get("note") || ""
            );


          if (
            form.get("reset")
          ) {

            chapter.done =
              Array(7).fill(false);

            chapter.completedOn =
              Array(7).fill("");

          }


          await saveState();

          closeModal();

          render();

          showToast(
            "Chapter updated ✓"
          );

        }
      );

  }


  /* =========================
     DELETE CHAPTER
  ========================= */

  async function deleteChapter(
    subjectId,
    chapterId
  ) {

    const result =
      findChapter(
        subjectId,
        chapterId
      );


    if (
      !result ||
      !result.chapter
    ) {

      return;

    }


    const confirmed =
      confirm(
        `Delete "${result.chapter.name}" and its revision history?`
      );


    if (!confirmed) {

      return;

    }


    result.subject.chapters =
      result.subject.chapters.filter(
        (chapter) =>
          chapter.id !== chapterId
      );


    await saveState();

    render();

    showToast(
      "Chapter deleted"
    );

  }


  /* =========================
     MOVE CHAPTER
  ========================= */

  async function moveChapter(
    subjectId,
    chapterId,
    direction
  ) {

    const subject =
      findSubject(
        subjectId
      );


    if (!subject) {

      return;

    }


    const index =
      subject.chapters.findIndex(
        (chapter) =>
          chapter.id === chapterId
      );


    const newIndex =
      index + direction;


    if (
      index < 0 ||
      newIndex < 0 ||
      newIndex >=
        subject.chapters.length
    ) {

      return;

    }


    [
      subject.chapters[index],
      subject.chapters[newIndex]
    ] = [
      subject.chapters[newIndex],
      subject.chapters[index]
    ];


    await saveState();

    render();

  }


  /* =========================
     COMPLETE REVISION
  ========================= */

  async function toggleRevision(
    subjectId,
    chapterId,
    revisionIndex
  ) {

    const result =
      findChapter(
        subjectId,
        chapterId
      );


    if (
      !result ||
      !result.chapter
    ) {

      return;

    }


    const chapter =
      result.chapter;


    chapter.done[
      revisionIndex
    ] =
      !chapter.done[
        revisionIndex
      ];


    chapter.completedOn[
      revisionIndex
    ] =
      chapter.done[
        revisionIndex
      ]
        ? getToday()
        : "";


    if (
      chapter.done[
        revisionIndex
      ]
    ) {

      state.xp += 10;

      state.activity[
        getToday()
      ] = true;


      showToast(
        "Revision Complete ✓  +10 XP"
      );

    } else {

      showToast(
        "Revision marked incomplete"
      );

    }


    await saveState();

    render();

  }


  /* =========================
     EXAM DATE
  ========================= */

  function editExamDate() {

    openModal(`

      <h3>HSC Exam Countdown</h3>

      <form id="examForm" class="form">

        <label>

          Exam Date

          <input
            type="date"
            name="date"
            value="${state.examDate}"
            required
          >

        </label>


        <div class="form-actions">

          <button
            type="button"
            class="secondary-button"
            data-close
          >
            Cancel
          </button>

          <button
            class="primary-button"
          >
            Save Date
          </button>

        </div>

      </form>

    `);


    $("examForm")
      .addEventListener(
        "submit",
        async (event) => {

          event.preventDefault();


          const form =
            new FormData(
              event.target
            );


          state.examDate =
            String(
              form.get("date")
            );


          await saveState();

          closeModal();

          render();

          showToast(
            "Exam date saved ✓"
          );

        }
      );

  }


  /* =========================
     BACKUP
  ========================= */

  function backupData() {

    const backup = {

      app:
        "Revision Tracker",

      version:
        1,

      exportedAt:
        new Date().toISOString(),

      state

    };


    const blob =
      new Blob(
        [
          JSON.stringify(
            backup,
            null,
            2
          )
        ],
        {
          type:
            "application/json"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href = url;

    link.download =
      `revision-tracker-backup-${getToday()}.json`;

    link.click();


    setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      1000
    );


    showToast(
      "Backup downloaded ✓"
    );

  }


  /* =========================
     RESTORE
  ========================= */

  function restoreData(file) {

    if (!file) {

      return;

    }


    const reader =
      new FileReader();


    reader.onload =
      async () => {

        try {

          const data =
            JSON.parse(
              reader.result
            );


          const imported =
            data.state || data;


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


          state =
            imported;


          normalizeState();

          await saveState();

          render();

          showToast(
            "Backup restored ✓"
          );

        } catch (error) {

          console.error(
            error
          );

          alert(
            "Invalid Revision Tracker backup file."
          );

        }

      };


    reader.readAsText(
      file
    );

  }


  /* =========================
     NOTIFICATIONS
  ========================= */

  async function requestNotifications() {

    if (
      !("Notification" in window)
    ) {

      alert(
        "या browser मध्ये notifications supported नाहीत."
      );

      return;

    }


    const permission =
      await Notification.requestPermission();


    showToast(
      "Notification permission: " +
      permission
    );

  }


  /* =========================
     RESET
  ========================= */

  async function resetData() {

    const confirmed =
      confirm(
        "तुमचा पूर्ण Revision Tracker data delete करायचा आहे का?"
      );


    if (!confirmed) {

      return;

    }


    state =
      defaultState();


    await saveState();

    render();

    showToast(
      "All data reset"
    );

  }


  /* =========================
     EVENT LISTENERS
  ========================= */

  document.addEventListener(
    "click",
    async (event) => {

      const pageButton =
        event.target.closest(
          "[data-page]"
        );


      if (pageButton) {

        const pageId =
          pageButton.dataset.page;


        document
          .querySelectorAll(
            ".page"
          )
          .forEach(
            (page) => {

              page.classList.toggle(
                "active",
                page.id === pageId
              );

            }
          );


        document
          .querySelectorAll(
            ".nav-button"
          )
          .forEach(
            (button) => {

              button.classList.toggle(
                "active",
                button.dataset.page ===
                  pageId
              );

            }
          );


        window.scrollTo(
          {
            top: 0,
            behavior: "smooth"
          }
        );


        render();

        return;

      }


      if (
        event.target.closest(
          "[data-close]"
        )
      ) {

        closeModal();

        return;

      }


      const toggle =
        event.target.closest(
          "[data-toggle]"
        );


      if (toggle) {

        const [
          subjectId,
          chapterId,
          index
        ] =
          toggle.dataset
            .toggle
            .split("|");


        await toggleRevision(
          subjectId,
          chapterId,
          Number(index)
        );

        return;

      }


      const add =
        event.target.closest(
          "[data-add-chapter]"
        );


      if (add) {

        addChapter(
          add.dataset.addChapter
        );

        return;

      }


      const editSubjectButton =
        event.target.closest(
          "[data-edit-sub]"
        );


      if (editSubjectButton) {

        editSubject(
          editSubjectButton
            .dataset
            .editSub
        );

        return;

      }


      const deleteSubjectButton =
        event.target.closest(
          "[data-delete-sub]"
        );


      if (deleteSubjectButton) {

        await deleteSubject(
          deleteSubjectButton
            .dataset
            .deleteSub
        );

        return;

      }


      const editChapterButton =
        event.target.closest(
          "[data-edit-chapter]"
        );


      if (editChapterButton) {

        const [
          subjectId,
          chapterId
        ] =
          editChapterButton
            .dataset
            .editChapter
            .split("|");


        editChapter(
          subjectId,
          chapterId
        );

        return;

      }


      const deleteChapterButton =
        event.target.closest(
          "[data-delete-chapter]"
        );


      if (deleteChapterButton) {

        const [
          subjectId,
          chapterId
        ] =
          deleteChapterButton
            .dataset
            .deleteChapter
            .split("|");


        await deleteChapter(
          subjectId,
          chapterId
        );

        return;

      }


      const upButton =
        event.target.closest(
          "[data-up]"
        );


      if (upButton) {

        const [
          subjectId,
          chapterId
        ] =
          upButton.dataset.up
            .split("|");


        await moveChapter(
          subjectId,
          chapterId,
          -1
        );

        return;

      }


      const downButton =
        event.target.closest(
          "[data-down]"
        );


      if (downButton) {

        const [
          subjectId,
          chapterId
        ] =
          downButton.dataset.down
            .split("|");


        await moveChapter(
          subjectId,
          chapterId,
          1
        );

      }

    }
  );


  $("addSubjectBtn")
    .addEventListener(
      "click",
      addSubject
    );


  $("homeAddSubject")
    .addEventListener(
      "click",
      addSubject
    );


  $("examEditBtn")
    .addEventListener(
      "click",
      editExamDate
    );


  $("plannerBtn")
    .addEventListener(
      "click",
      renderPlanner
    );


  $("plannerFrom")
    .addEventListener(
      "change",
      renderPlanner
    );


  $("plannerTo")
    .addEventListener(
      "change",
      renderPlanner
    );


  $("themeBtn")
    .addEventListener(
      "click",
      async () => {

        state.theme =
          state.theme === "dark"
            ? "light"
            : "dark";


        await saveState();

        applyTheme();

      }
    );


  $("backupBtn")
    .addEventListener(
      "click",
      backupData
    );


  $("restoreBtn")
    .addEventListener(
      "click",
      () =>
        $("restoreFile").click()
    );


  $("restoreFile")
    .addEventListener(
      "change",
      (event) => {

        restoreData(
          event.target.files[0]
        );

        event.target.value = "";

      }
    );


  $("notifyBtn")
    .addEventListener(
      "click",
      requestNotifications
    );


  $("resetBtn")
    .addEventListener(
      "click",
      resetData
    );


  /* =========================
     SAVE + RENDER
  ========================= */

  async function saveAndRender() {

    await saveState();

    render();

  }


  function render() {

    applyTheme();

    renderHome();

    renderToday();

    renderSubjects();

    renderProgress();

    renderExam();

    renderPlanner();

  }


  /* =========================
     INITIALIZE APP
  ========================= */

  async function initialize() {

    try {

      database =
        await openDatabase();


      state =
        await loadState();


      if (!state) {

        state =
          defaultState();

      }


      normalizeState();


      await saveState();


      render();


      if (
        "serviceWorker" in navigator
      ) {

        navigator.serviceWorker
          .register(
            "./sw.js"
          )
          .catch(
            (error) =>
              console.warn(
                "Service Worker:",
                error
              )
          );

      }

    } catch (error) {

      console.error(
        "Initialization error:",
        error
      );


      state =
        defaultState();


      normalizeState();

      render();

    }

  }


  initialize();

})();
