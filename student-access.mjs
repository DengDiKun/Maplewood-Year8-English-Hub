import { AccessError } from './admin-access.mjs';
export const STUDENT_DOMAIN = 'students.maplewood.invalid';
export function studentEmail(username) {
  if (typeof username !== 'string' || !/^[a-z0-9]{1,64}$/i.test(username.trim())) {
    throw new AccessError('auth/invalid-credential', 'A valid username is required.');
  }
  return `${username.trim().toLowerCase()}@${STUDENT_DOMAIN}`;
}
const validId = value => typeof value === 'string' && value.trim() && !value.includes('/');
export function studentProfile(snapshot, user, username) {
  const data = snapshot.exists() ? snapshot.data() : null;
  if (!validId(user?.uid) || !data || data.role !== 'student' || data.active !== true ||
      typeof data.username !== 'string' || studentEmail(data.username) !== studentEmail(username) ||
      user.email?.toLowerCase() !== studentEmail(username) ||
      !validId(data.classId) || !validId(data.studentId) ||
      ![data.displayName, data.className, data.branch].every(value => typeof value === 'string' && value.trim()) ||
      !Number.isSafeInteger(data.yearGroup) || data.yearGroup < 1 ||
      !Number.isSafeInteger(data.academicYear) || data.academicYear < 1) {
    throw new AccessError('access/denied', 'An active linked student account is required.');
  }
  return Object.freeze({ uid: user.uid, username: data.username, name: data.displayName.trim(),
    classId: data.classId, studentId: data.studentId, className: data.className.trim(),
    branch: data.branch.trim(), yearGroup: data.yearGroup, academicYear: data.academicYear });
}
export async function signInStudent(client, username, password) {
  const credential = await client.signIn(studentEmail(username), password);
  try { return studentProfile(await client.loadProfile(credential.user.uid), credential.user, username); }
  catch (error) {
    try { await client.signOut(); } catch { /* The UI stays closed. */ }
    throw error;
  }
}
export function studentError(error) {
  if (['auth/too-many-requests', 'auth/quota-exceeded'].includes(error?.code)) return 'Too many attempts. Please wait before trying again.';
  if (['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(error?.code)) return 'Could not connect. Check your connection and try again.';
  if (['access/denied', 'permission-denied', 'auth/user-disabled'].includes(error?.code)) return 'Student access is not available for this account. Please ask your teacher for help.';
  if (['auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'].includes(error?.code)) return 'The username or password is incorrect. Please try again.';
  return 'Sign-in could not be completed. Please reload the page and try again.';
}
