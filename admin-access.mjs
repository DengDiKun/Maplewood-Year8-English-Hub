export const PROJECT_ID = 'maplewood-english-learning';

export class AccessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AccessError';
    this.code = code;
  }
}

export function validateConfig(config) {
  if (!config || config.projectId !== PROJECT_ID ||
      typeof config.apiKey !== 'string' || !config.apiKey.trim() ||
      config.authDomain !== `${PROJECT_ID}.firebaseapp.com`) {
    throw new AccessError('setup/config', 'The Firebase project configuration is unavailable.');
  }
  return config;
}

export async function verifyAdministrator(user, loadProfile) {
  if (!user || typeof user.uid !== 'string' || !user.uid.trim() || user.uid.includes('/')) {
    throw new AccessError('access/denied', 'An administrator account is required.');
  }
  // The caller must read users/{uid} from the server, never browser storage.
  const snapshot = await loadProfile(user.uid);
  const profile = snapshot.exists() ? snapshot.data() : null;
  if (!profile || profile.active !== true || profile.role !== 'admin') {
    throw new AccessError('access/denied', 'This account is not enabled for administrator access.');
  }
  const name = typeof profile.displayName === 'string' && profile.displayName.trim()
    ? profile.displayName.trim() : 'Administrator';
  return Object.freeze({ name, email: user.email || '', uid: user.uid, role: 'admin' });
}

export async function signInAdministrator(client, email, password) {
  const credential = await client.signIn(email.trim(), password);
  try {
    return await verifyAdministrator(credential.user, client.loadProfile);
  } catch (error) {
    // A Firebase login alone must never reveal the account panel.
    try { await client.signOut(); } catch { /* UI remains closed on any failure. */ }
    throw error;
  }
}

export function errorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'The email address or password is incorrect. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait a little before trying again.';
    case 'auth/user-disabled':
      return 'This account is disabled. Contact the school administrator.';
    case 'access/denied':
    case 'permission-denied':
      return 'This account does not have an active administrator profile. Contact the school administrator.';
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'deadline-exceeded':
      return 'The connection could not be completed. Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled for this project.';
    default:
      return 'Sign-in could not be completed. Please reload this page and try again.';
  }
}
