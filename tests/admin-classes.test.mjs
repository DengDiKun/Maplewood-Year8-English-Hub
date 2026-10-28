import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAdministratorClasses, classErrorMessage } from '../admin-access.mjs';

const profile = { uid: 'admin-uid', role: 'admin' };
const daisy = { name: '8 Daisy', branch: 'TM', yearGroup: 8, academicYear: 2026, active: true, teacherUids: ['admin-uid'] };
const record = (id, data) => ({ id, data: () => data });
const load = (docs) => loadAdministratorClasses(profile, async () => ({ docs }));

test('shows server class details and the administrator teaching assignment', async () => {
  const result = await load([record('tm-y8-daisy-2026', daisy)]);
  assert.deepEqual(result, {
    classes: [{ id: 'tm-y8-daisy-2026', name: '8 Daisy', branch: 'TM', yearGroup: 8, academicYear: 2026, active: true, assignedToYou: true, teacherCount: 1 }],
    invalidCount: 0
  });
});

test('assignment requires an exact UID and counts duplicate entries only once', async () => {
  const result = await load([
    record('other', { ...daisy, teacherUids: ['other-admin-uid', 'other-admin-uid'] }),
    record('unassigned', { ...daisy, teacherUids: [] })
  ]);
  assert.equal(result.classes[0].assignedToYou, false);
  assert.equal(result.classes[0].teacherCount, 1);
  assert.equal(result.classes[1].assignedToYou, false);
  assert.equal(result.classes[1].teacherCount, 0);
});

test('missing or wrongly typed class fields are counted for review, not shown as valid assignments', async () => {
  const invalid = [null, {}, { ...daisy, active: 'true' }, { ...daisy, teacherUids: 'admin-uid' },
    { ...daisy, teacherUids: { 'admin-uid': true } }, { ...daisy, teacherUids: [null] },
    { ...daisy, teacherUids: ['users/admin-uid'] }, { ...daisy, teacherUids: [''] },
    { ...daisy, academicYear: '2026' }, { ...daisy, yearGroup: 8.5 }, { ...daisy, name: ' ' }];
  const result = await load(invalid.map((data, i) => record(String(i), data)));
  assert.deepEqual(result, { classes: [], invalidCount: invalid.length });
});

test('server revocation or network errors never produce cached or invented classes', async () => {
  for (const code of ['permission-denied', 'unavailable']) {
    await assert.rejects(loadAdministratorClasses(profile, async () => {
      throw Object.assign(new Error('private server detail'), { code });
    }), { code });
  }
  assert.deepEqual(await load([]), { classes: [], invalidCount: 0 });
});

test('non-administrator contexts cannot invoke the class collection loader', async () => {
  for (const value of [null, { ...profile, uid: '' }, { ...profile, uid: 'users/other' }, { ...profile, role: 'teacher' }]) {
    await assert.rejects(loadAdministratorClasses(value, () => { throw new Error('Must not query'); }), { code: 'access/denied' });
  }
});

test('active classes appear before inactive ones and names sort numerically', async () => {
  const result = await load([
    record('inactive', { ...daisy, active: false }),
    record('class10', { ...daisy, name: 'Class 10' }),
    record('class2', { ...daisy, name: 'Class 2' })
  ]);
  assert.deepEqual(result.classes.map(item => item.id), ['class2', 'class10', 'inactive']);
});

test('class errors give an actionable message without leaking upstream data', () => {
  assert.match(classErrorMessage({ code: 'permission-denied' }), /class access/);
  assert.match(classErrorMessage({ code: 'unavailable' }), /connection/);
  assert.ok(!classErrorMessage(new Error('private server detail')).includes('private'));
});
