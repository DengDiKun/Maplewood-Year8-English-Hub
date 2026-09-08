/**
 * Maplewood Year 8 English Learning Hub — response receiver + student code login
 * Google Sheet: Maplewood Year 8 English - Learning Hub Data
 *
 * DEPLOYMENT
 * Execute as: Me
 * Who has access: Anyone
 */

const SPREADSHEET_ID = '1Um24tdSvhCt7IEByRsQUbJrOnDdHxNXc4hl7GTkthF0';

const SUBMISSION_HEADERS = [
  'submission_id','submitted_at','student_name','class','lesson','lesson_title','xp',
  'auto_correct','auto_total','auto_percentage','activity4_first_score','activity4_first_possible',
  'morocco_attitude','morocco_moral','aragon_attitude','aragon_moral','bassanio_attitude','bassanio_moral',
  'morocco_free_response','bassanio_free_response','activity5_claim','activity5_evidence_id',
  'activity5_evidence_text','activity5_evidence_correct','activity5_explanation','final_interpretation','student_code'
];

const ITEM_HEADERS = [
  'submission_id','submitted_at','student_name','class','lesson','activity','item_id','skill',
  'response','expected_answer','auto_result','attempts','remedial_focus','student_code'
];

const PROGRESS_HEADERS = [
  'student_name','class','lessons_submitted','last_submission','avg_auto_percentage','activity4_accuracy',
  'evidence_selection_accuracy','strengths','priority_needs','teacher_notes','student_code'
];

const REMEDIAL_HEADERS = [
  'student_name','class','lesson','priority_skill','reason','recommended_activity','status','student_code'
];

const REGISTRY_HEADERS = [
  'student_code','student_name','class','active','registration_status','registered_at','last_activity',
  'lessons_completed','overall_progress'
];

/**
 * GET endpoints.
 * ?action=lookup&code=4393&callback=myCallback
 * JSONP is used so the Netlify site can read the response without CORS problems.
 */
function doGet(e) {
  try {
    const action = safe_(e && e.parameter && e.parameter.action).toLowerCase();
    if (action === 'lookup') {
      const code = normaliseCode_(e.parameter.code);
      const callback = safeCallback_(e.parameter.callback);
      const result = lookupAndRegister_(code);
      return output_(result, callback);
    }
    return output_({ok:true, service:'Maplewood Year 8 English Learning Hub', status:'ready'}, safeCallback_(e && e.parameter && e.parameter.callback));
  } catch (err) {
    return output_({ok:false,error:String(err && err.message ? err.message : err)}, safeCallback_(e && e.parameter && e.parameter.callback));
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.submissionId) throw new Error('Missing submissionId.');
    if (!data.studentCode) throw new Error('Missing studentCode.');
    if (!data.lesson) throw new Error('Missing lesson.');

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const registry = ensureSheet_(ss, 'Student Registry', REGISTRY_HEADERS);
    const student = findStudentByCode_(registry, normaliseCode_(data.studentCode));
    if (!student || !student.active) throw new Error('Invalid or inactive student code.');

    // Always trust the registry identity, never a typed/browser-supplied name.
    data.studentCode = student.code;
    data.studentName = student.name;
    data.classroom = student.classroom;

    const submissions = ensureSheet_(ss, 'Submissions', SUBMISSION_HEADERS);
    const items = ensureSheet_(ss, 'Item Responses', ITEM_HEADERS);
    ensureSheet_(ss, 'Student Progress', PROGRESS_HEADERS);
    ensureSheet_(ss, 'Error Analysis', ['lesson','activity','skill','item_id','submissions','correct','incorrect','accuracy','common_error','suggested_remedial']);
    ensureSheet_(ss, 'Remedial Groups', REMEDIAL_HEADERS);

    if (submissionExists_(submissions, data.submissionId)) {
      return json_({ok:true, duplicate:true, submissionId:data.submissionId});
    }

    const serverTime = new Date();
    submissions.appendRow([
      data.submissionId, serverTime, student.name, student.classroom,
      safe_(data.lesson), safe_(data.lessonTitle), number_(data.xp),
      number_(data.autoCorrect), number_(data.autoTotal), number_(data.autoPercentage),
      number_(data.activity4FirstScore), number_(data.activity4FirstPossible),
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
      safe_(data.answers && data.answers.finalInterpretation),
      student.code
    ]);

    const itemRows = (data.itemResponses || []).map(item => [
      data.submissionId, serverTime, student.name, student.classroom, safe_(data.lesson),
      safe_(item.activity), safe_(item.itemId), safe_(item.skill), safe_(item.response),
      safe_(item.expectedAnswer), safe_(item.autoResult), number_(item.attempts),
      safe_(item.remedialFocus), student.code
    ]);
    if (itemRows.length) {
      items.getRange(items.getLastRow()+1, 1, itemRows.length, ITEM_HEADERS.length).setValues(itemRows);
    }

    updateStudentProgress_(ss, data, itemRows, serverTime);
    updateErrorAnalysis_(ss, data, itemRows);
    updateRemedialGroup_(ss, data, itemRows);
    updateRegistryProgress_(ss, student.code, serverTime);
    SpreadsheetApp.flush();

    return json_({ok:true, submissionId:data.submissionId});
  } catch (err) {
    return json_({ok:false,error:String(err && err.message ? err.message : err)});
  } finally {
    lock.releaseLock();
  }
}

function lookupAndRegister_(code) {
  if (!/^\d{4}$/.test(code)) return {ok:false, valid:false, message:'Enter a valid 4-digit student code.'};
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const registry = ensureSheet_(ss, 'Student Registry', REGISTRY_HEADERS);
  const student = findStudentByCode_(registry, code);
  if (!student || !student.active) return {ok:true, valid:false, message:'Student code not recognised.'};

  // First successful code lookup counts as registration.
  const status = safe_(registry.getRange(student.row,5).getValue());
  if (!status || status.toLowerCase() === 'not yet registered') {
    registry.getRange(student.row,5).setValue('Registered');
    registry.getRange(student.row,6).setValue(new Date());
  }
  return {
    ok:true,
    valid:true,
    student:{code:student.code,name:student.name,classroom:student.classroom}
  };
}

function findStudentByCode_(registry, code) {
  const last = registry.getLastRow();
  if (last < 2) return null;
  const rows = registry.getRange(2,1,last-1,9).getValues();
  for (let i=0;i<rows.length;i++) {
    const rowCode = String(rows[i][0]).trim().padStart(4,'0');
    if (rowCode === code) {
      return {
        row:i+2,
        code:rowCode,
        name:safe_(rows[i][1]),
        classroom:safe_(rows[i][2]),
        active:rows[i][3] === true || String(rows[i][3]).toLowerCase() === 'true'
      };
    }
  }
  return null;
}

function updateRegistryProgress_(ss, code, serverTime) {
  const registry = ss.getSheetByName('Student Registry');
  const student = findStudentByCode_(registry, code);
  if (!student) return;

  const submissions = ss.getSheetByName('Submissions');
  const last = submissions.getLastRow();
  const rows = last >= 2 ? submissions.getRange(2,1,last-1,27).getValues() : [];
  const mine = rows.filter(r => String(r[26]).trim().padStart(4,'0') === code);
  const uniqueLessons = [...new Set(mine.map(r => safe_(r[4])).filter(Boolean))];
  const avg = mine.length ? mine.reduce((sum,r)=>sum+Number(r[9]||0),0)/mine.length : 0;

  registry.getRange(student.row,5).setValue('Registered');
  if (!registry.getRange(student.row,6).getValue()) registry.getRange(student.row,6).setValue(serverTime);
  registry.getRange(student.row,7).setValue(serverTime);
  registry.getRange(student.row,8).setValue(uniqueLessons.length);
  registry.getRange(student.row,9).setValue(avg).setNumberFormat('0.0%');
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length-sheet.getMaxColumns());
  }
  const current = sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
  headers.forEach((header,i)=>{
    if (!current[i]) sheet.getRange(1,i+1).setValue(header);
  });
  sheet.setFrozenRows(1);
  return sheet;
}

function submissionExists_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  return !!sheet.getRange(2,1,last-1,1).createTextFinder(String(id)).matchEntireCell(true).findNext();
}

function updateStudentProgress_(ss, data, itemRows, serverTime) {
  const sheet = ss.getSheetByName('Student Progress');
  const submissions = ss.getSheetByName('Submissions');
  const last = submissions.getLastRow();
  const rows = last >= 2 ? submissions.getRange(2,1,last-1,27).getValues() : [];
  const code = normaliseCode_(data.studentCode);
  const mine = rows.filter(r => String(r[26]).trim().padStart(4,'0') === code);
  const avg = mine.length ? mine.reduce((s,r)=>s+Number(r[9]||0),0)/mine.length : 0;
  const a4 = mine.length ? mine.reduce((s,r)=>s+(Number(r[11]||0)?Number(r[10]||0)/Number(r[11]||1):0),0)/mine.length : 0;
  const ev = mine.length ? mine.reduce((s,r)=>s+(String(r[23]).toLowerCase()==='true'?1:0),0)/mine.length : 0;
  const skill = skillSummary_(ss, code);
  const existingRow = findProgressRow_(sheet, code);
  const values = [[data.studentName,data.classroom,mine.length,serverTime,avg,a4,ev,skill.strengths,skill.needs,'',code]];
  if (existingRow) sheet.getRange(existingRow,1,1,11).setValues(values);
  else sheet.getRange(sheet.getLastRow()+1,1,1,11).setValues(values);
  if (sheet.getLastRow()>1) sheet.getRange(2,5,sheet.getLastRow()-1,3).setNumberFormat('0.0%');
}

function skillSummary_(ss, code) {
  const sheet = ss.getSheetByName('Item Responses');
  const last = sheet.getLastRow();
  if (last < 2) return {strengths:'',needs:''};
  const rows = sheet.getRange(2,1,last-1,14).getValues().filter(r=>String(r[13]).trim().padStart(4,'0')===code);
  const map = {};
  rows.forEach(r=>{
    const skill=safe_(r[7]).trim(), result=safe_(r[10]).trim().toLowerCase();
    if (!skill || !['correct','incorrect'].includes(result)) return;
    map[skill]=map[skill]||{c:0,t:0}; map[skill].t++; if(result==='correct')map[skill].c++;
  });
  const scored=Object.entries(map).map(([k,v])=>({k,rate:v.t?v.c/v.t:0}));
  if(!scored.length)return{strengths:'',needs:''};
  const strengths=[...scored].sort((a,b)=>b.rate-a.rate).filter(x=>x.rate>=.75).slice(0,2).map(x=>x.k).join(' | ');
  const needs=[...scored].sort((a,b)=>a.rate-b.rate).filter(x=>x.rate<.75).slice(0,2).map(x=>x.k).join(' | ');
  return {strengths,needs};
}

function updateErrorAnalysis_(ss, data, itemRows) {
  const sheet=ss.getSheetByName('Error Analysis');
  itemRows.forEach(r=>{
    const result=safe_(r[10]).toLowerCase();
    if(!['correct','incorrect'].includes(result))return;
    const activity=r[5],itemId=r[6],skill=r[7];
    const rowNo=findErrorRow_(sheet,data.lesson,activity,skill,itemId);
    let submissions=0,correct=0,incorrect=0,commonError='',remedial=r[12]||'';
    if(rowNo){const old=sheet.getRange(rowNo,1,1,10).getValues()[0];submissions=Number(old[4]||0);correct=Number(old[5]||0);incorrect=Number(old[6]||0);commonError=old[8]||'';}
    submissions++; if(result==='correct')correct++;else{incorrect++;commonError=safe_(r[8]);}
    const values=[[data.lesson,activity,skill,itemId,submissions,correct,incorrect,submissions?correct/submissions:0,commonError,remedial]];
    if(rowNo)sheet.getRange(rowNo,1,1,10).setValues(values);else sheet.getRange(sheet.getLastRow()+1,1,1,10).setValues(values);
  });
  if(sheet.getLastRow()>1)sheet.getRange(2,8,sheet.getLastRow()-1,1).setNumberFormat('0.0%');
}

function updateRemedialGroup_(ss, data, itemRows) {
  const wrong=itemRows.filter(r=>safe_(r[10]).toLowerCase()==='incorrect');
  const sheet=ss.getSheetByName('Remedial Groups');
  const code=normaliseCode_(data.studentCode);
  const existing=findRemedialRow_(sheet,code,data.lesson);
  let vals;
  if(!wrong.length){
    vals=[[data.studentName,data.classroom,data.lesson,'Secure / no immediate auto-marked weakness','All auto-marked items correct in this submission.','Extension / higher-order response practice','Monitor',code]];
  }else{
    const counts={};wrong.forEach(r=>{const skill=safe_(r[7])||'General';counts[skill]=(counts[skill]||0)+1;});
    const priority=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
    const sample=wrong.find(r=>r[7]===priority)||wrong[0];
    vals=[[data.studentName,data.classroom,data.lesson,priority,`Incorrect auto-marked responses in ${priority}.`,sample[12]||'Targeted practice required.','To do',code]];
  }
  if(existing)sheet.getRange(existing,1,1,8).setValues(vals);else sheet.getRange(sheet.getLastRow()+1,1,1,8).setValues(vals);
}

function findProgressRow_(sheet, code) {
  const last=sheet.getLastRow();if(last<2)return 0;
  const values=sheet.getRange(2,11,last-1,1).getDisplayValues();
  for(let i=0;i<values.length;i++)if(String(values[i][0]).trim().padStart(4,'0')===code)return i+2;
  return 0;
}

function findErrorRow_(sheet,lesson,activity,skill,itemId){
  const last=sheet.getLastRow();if(last<2)return 0;
  const rows=sheet.getRange(2,1,last-1,4).getDisplayValues();
  for(let i=0;i<rows.length;i++)if(rows[i][0]===String(lesson)&&rows[i][1]===String(activity)&&rows[i][2]===String(skill)&&rows[i][3]===String(itemId))return i+2;
  return 0;
}

function findRemedialRow_(sheet,code,lesson){
  const last=sheet.getLastRow();if(last<2)return 0;
  const rows=sheet.getRange(2,1,last-1,8).getDisplayValues();
  for(let i=0;i<rows.length;i++)if(String(rows[i][7]).trim().padStart(4,'0')===code&&rows[i][2]===String(lesson))return i+2;
  return 0;
}

function normaliseCode_(v){return safe_(v).replace(/\D/g,'').slice(0,4).padStart(4,'0');}
function safeCallback_(v){const cb=safe_(v);return /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(cb)?cb:'';}
function safe_(v){return v===null||v===undefined?'':String(v);}
function number_(v){const n=Number(v);return isFinite(n)?n:0;}
function boolText_(v){return v===true||String(v).toLowerCase()==='true'?'true':'false';}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function output_(obj,callback){
  if(callback){return ContentService.createTextOutput(`${callback}(${JSON.stringify(obj)});`).setMimeType(ContentService.MimeType.JAVASCRIPT);}
  return json_(obj);
}
