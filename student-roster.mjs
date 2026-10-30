import { AccessError } from './admin-access.mjs';
import { parseResponse, QUESTION_IDS } from './activity-responses.mjs';

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

export function mountRoster({ root, classes, load, loadResponse, sessionKey }) {
  const heading = root.querySelector('#roster-heading');
  const context = root.querySelector('#roster-context');
  const list = root.querySelector('#student-list');
  const status = root.querySelector('#student-status');
  const refresh = root.querySelector('#refresh-students');
  const back = root.querySelector('#back-classes');
  let selected = null;
  let trigger = null;
  let responseGeneration = 0;
  const review = document.createElement('section');
  review.setAttribute('aria-live', 'polite');
  root.append(review);
  const clearReview = () => {responseGeneration++; review.replaceChildren();};
  async function openResponse(student) {
    const request = ++responseGeneration, session = sessionKey(), classId = selected?.id;
    if (!session || !classId) return;
    review.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = student.name + ' — Writer’s Effect';
    title.tabIndex = -1;
    const message = document.createElement('p');
    message.textContent = 'Loading saved responses…';
    review.append(title, message); title.focus();
    try {
      const response = parseResponse(await loadResponse(classId, student.id));
      if (request !== responseGeneration || session !== sessionKey()) return;
      message.textContent = !response ? 'No saved work yet.' :
        (response.status === 'draft' ? 'Draft — still in progress' : 'Submitted — awaiting teacher review') +
        ' · Last saved: ' + response.date.toLocaleString('en-MY');
      if (response) for (const id of QUESTION_IDS) {
        const label = document.createElement('h4'), answer = document.createElement('p');
        label.textContent = 'Question ' + id.slice(1);
        answer.textContent = response.answers[id] || '(No answer yet)';
        answer.style.whiteSpace = 'pre-wrap'; answer.style.overflowWrap = 'anywhere';
        review.append(label, answer);
      }
    } catch {
      if (request === responseGeneration && session === sessionKey()) message.textContent =
        'Responses could not be loaded. Check your connection and class access, then choose View Writer’s Effect again.';
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
          action.textContent = 'View Writer’s Effect';
          action.setAttribute('aria-label', 'View Writer’s Effect responses for ' + student.name);
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
    list.replaceChildren();
    status.textContent = '';
    heading.textContent = '';
    context.textContent = '';
    root.hidden = true;
    root.setAttribute('aria-busy', 'false');
    refresh.disabled = false;
    classes.hidden = false;
  };
  back.addEventListener('click', () => { clear(); trigger?.focus(); trigger = null; });
  refresh.addEventListener('click', () => { if (selected && !refresh.disabled) void loader.run(selected.id); });
  return {
    clear,
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
