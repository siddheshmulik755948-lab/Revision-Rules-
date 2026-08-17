/* =========================================================
   REVISION TRACKER
   Offline-first PWA
   IndexedDB storage
   ========================================================= */

"use strict";


/* ================= DATABASE ================= */

const DB_NAME = "RevisionTrackerDB";
const DB_VERSION = 3;

let db = null;

const STORES = {
  chapters: "chapters",
  revisions: "revisions",
  files: "files",
  meta: "meta"
};


function openDatabase() {

  return new Promise((resolve, reject) => {

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {

      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORES.chapters)) {
        database.createObjectStore(STORES.chapters, {
          keyPath: "id"
        });
      }

      if (!database.objectStoreNames.contains(STORES.revisions)) {
        const store = database.createObjectStore(STORES.revisions, {
          keyPath: "id"
        });

        store.createIndex("chapterId", "chapterId", {
          unique: false
        });

        store.createIndex("dueDate", "dueDate", {
          unique: false
        });
      }

      if (!database.objectStoreNames.contains(STORES.files)) {

        const store = database.createObjectStore(STORES.files, {
          keyPath: "id"
        });

        store.createIndex("chapterId", "chapterId", {
          unique: false
        });
      }

      if (!database.objectStoreNames.contains(STORES.meta)) {
        database.createObjectStore(STORES.meta, {
          keyPath: "key"
        });
      }
    };


    request.onsuccess = () => {
      db = request.result;

      db.onversionchange = () => {
        db.close();
      };

      resolve(db);
    };


    request.onerror = () => {
      reject(request.error);
    };

  });
}


function dbPut(storeName, value) {

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(storeName, "readwrite");

    transaction.objectStore(storeName).put(value);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);

  });
}


function dbGet(storeName, key) {

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(storeName, "readonly");

    const request =
      transaction.objectStore(storeName).get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });
}


function dbGetAll(storeName) {

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(storeName, "readonly");

    const request =
      transaction.objectStore(storeName).getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);

  });
}


function dbDelete(storeName, key) {

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(storeName, "readwrite");

    transaction.objectStore(storeName).delete(key);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);

  });
}


function dbClear(storeName) {

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(storeName, "readwrite");

    transaction.objectStore(storeName).clear();

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);

  });
}


/* ================= UTILITIES ================= */

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
   Day 1 is the study day.
   Then revisions:
   Day 2
   Day 4
   Day 8
   Day 16
   Day 32
   Day 65
*/

const REVISION_DAYS = [1, 2, 4, 8, 16, 32, 65];


let selectedChapterId = null;
let editingChapterId = null;
let pendingRevisionId = null;


const $ = id => document.getElementById(id);


function todayISO() {

  const date = new Date();

  const offset =
    date.getTimezoneOffset() * 60000;

  return new Date(
    date.getTime() - offset
  ).toISOString().slice(0, 10);
}


function parseDate(dateString) {

  const [year, month, day] =
    dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
}


function addDays(dateString, days) {

  const date = parseDate(dateString);

  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}


function formatDate(dateString) {

  if (!dateString) return "";

  const date = parseDate(dateString);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


function dateDifference(fromDate, toDate) {

  const a = parseDate(fromDate);
  const b = parseDate(toDate);

  const difference =
    Math.floor(
      (b - a) / (1000 * 60 * 60 * 24)
    );

  return difference;
}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function uid(prefix = "id") {

  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 9)
  );
}


function showToast(message) {

  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}


/* ================= META ================= */

async function getMeta(key, fallback = null) {

  const value = await dbGet(STORES.meta, key);

  return value ? value.value : fallback;
}


async function setMeta(key, value) {

  await dbPut(STORES.meta, {
    key,
    value
  });
}


/* ================= CHAPTERS ================= */

async function getChapters() {

  return await dbGetAll(STORES.chapters);
}


async function getChapter(id) {

  return await dbGet(STORES.chapters, id);
}


async function createChapter(data) {

  const chapter = {
    id: uid("chapter"),
    subject: data.subject,
    name: data.name.trim(),
    startDate: data.startDate,
    notes: data.notes || "",
    createdAt: new Date().toISOString()
  };

  await dbPut(STORES.chapters, chapter);

  for (const day of REVISION_DAYS) {

    const revision = {
      id: uid("revision"),
      chapterId: chapter.id,
      dayNumber: day,
      dueDate: addDays(
        chapter.startDate,
        day - 1
      ),
      completed: false,
      final: false,
      completedAt: null
    };

    await dbPut(
      STORES.revisions,
      revision
    );
  }

  return chapter;
}


async function updateChapter(id, data) {

  const chapter = await getChapter(id);

  if (!chapter) return;

  const oldDate = chapter.startDate;

  chapter.subject = data.subject;
  chapter.name = data.name.trim();
  chapter.notes = data.notes || "";

  /*
    If start date changed, update unfinished
    revision dates automatically.
  */

  if (
    data.startDate &&
    data.startDate !== oldDate
  ) {

    chapter.startDate = data.startDate;

    const revisions =
      await getRevisionsForChapter(id);

    for (const revision of revisions) {

      if (!revision.final) {

        revision.dueDate =
          addDays(
            chapter.startDate,
            revision.dayNumber - 1
          );

        await dbPut(
          STORES.revisions,
          revision
        );
      }
    }

  }

  await dbPut(
    STORES.chapters,
    chapter
  );
}


async function deleteChapter(id) {

  const revisions =
    await getRevisionsForChapter(id);

  for (const revision of revisions) {
    await dbDelete(
      STORES.revisions,
      revision.id
    );
  }

  const files =
    await getFilesForChapter(id);

  for (const file of files) {
    await dbDelete(
      STORES.files,
      file.id
    );
  }

  await dbDelete(
    STORES.chapters,
    id
  );
}


/* ================= REVISIONS ================= */

async function getAllRevisions() {

  return await dbGetAll(
    STORES.revisions
  );
}


async function getRevisionsForChapter(id) {

  const all =
    await getAllRevisions();

  return all.filter(
    revision => revision.chapterId === id
  );
}


async function getRevision(id) {

  return await dbGet(
    STORES.revisions,
    id
  );
}


async function completeRevision(id) {

  const revision =
    await getRevision(id);

  if (!revision || revision.final) {
    return;
  }

  revision.completed = true;
  revision.final = true;
  revision.completedAt =
    new Date().toISOString();

  await dbPut(
    STORES.revisions,
    revision
  );


  const xp =
    await getMeta("xp", 0);

  await setMeta(
    "xp",
    Number(xp) + 20
  );


  await updateStreak();

  showToast(
    "Revision submitted successfully ✓"
  );

  await renderAll();
}


async function updateStreak() {

  const all =
    await getAllRevisions();

  const completedDates =
    new Set();

  all.forEach(revision => {

    if (
      revision.final &&
      revision.completedAt
    ) {

      completedDates.add(
        revision.completedAt.slice(0, 10)
      );

    }

  });


  let streak = 0;

  let date = todayISO();

  while (completedDates.has(date)) {

    streak++;

    date = addDays(date, -1);
  }


  await setMeta(
    "streak",
    streak
  );
}


/* ================= REVISION UI ================= */

function revisionLateText(revision) {

  if (revision.final) return "";

  const today = todayISO();

  if (revision.dueDate >= today) {
    return "";
  }

  const late =
    dateDifference(
      revision.dueDate,
      today
    );

  return `${late} day${late === 1 ? "" : "s"} late`;
}


function revisionHTML(revision, chapter) {

  const done = revision.final;

  const lateText =
    revisionLateText(revision);

  return `
    <div class="revision-item">

      <button
        class="revision-check ${done ? "done" : ""}"
        data-revision="${revision.id}"
        aria-label="Revision completion"
      >
        ${done ? "✓" : ""}
      </button>

      <div class="revision-content">

        <div class="revision-title">
          ${escapeHTML(chapter.subject)}
          •
          ${escapeHTML(chapter.name)}
        </div>

        <div class="revision-meta">
          Day ${revision.dayNumber}
          • Due ${formatDate(revision.dueDate)}
        </div>

        ${
          done
            ? `
              <span class="final-label">
                ✓ FINAL • Submitted
                ${formatDate(
                  revision.completedAt.slice(0, 10)
                )}
              </span>
            `
            : lateText
              ? `
                <span class="late-label">
                  ⚠ ${lateText}
                </span>
              `
              : ""
        }

      </div>

    </div>
  `;
}


/* ================= TODAY ================= */

async function getTodayRevisions() {

  const all =
    await getAllRevisions();

  return all.filter(
    revision =>
      revision.dueDate === todayISO()
  );
}


async function renderToday() {

  const today =
    await getTodayRevisions();

  $("todayCount").textContent =
    today.filter(r => !r.final).length;

  $("todayDateText").textContent =
    formatDate(todayISO());


  if (!today.length) {

    $("todayRevisionList").innerHTML =
      emptyState(
        "No revisions today",
        "Enjoy your day or add a new chapter."
      );

    $("todayPreview").innerHTML =
      emptyState(
        "No revisions today",
        "You are all caught up."
      );

    return;
  }


  let html = "";

  for (const revision of today) {

    const chapter =
      await getChapter(
        revision.chapterId
      );

    if (chapter) {
      html += revisionHTML(
        revision,
        chapter
      );
    }

  }


  $("todayRevisionList").innerHTML = html;


  const preview =
    today.slice(0, 2);

  let previewHTML = "";

  for (const revision of preview) {

    const chapter =
      await getChapter(
        revision.chapterId
      );

    if (chapter) {

      previewHTML += revisionHTML(
        revision,
        chapter
      );

    }

  }

  $("todayPreview").innerHTML =
    previewHTML;
}


/* ================= INCOMPLETE ================= */

async function renderIncomplete() {

  const all =
    await getAllRevisions();

  const today = todayISO();

  const incomplete =
    all.filter(
      revision =>
        !revision.final &&
        revision.dueDate < today
    )
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate)
    );


  $("incompleteCount").textContent =
    incomplete.length;


  if (!incomplete.length) {

    $("incompleteList").innerHTML =
      emptyState(
        "No incomplete revisions",
        "Excellent! You are fully caught up."
      );

    return;
  }


  let html = "";

  for (const revision of incomplete) {

    const chapter =
      await getChapter(
        revision.chapterId
      );

    if (!chapter) continue;

    html += revisionHTML(
      revision,
      chapter
    );

  }


  $("incompleteList").innerHTML =
    html;
}


/* ================= SUBJECTS ================= */

async function renderSubjects() {

  const chapters =
    await getChapters();

  let html = "";

  for (const subject of SUBJECTS) {

    const subjectChapters =
      chapters.filter(
        chapter =>
          chapter.subject === subject
      );


    html += `
      <div class="subject-block">

        <div class="subject-heading">

          <h3>
            ${escapeHTML(subject)}
          </h3>

          <span>
            ${subjectChapters.length}
          </span>

        </div>
    `;


    if (!subjectChapters.length) {

      html += `
        <div class="empty-state">
          No chapters added yet.
        </div>
      `;

    } else {

      for (const chapter of subjectChapters) {

        html += await chapterHTML(
          chapter
        );

      }

    }

    html += `</div>`;
  }


  $("subjectsContainer").innerHTML =
    html;
}


async function chapterHTML(chapter) {

  const revisions =
    await getRevisionsForChapter(
      chapter.id
    );

  const completed =
    revisions.filter(
      revision => revision.final
    ).length;

  const percent =
    revisions.length
      ? Math.round(
          (completed / revisions.length) * 100
        )
      : 0;


  return `
    <div class="chapter-card">

      <div class="chapter-header">

        <div>

          <div class="chapter-subject">
            ${escapeHTML(chapter.subject)}
          </div>

          <h3 class="chapter-title">
            ${escapeHTML(chapter.name)}
          </h3>

          <div class="chapter-date">
            Study started:
            ${formatDate(chapter.startDate)}
          </div>

        </div>


        <div class="chapter-actions">

          <button
            class="small-btn"
            data-action="openChapter"
            data-id="${chapter.id}"
          >
            Open
          </button>

          <button
            class="small-btn"
            data-action="editChapter"
            data-id="${chapter.id}"
          >
            Edit
          </button>

          <button
            class="small-btn danger"
            data-action="deleteChapter"
            data-id="${chapter.id}"
          >
            Delete
          </button>

        </div>

      </div>


      <div class="chapter-progress">

        <div class="progress-info">
          <span>Revision progress</span>
          <strong>${percent}%</strong>
        </div>

        <div class="progress-track">
          <div
            class="progress-fill"
            style="width:${percent}%"
          ></div>
        </div>

      </div>

    </div>
  `;
}


/* ================= CHAPTER DETAIL ================= */

async function openChapter(id) {

  const chapter =
    await getChapter(id);

  if (!chapter) return;

  selectedChapterId = id;

  $("detailSubject").textContent =
    chapter.subject;

  $("detailChapterName").textContent =
    chapter.name;

  $("detailChapterDate").textContent =
    `Study started ${formatDate(
      chapter.startDate
    )}`;


  await renderChapterRevisions();

  await renderChapterFiles();


  $("chapterDetailModal")
    .classList.add("open");
}


async function renderChapterRevisions() {

  const revisions =
    await getRevisionsForChapter(
      selectedChapterId
    );

  const chapter =
    await getChapter(
      selectedChapterId
    );


  let html = "";

  for (const revision of revisions) {

    html += revisionHTML(
      revision,
      chapter
    );

  }


  $("detailRevisions").innerHTML =
    html || emptyState(
      "No revisions",
      "This chapter has no revision schedule."
    );
}


/* ================= FILE STORAGE ================= */

async function saveFile(chapterId, file) {

  /*
    IMPORTANT:
    The complete File/Blob is stored in IndexedDB.
    Therefore deleting the original file from Gallery/File
    does not delete this app copy.
  */

  const record = {
    id: uid("file"),
    chapterId,
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
    blob: file
  };

  await dbPut(
    STORES.files,
    record
  );
}


async function getFilesForChapter(chapterId) {

  const all =
    await dbGetAll(
      STORES.files
    );

  return all.filter(
    file =>
      file.chapterId === chapterId
  );
}


function fileIcon(type) {

  if (type.startsWith("image/")) {
    return "🖼️";
  }

  if (type === "application/pdf") {
    return "📄";
  }

  if (type.startsWith("video/")) {
    return "🎥";
  }

  return "📝";
}


function formatFileSize(bytes) {

  if (!bytes) return "0 B";

  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];

  let size = bytes;
  let index = 0;

  while (
    size >= 1024 &&
    index < units.length - 1
  ) {

    size /= 1024;
    index++;
  }

  return `${size.toFixed(
    index === 0 ? 0 : 1
  )} ${units[index]}`;
}


async function renderChapterFiles() {

  const files =
    await getFilesForChapter(
      selectedChapterId
    );


  if (!files.length) {

    $("chapterFilesList").innerHTML =
      emptyState(
        "No files yet",
        "Add photos, PDFs, videos or text notes."
      );

    return;
  }


  $("chapterFilesList").innerHTML =
    files.map(file => `

      <div class="file-card">

        <div class="file-card-top">

          <div class="file-type-icon">
            ${fileIcon(file.type)}
          </div>

          <div class="file-card-info">

            <strong>
              ${escapeHTML(file.name)}
            </strong>

            <small>
              ${formatFileSize(file.size)}
              •
              ${formatDate(
                file.createdAt.slice(0, 10)
              )}
            </small>

          </div>

        </div>


        <div class="file-actions">

          <button
            class="secondary-btn"
            data-file-open="${file.id}"
          >
            Open
          </button>

          <button
            class="danger-btn"
            data-file-delete="${file.id}"
          >
            Delete
          </button>

        </div>

      </div>

    `).join("");
}


/* ================= TEXT NOTES ================= */

async function saveTextNote() {

  const title =
    $("textNoteTitle").value.trim();

  const content =
    $("textNoteContent").value.trim();


  if (!title || !content) {

    showToast(
      "Enter a title and note."
    );

    return;
  }


  const blob =
    new Blob(
      [content],
      { type: "text/plain" }
    );


  await dbPut(
    STORES.files,
    {
      id: uid("note"),
      chapterId: selectedChapterId,
      name: title + ".txt",
      type: "text/plain",
      size: blob.size,
      createdAt: new Date().toISOString(),
      blob
    }
  );


  $("textNoteTitle").value = "";
  $("textNoteContent").value = "";

  showToast("Text note saved ✓");

  await renderChapterFiles();
}


/* ================= FILE OPEN ================= */

async function openStoredFile(id) {

  const file =
    await dbGet(
      STORES.files,
      id
    );

  if (!file || !file.blob) return;


  const url =
    URL.createObjectURL(
      file.blob
    );


  /*
    Opening in a new tab/window lets the
    browser's native PDF/image/video viewer
    handle the file.
  */

  window.open(
    url,
    "_blank"
  );


  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}


/* ================= FILE DELETE ================= */

async function deleteStoredFile(id) {

  const confirmed =
    confirm(
      "Delete this file from Revision Tracker?"
    );

  if (!confirmed) return;

  await dbDelete(
    STORES.files,
    id
  );

  showToast("File deleted.");

  await renderChapterFiles();
}


/* ================= PROGRESS ================= */

async function calculateProgress() {

  const revisions =
    await getAllRevisions();

  if (!revisions.length) {
    return 0;
  }

  const completed =
    revisions.filter(
      revision => revision.final
    ).length;

  return Math.round(
    (completed / revisions.length) * 100
  );
}


async function renderProgress() {

  const chapters =
    await getChapters();

  const allRevisions =
    await getAllRevisions();


  const overall =
    await calculateProgress();


  $("overallProgress").textContent =
    `${overall}%`;

  document
    .querySelector(".progress-circle")
    .style.setProperty(
      "--progress",
      `${overall}%`
    );


  $("overallProgressText").textContent =
    allRevisions.length
      ? `${allRevisions.filter(r => r.final).length} of ${allRevisions.length} revisions completed.`
      : "Start your first chapter.";


  let html = "";


  for (const subject of SUBJECTS) {

    const subjectChapters =
      chapters.filter(
        chapter =>
          chapter.subject === subject
      );

    if (!subjectChapters.length) continue;


    let total = 0;
    let completed = 0;


    for (const chapter of subjectChapters) {

      const revisions =
        allRevisions.filter(
          revision =>
            revision.chapterId === chapter.id
        );

      total += revisions.length;

      completed +=
        revisions.filter(
          revision => revision.final
        ).length;
    }


    const percent =
      total
        ? Math.round(
            (completed / total) * 100
          )
        : 0;


    html += `

      <div class="section-card">

        <div class="progress-info">

          <strong>
            ${escapeHTML(subject)}
          </strong>

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

        <p class="revision-meta">
          ${completed} / ${total} revisions completed
        </p>

      </div>

    `;
  }


  $("progressSubjects").innerHTML =
    html ||
    emptyState(
      "No progress yet",
      "Add your first chapter."
    );


  $("subjectProgressHome").innerHTML =
    html ||
    emptyState(
      "No chapters yet",
      "Add a chapter to start tracking."
    );
}


/* ================= XP / STATS ================= */

async function renderStats() {

  const today =
    await getTodayRevisions();

  const incomplete =
    await getAllRevisions();


  $("todayCount").textContent =
    today.filter(
      revision => !revision.final
    ).length;


  $("incompleteCount").textContent =
    incomplete.filter(
      revision =>
        !revision.final &&
        revision.dueDate < todayISO()
    ).length;


  $("xpCount").textContent =
    await getMeta("xp", 0);


  $("streakCount").textContent =
    await getMeta("streak", 0);
}


/* ================= PLANNER ================= */

async function renderPlanner() {

  const start =
    $("plannerStart").value;

  const end =
    $("plannerEnd").value;


  if (!start) {

    showToast(
      "Select a start date."
    );

    return;
  }


  const finalEnd =
    end || start;


  if (finalEnd < start) {

    showToast(
      "End date cannot be before start date."
    );

    return;
  }


  const all =
    await getAllRevisions();


  const results =
    all.filter(
      revision =>
        revision.dueDate >= start &&
        revision.dueDate <= finalEnd
    )
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate)
    );


  if (!results.length) {

    $("plannerResults").innerHTML =
      emptyState(
        "No revisions in this period",
        "There are no scheduled revisions for the selected date range."
      );

    return;
  }


  const grouped = {};

  results.forEach(revision => {

    if (!grouped[revision.dueDate]) {
      grouped[revision.dueDate] = [];
    }

    grouped[revision.dueDate].push(
      revision
    );

  });


  let html = "";


  for (const date of Object.keys(grouped).sort()) {

    html += `
      <div class="section-card">

        <div class="planner-result-date">
          ${formatDate(date)}
        </div>
    `;


    for (const revision of grouped[date]) {

      const chapter =
        await getChapter(
          revision.chapterId
        );

      if (chapter) {

        html += revisionHTML(
          revision,
          chapter
        );

      }

    }


    html += `</div>`;
  }


  $("plannerResults").innerHTML =
    html;
}


/* ================= MODALS ================= */

function openChapterModal(chapter = null) {

  editingChapterId =
    chapter ? chapter.id : null;


  $("chapterModalTitle").textContent =
    chapter
      ? "Edit Chapter"
      : "Add Chapter";


  $("chapterModalEyebrow").textContent =
    chapter
      ? "EDIT CHAPTER"
      : "NEW CHAPTER";


  $("saveChapterBtn").textContent =
    chapter
      ? "Save Changes"
      : "Add Chapter";


  $("chapterSubject").value =
    chapter?.subject || "Physics";

  $("chapterName").value =
    chapter?.name || "";

  $("chapterDate").value =
    chapter?.startDate || todayISO();

  $("chapterNotes").value =
    chapter?.notes || "";


  $("chapterModal")
    .classList.add("open");
}


function closeChapterModal() {

  $("chapterModal")
    .classList.remove("open");

  editingChapterId = null;
}


function openConfirmModal(revisionId) {

  pendingRevisionId =
    revisionId;

  $("confirmModal")
    .classList.add("open");
}


function closeConfirmModal() {

  $("confirmModal")
    .classList.remove("open");

  pendingRevisionId = null;
}


function emptyState(title, message) {

  return `
    <div class="empty-state">
      <strong>${escapeHTML(title)}</strong>
      <span>${escapeHTML(message)}</span>
    </div>
  `;
}


/* ================= RESET DATA ================= */

async function resetSelectedData() {

  const selected =
    [...document.querySelectorAll(
      ".reset-check:checked"
    )].map(
      checkbox => checkbox.value
    );


  if (!selected.length) {

    showToast(
      "Select at least one item."
    );

    return;
  }


  const confirmed =
    confirm(
      "The selected data will be permanently deleted. Continue?"
    );


  if (!confirmed) return;


  if (selected.includes("revisions")) {

    await dbClear(
      STORES.revisions
    );
  }


  if (selected.includes("chapters")) {

    await dbClear(
      STORES.chapters
    );

    /*
      If chapters are deleted, their
      revisions and files should also be
      deleted to avoid orphaned data.
    */

    await dbClear(
      STORES.revisions
    );

    await dbClear(
      STORES.files
    );
  }


  if (selected.includes("files")) {

    await dbClear(
      STORES.files
    );
  }


  if (selected.includes("progress")) {

    await setMeta(
      "xp",
      0
    );

    await setMeta(
      "streak",
      0
    );
  }


  if (selected.includes("planner")) {

    /*
      Planner is generated from revisions,
      so there is no separate schedule database.
      Clearing revisions clears the related
      planner schedule.
    */
  }


  document.querySelectorAll(
    ".reset-check"
  ).forEach(
    checkbox =>
      checkbox.checked = false
  );

  $("resetSelectAll").checked = false;


  $("resetModal")
    .classList.remove("open");


  showToast(
    "Selected data deleted."
  );


  await renderAll();
}


/* ================= THEME ================= */

async function loadTheme() {

  const theme =
    await getMeta(
      "theme",
      "light"
    );

  document.body.classList.toggle(
    "dark",
    theme === "dark"
  );

  $("themeBtn").textContent =
    theme === "dark"
      ? "☀"
      : "☾";
}


async function toggleTheme() {

  const isDark =
    document.body.classList.contains(
      "dark"
    );

  const next =
    isDark ? "light" : "dark";

  document.body.classList.toggle(
    "dark",
    next === "dark"
  );

  await setMeta(
    "theme",
    next
  );

  $("themeBtn").textContent =
    next === "dark"
      ? "☀"
      : "☾";
}


/* ================= NAVIGATION ================= */

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
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );

    });


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* ================= EVENT LISTENERS ================= */

function setupEvents() {

  /*
    Navigation
  */

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showPage(
            button.dataset.page
          );

          if (
            button.dataset.page ===
            "todayPage"
          ) {
            renderToday();
          }

        }
      );

    });


  /*
    Theme
  */

  $("themeBtn")
    .addEventListener(
      "click",
      toggleTheme
    );


  $("darkModeSetting")
    .addEventListener(
      "click",
      toggleTheme
    );


  /*
    Add chapter
  */

  $("addChapterBtn")
    .addEventListener(
      "click",
      () =>
        openChapterModal()
    );


  $("closeChapterModal")
    .addEventListener(
      "click",
      closeChapterModal
    );


  /*
    Save chapter
  */

  $("saveChapterBtn")
    .addEventListener(
      "click",
      async () => {

        const subject =
          $("chapterSubject").value;

        const name =
          $("chapterName").value.trim();

        const startDate =
          $("chapterDate").value;

        const notes =
          $("chapterNotes").value.trim();


        if (!name) {

          showToast(
            "Enter chapter name."
          );

          return;
        }


        if (!startDate) {

          showToast(
            "Select study start date."
          );

          return;
        }


        if (editingChapterId) {

          await updateChapter(
            editingChapterId,
            {
              subject,
              name,
              startDate,
              notes
            }
          );

          showToast(
            "Chapter updated ✓"
          );

        } else {

          await createChapter(
            {
              subject,
              name,
              startDate,
              notes
            }
          );

          showToast(
            "Chapter added ✓"
          );
        }


        closeChapterModal();

        await renderAll();

      }
    );


  /*
    Close detail
  */

  $("closeDetailModal")
    .addEventListener(
      "click",
      () => {

        $("chapterDetailModal")
          .classList.remove("open");

        selectedChapterId = null;

      }
    );


  /*
    Confirm modal
  */

  $("cancelConfirm")
    .addEventListener(
      "click",
      closeConfirmModal
    );


  $("submitRevisionBtn")
    .addEventListener(
      "click",
      async () => {

        if (pendingRevisionId) {

          await completeRevision(
            pendingRevisionId
          );

        }

        closeConfirmModal();

        if (selectedChapterId) {
          await renderChapterRevisions();
        }

      }
    );


  /*
    Revision check buttons
  */

  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          ".revision-check"
        );

      if (!button) return;

      const id =
        button.dataset.revision;

      const revision =
        getRevision(id);

      revision.then(item => {

        if (!item || item.final) {
          return;
        }

        openConfirmModal(id);

      });

    }
  );


  /*
    Chapter action buttons
  */

  document.addEventListener(
    "click",
    async event => {

      const button =
        event.target.closest(
          "[data-action]"
        );

      if (!button) return;

      const action =
        button.dataset.action;

      const id =
        button.dataset.id;


      if (action === "openChapter") {

        await openChapter(id);

      }


      if (action === "editChapter") {

        const chapter =
          await getChapter(id);

        if (chapter) {
          openChapterModal(
            chapter
          );
        }

      }


      if (action === "deleteChapter") {

        const chapter =
          await getChapter(id);

        if (!chapter) return;


        const confirmed =
          confirm(
            `Delete "${chapter.name}" and all its revisions and files?`
          );


        if (!confirmed) return;


        await deleteChapter(id);

        showToast(
          "Chapter deleted."
        );

        await renderAll();

      }

    }
  );


  /*
    Detail tabs
  */

  document.addEventListener(
    "click",
    event => {

      const tab =
        event.target.closest(
          ".detail-tab"
        );

      if (!tab) return;

      const type =
        tab.dataset.detailTab;


      document
        .querySelectorAll(
          ".detail-tab"
        )
        .forEach(
          item =>
            item.classList.remove(
              "active"
            )
        );

      tab.classList.add("active");


      $("detailRevisions")
        .classList.toggle(
          "hidden",
          type !== "revisions"
        );


      $("detailFiles")
        .classList.toggle(
          "hidden",
          type !== "files"
        );

    }
  );


  /*
    File inputs
  */

  $("imageInput")
    .addEventListener(
      "change",
      async event => {

        await handleFiles(
          event.target.files
        );

        event.target.value = "";

      }
    );


  $("pdfInput")
    .addEventListener(
      "change",
      async event => {

        await handleFiles(
          event.target.files
        );

        event.target.value = "";

      }
    );


  $("videoInput")
    .addEventListener(
      "change",
      async event => {

        await handleFiles(
          event.target.files
        );

        event.target.value = "";

      }
    );


  $("saveTextNoteBtn")
    .addEventListener(
      "click",
      saveTextNote
    );


  /*
    Open / delete stored files
  */

  document.addEventListener(
    "click",
    async event => {

      const openButton =
        event.target.closest(
          "[data-file-open]"
        );

      if (openButton) {

        await openStoredFile(
          openButton.dataset.fileOpen
        );

        return;
      }


      const deleteButton =
        event.target.closest(
          "[data-file-delete]"
        );

      if (deleteButton) {

        await deleteStoredFile(
          deleteButton.dataset.fileDelete
        );

      }

    }
  );


  /*
    Planner
  */

  $("plannerSearchBtn")
    .addEventListener(
      "click",
      renderPlanner
    );


  /*
    Reset
  */

  $("resetDataBtn")
    .addEventListener(
      "click",
      () => {

        $("resetModal")
          .classList.add("open");

      }
    );


  $("closeResetModal")
    .addEventListener(
      "click",
      () => {

        $("resetModal")
          .classList.remove("open");

      }
    );


  $("cancelReset")
    .addEventListener(
      "click",
      () => {

        $("resetModal")
          .classList.remove("open");

      }
    );


  $("deleteSelectedBtn")
    .addEventListener(
      "click",
      resetSelectedData
    );


  /*
    Select all reset options
  */

  $("resetSelectAll")
    .addEventListener(
      "change",
      event => {

        document
          .querySelectorAll(
            ".reset-check"
          )
          .forEach(
            checkbox =>
              checkbox.checked =
                event.target.checked
          );

      }
    );


  /*
    Close modals by tapping outside
  */

  document.addEventListener(
    "click",
    event => {

      if (
        event.target.classList.contains(
          "modal-overlay"
        )
      ) {

        event.target.classList.remove(
          "open"
        );

      }

    }
  );

}


/* ================= FILE HANDLER ================= */

async function handleFiles(fileList) {

  if (
    !fileList ||
    !fileList.length ||
    !selectedChapterId
  ) {
    return;
  }


  const files =
    Array.from(fileList);


  showToast(
    `Saving ${files.length} file${files.length > 1 ? "s" : ""}...`
  );


  for (const file of files) {

    try {

      await saveFile(
        selectedChapterId,
        file
      );

    } catch (error) {

      console.error(
        "File save error:",
        error
      );

      showToast(
        `Could not save ${file.name}`
      );

    }

  }


  await renderChapterFiles();

  showToast(
    "Files saved inside the app ✓"
  );
}


/* ================= EMPTY / DATA ================= */

async function ensureDefaults() {

  const xp =
    await getMeta(
      "xp",
      null
    );

  if (xp === null) {

    await setMeta(
      "xp",
      0
    );

  }


  const streak =
    await getMeta(
      "streak",
      null
    );

  if (streak === null) {

    await setMeta(
      "streak",
      0
    );

  }


  const theme =
    await getMeta(
      "theme",
      null
    );

  if (theme === null) {

    await setMeta(
      "theme",
      "light"
    );

  }

}


/* ================= RENDER ALL ================= */

async function renderAll() {

  try {

    await renderToday();

    await renderIncomplete();

    await renderSubjects();

    await renderProgress();

    await renderStats();

  } catch (error) {

    console.error(
      "Render error:",
      error
    );

    showToast(
      "Something went wrong while loading data."
    );

  }
}


/* ================= PWA INSTALL ================= */

let deferredInstallPrompt = null;


window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredInstallPrompt =
      event;

  }
);


/* ================= SERVICE WORKER ================= */

async function registerServiceWorker() {

  if (
    "serviceWorker" in navigator
  ) {

    try {

      await navigator.serviceWorker.register(
        "sw.js"
      );

      console.log(
        "Service Worker registered."
      );

    } catch (error) {

      console.error(
        "Service Worker error:",
        error
      );

    }

  }
}


/* ================= APP START ================= */

async function init() {

  try {

    await openDatabase();

    await ensureDefaults();

    await loadTheme();

    setupEvents();

    await renderAll();

    /*
      Browser may ask for persistent storage.
      This helps protect IndexedDB files from
      automatic browser storage eviction.
    */

    if (
      navigator.storage &&
      navigator.storage.persist
    ) {

      try {
        await navigator.storage.persist();
      } catch (_) {
        // Persistence request may be denied.
      }

    }

    await registerServiceWorker();

  } catch (error) {

    console.error(
      "App initialization error:",
      error
    );

    document.body.innerHTML = `
      <div style="
        padding:30px;
        font-family:Arial;
        text-align:center;
      ">
        <h2>Revision Tracker</h2>
        <p>
          The app could not start correctly.
        </p>
        <p>
          Please reload the page.
        </p>
      </div>
    `;

  }

}


window.addEventListener(
  "DOMContentLoaded",
  init
);
