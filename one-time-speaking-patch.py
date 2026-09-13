from pathlib import Path

# 1) Add Research Showcase button to the homepage.
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = '<div class="hero-actions"><a class="cta primary" href="#journey">Explore the curriculum →</a><a class="cta secondary" href="unit8-3.html">Continue Unit 8.3 🧠</a></div>'
new = '<div class="hero-actions"><a class="cta primary" href="#journey">Explore the curriculum →</a><a class="cta secondary" href="unit8-3.html">Continue Unit 8.3 🧠</a><a class="cta secondary" href="speaking-assessment.html">Research Showcase 🎤</a></div>'
if old in s and 'href="speaking-assessment.html"' not in s:
    s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# 2) Extend Apps Script with central, atomic topic reservations.
p = Path('apps-script-learning-hub.gs')
s = p.read_text(encoding='utf-8')

if 'const SPEAKING_TOPIC_HEADERS' not in s:
    marker = "const REGISTRY_HEADERS = [\n  'student_code','student_name','class','active','registration_status','registered_at','last_activity',\n  'lessons_completed','overall_progress'\n];"
    addition = marker + """

const SPEAKING_TOPIC_HEADERS = [
  'topic_id','category','topic','student_code','student_name','class','selected_at','updated_at'
];

const SPEAKING_HISTORY_HEADERS = [
  'timestamp','student_code','student_name','class','action','topic_id','category','topic'
];

const SPEAKING_TOPIC_CATALOG = [
  ['T01','Strange Islands & Mysterious Places','Hashima Island, Japan'],
  ['T02','Strange Islands & Mysterious Places','Easter Island, Chile'],
  ['T03','Strange Islands & Mysterious Places','North Sentinel Island, India'],
  ['T04','Strange Islands & Mysterious Places','Socotra Island, Yemen'],
  ['T05','Strange Islands & Mysterious Places','Poveglia Island, Italy'],
  ['T06','Strange Islands & Mysterious Places','The Bermuda Triangle'],
  ['T07','Strange Islands & Mysterious Places','The Catacombs of Paris'],
  ['T08','Strange Islands & Mysterious Places','The Nazca Lines, Peru'],
  ['T09','Heroes & Inspiring People','Malala Yousafzai'],
  ['T10','Heroes & Inspiring People','Nelson Mandela'],
  ['T11','Heroes & Inspiring People','Steve Irwin'],
  ['T12','Heroes & Inspiring People','Jane Goodall'],
  ['T13','Heroes & Inspiring People','Stephen Hawking'],
  ['T14','Heroes & Inspiring People','Florence Nightingale'],
  ['T15','Heroes & Inspiring People','Marie Curie'],
  ['T16','Heroes & Inspiring People','Abdul Sattar Edhi'],
  ['T17','Monsters, Myths & Legends','The Loch Ness Monster'],
  ['T18','Monsters, Myths & Legends','Bigfoot'],
  ['T19','Monsters, Myths & Legends','The Kraken'],
  ['T20','Monsters, Myths & Legends','The Yeti'],
  ['T21','Monsters, Myths & Legends','The Kappa of Japanese folklore'],
  ['T22','Monsters, Myths & Legends','The Pontianak in Malay folklore'],
  ['T23','Monsters, Myths & Legends','Naga legends'],
  ['T24','Monsters, Myths & Legends','The Minotaur'],
  ['T25','The Modern World & Inventions','Artificial intelligence in education'],
  ['T26','The Modern World & Inventions','How smartphones changed everyday life'],
  ['T27','The Modern World & Inventions','The impact of social media'],
  ['T28','The Modern World & Inventions','Electric cars and the future of transport'],
  ['T29','The Modern World & Inventions','Drones and how they are used'],
  ['T30','The Modern World & Inventions','Robots in everyday life'],
  ['T31','The Modern World & Inventions','Virtual reality'],
  ['T32','The Modern World & Inventions','3D printing and its real-world uses'],
  ['T33','Environment & Human Impact','Deforestation'],
  ['T34','Environment & Human Impact','Plastic pollution'],
  ['T35','Environment & Human Impact','Coral bleaching'],
  ['T36','Environment & Human Impact','Endangered animals and conservation'],
  ['T37','Environment & Human Impact','Fast fashion and the environment'],
  ['T38','Environment & Human Impact','Food waste'],
  ['T39','Environment & Human Impact','Air pollution'],
  ['T40','Environment & Human Impact','Wildlife trafficking'],
  ['T41','Choices & Decisions','Rosa Parks and the decision to refuse her seat'],
  ['T42','Choices & Decisions','Terry Fox and the Marathon of Hope'],
  ['T43','Choices & Decisions','Wangari Maathai and the Green Belt Movement'],
  ['T44','Choices & Decisions','Ernest Shackleton and survival decisions during the Endurance expedition'],
  ['T45','Choices & Decisions','Captain Chesley Sullenberger and the Hudson River landing'],
  ['T46','Choices & Decisions','Bethany Hamilton returning to competitive surfing'],
  ['T47','Choices & Decisions','Greta Thunberg and the school climate strike'],
  ['T48','Choices & Decisions','A major decision during the Apollo 13 mission'],
  ['T49','Symbolism, Culture & Beliefs','Dragons in Chinese culture'],
  ['T50','Symbolism, Culture & Beliefs','The phoenix as a symbol'],
  ['T51','Symbolism, Culture & Beliefs','The lotus flower as a symbol'],
  ['T52','Symbolism, Culture & Beliefs','Ravens in myths and folklore'],
  ['T53','Symbolism, Culture & Beliefs','Wolves in folklore'],
  ['T54','Symbolism, Culture & Beliefs','Snakes in mythology'],
  ['T55','Symbolism, Culture & Beliefs','The moon in different cultures'],
  ['T56','Symbolism, Culture & Beliefs','Trees as symbols of life']
].map(r => ({id:r[0], category:r[1], topic:r[2]}));
"""
    if marker not in s:
        raise SystemExit('Registry marker not found')
    s = s.replace(marker, addition, 1)

if "action === 'speakingtopics'" not in s:
    marker = "    return output_({ok:true, service:'Maplewood Year 8 English Learning Hub', status:'ready'}, safeCallback_(e && e.parameter && e.parameter.callback));"
    insertion = """    if (action === 'speakingtopics') {
      const code = normaliseCode_(e.parameter.code);
      const callback = safeCallback_(e.parameter.callback);
      return output_(getSpeakingTopics_(code), callback);
    }
    if (action === 'selectspeakingtopic') {
      const code = normaliseCode_(e.parameter.code);
      const topicId = safe_(e.parameter.topicId).trim().toUpperCase();
      const callback = safeCallback_(e.parameter.callback);
      return output_(selectSpeakingTopic_(code, topicId), callback);
    }
""" + marker
    if marker not in s:
        raise SystemExit('doGet marker not found')
    s = s.replace(marker, insertion, 1)

if 'function getSpeakingTopics_' not in s:
    marker = 'function normaliseCode_(v)'
    funcs = r'''
function speakingTopicState_(sheet, code) {
  const last = sheet.getLastRow();
  if (last < 2) return {takenIds:[], currentTopicId:''};
  const rows = sheet.getRange(2,1,last-1,SPEAKING_TOPIC_HEADERS.length).getValues();
  const takenIds = [];
  let currentTopicId = '';
  rows.forEach(r => {
    const id = safe_(r[0]).trim().toUpperCase();
    const owner = String(r[3]).trim().padStart(4,'0');
    if (id && owner) takenIds.push(id);
    if (owner === code) currentTopicId = id;
  });
  return {takenIds:[...new Set(takenIds)], currentTopicId};
}

function getSpeakingTopics_(code) {
  if (!/^\d{4}$/.test(code)) return {ok:false, message:'Invalid profile.'};
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const registry = ensureSheet_(ss, 'Student Registry', REGISTRY_HEADERS);
  const student = findStudentByCode_(registry, code);
  if (!student || !student.active) return {ok:false, message:'Student profile not recognised.'};
  const sheet = ensureSheet_(ss, 'Speaking Topics', SPEAKING_TOPIC_HEADERS);
  const state = speakingTopicState_(sheet, code);
  return {ok:true, takenIds:state.takenIds, currentTopicId:state.currentTopicId};
}

function selectSpeakingTopic_(code, topicId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!/^\d{4}$/.test(code)) return {ok:false, message:'Invalid profile.'};
    const topic = SPEAKING_TOPIC_CATALOG.find(t => t.id === topicId);
    if (!topic) return {ok:false, message:'Topic not recognised.'};

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const registry = ensureSheet_(ss, 'Student Registry', REGISTRY_HEADERS);
    const student = findStudentByCode_(registry, code);
    if (!student || !student.active) return {ok:false, message:'Student profile not recognised.'};
    if (String(student.classroom).toLowerCase() === 'teacher') return {ok:false, message:'Teacher profiles cannot reserve a student topic.'};

    const sheet = ensureSheet_(ss, 'Speaking Topics', SPEAKING_TOPIC_HEADERS);
    const history = ensureSheet_(ss, 'Speaking Topic History', SPEAKING_HISTORY_HEADERS);
    const last = sheet.getLastRow();
    const rows = last >= 2 ? sheet.getRange(2,1,last-1,SPEAKING_TOPIC_HEADERS.length).getValues() : [];

    let targetOwner = '';
    const ownRows = [];
    rows.forEach((r,i) => {
      const id = safe_(r[0]).trim().toUpperCase();
      const owner = String(r[3]).trim().padStart(4,'0');
      if (id === topicId) targetOwner = owner;
      if (owner === code) ownRows.push({row:i+2,id,category:safe_(r[1]),topic:safe_(r[2])});
    });

    if (targetOwner && targetOwner !== code) {
      const state = speakingTopicState_(sheet, code);
      return {ok:false, message:'That topic was just taken by another student. Please choose another available topic.', takenIds:state.takenIds, currentTopicId:state.currentTopicId};
    }

    const current = ownRows.find(r => r.id === topicId);
    if (current) {
      const state = speakingTopicState_(sheet, code);
      return {ok:true, unchanged:true, takenIds:state.takenIds, currentTopicId:topicId};
    }

    ownRows.sort((a,b)=>b.row-a.row).forEach(r => {
      history.appendRow([new Date(), student.code, student.name, student.classroom, 'Released / changed', r.id, r.category, r.topic]);
      sheet.deleteRow(r.row);
    });

    const now = new Date();
    sheet.appendRow([topic.id, topic.category, topic.topic, student.code, student.name, student.classroom, now, now]);
    history.appendRow([now, student.code, student.name, student.classroom, 'Selected', topic.id, topic.category, topic.topic]);
    SpreadsheetApp.flush();

    const state = speakingTopicState_(sheet, code);
    return {ok:true, takenIds:state.takenIds, currentTopicId:topic.id};
  } catch (err) {
    return {ok:false, message:String(err && err.message ? err.message : err)};
  } finally {
    lock.releaseLock();
  }
}

'''
    if marker not in s:
        raise SystemExit('Helper marker not found')
    s = s.replace(marker, funcs + marker, 1)

p.write_text(s, encoding='utf-8')
