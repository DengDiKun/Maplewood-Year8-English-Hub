import { AccessError } from './admin-access.mjs';
import {parseResponse,ACTIVITY_ID} from './activity-responses.mjs?v=merchant-1';
import {mountTeacherMarking} from './marking-ui.mjs?v=merchant-1';
import {UNITS,getUnit,getActivity} from './learning-catalogue.mjs?v=merchant-1';

export function studentCollection(sdk, database, classId) {
  if (typeof classId !== 'string' || !classId.trim() || classId.includes('/')) {
    throw new AccessError('access/denied', 'A valid class is required.');
  }
  return sdk.collection(database, 'classes', classId, 'students');
}

export function parseStudents(snapshot) {
  const students = [];
  let invalidCount = 0;
  for (const document of snapshot.docs) {
    const data = document.data();
    if (!data || typeof document.id !== 'string' || !document.id ||
        typeof data.displayName !== 'string' || !data.displayName.trim() ||
        data.displayName.length > 200 || typeof data.active !== 'boolean') {
      invalidCount += 1;
      continue;
    }
    // Explicit allowlist: no emails, marks or other document fields enter the UI.
    students.push({ id: document.id, name: data.displayName.trim(), active: data.active });
  }
  students.sort((a, b) => Number(b.active) - Number(a.active) ||
    a.name.localeCompare(b.name, 'en', { numeric: true }) || a.id.localeCompare(b.id));
  return { students, invalidCount };
}

export function rosterErrorMessage(error) {
  if (['permission-denied', 'access/denied'].includes(error?.code)) {
    return 'Student access is no longer available for this class. Contact your school administrator.';
  }
  if (['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(error?.code)) {
    return 'Students could not be loaded. Check your connection and choose Refresh students.';
  }
  return 'Students could not be loaded. Please try Refresh students.';
}

// A separate request generation also invalidates replies when changing class,
// going back, refreshing classes or signing out. Session identity is checked too.
export function createRosterLoader({ load, sessionKey, pending, success, failure, settled }) {
  let generation = 0;
  return {
    cancel() { generation += 1; },
    async run(classId) {
      const request = ++generation;
      const session = sessionKey();
      if (!session) return;
      pending();
      const current = () => request === generation && session === sessionKey();
      try {
        const result = parseStudents(await load(classId));
        if (current()) success(result);
      } catch (error) {
        if (current()) failure(error);
      } finally {
        if (current()) settled();
      }
    }
  };
}

export function mountRoster({ root, classes, load, loadResponse, sessionKey, marking }) {
  const heading = root.querySelector('#roster-heading');
  const context = root.querySelector('#roster-context');
  const list = root.querySelector('#student-list');
  const status = root.querySelector('#student-status');
  const refresh = root.querySelector('#refresh-students');
  const back = root.querySelector('#back-classes');
  let selected = null;
  let trigger = null;
  let responseGeneration = 0;
  let editor = null;
  const canLeave=()=>editor?.canLeave() ?? true;
  const review = document.createElement('section');
  review.setAttribute('aria-live', 'polite');
  root.append(review);
  const clearReview = () => {responseGeneration++; editor?.clear(); editor=null; review.replaceChildren();};
  const filters=document.createElement('div');filters.className='learning-filter';
  const unitLabel=document.createElement('label'),activityLabel=document.createElement('label');
  unitLabel.textContent='Unit';activityLabel.textContent='Activity to review';
  const unitSelect=document.createElement('select'),activitySelect=document.createElement('select');
  for(const unit of UNITS){const option=document.createElement('option');option.value=String(unit.number);option.textContent='Unit '+unit.number+' — '+unit.title;unitSelect.append(option);}
  unitLabel.append(unitSelect);activityLabel.append(activitySelect);filters.append(unitLabel,activityLabel);list.before(filters);
  let chosenActivity=getActivity(ACTIVITY_ID);
  function chooseUnit(number){
    const unit=getUnit(number);unitSelect.value=String(number);activitySelect.replaceChildren();
    for(const activity of unit.activities){const option=document.createElement('option');option.value=activity.id;option.textContent=activity.title;activitySelect.append(option);}
    chosenActivity=unit.activities[0];activitySelect.value=chosenActivity.id;
  }
  chooseUnit(6);
  unitSelect.addEventListener('change',()=>{
    if(!canLeave()){unitSelect.value=String(chosenActivity.unit);return;}
    clearReview();chooseUnit(Number(unitSelect.value));
  });
  activitySelect.addEventListener('change',()=>{
    if(!canLeave()){activitySelect.value=chosenActivity.id;return;}
    const next=getActivity(activitySelect.value);
    if(!next || next.unit!==Number(unitSelect.value)){activitySelect.value=chosenActivity.id;return;}
    clearReview();chosenActivity=next;
  });
  async function openResponse(student) {
    const session = sessionKey(), classId = selected?.id;
    if (!session || !classId || !canLeave()) return;
    clearReview();
    const activity=chosenActivity;
    const request=++responseGeneration;
    const title = document.createElement('h3');
    title.textContent = student.name + ' — Unit '+activity.unit+' · '+activity.title;
    title.className='learning-review-heading';
    title.tabIndex = -1;
    const message = document.createElement('p');
    message.textContent = 'Loading saved responses…';
    review.append(title, message); title.focus();
    try {
      const response = parseResponse(await loadResponse(classId, student.id,activity.id),activity.id);
      if (request !== responseGeneration || session !== sessionKey()) return;
      message.textContent = !response ? 'No saved work yet.' :
        (response.status === 'draft' ? 'Draft — still in progress' : 'Submitted') +
        ' · Last saved: ' + response.date.toLocaleString('en-MY');
      if (response) for (const question of activity.questions) {
        const label = document.createElement('h4'), answer = document.createElement('p');
        label.className='learning-question';answer.className='learning-answer';
        label.textContent = question.label;
        answer.textContent = response.answers[question.id] || '(No answer yet)';
        answer.style.whiteSpace = 'pre-wrap'; answer.style.overflowWrap = 'anywhere';
        review.append(label, answer);
      }
      if(response && marking) {
        if(response.status==='submitted'){
          const markingRoot=document.createElement('section'); review.append(markingRoot);
          const scope={classId,studentId:student.id,activityId:activity.id};
          editor=mountTeacherMarking({root:markingRoot,sessionKey,
            load:()=>marking.load(scope,response.updatedAt),
            save:data=>marking.save(scope,{...data,submissionUpdatedAt:response.updatedAt})});
        }else{
          const note=document.createElement('p');
          note.textContent='Marking becomes available after the student submits their completed answers.';
          review.append(note);
        }
      }
    } catch {
      if (request === responseGeneration && session === sessionKey()) message.textContent =
        'Responses could not be loaded. Check your connection and class access, then choose View activity again.';
    }
  }
  const loader = createRosterLoader({ load, sessionKey,
    pending() {
      clearReview();
      list.replaceChildren();
      status.textContent = 'Loading students…';
      status.dataset.kind = '';
      refresh.disabled = true;
      root.setAttribute('aria-busy', 'true');
    },
    success(result) {
      const rows = result.students.map(student => {
        const row = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = student.name;
        const state = document.createElement('span');
        state.className = `class-state ${student.active ? 'active' : 'inactive'}`;
        state.textContent = student.active ? 'Active' : 'Inactive';
        row.append(name, state);
        if (loadResponse) {
          const action = document.createElement('button');
          action.type = 'button'; action.className = 'secondary refresh';
          action.textContent = 'View activity';
          action.setAttribute('aria-label', 'View selected activity responses for ' + student.name);
          action.addEventListener('click', () => void openResponse(student));
          const actions = document.createElement('span');
          actions.style.display = 'flex'; actions.style.flexWrap = 'wrap'; actions.style.gap = '8px';
          actions.append(state, action); row.append(actions);
          row.style.flexWrap = 'wrap';
        }
        return row;
      });
      list.replaceChildren(...rows);
      const count = result.students.length;
      status.textContent = count ? `${count} ${count === 1 ? 'student' : 'students'} loaded.` :
        result.invalidCount ? 'No complete student records are available.' : 'No students have been added to this class yet.';
      status.dataset.kind = result.invalidCount ? 'warning' : '';
      if (result.invalidCount) status.textContent += ` ${result.invalidCount} incomplete student ${result.invalidCount === 1 ? 'record needs' : 'records need'} an administrator to check their details.`;
    },
    failure(error) {
      status.textContent = rosterErrorMessage(error);
      status.dataset.kind = 'error';
    },
    settled() { refresh.disabled = false; root.setAttribute('aria-busy', 'false'); }
  });
  const clear = () => {
    clearReview();
    loader.cancel();
    selected = null;
    chooseUnit(6);
    list.replaceChildren();
    status.textContent = '';
    heading.textContent = '';
    context.textContent = '';
    root.hidden = true;
    root.setAttribute('aria-busy', 'false');
    refresh.disabled = false;
    classes.hidden = false;
  };
  back.addEventListener('click', () => { if(!canLeave())return; clear(); trigger?.focus(); trigger = null; });
  refresh.addEventListener('click', () => { if (selected && !refresh.disabled && canLeave()) void loader.run(selected.id); });
  return {
    clear,
    canLeave,
    open(item, button) {
      if (!sessionKey()) return;
      selected = item;
      trigger = button;
      heading.textContent = `${item.name} students`;
      context.textContent = `${item.branch} · Year ${item.yearGroup} · ${item.academicYear}${item.active ? '' : ' · Inactive class'}`;
      classes.hidden = true;
      root.hidden = false;
      heading.focus();
      void loader.run(item.id);
    }
  };
}
