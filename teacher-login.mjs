import { validateConfig, signInTeachingStaff, loadTeachingClasses, teachingClassesQuery, teachingSignInErrorMessage, teachingClassErrorMessage } from './admin-access.mjs';

const form = document.getElementById('login-form');
const fields = document.getElementById('login-fields');
const email = document.getElementById('email');
const password = document.getElementById('password');
const status = document.getElementById('status');
const account = document.getElementById('account');
const signOutButton = document.getElementById('sign-out');
const submit = document.getElementById('sign-in');
const retry = document.getElementById('retry');
const classList = document.getElementById('class-list');
const classStatus = document.getElementById('class-status');
const classRegion = document.getElementById('classes');
const refreshButton = document.getElementById('refresh-classes');
let generation = 0;
let classGeneration = 0;
let currentProfile = null;

function showStatus(message, kind = '') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function clearAccount() {
  currentProfile = null;
  classGeneration += 1;
  classList.replaceChildren();
  classStatus.textContent = '';
  classRegion.setAttribute('aria-busy', 'false');
  refreshButton.disabled = false;
  account.hidden = true;
  for (const id of ['account-name', 'account-email', 'account-role']) {
    document.getElementById(id).textContent = '';
  }
  form.hidden = false;
  document.querySelector('main').classList.remove('signed-in');
  document.getElementById('page-heading').textContent = 'Teacher sign-in';
  document.getElementById('intro').hidden = false;
  document.getElementById('notice').hidden = false;
}

function showAccount(profile) {
  currentProfile = profile;
  document.getElementById('account-name').textContent = profile.name;
  document.getElementById('account-email').textContent = profile.email;
  document.getElementById('account-role').textContent = profile.role === 'admin' ? 'Administrator' : 'Teacher';
  form.hidden = true;
  account.hidden = false;
  document.querySelector('main').classList.add('signed-in');
  document.getElementById('page-heading').textContent = 'Your teaching dashboard';
  document.getElementById('intro').hidden = true;
  document.getElementById('notice').hidden = true;
  showStatus('Signed in. Your staff profile has been verified.', 'success');
  document.getElementById('account-heading').focus();
}

function renderClasses(dashboard) {
  const cards = dashboard.classes.map(item => {
    const card = document.createElement('article');
    card.className = 'class-card';
    const heading = document.createElement('h4');
    heading.textContent = item.name;
    const state = document.createElement('span');
    state.className = `class-state ${item.active ? 'active' : 'inactive'}`;
    state.textContent = item.active ? 'Active' : 'Inactive';
    const top = document.createElement('div');
    top.className = 'class-top';
    top.append(heading, state);
    const details = document.createElement('dl');
    for (const [label, value] of [['Branch', item.branch], ['Year group', item.yearGroup], ['Academic year', item.academicYear]]) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = String(value);
      row.append(term, description);
      details.append(row);
    }
    const assignment = document.createElement('p');
    assignment.className = item.assignedToYou ? 'assignment assigned' : 'assignment';
    assignment.textContent = item.assignedToYou ? 'You are assigned to this class' :
      item.teacherCount === 0 ? 'No teacher assigned' :
      `${item.teacherCount} ${item.teacherCount === 1 ? 'teacher' : 'teachers'} assigned`;
    card.append(top, details, assignment);
    return card;
  });
  classList.replaceChildren(...cards);
  const count = dashboard.classes.length;
  classStatus.dataset.kind = dashboard.invalidCount ? 'warning' : '';
  classStatus.textContent = count ? `${count} ${count === 1 ? 'class' : 'classes'} loaded.` :
    dashboard.invalidCount ? 'No complete class records are available.' : 'No active classes are assigned to you yet.';
  if (dashboard.invalidCount) {
    classStatus.textContent += ` ${dashboard.invalidCount} incomplete class ${dashboard.invalidCount === 1 ? 'record needs' : 'records need'} an administrator to check their details.`;
  }
}

document.getElementById('show-password').addEventListener('change', (event) => {
  password.type = event.target.checked ? 'text' : 'password';
});
retry.addEventListener('click', () => location.reload());

async function start() {
  try {
    const response = await fetch('/__/firebase/init.json', {
      cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('Firebase configuration could not be loaded.');
    const config = validateConfig(await response.json());

    // Browser modules: no bundler, service-account key or extra Firebase project.
    const [appSDK, authSDK, firestoreSDK] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
    ]);
    const app = appSDK.initializeApp(config, 'maplewood-teaching');
    // The pilot requires a fresh login after a reload and writes no auth tokens
    // or role flags to localStorage, sessionStorage or the old Hub login keys.
    const auth = authSDK.initializeAuth(app, { persistence: authSDK.inMemoryPersistence });
    const database = firestoreSDK.getFirestore(app);
    const client = {
      signIn: (address, secret) => authSDK.signInWithEmailAndPassword(auth, address, secret),
      loadProfile: (uid) => firestoreSDK.getDocFromServer(firestoreSDK.doc(database, 'users', uid)),
      loadClasses: (uid) => firestoreSDK.getDocsFromServer(teachingClassesQuery(firestoreSDK, database, uid)),
      signOut: () => authSDK.signOut(auth)
    };

    const isCurrent = (profile, session, request) => generation === session &&
      classGeneration === request && currentProfile?.uid === profile.uid &&
      auth.currentUser?.uid === profile.uid;

    async function refreshClasses(profile, session) {
      const request = ++classGeneration;
      classList.replaceChildren();
      classStatus.textContent = 'Loading classes…';
      classStatus.dataset.kind = '';
      classRegion.setAttribute('aria-busy', 'true');
      refreshButton.disabled = true;
      try {
        const dashboard = await loadTeachingClasses(profile, client.loadClasses);
        if (isCurrent(profile, session, request)) renderClasses(dashboard);
      } catch (error) {
        if (!isCurrent(profile, session, request)) return;
        classStatus.textContent = teachingClassErrorMessage(error);
        classStatus.dataset.kind = 'error';
      } finally {
        if (isCurrent(profile, session, request)) {
          refreshButton.disabled = false;
          classRegion.setAttribute('aria-busy', 'false');
        }
      }
    }

    refreshButton.addEventListener('click', () => {
      if (currentProfile && !refreshButton.disabled) void refreshClasses(currentProfile, generation);
    });

    let wasSignedIn = false;
    authSDK.onAuthStateChanged(auth, (user) => {
      if (!user && wasSignedIn) {
        generation += 1;
        clearAccount();
      }
      wasSignedIn = Boolean(user);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (fields.disabled || !form.reportValidity()) return;
      const attempt = ++generation;
      fields.disabled = true;
      submit.textContent = 'Signing in…';
      showStatus('Signing in and checking your staff profile…');
      try {
        const profile = await signInTeachingStaff(client, email.value, password.value);
        if (generation !== attempt || auth.currentUser?.uid !== profile.uid) return;
        showAccount(profile);
        void refreshClasses(profile, attempt);
      } catch (error) {
        clearAccount();
        showStatus(teachingSignInErrorMessage(error), 'error');
      } finally {
        password.value = '';
        password.type = 'password';
        document.getElementById('show-password').checked = false;
        fields.disabled = false;
        submit.textContent = 'Sign in';
      }
    });

    signOutButton.addEventListener('click', async () => {
      generation += 1;
      clearAccount();
      fields.disabled = true;
      showStatus('Signing out…');
      try {
        await client.signOut();
        showStatus('You have signed out.');
        fields.disabled = false;
        email.focus();
      } catch {
        showStatus('Sign-out could not be completed. Reload this page to clear this login.', 'error');
        retry.hidden = false;
      }
    });

    fields.disabled = false;
    showStatus('Ready to sign in.');
  } catch {
    clearAccount();
    fields.disabled = true;
    showStatus('Could not connect to Maplewood sign-in. Check your connection and reload this page.', 'error');
    retry.hidden = false;
  }
}

start();
