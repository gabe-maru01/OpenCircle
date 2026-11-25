const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

const subjects = [
  ['Academics & Education', 'Math, physics & clarity', 'photo-1509062522246-3755977927d7'],
  ['Philosophy & Wisdom', 'Explore big questions', 'photo-1481627834876-b7833e8f5570'],
  ['Vedas & Heritage', 'Ancient knowledge', 'photo-1605106702734-205df224ecce'],
  ['Drawing & Visual Arts', 'Create something new', 'photo-1513364776144-60967b0f800f'],
  ['Music & Instruments', 'Find your rhythm', 'photo-1511379938547-c1f69419868d'],
  ['Dance & Performance', 'Move with confidence', 'photo-1504609813442-a8924e83f76e'],
  ['Technology & Coding', 'Build the future', 'photo-1518770660439-4636190af475'],
  ['Business & Career', 'Turn ideas into action', 'photo-1521737711867-e3b97375f902'],
  ['Languages & Literature', 'Connect through words', 'photo-1512820790803-83ca734da794'],
  ['Sports & Fitness', 'Learn by doing', 'photo-1531415074968-036ba1b575da'],
  ['Cooking & Food', 'Share a taste of home', 'photo-1556911220-e15b29be8c8f'],
  ['Traditional Skills', 'Keep craft alive', 'photo-1452860606245-08befc0ff44b']
];

const seniorPhotoMap = {
  'Prof. Subhash Kulkarni': 'photo-1552058544-f2b08422138a',
  'Savitri Devi': 'photo-1544717305-2782549b5136',
  'Col. Harpreet Singh (Retd.)': 'photo-1472099645785-5658abf4ff4e',
  'Narayanacharya Joshi': 'photo-1566616213894-2d4e1baee5d8'
};

const seniorFallbackPhotos = [
  'photo-1552058544-f2b08422138a',
  'photo-1544717305-2782549b5136',
  'photo-1472099645785-5658abf4ff4e',
  'photo-1566616213894-2d4e1baee5d8'
];

const subjectPhotoMap = {
  'Academics & Education': 'photo-1500648767791-00dcc994a43e',
  'Philosophy & Wisdom': 'photo-1506794778202-cad84cf45f1d',
  'Vedas & Heritage': 'photo-1531123897727-8f129e1688ce',
  'Drawing & Visual Arts': 'photo-1534528741775-53994a69daeb',
  'Music & Instruments': 'photo-1507003211169-0a1dd7228f2d',
  'Dance & Performance': 'photo-1544005313-94ddf0286df2',
  'Technology & Coding': 'photo-1500648767791-00dcc994a43e',
  'Business & Career': 'photo-1551836022-d5d88e9218df',
  'Languages & Literature': 'photo-1548142813-c348350df52b',
  'Sports & Fitness': 'photo-1507003211169-0a1dd7228f2d',
  'Cooking & Food': 'photo-1531123897727-8f129e1688ce',
  'Traditional Skills': 'photo-1534528741775-53994a69daeb'
};

const coursePhotoMap = {
  'Academics & Education': 'photo-1509062522246-3755977927d7',
  'Technology & Coding': 'photo-1518770660439-4636190af475',
  'Drawing & Visual Arts': 'photo-1513364776144-60967b0f800f',
  'Philosophy & Wisdom': 'photo-1481627834876-b7833e8f5570',
  'Vedas & Heritage': 'photo-1605106702734-205df224ecce'
};

let currentUser = null;
let authRole = 'student';
let seniorFilterActive = false;
let cachedTeachers = [];
let cachedCourses = [];
let myTeachersCache = [];
let activeMeetUrl = '';

const imgUrl = (id, w = 700) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=82`;

function getTeacherPhoto(t) {
  if (t.is_senior) {
    if (seniorPhotoMap[t.name]) {
      return imgUrl(seniorPhotoMap[t.name], 650);
    }
    const idx = Math.abs(t.id || 0) % seniorFallbackPhotos.length;
    return imgUrl(seniorFallbackPhotos[idx], 650);
  }
  return imgUrl(subjectPhotoMap[t.subject] || 'photo-1534528741775-53994a69daeb', 650);
}

function getCoursePhoto(c) {
  return imgUrl(coursePhotoMap[c.subject] || 'photo-1509062522246-3755977927d7', 700);
}

// --- AUTHENTICATION ---

async function refreshAuth() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    currentUser = data.user;
    updateAuthUI();
  } catch (err) {
    console.error('Auth check failed:', err);
  }
}

function updateAuthUI() {
  const navArea = $('navAuthArea');
  if (currentUser) {
    const roleLabel = currentUser.role === 'teacher' ? 'Teacher' : 'Student';
    navArea.innerHTML = `
      <span class="pill" style="cursor:pointer" onclick="go('dashboard')">${roleLabel}: ${esc(currentUser.name.split(' ')[0])}</span>
      <button class="btn secondary btn-sm" onclick="logoutUser()">Sign out</button>
      <button class="mobile-menu" onclick="document.getElementById('nav').classList.toggle('open')">☰</button>
    `;

    if (currentUser.role === 'teacher') {
      $('teachAuthGate').style.display = 'none';
      $('teachFormCard').style.display = 'block';
      if ($('teachNameInput') && !$('teachNameInput').value) {
        $('teachNameInput').value = currentUser.name;
      }
    } else {
      $('teachAuthGate').style.display = 'block';
      $('teachFormCard').style.display = 'none';
    }

    $('dashAuthGate').style.display = 'none';
    $('dashEyebrow').textContent = `${roleLabel} Workspace`;
    $('dashTitle').textContent = `Welcome, ${currentUser.name}`;
    $('dashSubtitle').textContent = `${currentUser.email} · ${roleLabel} Account`;

    if (currentUser.role === 'teacher') {
      $('teacherDashContent').style.display = 'block';
      $('studentDashContent').style.display = 'none';
    } else {
      $('studentDashContent').style.display = 'block';
      $('teacherDashContent').style.display = 'none';
    }
  } else {
    navArea.innerHTML = `
      <button class="btn secondary btn-sm" onclick="openAuthModal('student','login')">Student Login</button>
      <button class="btn primary btn-sm" onclick="openAuthModal('teacher','login')">Teacher Login</button>
      <button class="mobile-menu" onclick="document.getElementById('nav').classList.toggle('open')">☰</button>
    `;
    $('teachAuthGate').style.display = 'block';
    $('teachFormCard').style.display = 'none';
    $('dashAuthGate').style.display = 'grid';
    $('studentDashContent').style.display = 'none';
    $('teacherDashContent').style.display = 'none';
    $('dashEyebrow').textContent = 'Personal workspace';
    $('dashTitle').textContent = 'Your Dashboard';
    $('dashSubtitle').textContent = 'Sign in as a Student or Teacher to access your workspace.';
  }
}

function openAuthModal(role = 'student', tab = 'login') {
  setAuthRole(role);
  switchAuthTab(tab);
  $('authModal').classList.add('show');
}

function closeAuthModal() {
  $('authModal').classList.remove('show');
}

function setAuthRole(role) {
  authRole = role;
  $('roleBtnStudent').classList.toggle('active', role === 'student');
  $('roleBtnTeacher').classList.toggle('active', role === 'teacher');

  if (role === 'student') {
    $('loginHeading').textContent = 'Student Sign In';
    $('loginSub').textContent = 'Access your enrolled long-term courses, saved mentors, and session calls.';
    $('registerHeading').textContent = 'Create Student Account';
    $('registerSub').textContent = 'Join free to book 1-on-1 sessions and enroll in structured courses.';
    $('regBioLabel').textContent = 'What are you excited to learn?';
  } else {
    $('loginHeading').textContent = 'Teacher & Senior Mentor Sign In';
    $('loginSub').textContent = 'Manage your teaching listings, create live meet rooms, and answer questions.';
    $('registerHeading').textContent = 'Create Teacher / Senior Mentor Account';
    $('registerSub').textContent = 'Share your academic expertise, craft, or senior life experience.';
    $('regBioLabel').textContent = 'Short summary of your expertise or background';
  }
}

function switchAuthTab(tab) {
  $('tabLogin').classList.toggle('active', tab === 'login');
  $('tabRegister').classList.toggle('active', tab === 'register');
  $('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  $('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  $('loginMessage').textContent = '';
  $('registerMessage').textContent = '';
}

function quickDemoLogin(email, role) {
  setAuthRole(role);
  switchAuthTab('login');
  $('loginEmailInput').value = email;
  $('loginPassInput').value = 'demo1234';
  $('loginForm').requestSubmit();
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  data.expected_role = authRole;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const out = await res.json();
  if (!res.ok) {
    $('loginMessage').innerHTML = `<span class="error-text">${esc(out.error)}</span>`;
    return;
  }
  currentUser = out.user;
  updateAuthUI();
  e.target.reset();
  closeAuthModal();
  toast(`Signed in as ${currentUser.name} (${currentUser.role})`);
  loadTeachers();
  if ($('dashboard').classList.contains('active')) loadDashboard();
});

$('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  data.role = authRole;
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const out = await res.json();
  if (!res.ok) {
    $('registerMessage').innerHTML = `<span class="error-text">${esc(out.error)}</span>`;
    return;
  }
  currentUser = out.user;
  updateAuthUI();
  e.target.reset();
  closeAuthModal();
  toast(`Welcome to OpenCircle, ${currentUser.name}!`);
  if (currentUser.role === 'teacher') {
    go('teach');
  } else {
    loadTeachers();
  }
});

async function logoutUser() {
  await fetch('/api/logout', { method: 'POST' });
  currentUser = null;
  updateAuthUI();
  loadTeachers();
  toast('Signed out.');
}

// --- CARDS ---

function cardTeacher(t) {
  const safeName = esc(t.name).replace(/'/g, "&#39;");
  const isOwner = currentUser && t.user_id === currentUser.id;
  const seniorBadge = t.is_senior
    ? `<span class="pill pill-gold">★ ${esc(t.senior_tag || 'Senior Mentor')}</span>`
    : `<span class="rating">Demo profile</span>`;

  return `
    <article class="teacher ${t.is_senior ? 'senior-card' : ''}">
      <img class="teacher-img" src="${getTeacherPhoto(t)}" alt="${esc(t.name)}">
      <div class="teacher-body">
        <div class="teacher-top">
          <span class="pill">${esc(t.subject)}</span>
          ${seniorBadge}
        </div>
        <h3>${esc(t.name)}</h3>
        <div class="muted">${esc(t.bio || "Experienced knowledge sharer.")}</div>
        <div class="teacher-tags">
          <span class="tag">${esc(t.experience || "Practitioner")}</span>
          <span class="tag">${esc(t.location || t.mode)}</span>
        </div>
        <div class="teacher-foot">
          <span><b>${esc(t.price || "Free / volunteer")}</b></span>
          <div style="display:flex;gap:6px">
            <button class="btn plain" style="padding:8px 10px;font-size:12px" onclick="showProfile(${t.id})">Details</button>
            ${isOwner
              ? `<button class="btn secondary btn-sm" onclick="go('dashboard')">Manage</button>`
              : `<button class="btn primary btn-sm" onclick="openBooking(${t.id},'${safeName}')">Request</button>`
            }
          </div>
        </div>
      </div>
    </article>`;
}

function cardCourse(c) {
  return `
    <article class="course">
      <img src="${getCoursePhoto(c)}" alt="${esc(c.title)}">
      <div class="course-body">
        <div class="teacher-top">
          <span class="pill">${esc(c.subject)}</span>
          <span class="rating">${esc(c.duration)}</span>
        </div>
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description)}</p>
        <div class="course-meta">
          <span>Mentor: <b>${esc(c.teacher)}</b></span>
          <span>${esc(c.level)}</span>
        </div>
        <div class="teacher-foot">
          <span><b>${esc(c.price || "Free")}</b></span>
          <button class="btn secondary btn-sm" onclick="openCourseModal(${c.id})">Syllabus & Enroll</button>
        </div>
      </div>
    </article>`;
}

// --- NAVIGATION & BROWSER HISTORY ---

function go(id, addToHistory = true) {
  document.querySelectorAll('.view, .page').forEach(x => x.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
  $('nav').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (addToHistory && window.location.hash !== `#${id}`) {
    history.pushState({ view: id }, '', `#${id}`);
  }

  if (id === 'explore') loadTeachers();
  if (id === 'courses') loadCourses();
  if (id === 'community') loadQuestions();
  if (id === 'dashboard' && currentUser) loadDashboard();
}

window.addEventListener('popstate', (e) => {
  const targetView = (e.state && e.state.view) || window.location.hash.replace('#', '') || 'home';
  go(targetView, false);
});

function setMode(m, btn) {
  $('mode').value = m;
  document.querySelectorAll('.togglebar button[data-mode]').forEach(b => b.classList.toggle('active', b === btn));
  loadTeachers();
}

function toggleSeniorFilter(btn) {
  seniorFilterActive = !seniorFilterActive;
  btn.classList.toggle('active', seniorFilterActive);
  loadTeachers();
}

function syncModeDropdown() {
  const m = $('mode').value;
  document.querySelectorAll('.togglebar button[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  loadTeachers();
}

function resetExploreFilters() {
  $('search').value = '';
  $('subjectFilter').value = '';
  $('mode').value = 'All';
  seniorFilterActive = false;
  $('seniorToggleBtn').classList.remove('active');
  syncModeDropdown();
}

function filterCategory(subjectName) {
  go('explore');
  $('subjectFilter').value = subjectName;
  loadTeachers();
}

function exploreSeniors() {
  go('explore');
  seniorFilterActive = true;
  $('seniorToggleBtn').classList.add('active');
  loadTeachers();
}

function searchFromHero() {
  go('explore');
  $('search').value = $('heroSearch').value;
  $('mode').value = $('heroMode').value;
  syncModeDropdown();
}

// --- DATA LOADERS ---

async function loadTeachers() {
  try {
    const q = $('search') ? $('search').value : '';
    const subject = $('subjectFilter') ? $('subjectFilter').value : '';
    const mode = $('mode') ? $('mode').value : 'All';
    const seniorParam = seniorFilterActive ? '&senior=1' : '';

    const res = await fetch(`/api/teachers?q=${encodeURIComponent(q)}&subject=${encodeURIComponent(subject)}&mode=${encodeURIComponent(mode)}${seniorParam}`);
    const teachers = await res.json();
    cachedTeachers = teachers;

    if ($('resultCount')) {
      $('resultCount').textContent = `${teachers.length} ${teachers.length === 1 ? 'mentor' : 'mentors'} found`;
    }
    if ($('teachers')) {
      $('teachers').innerHTML = teachers.length
        ? teachers.map(cardTeacher).join('')
        : '<div class="empty" style="grid-column:1/-1">No matching mentors found. Try clearing a filter or exploring all 12 subjects.</div>';
    }

    if (!q && !subject && mode === 'All' && !seniorFilterActive) {
      const seniors = teachers.filter(t => t.is_senior).slice(0, 3);
      const regulars = teachers.filter(t => !t.is_senior).slice(0, 3);
      if ($('seniorSpotlightGrid')) {
        $('seniorSpotlightGrid').innerHTML = seniors.map(cardTeacher).join('');
      }
      if ($('featuredTeachers')) {
        $('featuredTeachers').innerHTML = regulars.map(cardTeacher).join('');
      }
    }
  } catch (err) {
    console.error('Error loading teachers:', err);
  }
}

async function loadCourses() {
  try {
    const q = $('courseSearch') ? $('courseSearch').value : '';
    const subj = $('courseSubjectFilter') ? $('courseSubjectFilter').value : '';
    const res = await fetch(`/api/courses?q=${encodeURIComponent(q)}&subject=${encodeURIComponent(subj)}`);
    const courses = await res.json();
    cachedCourses = courses;

    if ($('coursesList')) {
      $('coursesList').innerHTML = courses.length
        ? courses.map(cardCourse).join('')
        : '<div class="empty" style="grid-column:1/-1">No matching courses found.</div>';
    }
    if ($('homeCourses') && !q && !subj) {
      $('homeCourses').innerHTML = courses.slice(0, 3).map(cardCourse).join('');
    }
  } catch (err) {
    console.error('Error loading courses:', err);
  }
}

function openCourseModal(id) {
  const c = cachedCourses.find(x => x.id === id);
  if (!c) return;
  const steps = (c.syllabus || '').split('|').map(s => `<div class="syllabus-step">${esc(s.trim())}</div>`).join('');
  $('courseModalBody').innerHTML = `
    <button class="close" onclick="closeCourseModal()">×</button>
    <span class="pill">${esc(c.subject)} · ${esc(c.duration)}</span>
    <h2>${esc(c.title)}</h2>
    <p>${esc(c.description)}</p>
    <div style="margin:12px 0;font-size:13px">
      <b>Instructor:</b> ${esc(c.teacher)} · <b>Level:</b> ${esc(c.level)} · <b>Fee:</b> ${esc(c.price)}
    </div>
    <h3 style="font-size:16px;margin:16px 0 10px">Structured Syllabus Breakdown</h3>
    ${steps}
    <button class="btn primary" style="width:100%;margin-top:16px" onclick="enrollCourse(${c.id})">Enroll & Track in Dashboard</button>
  `;
  $('courseModal').classList.add('show');
}

function closeCourseModal() {
  $('courseModal').classList.remove('show');
}

async function enrollCourse(courseId) {
  if (!currentUser) {
    closeCourseModal();
    toast('Please sign in as a Student to enroll in courses.');
    openAuthModal('student', 'login');
    return;
  }
  const res = await fetch(`/api/courses/${courseId}/enroll`, { method: 'POST' });
  const out = await res.json();
  closeCourseModal();
  toast(out.message || out.error);
  if (res.ok) go('dashboard');
}

// --- QUICK ASK Q&A ---

async function loadQuestions() {
  const res = await fetch('/api/questions');
  const rows = await res.json();
  const canAnswer = currentUser && currentUser.role === 'teacher';

  $('questionsList').innerHTML = rows.length
    ? rows.map(q => `
        <article class="booking-card">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="pill">${esc(q.subject)}</span>
            <span class="muted">Asked by ${esc(q.author_name)}</span>
          </div>
          <h3 style="font-size:17px;margin-top:12px">${esc(q.question_text)}</h3>
          ${q.answer_text
            ? `<div class="reply-box"><b>${esc(q.answered_by)}:</b> ${esc(q.answer_text)}</div>`
            : canAnswer
              ? `<form onsubmit="submitAnswer(event, ${q.id})" style="margin-top:12px;display:flex;gap:8px">
                   <input name="answer_text" required placeholder="Write a helpful mentor reply..." style="flex:1;padding:9px;border:1px solid var(--line);border-radius:9px">
                   <button class="btn primary btn-sm" type="submit">Reply</button>
                 </form>`
              : `<div class="muted" style="margin-top:10px;font-style:italic">Awaiting response from a teacher or senior mentor...</div>`
          }
        </article>`).join('')
    : '<div class="empty" style="grid-column:1/-1">No questions posted yet. Ask the first question above!</div>';
}

$('questionForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) {
    toast('Please sign in to post a question.');
    openAuthModal('student', 'login');
    return;
  }
  const data = Object.fromEntries(new FormData(e.target).entries());
  const res = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (res.ok) {
    e.target.reset();
    toast('Question posted!');
    loadQuestions();
  }
});

async function submitAnswer(e, qId) {
  e.preventDefault();
  const answer_text = e.target.elements.answer_text.value;
  const res = await fetch(`/api/questions/${qId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer_text })
  });
  if (res.ok) {
    toast('Answer published!');
    loadQuestions();
  }
}

// --- DASHBOARD (ROLE-AWARE WITH MENTOR-ONLY MEET CREATION) ---

async function loadDashboard() {
  if (!currentUser) return;
  const res = await fetch('/api/dashboard');
  if (!res.ok) return;
  const data = await res.json();

  if (currentUser.role === 'teacher') {
    myTeachersCache = data.my_teachers || [];
    $('myTeachersList').innerHTML = myTeachersCache.length
      ? myTeachersCache.map(t => `
          <article class="panel" style="margin-bottom:0">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
              <span class="pill">${esc(t.subject)}</span>
              ${t.is_senior ? '<span class="pill pill-gold">★ Senior Spotlight</span>' : `<span class="muted">${esc(t.mode)}</span>`}
            </div>
            <h3 style="margin-top:12px">${esc(t.name)}</h3>
            <p>${esc(t.bio || 'No bio provided.')}</p>
            <div class="muted"><b>${esc(t.price || 'Free')}</b> · ${esc(t.location || t.mode)}</div>
            <div class="card-actions">
              <button class="btn secondary btn-sm" onclick="openEditTeacher(${t.id})">Edit listing</button>
              <button class="btn btn-danger btn-sm" onclick="deleteTeacher(${t.id})">Delete</button>
            </div>
          </article>`).join('')
      : '<div class="empty" style="grid-column:1/-1">You haven’t published any teaching listings yet. Click "+ Add new listing" above.</div>';

    $('incomingBookings').innerHTML = data.incoming.length
      ? data.incoming.map(b => {
          const safeTitle = esc(`${b.subject} with ${b.learner_name}`).replace(/'/g, "&#39;");
          const hasMeet = Boolean(b.meet_room);
          return `
          <article class="booking-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <span class="pill">${esc(b.subject)} · ${esc(b.session_type)}</span>
              <span class="badge-status status-${esc(b.status)}">${esc(b.status)}</span>
            </div>
            <h3 style="font-size:18px;margin-top:12px">${esc(b.learner_name)}</h3>
            <div class="muted" style="margin-top:4px">${esc(b.learner_email)} · Listing: ${esc(b.teacher_name)}</div>
            <p>${esc(b.message || 'No additional message provided.')}</p>
            ${b.teacher_reply ? `<div class="reply-box"><b>Your reply:</b> ${esc(b.teacher_reply)}</div>` : ''}
            ${hasMeet ? `<div class="muted" style="margin-top:8px"><b>Meet Room:</b> <code>${esc(b.meet_room)}</code></div>` : ''}
            <div class="card-actions">
              ${b.status !== 'Confirmed'
                ? `<button class="btn primary btn-sm" onclick="respondBooking(${b.id}, 'Confirmed')">Confirm & Create Meet</button>`
                : !hasMeet
                  ? `<button class="btn primary btn-sm" onclick="mentorCreateBookingMeet(${b.id})">+ Create Meet Room</button>`
                  : `<button class="btn primary btn-sm" onclick="startLiveMeet('${esc(b.meet_room)}', '${safeTitle}', false)">📹 Video Meet</button>
                     <button class="btn secondary btn-sm" onclick="startLiveMeet('${esc(b.meet_room)}', '${safeTitle}', true)">🎙 Voice Call</button>`
              }
              ${b.status !== 'Declined' ? `<button class="btn secondary btn-sm" onclick="respondBooking(${b.id}, 'Declined')">Decline</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="deleteBooking(${b.id})">Delete</button>
            </div>
          </article>`;
        }).join('')
      : '<div class="empty" style="grid-column:1/-1">No incoming student session requests yet.</div>';
  } else {
    $('studentEnrollments').innerHTML = data.enrollments.length
      ? data.enrollments.map(e => `
          <article class="panel" style="margin-bottom:0">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="pill">${esc(e.subject)}</span>
              <span class="badge-status status-Confirmed">${esc(e.progress)}</span>
            </div>
            <h3 style="margin-top:12px">${esc(e.title)}</h3>
            <p>Mentor: <b>${esc(e.teacher)}</b> · ${esc(e.duration)}</p>
            <div class="card-actions">
              <button class="btn secondary btn-sm" onclick="openCourseModal(${e.id})">View Syllabus</button>
              <button class="btn btn-danger btn-sm" onclick="dropEnrollment(${e.enrollment_id})">Unenroll</button>
            </div>
          </article>`).join('')
      : '<div class="empty" style="grid-column:1/-1">Not enrolled in any long-term courses yet. Explore Math, Coding, and Academic programmes!</div>';

    $('outgoingBookings').innerHTML = data.outgoing.length
      ? data.outgoing.map(b => {
          const safeTitle = esc(`${b.subject} with ${b.teacher_name}`).replace(/'/g, "&#39;");
          const hasMeet = b.status === 'Confirmed' && Boolean(b.meet_room);
          return `
          <article class="booking-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <span class="pill">${esc(b.subject)} · ${esc(b.session_type)}</span>
              <span class="badge-status status-${esc(b.status)}">${esc(b.status)}</span>
            </div>
            <h3 style="font-size:18px;margin-top:12px">With ${esc(b.teacher_name)}</h3>
            <p>${esc(b.message || 'No additional message provided.')}</p>
            ${b.teacher_reply ? `<div class="reply-box"><b>Mentor reply:</b> ${esc(b.teacher_reply)}</div>` : ''}
            ${!hasMeet && b.status === 'Pending'
              ? `<div class="muted" style="font-size:12px;margin-top:8px">⏳ Waiting for mentor to confirm & create the meet room...</div>`
              : ''}
            <div class="card-actions">
              ${hasMeet
                ? `<button class="btn primary btn-sm" onclick="startLiveMeet('${esc(b.meet_room)}', '${safeTitle}', false)">📹 Join Video Meet</button>
                   <button class="btn secondary btn-sm" onclick="startLiveMeet('${esc(b.meet_room)}', '${safeTitle}', true)">🎙 Join Voice Call</button>`
                : ''}
              ${(b.status === 'Pending' || b.status === 'Confirmed')
                ? `<button class="btn secondary btn-sm" onclick="cancelBooking(${b.id})">Cancel request</button>`
                : ''}
              <button class="btn btn-danger btn-sm" onclick="deleteBooking(${b.id})">Delete</button>
            </div>
          </article>`;
        }).join('')
      : '<div class="empty" style="grid-column:1/-1">No session requests yet. Browse mentors in Explore!</div>';

    $('savedMentorsList').innerHTML = data.saved.length
      ? data.saved.map(cardTeacher).join('')
      : '<div class="empty" style="grid-column:1/-1">No saved mentors yet. Open any mentor profile and click "Save mentor".</div>';
  }
}

async function dropEnrollment(enrollmentId) {
  await fetch(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' });
  toast('Course removed from dashboard.');
  loadDashboard();
}

function openEditTeacher(id) {
  const t = myTeachersCache.find(x => x.id === id);
  if (!t) return;
  const f = $('editTeacherForm');
  f.elements.id.value = t.id;
  f.elements.name.value = t.name;
  f.elements.subject.value = t.subject;
  f.elements.experience.value = t.experience || '';
  f.elements.mode.value = t.mode || 'Online';
  f.elements.location.value = t.location || '';
  f.elements.price.value = t.price || '';
  f.elements.is_senior.checked = Boolean(t.is_senior);
  f.elements.bio.value = t.bio || '';
  $('editTeacherModal').classList.add('show');
}

function closeEditModal() {
  $('editTeacherModal').classList.remove('show');
}

$('editTeacherForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.is_senior = e.target.elements.is_senior.checked;

  const res = await fetch(`/api/teachers/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const out = await res.json();
  if (!res.ok) {
    toast(out.error || 'Could not update listing.');
    return;
  }
  closeEditModal();
  toast('Teacher listing updated!');
  loadDashboard();
  loadTeachers();
});

async function deleteTeacher(id) {
  if (!confirm('Delete this teaching listing and its associated bookings?')) return;
  const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
  if (res.ok) {
    toast('Listing deleted.');
    loadDashboard();
    loadTeachers();
  }
}

async function respondBooking(id, status) {
  const reply = status === 'Confirmed'
    ? (prompt('Add a note for the student (a private Meet room will be created automatically):', 'Confirmed! Join the live meet room whenever you are ready.') || '')
    : '';
  const res = await fetch(`/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, teacher_reply: reply })
  });
  if (res.ok) {
    toast(status === 'Confirmed' ? 'Booking confirmed & Meet Room created!' : `Booking marked as ${status}.`);
    loadDashboard();
  }
}

async function mentorCreateBookingMeet(bookingId) {
  if (!currentUser || currentUser.role !== 'teacher') {
    toast('Only mentors can create meeting rooms.');
    return;
  }
  const res = await fetch(`/api/bookings/${bookingId}/meet`, { method: 'POST' });
  const out = await res.json();
  if (res.ok) {
    toast(out.message);
    loadDashboard();
  } else {
    toast(out.error || 'Could not create meet room.');
  }
}

function mentorCreateInstantMeet(audioOnly = false) {
  if (!currentUser || currentUser.role !== 'teacher') {
    toast('Only teachers and senior mentors can create meeting rooms.');
    return;
  }
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  const roomSlug = `OpenCircle-Host-${currentUser.id}-${rand}`;
  startLiveMeet(roomSlug, `${currentUser.name} · Open Mentor Room`, audioOnly);
}

async function cancelBooking(id) {
  const res = await fetch(`/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Cancelled' })
  });
  if (res.ok) {
    toast('Request cancelled.');
    loadDashboard();
  }
}

async function deleteBooking(id) {
  if (!confirm('Delete this booking record?')) return;
  const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
  if (res.ok) {
    toast('Booking deleted.');
    loadDashboard();
  }
}

// --- LIVE VOICE & VIDEO MEET LAUNCHER ---

function startLiveMeet(roomName, title, audioOnly = false) {
  const cleanRoom = roomName.replace(/[^a-zA-Z0-9-]/g, '');
  const hashParams = audioOnly
    ? '#config.startWithVideoMuted=true&config.prejoinPageEnabled=false'
    : '#config.startWithVideoMuted=false&config.prejoinPageEnabled=false';
  activeMeetUrl = `https://meet.jit.si/${cleanRoom}${hashParams}`;

  $('meetModeBadge').textContent = audioOnly ? '🎙 Live Voice Call' : '📹 Live Video Meet';
  $('meetRoomTitle').textContent = title;
  $('meetLinkDisplay').textContent = `https://meet.jit.si/${cleanRoom}`;
  $('meetLaunchBtn').href = activeMeetUrl;
  $('meetModal').classList.add('show');
}

function closeMeetModal() {
  $('meetModal').classList.remove('show');
}

function copyMeetLink() {
  if (!activeMeetUrl) return;
  const cleanLink = $('meetLinkDisplay').textContent;
  navigator.clipboard.writeText(cleanLink);
  toast('Invite link copied! Share it with your student or mentor.');
}

// --- PROFILE VIEW & BOOKING ---

function showProfile(id) {
  const t = cachedTeachers.find(x => x.id === id);
  if (!t) return;
  const safeName = esc(t.name).replace(/'/g, "&#39;");
  const isOwner = currentUser && t.user_id === currentUser.id;
  go('profile');
  $('profileContent').innerHTML = `
    <button class="btn secondary" onclick="history.back()">← Back</button>
    <div class="profile-layout">
      <div>
        <div class="panel profile-head">
          <img src="${getTeacherPhoto(t)}" alt="${esc(t.name)}">
          <div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span class="pill">${esc(t.subject)}</span>
              ${t.is_senior ? `<span class="pill pill-gold">★ ${esc(t.senior_tag || 'Senior Mentor')}</span>` : ''}
            </div>
            <h2 style="margin-top:8px">${esc(t.name)}</h2>
            <div class="muted" style="margin-top:5px">${esc(t.experience || 'Experienced practitioner')} · ${esc(t.location || t.mode)}</div>
          </div>
        </div>
        <div class="panel">
          <h3>About & Experience</h3>
          <p>${esc(t.bio || 'Passionate about sharing practical skills and knowledge.')}</p>
        </div>
        <div class="panel">
          <h3>Learning Formats & Transparency</h3>
          <p>Available modes: <b>${esc(t.mode)}</b> (${esc(t.location || 'Online')}) · Supports live Mentor-hosted Video & Voice Calls.</p>
          <p style="font-size:12px">Note: Illustrative buildathon demo listing.</p>
        </div>
      </div>
      <aside class="panel pricebox">
        <span class="pill">Connect with ${esc(t.name.split(' ')[0])}</span>
        <h3 style="margin-top:15px">Start learning</h3>
        <p>Request a 1-on-1 video meet, voice call, or quick advice session.</p>
        <strong>${esc(t.price || 'Free / volunteer')}</strong>
        <div class="muted" style="margin-top:4px">illustrative contribution</div>
        ${isOwner
          ? `<button class="btn secondary" style="width:100%;margin-top:18px" onclick="go('dashboard')">Manage your listing</button>`
          : `<button class="btn primary" style="width:100%;margin-top:18px" onclick="openBooking(${t.id},'${safeName}')">Request a session</button>
             <button class="btn secondary" style="width:100%;margin-top:9px" onclick="toggleSave(${t.id})">♡ Save mentor</button>`
        }
      </aside>
    </div>`;
}

async function toggleSave(teacherId) {
  if (!currentUser) {
    toast('Please sign in to save mentors.');
    openAuthModal('student', 'login');
    return;
  }
  const res = await fetch(`/api/saved/${teacherId}`, { method: 'POST' });
  const out = await res.json();
  toast(out.message);
}

$("teacherForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser || currentUser.role !== 'teacher') {
    openAuthModal('teacher', 'login');
    return;
  }
  const data = Object.fromEntries(new FormData(e.target).entries());
  data.is_senior = $('isSeniorCheckbox').checked;

  const res = await fetch('/api/teachers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const out = await res.json();
  $("teacherMessage").textContent = res.ok
    ? `Listing published! Opening your Teacher Dashboard...`
    : (out.error || "Something went wrong.");
  if (res.ok) {
    e.target.reset();
    toast("Teaching listing published!");
    await loadTeachers();
    setTimeout(() => {
      $("teacherMessage").textContent = "";
      go('dashboard');
    }, 800);
  }
});

function openBooking(id, name) {
  if (!currentUser) {
    toast("Please sign in as a Student to request a session.");
    openAuthModal('student', 'login');
    return;
  }
  $("bookingForm").elements.teacher_id.value = id;
  $("bookLearnerName").value = currentUser.name;
  $("bookLearnerEmail").value = currentUser.email;
  $("modalTitle").textContent = `Request a session with ${name}`;
  $("bookingMessage").textContent = "";
  $("modal").classList.add("show");
}

function closeModal() {
  $("modal").classList.remove("show");
}

$("bookingForm").addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const out = await res.json();
  $("bookingMessage").textContent = res.ok
    ? "Request sent! Opening your Dashboard..."
    : (out.error || "Could not save request.");
  if (res.ok) {
    e.target.reset();
    toast("Session request sent!");
    setTimeout(() => {
      closeModal();
      go('dashboard');
    }, 750);
  }
});

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2700);
}

function initUI() {
  $('categories').innerHTML = subjects.map(s => `
    <div class="category" onclick="filterCategory('${s[0]}')">
      <img src="${imgUrl(s[2], 400)}" alt="${s[0]}">
      <div>
        <b>${s[0]}</b>
        <small>${s[1]}</small>
      </div>
    </div>`).join('');

  const opts = subjects.map(s => `<option value="${s[0]}">${s[0]}</option>`).join('');
  $('subjectFilter').innerHTML += opts;
  $('courseSubjectFilter').innerHTML += opts;
  $('teachSubjectSelect').innerHTML = opts;
  $('editSubjectSelect').innerHTML = opts;
  $('questionSubjectSelect').innerHTML = opts;
}

function injectBackButtons() {
  ['explore', 'courses', 'community', 'teach', 'dashboard'].forEach(pageId => {
    const wrap = document.querySelector(`#${pageId} .wrap`);
    if (wrap && !wrap.querySelector('.page-back-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary btn-sm page-back-btn';
      btn.style.marginBottom = '16px';
      btn.textContent = '← Back';
      btn.onclick = () => {
        if (window.history.length > 1 && window.location.hash && window.location.hash !== '#home') {
          history.back();
        } else {
          go('home');
        }
      };
      wrap.insertBefore(btn, wrap.firstChild);
    }
  });
}

(async function bootstrap() {
  initUI();
  injectBackButtons();
  await refreshAuth();
  await loadTeachers();
  await loadCourses();

  const initialView = window.location.hash.replace('#', '') || 'home';
  history.replaceState({ view: initialView }, '', `#${initialView}`);
  if (initialView !== 'home' && $(initialView)) {
    go(initialView, false);
  }
})();