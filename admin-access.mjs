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

function validUid(uid) {
  return typeof uid === 'string' && uid.trim().length > 0 && !uid.includes('/');
}

async function verifyProfile(user, loadProfile, allowedRoles) {
  if (!user || !validUid(user.uid)) {
    throw new AccessError('access/denied', 'A staff account is required.');
  }
  // The caller must read users/{uid} from the server, never browser storage.
  const snapshot = await loadProfile(user.uid);
  const profile = snapshot.exists() ? snapshot.data() : null;
  if (!profile || profile.active !== true || !allowedRoles.includes(profile.role)) {
    throw new AccessError('access/denied', 'This account is not enabled for this staff page.');
  }
  const name = typeof profile.displayName === 'string' && profile.displayName.trim()
    ? profile.displayName.trim() : profile.role === 'admin' ? 'Administrator' : 'Teacher';
  return Object.freeze({ name, email: user.email || '', uid: user.uid, role: profile.role });
}

export function verifyAdministrator(user, loadProfile) {
  return verifyProfile(user, loadProfile, ['admin']);
}

export function verifyTeachingStaff(user, loadProfile) {
  return verifyProfile(user, loadProfile, ['teacher', 'admin']);
}

async function signInStaff(client, email, password, verify) {
  const credential = await client.signIn(email.trim(), password);
  try {
    return await verify(credential.user, client.loadProfile);
  } catch (error) {
    // A Firebase login alone must never reveal the account panel.
    try { await client.signOut(); } catch { /* UI remains closed on any failure. */ }
    throw error;
  }
}

export function signInAdministrator(client, email, password) {
  return signInStaff(client, email, password, verifyAdministrator);
}

export function signInTeachingStaff(client, email, password) {
  return signInStaff(client, email, password, verifyTeachingStaff);
}

export async function loadAdministratorClasses(profile, loadClasses) {
  if (!profile || profile.role !== 'admin' || !validUid(profile.uid)) {
    throw new AccessError('access/denied', 'An administrator account is required.');
  }
  // The caller uses getDocsFromServer. Firestore rules independently check the
  // current user's active administrator profile for every collection request.
  const snapshot = await loadClasses();
  return classDashboard(snapshot, profile.uid);
}

export function teachingClassesQuery(sdk, database, uid) {
  if (!validUid(uid)) {
    throw new AccessError('access/denied', 'A staff account is required.');
  }
  // Both conditions are required by the teacher's server-side read policy.
  return sdk.query(sdk.collection(database, 'classes'),
    sdk.where('active', '==', true),
    sdk.where('teacherUids', 'array-contains', uid));
}

export async function loadTeachingClasses(profile, loadClasses) {
  if (!profile || !['teacher', 'admin'].includes(profile.role) || !validUid(profile.uid)) {
    throw new AccessError('access/denied', 'A staff account is required.');
  }
  const snapshot = await loadClasses(profile.uid);
  const dashboard = classDashboard(snapshot, profile.uid);
  // Administrators can access all class documents at the backend, but this
  // teaching view must still show only their assigned active classes.
  if (dashboard.classes.some(item => !item.active || !item.assignedToYou)) {
    throw new AccessError('access/class-scope', 'The teaching class query returned unexpected records.');
  }
  return dashboard;
}

function classDashboard(snapshot, uid) {
  const classes = [];
  let invalidCount = 0;
  for (const document of snapshot.docs) {
    const data = document.data();
    if (!data || typeof document.id !== 'string' || !document.id ||
        typeof data.name !== 'string' || !data.name.trim() ||
        typeof data.branch !== 'string' || !data.branch.trim() ||
        !Number.isSafeInteger(data.yearGroup) || data.yearGroup < 1 ||
        !Number.isSafeInteger(data.academicYear) || data.academicYear < 1 ||
        typeof data.active !== 'boolean' || !Array.isArray(data.teacherUids) ||
        !data.teacherUids.every(uid => typeof uid === 'string' && uid.trim() && !uid.includes('/'))) {
      invalidCount += 1;
      continue;
    }
    classes.push({
      id: document.id,
      name: data.name.trim(),
      branch: data.branch.trim(),
      yearGroup: data.yearGroup,
      academicYear: data.academicYear,
      active: data.active,
      assignedToYou: data.teacherUids.includes(uid),
      teacherCount: new Set(data.teacherUids).size
    });
  }
  classes.sort((a, b) => Number(b.active) - Number(a.active) ||
    a.branch.localeCompare(b.branch) || b.academicYear - a.academicYear ||
    a.yearGroup - b.yearGroup || a.name.localeCompare(b.name, 'en', { numeric: true }) ||
    a.id.localeCompare(b.id));
  return { classes, invalidCount };
}

export function teachingSignInErrorMessage(error) {
  if (error?.code === 'access/denied' || error?.code === 'permission-denied') {
    return 'This account does not have an active teacher or administrator profile. Contact the school administrator.';
  }
  return errorMessage(error);
}

export function teachingClassErrorMessage(error) {
  if (error?.code === 'failed-precondition' || error?.code === 'access/class-scope') {
    return 'Classes could not be loaded. Please contact your school administrator.';
  }
  return classErrorMessage(error);
}

export function classErrorMessage(error) {
  if (error?.code === 'permission-denied' || error?.code === 'access/denied') {
    return 'Your account can sign in, but class access is not available. Contact your school administrator.';
  }
  if (['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(error?.code)) {
    return 'Classes could not be loaded. Check your connection and try again.';
  }
  return 'Classes could not be loaded. Please try again.';
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
