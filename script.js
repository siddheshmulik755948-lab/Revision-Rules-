"use strict";


/* =========================================================
   REVISION TRACKER
   ========================================================= */


/* ================= CONSTANTS ================= */

const DB_NAME = "RevisionTrackerDB";
const DB_VERSION = 1;

const SUBJECTS = [
  "Physics",
  "Chemistry",
  "Mathematics Part 1",
  "Mathematics Part 2",
  "Biology",
  "English",
  "Marathi"
];


/*
  Revision schedule:

  Day 1
  Day 3
  Day 7
  Day 14
  Day 30
*/

const REVISION_DAYS = [1, 3, 7, 14, 30];


let db = null;

let appData = {
  chapters: [],
  revisions: [],
  settings: {
    revisionDays: REVISION_DAYS,
    streak: 0,
    lastCompletedDate: null
  }
};


/* ================= DOM HELPERS ================= */

const $ = id => document.getElementById(id);


function todayISO() {

  const d = new Date();

  const year = d.getFullYear();

  const month =
    String(d.getMonth() + 1).padStart(2, "0");

  const day =
    String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function formatDate(dateString) {

  if (!dateString) {
    return "";
  }

  const d = new Date(dateString + "T00:00:00");

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


function dateDifference(fromDate, toDate) {

  const a =
    new Date(fromDate + "T00:00:00");

  const b =
    new Date(toDate + "T00:00:00");

  return Math.floor(
    (b - a) / 86400000
  );
}


function createId(prefix = "id") {

  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(2, 9)
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


/* ================= TOAST ================= */

let toastTimer = null;


function showToast(message) {

  const toast = $("toast");

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {

    toast.classList.remove("show");

  }, 2500);
}


/* ================= MODAL ================= */

function openModal(content) {

  $("modalContent").innerHTML = content;

  $("modalOverlay").classList.remove("hidden");

}


function closeModal() {

  $("modalOverlay").classList.add("hidden");

  $("modalContent").innerHTML = "";

}


/* ================= INDEXED DB ================= */

function openDatabase() {

  return new Promise((resolve, reject) => {

    const request =
      indexedDB.open(DB_NAME, DB_VERSION);


    request.onupgradeneeded = event => {

      const database = event.target.result;


      if (!database.objectStoreNames.contains("attachments")) {

        const store =
          database.createObjectStore(
            "attachments",
            { keyPath: "id" }
          );

        store.createIndex(
          "chapterId",
          "chapterId",
          { unique: false }
        );

      }

    };


    request.onsuccess = event => {

      db = event.target.result;

      resolve(db);

    };


    request.onerror = () => {

      reject(request.error);

    };

  });

}


function saveAttachment(fileRecord) {

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        "attachments",
        "readwrite"
      );

    const store =
      transaction.objectStore("attachments");


    const request =
      store.put(fileRecord);


    request.onsuccess = () => resolve();

    request.onerror =
      () => reject(request.error);

  });

}


function getAttachments(chapterId) {

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        "attachments",
        "readonly"
      );

    const store =
      transaction.objectStore("attachments");


    const index =
      store.index("chapterId");


    const request =
      index.getAll(chapterId);


    request.onsuccess = () => {

      resolve(request.result || []);

    };


    request.onerror =
      () => reject(request.error);

  });

}


function deleteAttachment(id) {

  return new Promise((resolve, reject) => {

    const transaction =
      db.transaction(
        "attachments",
        "readwrite"
      );

    const store =
      transaction.objectStore("attachments");


    const request =
      store.delete(id);


    request.onsuccess = () => resolve();

    request.onerror =
      () => reject(request.error);

  });

}


function deleteChapterAttachments(chapterId) {

  return new Promise(async (resolve, reject) => {

    try {

      const files =
        await getAttachments(chapterId);

      for (const file of files) {

        await deleteAttachment(file.id);

      }

      resolve();

    } catch (error) {

      reject(error);

    }

  });

}


/* ================= LOCAL DATA ================= */

function loadData() {

  try {

    const saved =
      localStorage.getItem(
        "revisionTrackerData"
      );


    if (saved) {

      const parsed =
        JSON.parse(saved);


      appData = {

        chapters:
          Array.isArray(parsed.chapters)
            ? parsed.chapters
            : [],

        revisions:
          Array.isArray(parsed.revisions)
            ? parsed.revisions
            : [],

        settings:
          parsed.settings || {
            revisionDays: REVISION_DAYS,
            streak: 0,
            lastCompletedDate: null
          }

      };

    }

  } catch (error) {

    console.error(
      "Data loading error:",
      error
    );

  }

}


function saveData() {

  localStorage.setItem(
    "revisionTrackerData",
    JSON.stringify(appData)
  );

}


/* ================= SERVICE WORKER ================= */

function registerServiceWorker() {

  if (
    "serviceWorker" in navigator
  ) {

    window.addEventListener(
      "load",
      () => {

        navigator.serviceWorker
          .register("./sw.js")
          .catch(error => {

            console.error(
              "Service Worker error:",
              error
            );

          });

      }
    );

  }

}


/* ================= NAVIGATION ================= */

function setupNavigation() {

  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const pageId =
            button.dataset.page;


          document
            .querySelectorAll(".page")
            .forEach(page => {

              page.classList.remove(
                "active"
              );

            });


          $(pageId)
            .classList.add("active");


          document
            .querySelectorAll(".nav-btn")
            .forEach(btn => {

              btn.classList.remove(
                "active"
              );

            });


          button.classList.add(
            "active"
          );


          renderCurrentPage(pageId);

        }
      );

    });

}


function renderCurrentPage(pageId) {

  if (pageId === "homePage") {
    renderHome();
  }

  if (pageId === "todayPage") {
    renderToday();
  }

  if (pageId === "incompletePage") {
    renderIncomplete();
  }

  if (pageId === "plannerPage") {

    $("plannerStart").value =
      $("plannerStart").value ||
      todayISO();

    $("plannerEnd").value =
      $("plannerEnd").value ||
      todayISO();

  }

}


/* ================= HOME ================= */

function renderHome() {

  $("todayText").textContent =
    new Date().toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );


  const totalChapters =
    appData.chapters.length;


  const completed =
    appData.revisions.filter(
      r => r.status === "completed"
    ).length;


  const totalRevisions =
    appData.revisions.length;


  const percentage =
    totalRevisions === 0
      ? 0
      : Math.round(
          (completed / totalRevisions) * 100
        );


  $("totalChapters")
    .textContent =
    totalChapters;


  $("completedRevisions")
    .textContent =
    completed;


  $("pendingRevisions")
    .textContent =
    totalRevisions - completed;


  $("overallPercent")
    .textContent =
    `${percentage}%`;


  const degrees =
    percentage * 3.6;


  document
    .querySelector(".progress-ring")
    .style.background =
      `conic-gradient(
        var(--primary)
        ${degrees}deg,
        #dfe5df
        ${degrees}deg
      )`;


  $("streakValue")
    .textContent =
    appData.settings.streak || 0;


  renderSubjects();

}


/* ================= SUBJECTS ================= */

function renderSubjects() {

  const container =
    $("subjectsContainer");


  container.innerHTML = "";


  SUBJECTS.forEach(subject => {

    const chapters =
      appData.chapters.filter(
        c => c.subject === subject
      );


    const chapterIds =
      new Set(
        chapters.map(c => c.id)
      );


    const revisions =
      appData.revisions.filter(
        r => chapterIds.has(r.chapterId)
      );


    const completed =
      revisions.filter(
        r => r.status === "completed"
      ).length;


    const percent =
      revisions.length === 0
        ? 0
        : Math.round(
            (completed / revisions.length) * 100
          );


    const card =
      document.createElement("div");


    card.className =
      "subject-card";


    card.innerHTML = `

      <div class="subject-top">

        <div class="subject-name">
          ${escapeHTML(subject)}
        </div>

        <button
          class="small-btn"
          data-add-subject="${escapeHTML(subject)}"
          title="Add chapter"
        >
          ＋
        </button>

      </div>


      <div class="subject-progress">

        <div
          class="subject-progress-bar"
          style="width:${percent}%"
        ></div>

      </div>


      <div class="subject-meta">

        <span>
          ${chapters.length} chapter(s)
        </span>

        <span>
          ${percent}% revised
        </span>

      </div>


      <div class="chapter-list">

        ${
          chapters.length === 0

            ? `
              <div
                style="
                  padding:10px;
                  color:var(--muted);
                  font-size:11px;
                  text-align:center;
                "
              >
                No chapters added yet.
              </div>
            `

            : chapters
                .map(chapterHTML)
                .join("")
        }

      </div>


      <button
        class="add-chapter-btn"
        data-add-subject="${escapeHTML(subject)}"
      >
        + Add Chapter
      </button>

    `;


    container.appendChild(card);

  });


  container
    .querySelectorAll(
      "[data-add-subject]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openChapterModal(
            button.dataset.addSubject
          );

        }
      );

    });


  container
    .querySelectorAll(
      "[data-edit-chapter]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openChapterModal(
            button.dataset.subject,
            button.dataset.editChapter
          );

        }
      );

    });


  container
    .querySelectorAll(
      "[data-delete-chapter]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          await deleteChapter(
            button.dataset.deleteChapter
          );

        }
      );

    });


  container
    .querySelectorAll(
      "[data-notes-chapter]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openNotes(
            button.dataset.notesChapter
          );

        }
      );

    });

}


function chapterHTML(chapter) {

  return `

    <div class="chapter-item">

      <div class="chapter-main">

        <div>

          <div class="chapter-title">
            ${escapeHTML(chapter.name)}
          </div>

          <div class="chapter-date">
            Study Date:
            ${formatDate(chapter.studyDate)}
          </div>

        </div>


        <div class="chapter-actions">

          <button
            class="small-btn"
            data-edit-chapter="${chapter.id}"
            data-subject="${escapeHTML(chapter.subject)}"
            title="Edit"
          >
            ✎
          </button>

          <button
            class="small-btn danger"
            data-delete-chapter="${chapter.id}"
            title="Delete"
          >
            🗑
          </button>

        </div>

      </div>


      <button
        class="notes-btn"
        data-notes-chapter="${chapter.id}"
      >
        📝 Notes & Files
      </button>

    </div>

  `;

}


/* ================= CHAPTER MODAL ================= */

function openChapterModal(
  subject,
  chapterId = null
) {

  const chapter =
    chapterId
      ? appData.chapters.find(
          c => c.id === chapterId
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

      <label>Subject</label>

      <input
        value="${escapeHTML(subject)}"
        disabled
      >

    </div>


    <div class="form-group">

      <label>Chapter Name</label>

      <input
        id="chapterNameInput"
        type="text"
        placeholder="Enter chapter name"
        value="${
          chapter
            ? escapeHTML(chapter.name)
            : ""
        }"
      >

    </div>


    <div class="form-group">

      <label>Study Date</label>

      <input
        id="chapterDateInput"
        type="date"
        value="${
          chapter
            ? chapter.studyDate
            : todayISO()
        }"
      >

    </div>


    <div class="modal-actions">

      <button
        class="secondary-btn"
        id="cancelModalBtn"
      >
        Cancel
      </button>

      <button
        class="primary-btn"
        id="saveChapterBtn"
      >
        Save Chapter
      </button>

    </div>

  `);


  $("cancelModalBtn")
    .addEventListener(
      "click",
      closeModal
    );


  $("saveChapterBtn")
    .addEventListener(
      "click",
      () => {

        saveChapter(
          subject,
          chapterId
        );

      }
    );

}


function saveChapter(
  subject,
  chapterId
) {

  const name =
    $("chapterNameInput")
      .value.trim();


  const studyDate =
    $("chapterDateInput")
      .value;


  if (!name) {

    showToast(
      "Please enter chapter name."
    );

    return;

  }


  if (!studyDate) {

    showToast(
      "Please select study date."
    );

    return;

  }


  if (chapterId) {

    const chapter =
      appData.chapters.find(
        c => c.id === chapterId
      );


    if (!chapter) {
      return;
    }


    chapter.name = name;

    chapter.studyDate =
      studyDate;


    /*
      Existing revision dates remain unchanged
      while editing a chapter.
    */

    saveData();

    closeModal();

    renderHome();

    showToast(
      "Chapter updated successfully."
    );

    return;

  }


  const chapter = {

    id: createId("chapter"),

    subject,

    name,

    studyDate,

    createdAt:
      new Date().toISOString()

  };


  appData.chapters.push(
    chapter
  );


  createRevisionSchedule(
    chapter
  );


  saveData();

  closeModal();

  renderHome();

  showToast(
    "Chapter added successfully."
  );

}


/* ================= REVISION SCHEDULE ================= */

function addDays(
  dateString,
  days
) {

  const date =
    new Date(
      dateString + "T00:00:00"
    );


  date.setDate(
    date.getDate() + days
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


function createRevisionSchedule(
  chapter
) {

  const schedule =
    appData.settings.revisionDays ||
    REVISION_DAYS;


  schedule.forEach(
    (days, index) => {

      const revision = {

        id:
          createId("revision"),

        chapterId:
          chapter.id,

        revisionNumber:
          index + 1,

        scheduledDate:
          addDays(
            chapter.studyDate,
            days
          ),

        status:
          "pending",

        confirmed:
          false,

        completedAt:
          null

      };


      appData.revisions.push(
        revision
      );

    }
  );

}


/* ================= TODAY REVISION ================= */

function getChapter(
  chapterId
) {

  return appData.chapters.find(
    c => c.id === chapterId
  );

}


function getTodayRevisions() {

  const today =
    todayISO();


  return appData.revisions.filter(
    r =>
      r.scheduledDate === today
  );

}


function renderToday() {

  const revisions =
    getTodayRevisions();


  $("todayRevisionCount")
    .textContent =
    `${revisions.length} revision(s) scheduled today`;


  const container =
    $("todayRevisionList");


  container.innerHTML = "";


  if (revisions.length === 0) {

    $("todayEmpty")
      .classList.remove("hidden");

    return;

  }


  $("todayEmpty")
    .classList.add("hidden");


  revisions.forEach(
    revision => {

      container.appendChild(
        createRevisionCard(
          revision,
          false
        )
      );

    }
  );

}


/* ================= INCOMPLETE ================= */

function getIncompleteRevisions() {

  const today =
    todayISO();


  return appData.revisions
    .filter(
      r =>
        r.status !== "completed" &&
        r.scheduledDate < today
    )
    .sort(
      (a, b) =>
        a.scheduledDate.localeCompare(
          b.scheduledDate
        )
    );

}


function renderIncomplete() {

  const revisions =
    getIncompleteRevisions();


  const container =
    $("incompleteList");


  container.innerHTML = "";


  if (revisions.length === 0) {

    $("incompleteEmpty")
      .classList.remove("hidden");

    return;

  }


  $("incompleteEmpty")
    .classList.add("hidden");


  revisions.forEach(
    revision => {

      container.appendChild(
        createRevisionCard(
          revision,
          true
        )
      );

    }
  );

}


/* ================= REVISION CARD ================= */

function createRevisionCard(
  revision,
  isLate
) {

  const chapter =
    getChapter(
      revision.chapterId
    );


  const card =
    document.createElement("div");


  card.className =
    "revision-card";


  if (
    revision.status ===
    "completed"
  ) {

    card.classList.add(
      "completed"
    );

  }


  const today =
    todayISO();


  const lateDays =
    isLate
      ? dateDifference(
          revision.scheduledDate,
          today
        )
      : 0;


  const lateBadge =
    isLate
      ? `
        <span class="late-badge">
          ${lateDays} day(s) late
        </span>
      `
      : "";


  card.innerHTML = `

    <div class="revision-header">

      <div>

        <div class="revision-subject">
          ${escapeHTML(
            chapter?.subject ||
            "Unknown Subject"
          )}
        </div>

        <div class="revision-title">
          ${escapeHTML(
            chapter?.name ||
            "Deleted Chapter"
          )}
        </div>

      </div>

      ${lateBadge}

    </div>


    <div class="revision-info">

      Revision #${revision.revisionNumber}

      <br>

      Scheduled:
      ${formatDate(
        revision.scheduledDate
      )}

      ${
        revision.completedAt
          ? `
            <br>
            Completed:
            ${formatDate(
              revision.completedAt.slice(0, 10)
            )}
          `
          : ""
      }

    </div>


    <div class="revision-actions">

      <button
        class="check-btn ${
          revision.confirmed
            ? "checked"
            : ""
        }"
        data-check-revision="${revision.id}"
        title="Confirm revision"
      >
        ${
          revision.confirmed
            ? "✓"
            : "○"
        }
      </button>


      <button
        class="submit-btn"
        data-submit-revision="${revision.id}"
        ${
          revision.confirmed
            ? ""
            : "disabled"
        }
      >
        ${
          revision.status ===
          "completed"
            ? "Submitted ✓"
            : "Confirm & Submit"
        }
      </button>

    </div>

  `;


  card
    .querySelector(
      "[data-check-revision]"
    )
    .addEventListener(
      "click",
      () => {

        toggleRevisionCheck(
          revision.id
        );

      }
    );


  card
    .querySelector(
      "[data-submit-revision]"
    )
    .addEventListener(
      "click",
      () => {

        submitRevision(
          revision.id
        );

      }
    );


  return card;

}


/* ================= CHECK REVISION ================= */

function toggleRevisionCheck(
  revisionId
) {

  const revision =
    appData.revisions.find(
      r => r.id === revisionId
    );


  if (!revision) {
    return;
  }


  if (
    revision.status ===
    "completed"
  ) {

    showToast(
      "This revision is already final."
    );

    return;

  }


  revision.confirmed =
    !revision.confirmed;


  saveData();


  renderToday();

  renderIncomplete();

}


/* ================= SUBMIT REVISION ================= */

function submitRevision(
  revisionId
) {

  const revision =
    appData.revisions.find(
      r => r.id === revisionId
    );


  if (!revision) {
    return;
  }


  if (!revision.confirmed) {

    showToast(
      "First tick the revision to confirm it."
    );

    return;

  }


  if (
    revision.status ===
    "completed"
  ) {

    return;

  }


  revision.status =
    "completed";


  revision.completedAt =
    new Date().toISOString();


  updateStreak();


  saveData();


  renderHome();

  renderToday();

  renderIncomplete();


  showToast(
    "Revision submitted and saved permanently."
  );

}


/* ================= STREAK ================= */

function updateStreak() {

  const today =
    todayISO();


  const last =
    appData.settings.lastCompletedDate;


  if (!last) {

    appData.settings.streak = 1;

  } else {

    const difference =
      dateDifference(
        last,
        today
      );


    if (difference === 1) {

      appData.settings.streak =
        (appData.settings.streak || 0) + 1;

    } else if (
      difference > 1
    ) {

      appData.settings.streak = 1;

    }

  }


  appData.settings.lastCompletedDate =
    today;

}


/* ================= DELETE CHAPTER ================= */

async function deleteChapter(
  chapterId
) {

  const chapter =
    getChapter(chapterId);


  if (!chapter) {
    return;
  }


  const confirmed =
    window.confirm(
      `Delete "${chapter.name}"?\n\nIts revisions will also be deleted.`
    );


  if (!confirmed) {
    return;
  }


  appData.chapters =
    appData.chapters.filter(
      c => c.id !== chapterId
    );


  appData.revisions =
    appData.revisions.filter(
      r => r.chapterId !== chapterId
    );


  try {

    await deleteChapterAttachments(
      chapterId
    );

  } catch (error) {

    console.error(error);

  }


  saveData();

  renderHome();


  showToast(
    "Chapter deleted."
  );

}


/* ================= NOTES ================= */

async function openNotes(
  chapterId
) {

  const chapter =
    getChapter(chapterId);


  if (!chapter) {
    return;
  }


  let attachments = [];


  try {

    attachments =
      await getAttachments(
        chapterId
      );

  } catch (error) {

    console.error(error);

  }


  openModal(`

    <h2>
      Notes — ${escapeHTML(
        chapter.name
      )}
    </h2>


    <div class="note-section">

      <div class="form-group">

        <label>
          Personal Notes
        </label>

        <textarea
          id="chapterNotes"
          rows="7"
          placeholder="Write your notes here..."
        >${escapeHTML(
          chapter.notes || ""
        )}</textarea>

      </div>


      <div class="file-upload">

        <label for="attachmentInput">

          📎 Add Photos / PDFs / Videos

          <br>

          <small>
            Files are stored inside the app.
          </small>

        </label>


        <input
          id="attachmentInput"
          type="file"
          multiple
          accept="
            image/*,
            application/pdf,
            video/*,
            .pdf
          "
        >

      </div>


      <div id="attachmentList"
           class="attachment-list">

        ${
          attachments
            .map(
              attachmentHTML
            )
            .join("")
        }

      </div>


      <div class="modal-actions">

        <button
          class="secondary-btn"
          id="closeNotesBtn"
        >
          Close
        </button>

        <button
          class="primary-btn"
          id="saveNotesBtn"
        >
          Save Notes
        </button>

      </div>

    </div>

  `);


  $("closeNotesBtn")
    .addEventListener(
      "click",
      closeModal
    );


  $("saveNotesBtn")
    .addEventListener(
      "click",
      () => {

        chapter.notes =
          $("chapterNotes")
            .value;

        saveData();

        showToast(
          "Notes saved."
        );

      }
    );


  $("attachmentInput")
    .addEventListener(
      "change",
      async event => {

        const files =
          Array.from(
            event.target.files
          );


        if (files.length === 0) {
          return;
        }


        for (const file of files) {

          try {

            await saveAttachment({

              id:
                createId("file"),

              chapterId,

              name:
                file.name,

              type:
                file.type,

              size:
                file.size,

              blob:
                file,

              createdAt:
                new Date().toISOString()

            });

          } catch (error) {

            console.error(
              error
            );

            showToast(
              "File could not be stored."
            );

          }

        }


        showToast(
          `${files.length} file(s) added.`
        );


        await openNotes(
          chapterId
        );

      }
    );


  $("attachmentList")
    .querySelectorAll(
      "[data-delete-file]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset.deleteFile;


          const confirmDelete =
            window.confirm(
              "Delete this file?"
            );


          if (!confirmDelete) {
            return;
          }


          await deleteAttachment(
            id
          );


          await openNotes(
            chapterId
          );

        }
      );

    });


  $("attachmentList")
    .querySelectorAll(
      "[data-open-file]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset.openFile;


          const files =
            await getAttachments(
              chapterId
            );


          const file =
            files.find(
              f => f.id === id
            );


          if (!file) {
            return;
          }


          const url =
            URL.createObjectURL(
              file.blob
            );


          window.open(
            url,
            "_blank"
          );


          setTimeout(
            () => URL.revokeObjectURL(url),
            60000
          );

        }
      );

    });

}


function attachmentHTML(
  file
) {

  const sizeMB =
    file.size /
    (1024 * 1024);


  return `

    <div class="attachment-item">

      <div class="attachment-info">

        <strong>
          ${escapeHTML(
            file.name
          )}
        </strong>

        <small>
          ${escapeHTML(
            file.type ||
            "File"
          )}
          •
          ${sizeMB.toFixed(2)}
          MB
        </small>

      </div>


      <div class="attachment-actions">

        <button
          class="small-btn"
          data-open-file="${file.id}"
          title="Open"
        >
          ↗
        </button>

        <button
          class="small-btn danger"
          data-delete-file="${file.id}"
          title="Delete"
        >
          🗑
        </button>

      </div>

    </div>

  `;

}


/* ================= PLANNER ================= */

function setupPlanner() {

  $("plannerBtn")
    .addEventListener(
      "click",
      showPlanner
    );

}


function showPlanner() {

  const start =
    $("plannerStart").value;


  const end =
    $("plannerEnd").value;


  if (!start || !end) {

    showToast(
      "Please select dates."
    );

    return;

  }


  if (start > end) {

    showToast(
      "End date must be after start date."
    );

    return;

  }


  const results =
    $("plannerResults");


  results.innerHTML = "";


  let current =
    start;


  let hasRevision = false;


  while (current <= end) {

    const revisions =
      appData.revisions.filter(
        r =>
          r.scheduledDate ===
          current
      );


    const day =
      document.createElement("div");


    day.className =
      "planner-day";


    day.innerHTML = `

      <h3>
        ${formatDate(current)}
      </h3>

    `;


    if (revisions.length === 0) {

      day.innerHTML += `

        <div
          class="planner-item"
          style="color:var(--muted)"
        >
          No revision scheduled.
        </div>

      `;

    } else {

      hasRevision = true;


      revisions.forEach(
        revision => {

          const chapter =
            getChapter(
              revision.chapterId
            );


          const item =
            document.createElement(
              "div"
            );


          item.className =
            "planner-item";


          item.innerHTML = `

            <strong>
              ${escapeHTML(
                chapter?.name ||
                "Deleted Chapter"
              )}
            </strong>

            <small>
              ${escapeHTML(
                chapter?.subject ||
                ""
              )}
              • Revision #${
                revision.revisionNumber
              }
              •
              ${
                revision.status ===
                "completed"
                  ? "Completed ✓"
                  : "Pending"
              }
            </small>

          `;


          day.appendChild(
            item
          );

        }
      );

    }


    results.appendChild(
      day
    );


    current =
      addDays(
        current,
        1
      );

  }


  if (!hasRevision) {

    showToast(
      "No revisions found in this period."
    );

  }

}


/* ================= SETTINGS ================= */

function openSettings() {

  openModal(`

    <h2>Settings</h2>


    <div class="settings-group">

      <h3>Revision Schedule</h3>

      <div class="setting-row">

        <div>

          <strong>
            Revision Pattern
          </strong>

          <small>
            Current: 1, 3, 7, 14, 30 days
          </small>

        </div>

        <span>📅</span>

      </div>

    </div>


    <div class="settings-group">

      <h3>Data Management</h3>


      <div class="setting-row">

        <div>

          <strong>
            Chapters
          </strong>

          <small>
            Delete all chapters and their revisions.
          </small>

        </div>

        <button
          class="small-btn danger"
          id="resetChaptersBtn"
        >
          🗑
        </button>

      </div>


      <div class="setting-row">

        <div>

          <strong>
            Revision History
          </strong>

          <small>
            Delete revision records only.
          </small>

        </div>

        <button
          class="small-btn danger"
          id="resetRevisionsBtn"
        >
          🗑
        </button>

      </div>


      <div class="setting-row">

        <div>

          <strong>
            Notes & Files
          </strong>

          <small>
            Delete all stored chapter files.
          </small>

        </div>

        <button
          class="small-btn danger"
          id="resetFilesBtn"
        >
          🗑
        </button>

      </div>


      <div class="setting-row">

        <div>

          <strong>
            Streak
          </strong>

          <small>
            Reset your current streak.
          </small>

        </div>

        <button
          class="small-btn danger"
          id="resetStreakBtn"
        >
          ↻
        </button>

      </div>

    </div>


    <div class="settings-group">

      <h3>Complete Restart</h3>

      <p
        style="
          color:var(--muted);
          font-size:11px;
          line-height:1.6;
          margin-bottom:10px;
        "
      >
        This removes all app data including chapters,
        revisions, notes, files and streak.
        This action cannot be undone.
      </p>


      <button
        class="danger-btn"
        id="fullResetBtn"
      >
        Restart App & Delete All Data
      </button>

    </div>


    <button
      class="secondary-btn"
      id="settingsCloseBtn"
      style="width:100%;"
    >
      Close
    </button>

  `);


  $("settingsCloseBtn")
    .addEventListener(
      "click",
      closeModal
    );


  $("resetChaptersBtn")
    .addEventListener(
      "click",
      resetChapters
    );


  $("resetRevisionsBtn")
    .addEventListener(
      "click",
      resetRevisions
    );


  $("resetFilesBtn")
    .addEventListener(
      "click",
      resetFiles
    );


  $("resetStreakBtn")
    .addEventListener(
      "click",
      resetStreak
    );


  $("fullResetBtn")
    .addEventListener(
      "click",
      fullReset
    );

}


/* ================= SELECTIVE RESET ================= */

function resetChapters() {

  if (
    !window.confirm(
      "Delete all chapters and their revisions?"
    )
  ) {
    return;
  }


  appData.chapters = [];

  appData.revisions = [];


  saveData();

  renderHome();

  showToast(
    "Chapters and revisions deleted."
  );

  openSettings();

}


function resetRevisions() {

  if (
    !window.confirm(
      "Delete all revision records?"
    )
  ) {
    return;
  }


  appData.revisions = [];


  saveData();

  renderHome();

  showToast(
    "Revision history deleted."
  );

  openSettings();

}


async function resetFiles() {

  if (
    !window.confirm(
      "Delete all Notes & Files?"
    )
  ) {
    return;
  }


  try {

    const transaction =
      db.transaction(
        "attachments",
        "readwrite"
      );


    const store =
      transaction.objectStore(
        "attachments"
      );


    store.clear();


    transaction.oncomplete =
      () => {

        showToast(
          "All files deleted."
        );

        openSettings();

      };


  } catch (error) {

    console.error(error);

  }

}


function resetStreak() {

  if (
    !window.confirm(
      "Reset streak?"
    )
  ) {
    return;
  }


  appData.settings.streak = 0;

  appData.settings.lastCompletedDate =
    null;


  saveData();

  renderHome();

  showToast(
    "Streak reset."
  );

  openSettings();

}


async function fullReset() {

  const confirmed =
    window.confirm(
      "This will permanently delete ALL app data. Continue?"
    );


  if (!confirmed) {
    return;
  }


  try {

    localStorage.removeItem(
      "revisionTrackerData"
    );


    const transaction =
      db.transaction(
        "attachments",
        "readwrite"
      );


    transaction
      .objectStore(
        "attachments"
      )
      .clear();


    appData = {

      chapters: [],

      revisions: [],

      settings: {

        revisionDays:
          REVISION_DAYS,

        streak: 0,

        lastCompletedDate:
          null

      }

    };


    saveData();

    closeModal();

    renderHome();

    renderToday();

    renderIncomplete();


    showToast(
      "App restarted successfully."
    );


  } catch (error) {

    console.error(
      error
    );

    showToast(
      "Restart failed."
    );

  }

}


/* ================= EVENTS ================= */

function setupEvents() {

  $("settingsBtn")
    .addEventListener(
      "click",
      openSettings
    );


  $("closeModal")
    .addEventListener(
      "click",
      closeModal
    );


  $("modalOverlay")
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("modalOverlay")
        ) {

          closeModal();

        }

      }
    );

}


/* ================= INITIALIZATION ================= */

async function initializeApp() {

  try {

    await openDatabase();

  } catch (error) {

    console.error(
      "IndexedDB unavailable:",
      error
    );

    showToast(
      "File storage is unavailable in this browser."
    );

  }


  loadData();

  registerServiceWorker();

  setupNavigation();

  setupPlanner();

  setupEvents();

  renderHome();

  renderToday();

  renderIncomplete();


  $("plannerStart").value =
    todayISO();


  $("plannerEnd").value =
    todayISO();

}


document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
