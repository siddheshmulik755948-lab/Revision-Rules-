
"use strict";

/* =========================================================
   REVISION TRACKER
   Offline-first study & revision manager
   ========================================================= */

const STORAGE_KEY = "revision_tracker_data_v1";

const DEFAULT_RULES = [
  { name: "Revision 1", day: 2 },
  { name: "Revision 2", day: 4 },
  { name: "Revision 3", day: 8 },
  { name: "Revision 4", day: 16 },
  { name: "Revision 5", day: 32 },
  { name: "Final Revision", day: 65 }
];

let data = loadData();


/* =========================================================
   DATA
   ========================================================= */

function createDefaultData() {
  return {
    subjects: [],
    rules: structuredCloneSafe(DEFAULT_RULES),
    revisionHistory: {},
    notes: {},
    settings: {
      notifications: false
    }
  };
}


function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}


function loadData() {

  try {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createDefaultData();
    }

    const parsed = JSON.parse(saved);

    return {
      subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
      rules: Array.isArray(parsed.rules)
        ? parsed.rules
        : structuredCloneSafe(DEFAULT_RULES),
      revisionHistory:
        parsed.revisionHistory &&
        typeof parsed.revisionHistory === "object"
          ? parsed.revisionHistory
          : {},
      notes:
        parsed.notes &&
        typeof parsed.notes === "object"
          ? parsed.notes
          : {},
      settings: {
        notifications:
          Boolean(parsed.settings?.notifications)
      }
    };

  } catch (error) {

    console.error("Data loading error:", error);

    return createDefaultData();
  }
}


function saveData() {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

  } catch (error) {

    console.error("Data saving error:", error);

    showToast(
      "Storage is full. Large files should be stored separately."
    );
  }
}


/* =========================================================
   HELPERS
   ========================================================= */

function uid(prefix = "id") {

  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 9)
  );
}


function todayISO() {

  const d = new Date();

  const year = d.getFullYear();

  const month = String(
    d.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    d.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function parseISODate(value) {

  const [y, m, d] = value
    .split("-")
    .map(Number);

  return new Date(
    y,
    m - 1,
    d
  );
}


function formatDate(value) {

  if (!value) return "—";

  const date = parseISODate(value);

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


function daysBetween(start, end) {

  const a = parseISODate(start);
  const b = parseISODate(end);

  return Math.round(
    (b - a) /
    (1000 * 60 * 60 * 24)
  );
}


function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getSubject(subjectId) {

  return data.subjects.find(
    s => s.id === subjectId
  );
}


function getChapter(subjectId, chapterId) {

  const subject = getSubject(subjectId);

  if (!subject) return null;

  return subject.chapters.find(
    c => c.id === chapterId
  );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.toggle(
        "active",
        page.id === pageId
      );

    });


  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );

    });


  if (pageId === "homePage") renderHome();

  if (pageId === "subjectsPage") renderSubjects();

  if (pageId === "revisionsPage") renderRevisions();

  if (pageId === "plannerPage") {

    const plannerDate =
      document.getElementById("plannerDate");

    if (!plannerDate.value) {
      plannerDate.value = todayISO();
    }

  }

  if (pageId === "settingsPage") {
    renderSettings();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


document
  .querySelectorAll(".nav-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => showPage(button.dataset.page)
    );

  });


document
  .getElementById("settingsBtn")
  .addEventListener(
    "click",
    () => showPage("settingsPage")
  );


/* =========================================================
   SUBJECTS
   ========================================================= */

function addSubject() {

  openModal(
    "Add Subject",
    `
      <form id="subjectForm" class="modal-form">

        <div class="form-group">
          <label class="input-label">
            Subject name
          </label>

          <input
            id="subjectName"
            class="input"
            placeholder="e.g. Physics"
            required
            maxlength="100"
          >
        </div>

        <button class="primary-btn full-btn">
          Add Subject
        </button>

      </form>
    `
  );


  document
    .getElementById("subjectForm")
    .addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const input =
          document.getElementById("subjectName");

        const name =
          input.value.trim();

        if (!name) return;

        data.subjects.push({
          id: uid("subject"),
          name,
          chapters: []
        });

        saveData();

        closeModal();

        renderSubjects();

        renderHome();

        showToast("Subject added.");

      }
    );
}


function editSubject(subjectId) {

  const subject =
    getSubject(subjectId);

  if (!subject) return;

  openModal(
    "Edit Subject",
    `
      <form id="editSubjectForm" class="modal-form">

        <div class="form-group">
          <label class="input-label">
            Subject name
          </label>

          <input
            id="editSubjectName"
            class="input"
            value="${escapeHTML(subject.name)}"
            maxlength="100"
            required
          >
        </div>

        <button class="primary-btn full-btn">
          Save Changes
        </button>

      </form>
    `
  );


  document
    .getElementById("editSubjectForm")
    .addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const name =
          document
            .getElementById("editSubjectName")
            .value
            .trim();

        if (!name) return;

        subject.name = name;

        saveData();

        closeModal();

        renderSubjects();

        renderHome();

        showToast("Subject updated.");

      }
    );
}


function deleteSubject(subjectId) {

  const subject =
    getSubject(subjectId);

  if (!subject) return;

  const confirmed =
    confirm(
      `Delete "${subject.name}" and all its chapters?`
    );

  if (!confirmed) return;

  subject.chapters.forEach(
    chapter => {

      delete data.notes[
        chapter.id
      ];

    }
  );

  data.subjects =
    data.subjects.filter(
      s => s.id !== subjectId
    );

  saveData();

  renderSubjects();

  renderHome();

  showToast("Subject deleted.");
}


/* =========================================================
   CHAPTERS
   ========================================================= */

function addChapter(subjectId) {

  const subject =
    getSubject(subjectId);

  if (!subject) return;

  openModal(
    "Add Chapter",
    `
      <form id="chapterForm" class="modal-form">

        <div class="form-group">

          <label class="input-label">
            Chapter name
          </label>

          <input
            id="chapterName"
            class="input"
            placeholder="e.g. Ray Optics"
            maxlength="150"
            required
          >

        </div>


        <div class="form-group">

          <label class="input-label">
            Chapter Start Date
          </label>

          <input
            id="chapterStartDate"
            class="input"
            type="date"
            value="${todayISO()}"
            required
          >

        </div>


        <button class="primary-btn full-btn">
          Start Chapter
        </button>

      </form>
    `
  );


  document
    .getElementById("chapterForm")
    .addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const name =
          document
            .getElementById("chapterName")
            .value
            .trim();

        const startDate =
          document
            .getElementById("chapterStartDate")
            .value;

        if (!name || !startDate) {
          showToast(
            "Enter chapter name and date."
          );
          return;
        }


        subject.chapters.push({

          id: uid("chapter"),

          name,

          startDate,

          createdAt: new Date().toISOString(),

          notes: "",

          attachments: []

        });


        saveData();

        closeModal();

        renderSubjects();

        renderHome();

        showToast("Chapter added.");

      }
    );
}


function editChapter(subjectId, chapterId) {

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );

  if (!chapter) return;


  openModal(
    "Edit Chapter",
    `
      <form id="editChapterForm" class="modal-form">

        <div class="form-group">

          <label class="input-label">
            Chapter name
          </label>

          <input
            id="editChapterName"
            class="input"
            value="${escapeHTML(chapter.name)}"
            required
            maxlength="150"
          >

        </div>


        <div class="form-group">

          <label class="input-label">
            Start Date
          </label>

          <input
            id="editChapterDate"
            class="input"
            type="date"
            value="${chapter.startDate}"
            required
          >

        </div>


        <button class="primary-btn full-btn">
          Save Changes
        </button>

      </form>
    `
  );


  document
    .getElementById("editChapterForm")
    .addEventListener(
      "submit",
      event => {

        event.preventDefault();

        chapter.name =
          document
            .getElementById("editChapterName")
            .value
            .trim();

        chapter.startDate =
          document
            .getElementById("editChapterDate")
            .value;

        saveData();

        closeModal();

        renderSubjects();

        renderHome();

        showToast("Chapter updated.");

      }
    );
}


function deleteChapter(subjectId, chapterId) {

  const subject =
    getSubject(subjectId);

  if (!subject) return;

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );

  if (!chapter) return;

  if (
    !confirm(
      `Delete "${chapter.name}"?`
    )
  ) return;


  subject.chapters =
    subject.chapters.filter(
      c => c.id !== chapterId
    );

  delete data.notes[
    chapterId
  ];

  saveData();

  renderSubjects();

  renderHome();

  showToast("Chapter deleted.");
}


/* =========================================================
   MOVE CHAPTER
   ========================================================= */

function moveChapter(
  sourceSubjectId,
  chapterId
) {

  const source =
    getSubject(sourceSubjectId);

  const chapter =
    getChapter(
      sourceSubjectId,
      chapterId
    );

  if (!source || !chapter) return;


  const targets =
    data.subjects.filter(
      s => s.id !== sourceSubjectId
    );


  if (!targets.length) {

    showToast(
      "Add another subject first."
    );

    return;
  }


  const options =
    targets
      .map(
        subject =>
          `<option value="${subject.id}">
            ${escapeHTML(subject.name)}
          </option>`
      )
      .join("");


  openModal(
    "Move Chapter",
    `
      <div class="modal-form">

        <p class="muted">
          Move "${escapeHTML(chapter.name)}"
          to another subject.
        </p>

        <select
          id="moveTarget"
          class="select"
        >
          ${options}
        </select>

        <button
          id="confirmMove"
          class="primary-btn full-btn"
        >
          Move Chapter
        </button>

      </div>
    `
  );


  document
    .getElementById("confirmMove")
    .addEventListener(
      "click",
      () => {

        const targetId =
          document
            .getElementById("moveTarget")
            .value;

        const target =
          getSubject(targetId);

        if (!target) return;


        source.chapters =
          source.chapters.filter(
            c => c.id !== chapterId
          );


        target.chapters.push(
          chapter
        );


        saveData();

        closeModal();

        renderSubjects();

        renderHome();

        showToast(
          `Chapter moved to ${target.name}.`
        );

      }
    );
}


/* =========================================================
   NOTES
   ========================================================= */

function openNotes(
  subjectId,
  chapterId
) {

  const chapter =
    getChapter(
      subjectId,
      chapterId
    );

  if (!chapter) return;


  const saved =
    data.notes[chapterId] || {
      text: "",
      attachments: []
    };


  openModal(
    `Notes — ${chapter.name}`,
    `
      <div class="notes-area">

        <label class="input-label">
          Chapter Notes
        </label>

        <textarea
          id="chapterNotes"
          class="textarea"
          placeholder="Write your notes here..."
        >${escapeHTML(saved.text || "")}</textarea>


        <button
          id="saveNotes"
          class="primary-btn full-btn"
        >
          💾 Save Notes
        </button>


        <hr>


        <label class="input-label">
          Photos / PDFs / Videos
        </label>

        <input
          id="attachmentInput"
          class="input"
          type="file"
          multiple
          accept="image/*,application/pdf,video/*"
        >


        <div id="attachmentList"
             class="file-list">

          ${
            renderAttachmentHTML(
              saved.attachments || []
            )
          }

        </div>

      </div>
    `
  );


  document
    .getElementById("saveNotes")
    .addEventListener(
      "click",
      () => {

        data.notes[chapterId] = {
          text:
            document
              .getElementById("chapterNotes")
              .value,

          attachments:
            saved.attachments || []
        };

        saveData();

        showToast(
          "Notes saved."
        );

      }
    );


  document
    .getElementById("attachmentInput")
    .addEventListener(
      "change",
      async event => {

        const files =
          Array.from(
            event.target.files
          );

        if (!files.length) return;


        /*
         * Browser storage limits vary.
         * This version stores file metadata and
         * small files in IndexedDB.
         */

        for (const file of files) {

          try {

            const id =
              await storeFile(file);

            saved.attachments.push({
              id,
              name: file.name,
              type: file.type,
              size: file.size
            });

          } catch (error) {

            console.error(error);

            showToast(
              "One or more files could not be stored."
            );
          }
        }


        data.notes[chapterId] =
          saved;

        saveData();


        document
          .getElementById(
            "attachmentList"
          )
          .innerHTML =
          renderAttachmentHTML(
            saved.attachments
          );


        event.target.value = "";

      }
    );
}


function renderAttachmentHTML(
  attachments
) {

  if (!attachments.length) {

    return `
      <div class="empty">
        No files added yet.
      </div>
    `;

  }


  return attachments
    .map(
      file => `
        <div class="file-item">

          <strong>
            ${escapeHTML(file.name)}
          </strong>

          <div class="muted">
            ${escapeHTML(file.type || "File")}
          </div>

        </div>
      `
    )
    .join("");
}


/* =========================================================
   INDEXED DB FOR FILES
   ========================================================= */

const DB_NAME =
  "RevisionTrackerFiles";

const DB_VERSION = 1;

let dbPromise = null;


function openDB() {

  if (dbPromise) return dbPromise;


  dbPromise =
    new Promise(
      (resolve, reject) => {

        const request =
          indexedDB.open(
            DB_NAME,
            DB_VERSION
          );


        request.onupgradeneeded =
          event => {

            const db =
              event.target.result;

            if (
              !db.objectStoreNames.contains(
                "files"
              )
            ) {

              db.createObjectStore(
                "files",
                {
                  keyPath: "id"
                }
              );

            }

          };


        request.onsuccess =
          () => resolve(
            request.result
          );


        request.onerror =
          () => reject(
            request.error
          );

      }
    );


  return dbPromise;
}


async function storeFile(file) {

  const db =
    await openDB();

  const id =
    uid("file");


  return new Promise(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          "files",
          "readwrite"
        );

      transaction.objectStore(
        "files"
      ).put({
        id,
        blob: file
      });


      transaction.oncomplete =
        () => resolve(id);

      transaction.onerror =
        () => reject(
          transaction.error
        );

    }
  );
}


/* =========================================================
   REVISION CALCULATION
   ========================================================= */

function getRevisionItemsForDate(
  date
) {

  const items = [];


  data.subjects.forEach(
    subject => {

      subject.chapters.forEach(
        chapter => {

          const elapsed =
            daysBetween(
              chapter.startDate,
              date
            );


          if (elapsed < 0) return;


          data.rules.forEach(
            rule => {

              if (
                elapsed !==
                Number(rule.day)
              ) return;


              const key =
                revisionKey(
                  chapter.id,
                  rule
                );


              const history =
                data.revisionHistory[key];


              items.push({

                key,

                subjectId:
                  subject.id,

                subjectName:
                  subject.name,

                chapterId:
                  chapter.id,

                chapterName:
                  chapter.name,

                revisionName:
                  rule.name,

                dueDate:
                  addDays(
                    chapter.startDate,
                    Number(rule.day)
                  ),

                day:
                  Number(rule.day),

                submitted:
                  Boolean(
                    history?.submitted
                  )

              });

            }
          );

        }
      );

    }
  );


  return items;
}


function revisionKey(
  chapterId,
  rule
) {

  return (
    chapterId +
    "::" +
    rule.name +
    "::" +
    rule.day
  );
}


function addDays(
  dateString,
  number
) {

  const date =
    parseISODate(dateString);

  date.setDate(
    date.getDate() +
    Number(number)
  );


  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


  return `${year}-${month}-${day}`;
}


function getIncompleteRevisions() {

  const today =
    todayISO();

  const items = [];


  data.subjects.forEach(
    subject => {

      subject.chapters.forEach(
        chapter => {

          data.rules.forEach(
            rule => {

              const due =
                addDays(
                  chapter.startDate,
                  Number(rule.day)
                );


              if (
                due >= today
              ) return;


              const key =
                revisionKey(
                  chapter.id,
                  rule
                );


              const history =
                data.revisionHistory[key];


              if (
                history?.submitted
              ) return;


              items.push({

                key,

                subjectId:
                  subject.id,

                subjectName:
                  subject.name,

                chapterId:
                  chapter.id,

                chapterName:
                  chapter.name,

                revisionName:
                  rule.name,

                dueDate:
                  due,

                day:
                  Number(rule.day),

                lateDays:
                  daysBetween(
                    due,
                    today
                  )

              });

            }
          );

        }
      );

    }
  );


  return items;
}


/* =========================================================
   REVISION CONFIRM / SUBMIT
   ========================================================= */

function showConfirmBox(key) {

  const box =
    document.querySelector(
      `[data-confirm="${CSS.escape(key)}"]`
    );

  if (!box) return;

  box.classList.add("show");
}


function submitRevision(key) {

  const confirmed =
    confirm(
      "Confirm that this revision is completed?"
    );

  if (!confirmed) return;


  data.revisionHistory[key] = {

    submitted: true,

    submittedAt:
      new Date().toISOString()

  };


  saveData();

  renderRevisions();

  renderHome();

  showToast(
    "Revision permanently submitted."
  );
}


/* =========================================================
   RENDER REVISIONS
   ========================================================= */

function renderRevisionCard(
  item,
  incomplete = false
) {

  const history =
    data.revisionHistory[item.key];

  const submitted =
    Boolean(
      history?.submitted
    );


  const lateHTML =
    incomplete
      ? `
        <small class="late-text">
          Late by ${item.lateDays} day(s)
        </small>
      `
      : "";


  return `
    <div
      class="revision-card ${
        submitted ? "completed" : ""
      }"
    >

      <div class="revision-top">

        <div>

          <p class="revision-title">
            ${submitted ? "✓ " : ""}
            ${escapeHTML(item.chapterName)}
          </p>

          <p class="revision-subtitle">
            ${escapeHTML(item.subjectName)}
            • ${escapeHTML(item.revisionName)}
          </p>

          <p class="revision-subtitle">
            Due: ${formatDate(item.dueDate)}
          </p>

          ${
            incomplete
              ? `
                <p class="revision-subtitle late-text">
                  Overdue by ${item.lateDays} day(s)
                </p>
              `
              : ""
          }

        </div>


        <div class="revision-right">

          <small>
            Day ${item.day}
          </small>

          ${
            submitted
              ? `
                <button
                  class="check-button"
                  disabled
                >
                  ✓
                </button>
              `
              : `
                <button
                  class="check-button"
                  data-check="${escapeHTML(item.key)}"
                >
                  ✓
                </button>
              `
          }

        </div>

      </div>


      ${
        submitted
          ? `
            <div class="muted">
              Final submitted ✓
            </div>
          `
          : `
            <div
              class="confirm-box"
              data-confirm="${escapeHTML(item.key)}"
            >

              <button
                class="submit-button"
                data-submit="${escapeHTML(item.key)}"
              >
                ✓ Confirm & Submit
              </button>

            </div>
          `
      }

    </div>
  `;
}


function attachRevisionEvents() {

  document
    .querySelectorAll("[data-check]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          showConfirmBox(
            button.dataset.check
          )
      );

    });


  document
    .querySelectorAll("[data-submit]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          submitRevision(
            button.dataset.submit
          )
      );

    });

}


function renderRevisions() {

  const today =
    todayISO();


  const todayItems =
    getRevisionItemsForDate(
      today
    );


  const incomplete =
    getIncompleteRevisions();


  const todayList =
    document.getElementById(
      "todayRevisionList"
    );


  const incompleteList =
    document.getElementById(
      "incompleteRevisionList"
    );


  document.getElementById(
    "todayRevisionBadge"
  ).textContent =
    todayItems.length;


  document.getElementById(
    "lateRevisionBadge"
  ).textContent =
    incomplete.length;


  todayList.innerHTML =
    todayItems.length
      ? todayItems
          .map(item =>
            renderRevisionCard(item)
          )
          .join("")
      : `
          <div class="empty">
            🎉 No revisions scheduled for today.
          </div>
        `;


  incompleteList.innerHTML =
    incomplete.length
      ? incomplete
          .map(item =>
            renderRevisionCard(
              item,
              true
            )
          )
          .join("")
      : `
          <div class="empty">
            Excellent! No incomplete revisions.
          </div>
        `;


  attachRevisionEvents();

}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {

  const subjects =
    data.subjects;


  const chapters =
    subjects.reduce(
      (total, subject) =>
        total +
        subject.chapters.length,
      0
    );


  const todayItems =
    getRevisionItemsForDate(
      todayISO()
    );


  const incomplete =
    getIncompleteRevisions();


  document.getElementById(
    "subjectCount"
  ).textContent =
    subjects.length;


  document.getElementById(
    "chapterCount"
  ).textContent =
    chapters;


  document.getElementById(
    "todayCount"
  ).textContent =
    todayItems.length;


  document.getElementById(
    "incompleteCount"
  ).textContent =
    incomplete.length;


  const totalRevisions =
    subjects.reduce(
      (total, subject) =>
        total +
        subject.chapters.length *
        data.rules.length,
      0
    );


  const completed =
    Object.values(
      data.revisionHistory
    ).filter(
      item =>
        item &&
        item.submitted
    ).length;


  const percent =
    totalRevisions
      ? Math.min(
          100,
          Math.round(
            completed /
            totalRevisions *
            100
          )
        )
      : 0;


  document.getElementById(
    "overallPercent"
  ).textContent =
    `${percent}%`;


  document.getElementById(
    "overallProgress"
  ).style.width =
    `${percent}%`;


  const homeToday =
    document.getElementById(
      "homeTodayList"
    );


  homeToday.innerHTML =
    todayItems.length
      ? todayItems
          .slice(0, 4)
          .map(item =>
            renderRevisionCard(item)
          )
          .join("")
      : `
        <div class="empty">
          🎉 No revisions today.
        </div>
      `;


  const homeSubjects =
    document.getElementById(
      "homeSubjects"
    );


  homeSubjects.innerHTML =
    subjects.length
      ? subjects
          .slice(0, 5)
          .map(
            subject => `
              <div class="subject-card">

                <div class="subject-top">

                  <div class="subject-info">

                    <div class="subject-icon">
                      📚
                    </div>

                    <div>

                      <h3>
                        ${escapeHTML(subject.name)}
                      </h3>

                      <p>
                        ${subject.chapters.length}
                        chapter(s)
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            `
          )
          .join("")
      : `
        <div class="empty">
          Add your first subject.
        </div>
      `;


  attachRevisionEvents();

}


/* =========================================================
   SUBJECT PAGE
   ========================================================= */

function renderSubjects() {

  const container =
    document.getElementById(
      "subjectsList"
    );


  if (!data.subjects.length) {

    container.innerHTML = `
      <div class="section-card">
        <div class="empty">
          📚 No subjects yet.<br>
          Add your first subject to begin.
        </div>
      </div>
    `;

    return;
  }


  container.innerHTML =
    data.subjects
      .map(
        subject => `

          <section
            class="subject-card"
          >

            <div class="subject-top">

              <div class="subject-info">

                <div class="subject-icon">
                  📚
                </div>

                <div>

                  <h3>
                    ${escapeHTML(subject.name)}
                  </h3>

                  <p>
                    ${subject.chapters.length}
                    chapter(s)
                  </p>

                </div>

              </div>


              <div class="chapter-actions">

                <button
                  class="mini-btn"
                  data-action="edit-subject"
                  data-subject="${subject.id}"
                >
                  ✏️
                </button>

                <button
                  class="mini-btn"
                  data-action="delete-subject"
                  data-subject="${subject.id}"
                >
                  🗑️
                </button>

              </div>

            </div>


            <button
              class="secondary-btn full-btn"
              data-action="add-chapter"
              data-subject="${subject.id}"
            >
              ＋ Add Chapter
            </button>


            <div class="chapter-list">

              ${
                subject.chapters.length
                  ? subject.chapters
                      .map(
                        chapter => `

                          <div
                            class="chapter-card"
                          >

                            <div class="chapter-top">

                              <div>

                                <p class="chapter-name">
                                  ${escapeHTML(chapter.name)}
                                </p>

                                <p class="chapter-meta">
                                  Started:
                                  ${formatDate(chapter.startDate)}
                                </p>

                              </div>


                              <div
                                class="chapter-actions"
                              >

                                <button
                                  class="mini-btn"
                                  data-action="edit-chapter"
                                  data-subject="${subject.id}"
                                  data-chapter="${chapter.id}"
                                >
                                  ✏️
                                </button>

                                <button
                                  class="mini-btn"
                                  data-action="move-chapter"
                                  data-subject="${subject.id}"
                                  data-chapter="${chapter.id}"
                                >
                                  ↗️
                                </button>

                                <button
                                  class="mini-btn"
                                  data-action="notes"
                                  data-subject="${subject.id}"
                                  data-chapter="${chapter.id}"
                                >
                                  📝
                                </button>

                                <button
                                  class="mini-btn"
                                  data-action="delete-chapter"
                                  data-subject="${subject.id}"
                                  data-chapter="${chapter.id}"
                                >
                                  🗑️
                                </button>

                              </div>

                            </div>

                          </div>

                        `
                      )
                      .join("")
                  : `
                    <div class="empty">
                      No chapters yet.
                    </div>
                  `
              }

            </div>

          </section>

        `
      )
      .join("");


  attachSubjectEvents();

}


function attachSubjectEvents() {

  document
    .querySelectorAll(
      '[data-action="edit-subject"]'
    )
    .forEach(
      button =>
        button.onclick = () =>
          editSubject(
            button.dataset.subject
          )
    );


  document
    .querySelectorAll(
      '[data-action="delete-subject"]'
    )
    .forEach(
      button =>
        button.onclick = () =>
          deleteSubject(
            button.dataset.subject
          )
    );


  document
    .querySelectorAll(
      '[data-action="add-chapter"]'
    )
    .forEach(
      button =>
        button.onclick = () =>
          addChapter(
            button.dataset.subject
          )
    );


  document
    .querySelectorAll(
      '[data-action="edit-chapter"]'
    )
    .forEach(
      button =>
        button.onclick = () =>
          editChapter(
            button.dataset.subject,
            button.dataset.chapter
          )
    );


  document
    .querySelectorAll(
      '[data-action="move-chapter"]'
    )
    .forEach(
      button =>
        button.onclick = () =>
          moveChapter(
            button.dataset.subject,
            button.dataset.chapter
          )
    );


  document
    .querySelectorAll(
      '[data-action="notes"]'
    )
    .forEach(
      button =>
        button.onclick = () =>
          openNotes(
            button.dataset.subject,
            button.dataset.chapter
          )
    );


  document
    .querySelectorAll(
      '[data-action="delete-chapter"]'
    )
    .forEach(
      button =>
        button.onclick = () =>
          deleteChapter(
            button.dataset.subject,
            button.dataset.chapter
          )
    );

}


/* =========================================================
   PLANNER
   ========================================================= */

function renderPlannerDate() {

  const date =
    document
      .getElementById(
        "plannerDate"
      )
      .value;


  if (!date) return;


  const items =
    getRevisionItemsForDate(
      date
    );


  document.getElementById(
    "plannerResultTitle"
  ).textContent =
    `Revisions — ${formatDate(date)}`;


  const container =
    document.getElementById(
      "plannerResult"
    );


  container.innerHTML =
    items.length
      ? items
          .map(item =>
            renderRevisionCard(item)
          )
          .join("")
      : `
          <div class="empty">
            No revision scheduled for this date.
          </div>
        `;


  attachRevisionEvents();

}


function renderTrip() {

  const start =
    document
      .getElementById(
        "tripStart"
      )
      .value;


  const end =
    document
      .getElementById(
        "tripEnd"
      )
      .value;


  const container =
    document.getElementById(
      "tripResult"
    );


  if (!start || !end) {

    showToast(
      "Select both dates."
    );

    return;
  }


  if (start > end) {

    showToast(
      "End date must be after start date."
    );

    return;
  }


  const totalDays =
    daysBetween(
      start,
      end
    ) + 1;


  if (totalDays > 366) {

    showToast(
      "Period cannot be longer than one year."
    );

    return;
  }


  let html = "";


  for (
    let i = 0;
    i < totalDays;
    i++
  ) {

    const date =
      addDays(
        start,
        i
      );


    const items =
      getRevisionItemsForDate(
        date
      );


    html += `
      <div class="trip-day">

        <h4>
          ${formatDate(date)}
        </h4>

        ${
          items.length
            ? items
                .map(
                  item => `
                    <p>
                      🔄
                      ${escapeHTML(item.subjectName)}
                      —
                      ${escapeHTML(item.chapterName)}
                      —
                      ${escapeHTML(item.revisionName)}
                    </p>
                  `
                )
                .join("")
            : `
              <p>
                No revision scheduled.
              </p>
            `
        }

      </div>
    `;
  }


  container.innerHTML =
    html;
}


/* =========================================================
   SETTINGS
   ========================================================= */

function renderSettings() {

  const container =
    document.getElementById(
      "revisionRules"
    );


  container.innerHTML =
    data.rules
      .map(
        (rule, index) => `
          <div class="rule-row">

            <div class="rule-day">
              Day ${index === 0 ? 1 : rule.day}
            </div>

            <input
              class="input rule-input"
              data-index="${index}"
              type="number"
              min="1"
              max="3650"
              value="${rule.day}"
            >

          </div>

          <div class="muted"
               style="margin-left:78px;margin-top:-2px;margin-bottom:6px;">
            ${escapeHTML(rule.name)}
          </div>
        `
      )
      .join("");


  document.getElementById(
    "notificationToggle"
  ).checked =
    Boolean(
      data.settings.notifications
    );

}


function saveRevisionRules() {

  const inputs =
    Array.from(
      document.querySelectorAll(
        ".rule-input"
      )
    );


  const values =
    inputs.map(
      input =>
        Number(input.value)
    );


  if (
    values.some(
      value =>
        !Number.isFinite(value) ||
        value < 1
      )
    )
  {

    showToast(
      "Enter valid revision days."
    );

    return;
  }


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    if (
      values[i] <=
      values[i - 1]
    ) {

      showToast(
        "Revision days must be in increasing order."
      );

      return;
    }

  }


  data.rules =
    data.rules.map(
      (rule, index) => ({
        ...rule,
        day: values[index]
      })
    );


  saveData();

  showToast(
    "Revision system updated."
  );

  renderHome();

  renderRevisions();

}


function restoreDefaultRules() {

  if (
    !confirm(
      "Restore Day 2, 4, 8, 16, 32, 65?"
    )
  ) return;


  data.rules =
    structuredCloneSafe(
      DEFAULT_RULES
    );


  saveData();

  renderSettings();

  renderHome();

  renderRevisions();

  showToast(
    "Default revision system restored."
  );
}


/* =========================================================
   RESET
   ========================================================= */

function resetSelectedData() {

  const subjects =
    document.getElementById(
      "resetSubjects"
    ).checked;


  const revisions =
    document.getElementById(
      "resetRevisions"
    ).checked;


  const notes =
    document.getElementById(
      "resetNotes"
    ).checked;


  const settings =
    document.getElementById(
      "resetSettings"
    ).checked;


  if (
    !subjects &&
    !revisions &&
    !notes &&
    !settings
  ) {

    showToast(
      "Select something to delete."
    );

    return;
  }


  if (
    !confirm(
      "Delete the selected data?"
    )
  ) return;


  if (subjects) {

    data.subjects = [];

  }


  if (revisions) {

    data.revisionHistory = {};

  }


  if (notes) {

    data.notes = {};

  }


  if (settings) {

    data.rules =
      structuredCloneSafe(
        DEFAULT_RULES
      );

    data.settings = {
      notifications: false
    };

  }


  saveData();

  renderHome();

  renderSubjects();

  renderRevisions();

  renderSettings();

  showToast(
    "Selected data deleted."
  );

}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

async function enableNotifications() {

  if (
    !("Notification" in window)
  ) {

    showToast(
      "Notifications are not supported here."
    );

    return;
  }


  try {

    const permission =
      await Notification.requestPermission();


    if (
      permission === "granted"
    ) {

      data.settings.notifications =
        true;

      saveData();

      renderSettings();

      showToast(
        "Notifications enabled."
      );

    } else {

      showToast(
        "Notification permission was not granted."
      );

    }

  } catch (error) {

    console.error(error);

    showToast(
      "Could not enable notifications."
    );

  }
}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(
  title,
  body
) {

  document.getElementById(
    "modalTitle"
  ).textContent =
    title;


  document.getElementById(
    "modalBody"
  ).innerHTML =
    body;


  document
    .getElementById(
      "modalOverlay"
    )
    .classList.remove(
      "hidden"
    );

}


function closeModal() {

  document
    .getElementById(
      "modalOverlay"
    )
    .classList.add(
      "hidden"
    );

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
      2600
    );

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

document
  .getElementById(
    "closeModal"
  )
  .addEventListener(
    "click",
    closeModal
  );


document
  .getElementById(
    "modalOverlay"
  )
  .addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "modalOverlay"
      ) {

        closeModal();

      }

    }
  );


document
  .getElementById(
    "addSubjectBtn"
  )
  .addEventListener(
    "click",
    addSubject
  );


document
  .getElementById(
    "homeAddSubject"
  )
  .addEventListener(
    "click",
    addSubject
  );


document
  .getElementById(
    "checkDateBtn"
  )
  .addEventListener(
    "click",
    renderPlannerDate
  );


document
  .getElementById(
    "checkTripBtn"
  )
  .addEventListener(
    "click",
    renderTrip
  );


document
  .getElementById(
    "saveRulesBtn"
  )
  .addEventListener(
    "click",
    saveRevisionRules
  );


document
  .getElementById(
    "resetRulesBtn"
  )
  .addEventListener(
    "click",
    restoreDefaultRules
  );


document
  .getElementById(
    "resetDataBtn"
  )
  .addEventListener(
    "click",
    resetSelectedData
  );


document
  .getElementById(
    "notificationBtn"
  )
  .addEventListener(
    "click",
    enableNotifications
  );


document
  .getElementById(
    "notificationToggle"
  )
  .addEventListener(
    "change",
    event => {

      data.settings.notifications =
        event.target.checked;

      saveData();

    }
  );


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "sw.js"
        )
        .then(
          registration => {

            console.log(
              "Service Worker registered:",
              registration.scope
            );

          }
        )
        .catch(
          error => {

            console.error(
              "Service Worker registration failed:",
              error
            );

          }
        );

    }
  );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initialize() {

  document.getElementById(
    "headerDate"
  ).textContent =
    new Date().toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );


  document.getElementById(
    "plannerDate"
  ).value =
    todayISO();


  renderHome();

  renderSubjects();

  renderRevisions();

  renderSettings();

}


initialize();
