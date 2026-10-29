import test from 'node:test';
import assert from 'node:assert/strict';
import { studentCollection, parseStudents, rosterErrorMessage, createRosterLoader } from '../student-roster.mjs';
const snapshot = records => ({ docs: records.map(([id, data]) => ({ id, data: () => data })) });
const student = (name, active = true) => ({ displayName: name, active });

test('roster reads only the selected class students subcollection', () => {
  const sdk = { collection: (...args) => args };
  assert.deepEqual(studentCollection(sdk, 'database', 'daisy'), ['database', 'classes', 'daisy', 'students']);
  for (const id of ['', null, 'daisy/students', '   ']) assert.throws(() => studentCollection(sdk, {}, id));
});
test('roster validates records, sorts active names first and exposes only roster fields', () => {
  const result = parseStudents(snapshot([
    ['b', student(' Student B ')], ['a', { ...student('Student A'), email: 'private', mark: 20 }],
    ['c', student('Student C', false)], ['bad', { displayName: 'Missing active' }],
    ['blank', student(' ')], ['wrong', student('Wrong', 'true')], ['long', student('x'.repeat(201))]
  ]));
  assert.deepEqual(result, { students: [
    { id: 'a', name: 'Student A', active: true }, { id: 'b', name: 'Student B', active: true },
    { id: 'c', name: 'Student C', active: false }], invalidCount: 4 });
  assert.deepEqual(parseStudents(snapshot([])), { students: [], invalidCount: 0 });
});
test('server failures have safe, useful messages', () => {
  assert.match(rosterErrorMessage({ code: 'permission-denied' }), /access is no longer available/);
  assert.match(rosterErrorMessage({ code: 'unavailable' }), /connection/);
  assert.ok(!rosterErrorMessage({ message: 'Private details' }).includes('Private'));
});
function harness() {
  let session = 'teacher:1';
  const requests = [], events = [];
  const loader = createRosterLoader({
    load: id => new Promise((resolve, reject) => requests.push({ id, resolve, reject })),
    sessionKey: () => session,
    pending: () => events.push('pending'), success: data => events.push(data),
    failure: error => events.push(error.code), settled: () => events.push('settled')
  });
  return { loader, requests, events, session: value => { session = value; } };
}
test('switching class discards an older response that arrives last', async () => {
  const h = harness();
  const first = h.loader.run('first'); const second = h.loader.run('second');
  h.requests[1].resolve(snapshot([['new', student('New')]])); await second;
  h.requests[0].resolve(snapshot([['old', student('Old')]])); await first;
  assert.equal(h.events.filter(item => typeof item === 'object').length, 1);
  assert.equal(h.events[2].students[0].name, 'New');
});
test('back, class refresh and sign-out cancellation discard pending success or error', async () => {
  for (const reject of [false, true]) {
    const h = harness(); const result = h.loader.run('daisy'); h.loader.cancel();
    if (reject) h.requests[0].reject({ code: 'unavailable' }); else h.requests[0].resolve(snapshot([]));
    await result; assert.deepEqual(h.events, ['pending']);
  }
});
test('session changes discard data and a signed-out session starts no read', async () => {
  const h = harness(); const result = h.loader.run('daisy'); h.session('other:2');
  h.requests[0].resolve(snapshot([['a', student('Private')]])); await result;
  assert.deepEqual(h.events, ['pending']);
  h.session(null); await h.loader.run('daisy'); assert.equal(h.requests.length, 1);
});
test('refresh failures replace loading with error and settle the current request', async () => {
  const h = harness(); const result = h.loader.run('daisy');
  h.requests[0].reject({ code: 'permission-denied' }); await result;
  assert.deepEqual(h.events, ['pending', 'permission-denied', 'settled']);
});
