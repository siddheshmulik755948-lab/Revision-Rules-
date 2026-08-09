const subjects = [
  {
    name: "Physics",
    icon: "⚡",
    chapters: [
      "Chapter 1",
      "Chapter 2",
      "Chapter 3",
      "Chapter 4",
      "Chapter 5"
    ]
  },

  {
    name: "Chemistry",
    icon: "🧪",
    chapters: [
      "Chapter 1",
      "Chapter 2",
      "Chapter 3",
      "Chapter 4",
      "Chapter 5"
    ]
  },

  {
    name: "Mathematics Part 1",
    icon: "➗",
    chapters: [
      "Chapter 1",
      "Chapter 2",
      "Chapter 3",
      "Chapter 4",
      "Chapter 5"
    ]
  },

  {
    name: "Mathematics Part 2",
    icon: "📐",
    chapters: [
      "Chapter 1",
      "Chapter 2",
      "Chapter 3",
      "Chapter 4",
      "Chapter 5"
    ]
  },

  {
    name: "Biology",
    icon: "🧬",
    chapters: [
      "Chapter 1",
      "Chapter 2",
      "Chapter 3",
      "Chapter 4",
      "Chapter 5"
    ]
  },

  {
    name: "English",
    icon: "📘",
    chapters: [
      "Chapter 1",
      "Chapter 2",
      "Chapter 3",
      "Chapter 4",
      "Chapter 5"
    ]
  },

  {
    name: "Marathi",
    icon: "📕",
    chapters: [
      "Chapter 1",
      "Chapter 2",
      "Chapter 3",
      "Chapter 4",
      "Chapter 5"
    ]
  }
];


const STORAGE_KEY = "revisionRulesData";

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  revisions: {},
  xp: 0,
  streak: 0,
  lastRevisionDate: null
};


let currentSubject = null;


/* SAVE DATA */

function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
}


/* GET CHAPTER DATA */

function getChapter(subject, chapter) {

  const key = subject + "|" + chapter;

  if (!data.revisions[key]) {

    data.revisions[key] = {
      day1: false,
      day3: false,
      day7: false,
      dates: {}
    };

  }

  return data.revisions[key];
}


/* SUBJECT PROGRESS */

function getSubjectProgress(subject) {

  let total = subject.chapters.length * 3;
  let done = 0;

  subject.chapters.forEach(chapter => {

    const r = getChapter(subject.name, chapter);

    if (r.day1) done++;
    if (r.day3) done++;
    if (r.day7) done++;

  });

  return Math.round((done / total) * 100);
}


/* OVERALL PROGRESS */

function getOverallProgress() {

  let total = 0;
  let done = 0;

  subjects.forEach(subject => {

    subject.chapters.forEach(chapter => {

      const r = getChapter(subject.name, chapter);

      total += 3;

      if (r.day1) done++;
      if (r.day3) done++;
      if (r.day7) done++;

    });

  });

  if (!total) return 0;

  return Math.round((done / total) * 100);
}


/* HOME */

function renderHome() {

  const grid = document.getElementById("subjectGrid");

  grid.innerHTML = "";

  subjects.forEach(subject => {

    const percent = getSubjectProgress(subject);

    const card = document.createElement("div");

    card.className = "subject-card";

    card.innerHTML = `
      <div class="subject-icon">${subject.icon}</div>

      <div class="subject-name">
        ${subject.name}
      </div>

      <div class="subject-percent-small">
        ${percent}% completed
      </div>

      <div class="mini-progress">
        <div style="width:${percent}%"></div>
      </div>
    `;

    card.onclick = () => openSubject(subject);

    grid.appendChild(card);

  });


  const overall = getOverallProgress();

  document.getElementById("overallProgress").textContent =
    overall + "%";


  document.getElementById("streakCount").textContent =
    data.streak;


  document.getElementById("xpText").textContent =
    data.xp + " XP";


  const xpPercent =
    Math.min((data.xp % 100), 100);

  document.getElementById("xpBar").style.width =
    xpPercent + "%";


  renderBadges();
  renderCountdown();
  renderTodayCount();

}


/* OPEN SUBJECT */

function openSubject(subject) {

  currentSubject = subject;

  document.getElementById("homePage")
    .classList.remove("active");

  document.getElementById("subjectPage")
    .classList.add("active");

  document.getElementById("subjectTitle")
    .textContent = subject.name;

  renderSubject();

}


/* SUBJECT PAGE */

function renderSubject() {

  const subject = currentSubject;

  const percent =
    getSubjectProgress(subject);


  document.getElementById("subjectPercent")
    .textContent = percent + "%";

  document.getElementById("subjectProgressText")
    .textContent = percent + "%";

  document.getElementById("subjectProgressBar")
    .style.width = percent + "%";


  const list =
    document.getElementById("chapterList");

  list.innerHTML = "";


  subject.chapters.forEach(chapter => {

    const r =
      getChapter(subject.name, chapter);


    const completed =
      [r.day1, r.day3, r.day7]
      .filter(Boolean).length;


    const percent =
      Math.round((completed / 3) * 100);


    const card =
      document.createElement("div");

    card.className = "chapter-card";


    card.innerHTML = `

      <div class="chapter-top">

        <div class="chapter-name">
          ${chapter}
        </div>

        <div class="chapter-percent">
          ${percent}%
        </div>

      </div>


      <div class="chapter-progress">
        <div style="width:${percent}%"></div>
      </div>


      <div class="revision-info">
        Revision: 
        ${r.day1 ? "✅ Day 1" : "⬜ Day 1"} 
        •
        ${r.day3 ? "✅ Day 3" : "⬜ Day 3"} 
        •
        ${r.day7 ? "✅ Day 7" : "⬜ Day 7"}
      </div>


      <div class="revision-buttons">

        <button
          class="${r.day1 ? "done" : ""}"
          onclick="completeRevision('${subject.name}','${chapter}','day1')">
          Day 1
        </button>

        <button
          class="${r.day3 ? "done" : ""}"
          onclick="completeRevision('${subject.name}','${chapter}','day3')">
          Day 3
        </button>

        <button
          class="${r.day7 ? "done" : ""}"
          onclick="completeRevision('${subject.name}','${chapter}','day7')">
          Day 7
        </button>

      </div>
    `;


    list.appendChild(card);

  });

}


/* COMPLETE REVISION */

function completeRevision(
  subject,
  chapter,
  revision
) {

  const r =
    getChapter(subject, chapter);


  if (r[revision]) return;


  r[revision] = true;


  const today =
    new Date().toISOString().split("T")[0];


  r.dates[revision] = today;


  data.xp += 10;


  updateStreak();


  saveData();


  renderSubject();
  renderHome();
  renderToday();


  alert("Revision completed! 🎉 +10 XP");

}


/* STREAK */

function updateStreak() {

  const today =
    new Date().toISOString().split("T")[0];


  if (data.lastRevisionDate === today) {
    return;
  }


  if (!data.lastRevisionDate) {

    data.streak = 1;

  } else {

    const last =
      new Date(data.lastRevisionDate);

    const current =
      new Date(today);


    const difference =
      Math.floor(
        (current - last) /
        (1000 * 60 * 60 * 24)
      );


    if (difference === 1) {

      data.streak++;

    } else {

      data.streak = 1;

    }

  }


  data.lastRevisionDate = today;

}


/* TODAY REVISION */

function renderToday() {

  const list =
    document.getElementById("todayList");

  list.innerHTML = "";


  let found = false;


  subjects.forEach(subject => {

    subject.chapters.forEach(chapter => {

      const r =
        getChapter(subject.name, chapter);


      if (!r.day1 || !r.day3 || !r.day7) {

        found = true;


        const card =
          document.createElement("div");

        card.className = "today-card";


        card.innerHTML = `
          <h3>${subject.icon} ${subject.name}</h3>

          <p>${chapter}</p>

          <button
            class="today-btn"
            onclick="openSubjectByName('${subject.name}')">
            Open Revision
          </button>
        `;


        list.appendChild(card);

      }

    });

  });


  if (!found) {

    list.innerHTML = `
      <div class="empty">
        🎉 All revisions are completed!
      </div>
    `;

  }

}


/* TODAY COUNT */

function renderTodayCount() {

  let count = 0;

  subjects.forEach(subject => {

    subject.chapters.forEach(chapter => {

      const r =
        getChapter(subject.name, chapter);

      if (!r.day1 || !r.day3 || !r.day7) {
        count++;
      }

    });

  });


  document.getElementById("todayCount")
    .textContent = count + " revisions remaining";

}


/* PROGRESS PAGE */

function renderProgress() {

  const list =
    document.getElementById("progressList");

  list.innerHTML = "";


  subjects.forEach(subject => {

    const percent =
      getSubjectProgress(subject);


    const card =
      document.createElement("div");

    card.className =
      "progress-subject-card";


    card.innerHTML = `

      <h3>
        ${subject.icon} ${subject.name}
      </h3>

      <p>
        ${percent}% of revision plan completed
      </p>

      <div class="large-progress">
        <div style="width:${percent}%"></div>
      </div>

    `;


    list.appendChild(card);

  });

}


/* BADGES */

function renderBadges() {

  const box =
    document.getElementById("badges");

  box.innerHTML = "";


  const badges = [];


  if (data.xp >= 10)
    badges.push("🌱 First Revision");


  if (data.xp >= 50)
    badges.push("⭐ 50 XP");


  if (data.xp >= 100)
    badges.push("🏆 100 XP");


  if (data.streak >= 3)
    badges.push("🔥 3 Day Streak");


  if (data.streak >= 7)
    badges.push("👑 7 Day Streak");


  if (!badges.length) {

    box.innerHTML =
      `<span class="badge">🔒 Start revising</span>`;

    return;

  }


  badges.forEach(badge => {

    const el =
      document.createElement("span");

    el.className = "badge";

    el.textContent = badge;

    box.appendChild(el);

  });

}


/* COUNTDOWN */

function renderCountdown() {

  /*
    HSC countdown date can be changed here later.
    For now this is a placeholder date.
  */

  const examDate =
    new Date("2027-02-15T09:00:00");


  const now =
    new Date();


  const difference =
    examDate - now;


  if (difference <= 0) {

    document.getElementById("daysLeft")
      .textContent = "0";

    document.getElementById("hoursLeft")
      .textContent = "0";

    document.getElementById("minutesLeft")
      .textContent = "0";

    return;

  }


  const days =
    Math.floor(
      difference /
      (1000 * 60 * 60 * 24)
    );


  const hours =
    Math.floor(
      (difference /
      (1000 * 60 * 60)) % 24
    );


  const minutes =
    Math.floor(
      (difference /
      (1000 * 60)) % 60
    );


  document.getElementById("daysLeft")
    .textContent = days;

  document.getElementById("hoursLeft")
    .textContent = hours;

  document.getElementById("minutesLeft")
    .textContent = minutes;

}


/* NAVIGATION */

function showPage(pageId, button) {

  document.querySelectorAll(".page")
    .forEach(page =>
      page.classList.remove("active")
    );


  document.getElementById(pageId)
    .classList.add("active");


  document.querySelectorAll(".nav-btn")
    .forEach(btn =>
      btn.classList.remove("active")
    );


  if (button) {
    button.classList.add("active");
  }


  if (pageId === "todayPage") {
    renderToday();
  }


  if (pageId === "progressPage") {
    renderProgress();
  }

}


/* HOME */

function goHome() {

  document.querySelectorAll(".page")
    .forEach(page =>
      page.classList.remove("active")
    );


  document.getElementById("homePage")
    .classList.add("active");

  currentSubject = null;

  renderHome();

}


/* OPEN SUBJECT BY NAME */

function openSubjectByName(name) {

  const subject =
    subjects.find(s => s.name === name);

  if (subject) {
    openSubject(subject);
  }

}


/* START APP */

renderHome();
renderToday();

setInterval(() => {

  renderCountdown();

}, 60000);
