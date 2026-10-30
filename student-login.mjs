import { validateConfig } from './admin-access.mjs';
import { signInStudent, studentProfile, studentError } from './student-access.mjs';
const $ = id => document.getElementById(id);
const form = $('login-form'), fields = $('login-fields'), account = $('account');
const username = $('username'), password = $('password'), status = $('status');
let generation = 0, current = null;
const message = (text, kind = '') => { status.textContent = text; status.dataset.kind = kind; };
function clear() {
  current = null; account.hidden = true; form.hidden = false;
  document.querySelector('main').classList.remove('signed-in');
  for (const id of ['student-name', 'student-username', 'student-class', 'student-branch', 'student-year', 'student-academic-year']) $(id).textContent = '';
  $('refresh-profile').disabled = false;
  $('page-heading').textContent = 'Student sign-in';
  $('intro').hidden = false;
}
function show(profile) {
  current = profile; form.hidden = true; account.hidden = false;
  document.querySelector('main').classList.add('signed-in');
  $('page-heading').textContent = 'Your student dashboard'; $('intro').hidden = true;
  for (const [id, value] of Object.entries({ 'student-name':profile.name, 'student-username':profile.username,
    'student-class':profile.className, 'student-branch':profile.branch, 'student-year':profile.yearGroup,
    'student-academic-year':profile.academicYear })) $(id).textContent = String(value);
  message('Signed in. Your student profile and class access have been checked.', 'success');
  $('account-heading').focus();
}
$('show-password').addEventListener('change', event => { password.type = event.target.checked ? 'text' : 'password'; });
$('help').addEventListener('click', () => message('Ask your teacher to help with your Learning Hub username or password. Your Edupage password is separate.'));
$('retry').addEventListener('click', () => location.reload());
async function start() {
  try {
    const response = await fetch('/__/firebase/init.json', { cache:'no-store', credentials:'same-origin', signal:AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Configuration unavailable');
    const config = validateConfig(await response.json());
    const [apps, authSDK, dbSDK] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')
    ]);
    const app = apps.initializeApp(config, 'maplewood-student');
    const auth = authSDK.initializeAuth(app, { persistence:authSDK.inMemoryPersistence });
    const db = dbSDK.getFirestore(app);
    const client = {
      signIn:(email, secret) => authSDK.signInWithEmailAndPassword(auth, email, secret),
      loadProfile:uid => dbSDK.getDocFromServer(dbSDK.doc(db, 'users', uid)),
      signOut:() => authSDK.signOut(auth)
    };
    let wasSignedIn = false;
    authSDK.onAuthStateChanged(auth, user => {
      if (!user && wasSignedIn && current) {
        generation++; clear(); fields.disabled = false; message('You have signed out.');
      }
      wasSignedIn = Boolean(user);
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (fields.disabled || !form.reportValidity()) return;
      const request = ++generation;
      fields.disabled = true; message('Signing in and checking your student profile…');
      try {
        const profile = await signInStudent(client, username.value, password.value);
        if (request === generation && auth.currentUser?.uid === profile.uid) show(profile);
      } catch (error) { if (request === generation) { clear(); message(studentError(error), 'error'); } }
      finally {
        password.value = ''; password.type = 'password'; $('show-password').checked = false;
        fields.disabled = false;
      }
    });
    $('refresh-profile').addEventListener('click', async () => {
      if (!current || $('refresh-profile').disabled) return;
      const previous = current, request = ++generation;
      // Remove previous personal data before every server refresh.
      clear(); form.hidden = true; fields.disabled = true; message('Checking your student profile…');
      try {
        const profile = studentProfile(await client.loadProfile(previous.uid), auth.currentUser, previous.username);
        if (request === generation && auth.currentUser?.uid === previous.uid) show(profile);
      } catch (error) {
        if (request !== generation) return;
        clear(); message(studentError(error), 'error');
        try { await client.signOut(); fields.disabled = false; } catch { fields.disabled = true; $('retry').hidden = false; }
      } finally { if (request === generation) fields.disabled = false; }
    });
    $('sign-out').addEventListener('click', async () => {
      generation++; clear(); fields.disabled = true; message('Signing out…');
      try { await client.signOut(); fields.disabled = false; message('You have signed out.'); username.focus(); }
      catch { message('Reload this page to clear your sign-in.', 'error'); $('retry').hidden = false; }
    });
    fields.disabled = false; message('Ready to sign in.');
  } catch {
    clear(); fields.disabled = true;
    message('Could not connect to student sign-in. Check your connection and reload the page.', 'error'); $('retry').hidden = false;
  }
}
start();
