import { AccessError } from './admin-access.mjs';
import {getActivity} from './learning-catalogue.mjs?v=units-1-9-v1';

export const ACTIVITY_ID = 'writers-effect-v1';
export const QUESTION_IDS = Object.freeze(Array.from({length:11}, (_, i) => 'q' + (i + 1)));
function definition(activityId) {
  const activity=getActivity(activityId);
  if(!activity)throw new AccessError('access/denied','Choose a registered learning activity.');
  return activity;
}
export function responseDocument(sdk, db, classId, studentId, activityId=ACTIVITY_ID) {
  definition(activityId);
  if (![classId, studentId].every(id => typeof id === 'string' && id.trim() && !id.includes('/'))) {
    throw new AccessError('access/denied', 'A linked student record is required.');
  }
  return sdk.doc(db, 'classes', classId, 'students', studentId, 'responses', activityId);
}
export function responsePayload(answers, status, updatedAt, activityId=ACTIVITY_ID) {
  const ids=definition(activityId).questions.map(question=>question.id);
  if (!['draft','submitted'].includes(status) || !answers ||
      Object.keys(answers).length !== ids.length ||
      !ids.every(id => typeof answers[id] === 'string' && answers[id].length <= 4000 &&
        (status === 'draft' || answers[id].trim().length > 0))) {
    throw new AccessError('activity/invalid', 'Complete every question before submitting. Each answer can contain up to 4,000 characters.');
  }
  return {version:1, status, answers:Object.fromEntries(ids.map(id => [id, answers[id]])), updatedAt};
}
export function parseResponse(snapshot,activityId=ACTIVITY_ID) {
  definition(activityId);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data?.version !== 1 || typeof data.updatedAt?.toDate !== 'function') throw new Error('Invalid response');
  const value = responsePayload(data.answers, data.status, data.updatedAt,activityId);
  return {...value, date:data.updatedAt.toDate()};
}
export function activityError(error) {
  if (error?.code === 'activity/invalid') return error.message;
  if (['permission-denied','access/denied'].includes(error?.code)) {
    return 'Access is no longer available, or this work has already been submitted. Close the activity and refresh your profile before reopening it.';
  }
  return 'Could not complete this request. Your changes have not been confirmed as saved. Check your connection and try again.';
}

// No browser storage, student codes or detached auth session. All requests use
// the authenticated dashboard's SDK and the current verified profile.
export function mountStudentActivity({root, open, load, save, sessionKey, feedback,activityId=ACTIVITY_ID,onClose}) {
  const ids=definition(activityId).questions.map(question=>question.id);
  const fields = root.querySelector('fieldset');
  const status = root.querySelector('[data-activity-status]');
  const saveButton = root.querySelector('[data-save-draft]');
  const submitButton = root.querySelector('[data-submit]');
  const close = root.querySelector('[data-close-activity]');
  let profile = null, generation = 0, dirty = false, busy = false, submitted = false;
  const answers = () => Object.fromEntries(ids.map(id => [id, root.querySelector('#'+id).value]));
  const message = text => {status.textContent = text;};
  const lock = value => {busy = value; fields.disabled = value || submitted; saveButton.disabled = value || submitted; submitButton.disabled = value || submitted;};
  const clear = () => {
    feedback?.clear();
    generation++; profile = null; dirty = false; submitted = false; busy = false;
    root.hidden = true; if(open)open.disabled = false;
    for (const id of ids) root.querySelector('#'+id).value = '';
    root.querySelectorAll('.hintbox').forEach(box => box.classList.remove('show'));
    root.querySelectorAll('.hint').forEach(button => button.setAttribute('aria-expanded', 'false'));
    message(''); lock(false);
  };
  root.querySelectorAll('.hint').forEach(button => button.addEventListener('click', () => {
    const box = button.nextElementSibling;
    button.setAttribute('aria-expanded', String(box.classList.toggle('show')));
  }));
  fields.addEventListener('input', () => {dirty = true; message('Unsaved changes. Choose Save draft before leaving.');});
  const canLeave=()=>{
    if (busy) {message('Please wait for the current request to finish before closing.'); return false;}
    return !dirty || globalThis.confirm('Leave without saving your changes?');
  };
  close.addEventListener('click', () => {
    if(!canLeave())return;
    clear(); if(onClose)onClose();else open?.focus();
  });
  const unload=event => {
    if (dirty || busy) {event.preventDefault(); event.returnValue = '';}
  };
  globalThis.addEventListener('beforeunload',unload);
  const runSave = async statusValue => {
    if (!profile || busy || submitted || !sessionKey()) return;
    let payload;
    try {payload = responsePayload(answers(), statusValue, null,activityId);} catch (error) {message(activityError(error)); return;}
    if (statusValue === 'submitted' && !globalThis.confirm('Submit your responses for teacher review? You cannot edit them after submitting.')) return;
    const request = ++generation, session = sessionKey(), previous = profile;
    lock(true); message('Saving… Keep this page open until saving is confirmed.');
    try {
      await save(previous, payload);
      if (request !== generation || session !== sessionKey()) return;
      submitted = statusValue === 'submitted'; dirty = false;
      if(submitted) feedback?.show(previous);
      message(submitted ? 'Submitted for teacher review. Your responses are now read-only.' : 'Draft saved. You can reopen it after signing in again.');
    } catch (error) {if (request === generation && session === sessionKey()) message(activityError(error));}
    finally {if (request === generation && session === sessionKey()) lock(false);}
  };
  saveButton.addEventListener('click', () => void runSave('draft'));
  submitButton.addEventListener('click', () => void runSave('submitted'));
  return {
    clear,
    canLeave,
    destroy(){clear();globalThis.removeEventListener('beforeunload',unload);},
    hasUnsavedChanges: () => dirty || busy,
    async open(value) {
      if (!sessionKey() || busy) return;
      clear(); profile = value; root.hidden = false; if(open)open.disabled = true;
      const request = ++generation, session = sessionKey();
      lock(true); message('Loading your saved work…');
      root.querySelector('h3').focus();
      try {
        const saved = parseResponse(await load(value),activityId);
        if (request !== generation || session !== sessionKey()) return;
        if (saved) for (const id of ids) root.querySelector('#'+id).value = saved.answers[id];
        submitted = saved?.status === 'submitted';
        if(submitted) feedback?.show(value);
        message(submitted ? 'Submitted for teacher review. Your responses are read-only.' : saved ? 'Your saved draft is ready.' : definition(activityId).intro+' Save a draft whenever you need a break.');
        lock(false);
      } catch (error) {
        if (request !== generation || session !== sessionKey()) return;
        busy = false; message(activityError(error));
        // Loading failed: keep editing disabled to avoid overwriting unseen work.
      }
    }
  };
}
