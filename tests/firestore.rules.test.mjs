import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import * as firestoreSDK from 'firebase/firestore';
import { teachingClassesQuery } from '../admin-access.mjs';
import { doc, collection, query, where, getDocFromServer as getDoc, getDocsFromServer as getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let environment;
const classData = { name: '8 Daisy', branch: 'TM', yearGroup: 8, academicYear: 2026, active: true, teacherUids: ['teacher', 'admin'] };
const db = (uid, claims) => environment.authenticatedContext(uid, claims).firestore();
const assignedQuery = (database, uid) => teachingClassesQuery(firestoreSDK, database, uid);

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-maplewood-classes',
    firestore: { host: '127.0.0.1', port: 8080, rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') }
  });
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    const profiles = {
      admin: { active: true, role: 'admin' },
      teacher: { active: true, role: 'teacher' },
      other: { active: true, role: 'teacher' },
      unassigned: { active: true, role: 'teacher' },
      student: { active: true, role: 'student' },
      inactive: { active: false, role: 'admin' },
      'inactive-teacher': { active: false, role: 'teacher' },
      'string-active': { active: 'true', role: 'admin' },
      'wrong-role': { active: true, role: 'Admin' }
    };
    const classes = {
      daisy: classData,
      other: { ...classData, teacherUids: ['other'] },
      inactive: { ...classData, active: false },
      'missing-assignment': { name: 'Incomplete class', active: true },
      'map-assignment': { ...classData, teacherUids: { teacher: true } },
      'string-assignment': { ...classData, teacherUids: 'teacher' }
    };
    await Promise.all([
      ...Object.entries(profiles).map(([uid, data]) => setDoc(doc(database, 'users', uid), data)),
      ...Object.entries(classes).map(([id, data]) => setDoc(doc(database, 'classes', id), data)),
      setDoc(doc(database, 'users', 'admin', 'classes', 'duplicate'), classData),
      setDoc(doc(database, 'classes', 'daisy', 'students', 'private'), { name: 'Private student' }),
      ...['other', 'inactive', 'missing-assignment', 'map-assignment', 'string-assignment', 'orphan'].map(id =>
        setDoc(doc(database, 'classes', id, 'students', 'sample'), { displayName: 'Sample Student', active: true })),
      setDoc(doc(database, 'classes', 'daisy', 'students', 'inactive'), { displayName: 'Inactive sample', active: false }),
      setDoc(doc(database, 'classes', 'daisy', 'students', 'private', 'results', 'private'), { mark: 10 }),
      setDoc(doc(database, 'students', 'root-private'), { displayName: 'Root private' }),
      setDoc(doc(database, 'submissions', 'private'), { mark: 10 })
    ]);
  });
});

after(async () => { await environment?.cleanup(); });

test('unauthenticated requests cannot read profiles or classes', async () => {
  const database = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(database, 'users', 'admin')));
  await assertFails(getDoc(doc(database, 'classes', 'daisy')));
  await assertFails(getDocs(collection(database, 'classes')));
});

test('an active user can get only their own profile and cannot list profiles', async () => {
  for (const uid of ['admin', 'teacher', 'student']) {
    const database = db(uid);
    await assertSucceeds(getDoc(doc(database, 'users', uid)));
    await assertFails(getDoc(doc(database, 'users', uid === 'admin' ? 'teacher' : 'admin')));
    await assertFails(getDocs(collection(database, 'users')));
  }
  await assertFails(getDoc(doc(db('inactive'), 'users', 'inactive')));
});

test('active administrators can get and list all class records', async () => {
  const database = db('admin');
  await assertSucceeds(getDoc(doc(database, 'classes', 'daisy')));
  await assertSucceeds(getDoc(doc(database, 'classes', 'other')));
  await assertSucceeds(getDoc(doc(database, 'classes', 'inactive')));
  const result = await assertSucceeds(getDocs(collection(database, 'classes')));
  assert.equal(result.size, 6);
});

test('teachers can get only their assigned active classes, using an actual UID array', async () => {
  const database = db('teacher');
  await assertSucceeds(getDoc(doc(database, 'classes', 'daisy')));
  for (const id of ['other', 'inactive', 'missing-assignment', 'map-assignment', 'string-assignment']) {
    await assertFails(getDoc(doc(database, 'classes', id)));
  }
});

test('teacher queries require both the active filter and their own UID membership', async () => {
  const database = db('teacher');
  const result = await assertSucceeds(getDocs(assignedQuery(database, 'teacher')));
  assert.deepEqual(result.docs.map(item => item.id), ['daisy']);
  await assertFails(getDocs(collection(database, 'classes')));
  await assertFails(getDocs(query(collection(database, 'classes'), where('active', '==', true))));
  await assertFails(getDocs(query(collection(database, 'classes'), where('teacherUids', 'array-contains', 'teacher'))));
  await assertFails(getDocs(assignedQuery(database, 'other')));
  await assertFails(getDocs(query(collection(database, 'classes'), where('active', '==', true), where('teacherUids', '==', { teacher: true }))));
  await assertFails(getDocs(query(collection(database, 'classes'), where('active', '==', true), where('teacherUids', '==', 'teacher'))));
});

test('the production teaching query also limits an administrator to assigned active classes', async () => {
  const result = await assertSucceeds(getDocs(assignedQuery(db('admin'), 'admin')));
  assert.deepEqual(result.docs.map(item => item.id), ['daisy']);
});

test('an active teacher with no assignments gets an empty class list', async () => {
  const result = await assertSucceeds(getDocs(assignedQuery(db('unassigned'), 'unassigned')));
  assert.equal(result.size, 0);
});

test('student, absent, inactive and malformed profiles cannot read class data', async () => {
  for (const uid of ['student', 'missing', 'inactive', 'inactive-teacher', 'string-active', 'wrong-role']) {
    const database = db(uid);
    await assertFails(getDoc(doc(database, 'classes', 'daisy')));
    await assertFails(getDocs(assignedQuery(database, uid)));
  }
  // A client token claiming an admin role does not replace the server profile.
  await assertFails(getDocs(collection(db('student', { role: 'admin' }), 'classes')));
});

test('no client, including an administrator, can write classes or change role/assignment fields', async () => {
  for (const uid of ['admin', 'teacher', 'student', 'missing']) {
    const database = db(uid);
    await assertFails(setDoc(doc(database, 'classes', 'new-class'), classData));
    await assertFails(updateDoc(doc(database, 'classes', 'daisy'), { teacherUids: [uid] }));
    await assertFails(updateDoc(doc(database, 'classes', 'daisy'), { name: 'Changed' }));
    await assertFails(deleteDoc(doc(database, 'classes', 'daisy')));
    await assertFails(setDoc(doc(database, 'users', uid), { active: true, role: 'admin' }));
    await assertFails(deleteDoc(doc(database, 'users', uid)));
  }
});

test('class access grants no access to nested duplicates, results, root students or submissions', async () => {
  for (const uid of ['admin', 'teacher']) {
    const database = db(uid);
    await assertFails(getDoc(doc(database, 'classes', 'daisy', 'students', 'private', 'results', 'private')));
    await assertFails(getDocs(collection(database, 'students')));
    await assertFails(getDoc(doc(database, 'students', 'root-private')));
    await assertFails(getDocs(firestoreSDK.collectionGroup(database, 'students')));
    await assertFails(getDoc(doc(database, 'users', 'admin', 'classes', 'duplicate')));
    await assertFails(getDoc(doc(database, 'submissions', 'private')));
  }
});

test('administrators read rosters in every existing class, including inactive classes', async () => {
  const database = db('admin');
  for (const id of ['daisy', 'other', 'inactive']) {
    await assertSucceeds(getDocs(collection(database, 'classes', id, 'students')));
  }
  await assertSucceeds(getDoc(doc(database, 'classes', 'daisy', 'students', 'private')));
  await assertFails(getDocs(collection(database, 'classes', 'orphan', 'students')));
});

test('teachers read only their assigned active class roster, including inactive students', async () => {
  const database = db('teacher');
  const result = await assertSucceeds(getDocs(collection(database, 'classes', 'daisy', 'students')));
  assert.equal(result.size, 2);
  await assertSucceeds(getDoc(doc(database, 'classes', 'daisy', 'students', 'inactive')));
  for (const id of ['other', 'inactive', 'missing-assignment', 'map-assignment', 'string-assignment', 'orphan']) {
    await assertFails(getDocs(collection(database, 'classes', id, 'students')));
    await assertFails(getDoc(doc(database, 'classes', id, 'students', 'sample')));
  }
});

test('anonymous, student, unassigned, missing and disabled profiles cannot read rosters', async () => {
  for (const uid of [null, 'student', 'unassigned', 'missing', 'inactive', 'inactive-teacher', 'string-active', 'wrong-role']) {
    const database = uid ? db(uid) : environment.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(database, 'classes', 'daisy', 'students')));
    await assertFails(getDoc(doc(database, 'classes', 'daisy', 'students', 'private')));
  }
  await assertFails(getDocs(collection(db('student', { role: 'admin' }), 'classes', 'daisy', 'students')));
});

test('all browser roles are denied student creation, edits and deletion', async () => {
  for (const uid of ['admin', 'teacher', 'student']) {
    const database = db(uid);
    await assertFails(setDoc(doc(database, 'classes', 'daisy', 'students', 'new'), { displayName: 'New', active: true }));
    await assertFails(updateDoc(doc(database, 'classes', 'daisy', 'students', 'private'), { displayName: 'Changed' }));
    await assertFails(deleteDoc(doc(database, 'classes', 'daisy', 'students', 'private')));
  }
});

test('deactivating a class revokes teacher roster reads while retaining administrator review', async () => {
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'classes', 'daisy'), { active: false });
  });
  try {
    await assertFails(getDocs(collection(db('teacher'), 'classes', 'daisy', 'students')));
    await assertSucceeds(getDocs(collection(db('admin'), 'classes', 'daisy', 'students')));
  } finally {
    await environment.withSecurityRulesDisabled(async context => {
      await updateDoc(doc(context.firestore(), 'classes', 'daisy'), { active: true });
    });
  }
});

test('removing an assignment or disabling a profile revokes subsequent server reads', async () => {
  const teacher = db('teacher');
  const admin = db('admin');
  await assertSucceeds(getDoc(doc(teacher, 'classes', 'daisy')));
  await assertSucceeds(getDocs(collection(teacher, 'classes', 'daisy', 'students')));
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'classes', 'daisy'), { teacherUids: ['admin'] });
  });
  await assertFails(getDoc(doc(teacher, 'classes', 'daisy')));
  await assertFails(getDocs(collection(teacher, 'classes', 'daisy', 'students')));
  const result = await assertSucceeds(getDocs(assignedQuery(teacher, 'teacher')));
  assert.equal(result.size, 0);
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'users', 'admin'), { active: false });
  });
  await assertFails(getDocs(collection(admin, 'classes')));
  await assertFails(getDocs(collection(admin, 'classes', 'daisy', 'students')));
});
