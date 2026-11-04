import { AccessError } from './admin-access.mjs';

const validId = value => typeof value === 'string' && value.trim() && value.length <= 128 && !value.includes('/');
export function markingRefs(sdk, db, scope) {
  if (!scope || !validId(scope.classId) || !validId(scope.studentId) ||
      typeof scope.activityId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(scope.activityId)) {
    throw new AccessError('access/denied', 'A linked activity is required.');
  }
  const path = ['classes', scope.classId, 'students', scope.studentId];
  return {
    response:sdk.doc(db, ...path, 'responses', scope.activityId),
    draft:sdk.doc(db, ...path, 'markingDrafts', scope.activityId),
    published:sdk.doc(db, ...path, 'feedback', scope.activityId)
  };
}
export function markValues(score, maxScore, feedback) {
  if (!Number.isSafeInteger(score) || !Number.isSafeInteger(maxScore) ||
      maxScore < 1 || maxScore > 1000 || score < 0 || score > maxScore ||
      typeof feedback !== 'string' || feedback.length > 4000) {
    throw new AccessError('marking/invalid', 'Enter a whole-number mark from 0 to the total. The total must be 1–1,000. Comments can contain up to 4,000 characters.');
  }
  return {score, maxScore, feedback};
}
export function stampKey(value) {
  if (value == null) return null;
  if (!Number.isSafeInteger(value.seconds) || !Number.isInteger(value.nanoseconds) ||
      value.nanoseconds < 0 || value.nanoseconds > 999999999) throw new Error('Invalid timestamp');
  return value.seconds + ':' + value.nanoseconds;
}
const recordStamp = snapshot => snapshot.exists() ? stampKey(snapshot.data().updatedAt) : null;
export function parseMarking(snapshot, submissionUpdatedAt) {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data?.version !== 1 || !validId(data.reviewerUid) || !stampKey(data.updatedAt) ||
      !stampKey(data.submissionUpdatedAt) || !stampKey(submissionUpdatedAt) ||
      stampKey(data.submissionUpdatedAt) !== stampKey(submissionUpdatedAt) ||
      typeof data.updatedAt.toDate !== 'function') throw new Error('Invalid or outdated marking');
  return {...markValues(data.score, data.maxScore, data.feedback),
    updatedAt:data.updatedAt, submissionUpdatedAt:data.submissionUpdatedAt};
}
export function markingError(error) {
  if (error?.code === 'marking/invalid') return error.message;
  if (error?.code === 'marking/conflict') return 'This review or submission changed elsewhere. Refresh the review before saving again.';
  if (['permission-denied','access/denied','unauthenticated'].includes(error?.code)) return 'Marking access is no longer available. Refresh your class access before continuing.';
  return 'Could not complete this request. Check your connection and try again.';
}
export function createMarkingClient(sdk, db, currentUid) {
  return {
    async load(scope, submissionUpdatedAt) {
      const refs = markingRefs(sdk, db, scope);
      const [draft, published] = await Promise.all([
        sdk.getDocFromServer(refs.draft), sdk.getDocFromServer(refs.published)
      ]);
      return {draft:parseMarking(draft, submissionUpdatedAt), published:parseMarking(published, submissionUpdatedAt),
        versions:{draft:recordStamp(draft), published:recordStamp(published)}};
    },
    async save(scope, {values, publish, expected, submissionUpdatedAt}) {
      const uid = currentUid();
      if (!validId(uid)) throw new AccessError('access/denied', 'Sign in again.');
      const marks = markValues(values.score, values.maxScore, values.feedback);
      if (typeof publish !== 'boolean' || !expected || !stampKey(submissionUpdatedAt)) throw new Error('A loaded review is required');
      const refs = markingRefs(sdk, db, scope);
      await sdk.runTransaction(db, async transaction => {
        const [submission, draft, published] = await Promise.all([
          transaction.get(refs.response), transaction.get(refs.draft), transaction.get(refs.published)
        ]);
        if (currentUid() !== uid) throw new AccessError('access/denied', 'The session changed.');
        if (!submission.exists() || submission.data().status !== 'submitted' ||
            stampKey(submission.data().updatedAt) !== stampKey(submissionUpdatedAt) ||
            recordStamp(draft) !== expected.draft || recordStamp(published) !== expected.published) {
          throw new AccessError('marking/conflict', 'Refresh this review.');
        }
        const payload = {version:1, ...marks, reviewerUid:uid, submissionUpdatedAt, updatedAt:sdk.serverTimestamp()};
        transaction.set(refs.draft, payload);
        if (publish) transaction.set(refs.published, payload);
      });
    }
  };
}
