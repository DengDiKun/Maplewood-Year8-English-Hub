/**
 * Maplewood Year 8 English Learning Hub — response receiver
 * Google Sheet: Maplewood Year 8 English - Learning Hub Data
 *
 * Deploy this file as a Google Apps Script Web App.
 * Execute as: Me
 * Who has access: Anyone
 */

const SPREADSHEET_ID = '1Um24tdSvhCt7IEByRsQUbJrOnDdHxNXc4hl7GTkthF0';

const SUBMISSION_HEADERS = [
  'submission_id','submitted_at','student_name','class','lesson','lesson_title','xp',
  'auto_correct','auto_total','auto_percentage','activity4_first_score','activity4_first_possible',
  'morocco_attitude','morocco_moral','aragon_attitude','aragon_moral','bassanio_attitude','bassanio_moral',
  'morocco_free_response','bassanio_free_response','activity5_claim','activity5_evidence_id',
  'activity5_evidence_text','activity5_evidence_correct','activity5_explanation','final_interpretation'
];

const ITEM_HEADERS = [
  'submission_id','submitted_at','student_name','class','lesson','activity','item_id','skill',
  'response','expected_answer','auto_result','attempts','remedial_focus'
];

function doGet() {
  return json_({ ok: true, service: 'Maplewood Year 8 English Learning Hub', status: 'ready' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.submissionId) throw new Error('Missing submissionId.');
    if (!data.studentName) throw new Error('Missing studentName.');
    if (!data.classroom) throw new Error('Missing classroom.');
    if (!data.lesson) throw new Error('Missing lesson.');

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const submissions = ensureSheet_(ss, 'Submissions', SUBMISSION_HEADERS);
    const items = ensureSheet_(ss, 'Item Responses', ITEM_HEADERS);
    ensureSheet_(ss, 'Student Progress', ['student_name','class','lessons_submitted','last_submission','avg_auto_percentage','activity4_accuracy','evidence_selection_accuracy','strengths','priority_needs','teacher_notes']);
    ensureSheet_(ss, 'Error Analysis', ['lesson','activity','skill','item_id','submissions','correct','incorrect','accuracy','common_error','suggested_remedial']);
    ensureSheet_(ss, 'Remedial Groups', ['student_name','class','lesson','priority_skill','reason','recommended_activity','status']);

    if (submissionExists_(submissions, data.submissionId)) {
      return json_({ ok: true, duplicate: true, submissionId: data.submissionId });
    }

    const serverTime = new Date();
    const row = [
      data.submissionId,
      serverTime,
      safe_(data.studentName),
      safe_(data.classroom),
      safe_(data.lesson),
      safe_(data.lessonTitle),
      number_(data.xp),
      number_(data.autoCorrect),
      number_(data.autoTotal),
      number_(data.autoPercentage),
      number_(data.activity4FirstScore),
      number_(data.activity4FirstPossible),
      safe_(data.answers && data.answers.moroccoAttitude),
      safe_(data.answers && data.answers.moroccoMoral),
      safe_(data.answers && data.answers.aragonAttitude),
      safe_(data.answers && data.answers.aragonMoral),
      safe_(data.answers && data.answers.bassanioAttitude),
      safe_(data.answers && data.answers.bassanioMoral),
      safe_(data.answers && data.answers.moroccoFreeResponse),
      safe_(data.answers && data.answers.bassanioFreeResponse),
      safe_(data.answers && data.answers.activity5Claim),
      safe_(data.answers && data.answers.activity5EvidenceId),
      safe_(data.answers && data.answers.activity5EvidenceText),
      boolText_(data.answers && data.answers.activity5EvidenceCorrect),
      safe_(data.answers && data.answers.activity5Explanation),
      safe_(data.answers && data.answers.finalInterpretation)
    ];
    submissions.appendRow(row);

    const itemRows = (data.itemResponses || []).map(item => [
      data.submissionId,
      serverTime,
      safe_(data.studentName),
      safe_(data.classroom),
      safe_(data.lesson),
      safe_(item.activity),
      safe_(item.itemId),
      safe_(item.skill),
      safe_(item.response),
      safe_(item.expectedAnswer),
      safe_(item.autoResult),
      number_(item.attempts),
      safe_(item.remedialFocus)
    ]);
    if (itemRows.length) {
      items.getRange(items.getLastRow() + 1, 1, itemRows.length, ITEM_HEADERS.length).setValues(itemRows);
    }

    updateStudentProgress_(ss, data, itemRows, serverTime);
    updateErrorAnalysis_(ss, data, itemRows);
    updateRemedialGroup_(ss, data, itemRows);
    SpreadsheetApp.flush();

    return json_({ ok: true, submissionId: data.submissionId });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  const current = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  if (!current.some(Boolean)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function submissionExists_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  return !!sheet.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
}

function updateStudentProgress_(ss, data, itemRows, serverTime) {
  const sheet = ss.getSheetByName('Student Progress');
  const submissions = ss.getSheetByName('Submissions');
  const last = submissions.getLastRow();
  const rows = last >= 2 ? submissions.getRange(2, 1, last - 1, 26).getValues() : [];
  const mine = rows.filter(r => String(r[2]).trim().toLowerCase() === String(data.studentName).trim().toLowerCase() && String(r[3]).trim().toLowerCase() === String(data.classroom).trim().toLowerCase());
  const avg = mine.length ? mine.reduce((s,r) => s + Number(r[9] || 0), 0) / mine.length : 0;
  const a4 = mine.length ? mine.reduce((s,r) => s + (Number(r[11] || 0) ? Number(r[10] || 0) / Number(r[11] || 1) : 0), 0) / mine.length : 0;
  const ev = mine.length ? mine.reduce((s,r) => s + (String(r[23]).toLowerCase() === 'true' ? 1 : 0), 0) / mine.length : 0;

  const skill = skillSummary_(ss, data.studentName, data.classroom);
  const existingRow = findStudentRow_(sheet, data.studentName, data.classroom);
  const values = [[safe_(data.studentName), safe_(data.classroom), mine.length, serverTime, avg, a4, ev, skill.strengths, skill.needs, '']];
  if (existingRow) sheet.getRange(existingRow, 1, 1, 10).setValues(values);
  else sheet.getRange(sheet.getLastRow() + 1, 1, 1, 10).setValues(values);
  sheet.getRange(2, 5, Math.max(1, sheet.getLastRow()-1), 3).setNumberFormat('0.0%');
}

function skillSummary_(ss, studentName, classroom) {
  const sheet = ss.getSheetByName('Item Responses');
  const last = sheet.getLastRow();
  if (last < 2) return { strengths: '', needs: '' };
  const rows = sheet.getRange(2, 1, last - 1, 13).getValues().filter(r => String(r[2]).trim().toLowerCase() === String(studentName).trim().toLowerCase() && String(r[3]).trim().toLowerCase() === String(classroom).trim().toLowerCase());
  const map = {};
  rows.forEach(r => {
    const skill = String(r[7] || '').trim();
    const result = String(r[10] || '').trim().toLowerCase();
    if (!skill || !['correct','incorrect'].includes(result)) return;
    map[skill] = map[skill] || {c:0,t:0};
    map[skill].t++;
    if (result === 'correct') map[skill].c++;
  });
  const scored = Object.entries(map).map(([k,v]) => ({k,rate:v.t ? v.c/v.t : 0})).sort((a,b) => b.rate-a.rate);
  if (!scored.length) return { strengths: '', needs: '' };
  const strongest = scored.filter(x => x.rate >= .75).slice(0,2).map(x => x.k).join(' | ');
  const weakest = [...scored].sort((a,b)=>a.rate-b.rate).filter(x => x.rate < .75).slice(0,2).map(x => x.k).join(' | ');
  return { strengths: strongest, needs: weakest };
}

function updateErrorAnalysis_(ss, data, itemRows) {
  const sheet = ss.getSheetByName('Error Analysis');
  itemRows.forEach(r => {
    const result = String(r[10] || '').toLowerCase();
    if (!['correct','incorrect'].includes(result)) return;
    const activity = r[5], itemId = r[6], skill = r[7];
    const rowNo = findErrorRow_(sheet, data.lesson, activity, skill, itemId);
    let submissions = 0, correct = 0, incorrect = 0, commonError = '', remedial = r[12] || '';
    if (rowNo) {
      const old = sheet.getRange(rowNo, 1, 1, 10).getValues()[0];
      submissions = Number(old[4] || 0); correct = Number(old[5] || 0); incorrect = Number(old[6] || 0); commonError = old[8] || '';
    }
    submissions++;
    if (result === 'correct') correct++; else { incorrect++; commonError = safe_(r[8]); }
    const accuracy = submissions ? correct/submissions : 0;
    const values = [[data.lesson, activity, skill, itemId, submissions, correct, incorrect, accuracy, commonError, remedial]];
    if (rowNo) sheet.getRange(rowNo,1,1,10).setValues(values); else sheet.getRange(sheet.getLastRow()+1,1,1,10).setValues(values);
  });
  if (sheet.getLastRow() > 1) sheet.getRange(2,8,sheet.getLastRow()-1,1).setNumberFormat('0.0%');
}

function updateRemedialGroup_(ss, data, itemRows) {
  const wrong = itemRows.filter(r => String(r[10] || '').toLowerCase() === 'incorrect');
  const sheet = ss.getSheetByName('Remedial Groups');
  const existing = findRemedialRow_(sheet, data.studentName, data.classroom, data.lesson);
  if (!wrong.length) {
    const vals = [[data.studentName, data.classroom, data.lesson, 'Secure / no immediate auto-marked weakness', 'All auto-marked items correct in this submission.', 'Extension / higher-order response practice', 'Monitor']];
    if (existing) sheet.getRange(existing,1,1,7).setValues(vals); else sheet.getRange(sheet.getLastRow()+1,1,1,7).setValues(vals);
    return;
  }
  const counts = {};
  wrong.forEach(r => { const skill = String(r[7] || 'General').trim(); counts[skill] = (counts[skill] || 0) + 1; });
  const priority = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
  const sample = wrong.find(r => r[7] === priority) || wrong[0];
  const vals = [[data.studentName, data.classroom, data.lesson, priority, `Incorrect auto-marked responses in ${priority}.`, sample[12] || 'Targeted practice required.', 'To do']];
  if (existing) sheet.getRange(existing,1,1,7).setValues(vals); else sheet.getRange(sheet.getLastRow()+1,1,1,7).setValues(vals);
}

function findStudentRow_(sheet, name, classroom) {
  const last = sheet.getLastRow(); if (last < 2) return 0;
  const rows = sheet.getRange(2,1,last-1,2).getDisplayValues();
  const n=String(name).trim().toLowerCase(), c=String(classroom).trim().toLowerCase();
  for (let i=0;i<rows.length;i++) if (rows[i][0].trim().toLowerCase()===n && rows[i][1].trim().toLowerCase()===c) return i+2;
  return 0;
}
function findErrorRow_(sheet, lesson, activity, skill, itemId) {
  const last=sheet.getLastRow(); if(last<2)return 0;
  const rows=sheet.getRange(2,1,last-1,4).getDisplayValues();
  for(let i=0;i<rows.length;i++) if(rows[i][0]===String(lesson) && rows[i][1]===String(activity) && rows[i][2]===String(skill) && rows[i][3]===String(itemId)) return i+2;
  return 0;
}
function findRemedialRow_(sheet,name,classroom,lesson){
  const last=sheet.getLastRow(); if(last<2)return 0;
  const rows=sheet.getRange(2,1,last-1,3).getDisplayValues();
  const n=String(name).trim().toLowerCase(),c=String(classroom).trim().toLowerCase(),l=String(lesson);
  for(let i=0;i<rows.length;i++) if(rows[i][0].trim().toLowerCase()===n && rows[i][1].trim().toLowerCase()===c && rows[i][2]===l)return i+2;
  return 0;
}

function safe_(v) { return v === null || v === undefined ? '' : String(v); }
function number_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function boolText_(v) { return v === true || String(v).toLowerCase() === 'true' ? 'true' : 'false'; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
