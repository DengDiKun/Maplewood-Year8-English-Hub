import { validateConfig, signInAdministrator, errorMessage } from './admin-access.mjs';

const form = document.getElementById('login-form');
const fields = document.getElementById('login-fields');
const email = document.getElementById('email');
const password = document.getElementById('password');
const status = document.getElementById('status');
const account = document.getElementById('account');
const signOutButton = document.getElementById('sign-out');
const submit = document.getElementById('sign-in');
const retry = document.getElementById('retry');
let generation = 0;

function showStatus(message, kind = '') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function clearAccount() {
  account.hidden = true;
  for (const id of ['account-name', 'account-email', 'account-role']) {
    document.getElementById(id).textContent = '';
  }
  form.hidden = false;
}

function showAccount(profile) {
  document.getElementById('account-name').textContent = profile.name;
  document.getElementById('account-email').textContent = profile.email;
  document.getElementById('account-role').textContent = 'Administrator';
  form.hidden = true;
  account.hidden = false;
  showStatus('Signed in. Your administrator profile has been verified.', 'success');
  document.getElementById('account-heading').focus();
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
    const app = appSDK.initializeApp(config, 'maplewood-admin-pilot');
    // The pilot requires a fresh login after a reload and writes no auth tokens
    // or role flags to localStorage, sessionStorage or the old Hub login keys.
    const auth = authSDK.initializeAuth(app, { persistence: authSDK.inMemoryPersistence });
    const database = firestoreSDK.getFirestore(app);
    const client = {
      signIn: (address, secret) => authSDK.signInWithEmailAndPassword(auth, address, secret),
      loadProfile: (uid) => firestoreSDK.getDocFromServer(firestoreSDK.doc(database, 'users', uid)),
      signOut: () => authSDK.signOut(auth)
    };

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
      showStatus('Signing in and checking your administrator profile…');
      try {
        const profile = await signInAdministrator(client, email.value, password.value);
        if (generation !== attempt || auth.currentUser?.uid !== profile.uid) return;
        showAccount(profile);
      } catch (error) {
        clearAccount();
        showStatus(errorMessage(error), 'error');
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
