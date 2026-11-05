import { markValues, parseMarking, markingError } from './marking-data.mjs?v=units-1-9-v1';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function renderPublished(root, value) {
  root.replaceChildren();
  if (!value) {root.append(element('p', 'No feedback has been published yet.')); return;}
  root.append(element('p', 'Published mark: ' + value.score + ' / ' + value.maxScore, 'marking-score'));
  root.append(element('p', value.feedback || 'No comments added.', 'marking-comment'));
  root.append(element('p', 'Published: ' + value.updatedAt.toDate().toLocaleString('en-MY'), 'marking-meta'));
}

// The activity ID is supplied by its caller. This editor is shared by every
// submitted activity as the remaining units are connected.
export function mountTeacherMarking({root, load, save, sessionKey}) {
  root.classList.add('marking-panel');
  const heading = element('h3', 'Marking and feedback');
  const help = element('p', 'Choose the total for this activity. Save a marking draft for staff, or publish the mark and comments to the student.');
  const published = element('section', null, 'marking-published');
  published.setAttribute('aria-label', 'Currently published feedback');
  const form = element('form', null, 'marking-form');
  const fields = element('fieldset');
  fields.append(element('legend', 'Overall mark and comments'));
  const scoreLabel = element('label', 'Mark awarded');
  const score = element('input'); score.type='number'; score.min='0'; score.max='1000'; score.step='1'; score.required=true;
  scoreLabel.append(score);
  const totalLabel = element('label', 'Out of');
  const total = element('input'); total.type='number'; total.min='1'; total.max='1000'; total.step='1'; total.required=true;
  totalLabel.append(total);
  const commentsLabel = element('label', 'Feedback to student (optional)');
  const comments = element('textarea'); comments.maxLength=4000; comments.rows=5;
  commentsLabel.append(comments);
  fields.append(scoreLabel, totalLabel, commentsLabel);
  const actions = element('div', null, 'marking-actions');
  const draftButton=element('button', 'Save marking draft', 'secondary refresh'); draftButton.type='submit';
  const publishButton=element('button', 'Publish feedback', 'secondary refresh'); publishButton.type='button';
  const refresh=element('button', 'Refresh review', 'text-button'); refresh.type='button';
  actions.append(draftButton, publishButton, refresh);
  const status=element('p', null, 'marking-status'); status.setAttribute('role','status');
  form.append(fields, actions); root.replaceChildren(heading, help, published, form, status);
  let generation=0, state=null, dirty=false, busy=false;
  const lock=value=>{busy=value; fields.disabled=value; draftButton.disabled=value; publishButton.disabled=value;};
  const current=(request,session)=>request===generation && session && session===sessionKey();
  const refreshReview=async(prefix='')=>{
    const request=++generation, session=sessionKey();
    state=null; dirty=false; score.value=''; total.value=''; comments.value=''; published.replaceChildren();
    lock(true); status.textContent=prefix+'Loading review…';
    if (!session) return;
    try {
      const result=await load();
      if(!current(request,session))return;
      state=result; const value=result.draft || result.published;
      if(value){score.value=String(value.score);total.value=String(value.maxScore);comments.value=value.feedback;}
      renderPublished(published,result.published);
      status.textContent=prefix+(result.draft ? 'Marking draft loaded. Draft edits remain private until published.' : 'Ready to mark this submission.');
      lock(false);
    } catch(error) {
      if(!current(request,session))return;
      busy=false;status.textContent=prefix+markingError(error)+' Use Refresh review before editing.';
    }
  };
  const canLeave=()=>{
    if(busy){status.textContent='Please wait for the current request to finish.';return false;}
    return !dirty || globalThis.confirm('Leave this review without saving your changes?');
  };
  fields.addEventListener('input',()=>{dirty=true;status.textContent='Unsaved marking changes.';});
  async function persist(publish) {
    if(!state||busy||!sessionKey()||!form.reportValidity())return;
    let values;
    try{values=markValues(score.valueAsNumber,total.valueAsNumber,comments.value);}
    catch(error){status.textContent=markingError(error);return;}
    if(publish && !globalThis.confirm('Publish this mark and feedback to the student?'))return;
    const request=++generation,session=sessionKey(),expected=state.versions;
    lock(true);status.textContent=publish?'Publishing feedback…':'Saving marking draft…';
    try{
      await save({values,publish,expected});
      if(!current(request,session))return;
      dirty=false;
      await refreshReview(publish?'Feedback published to the student. ':'Marking draft saved privately. ');
    }catch(error){
      if(!current(request,session))return;
      status.textContent=markingError(error);
      if(error?.code==='marking/conflict'){busy=false;state=null;}else lock(false);
    }
  }
  form.addEventListener('submit',event=>{event.preventDefault();void persist(false);});
  publishButton.addEventListener('click',()=>void persist(true));
  refresh.addEventListener('click',()=>{if(canLeave())void refreshReview();});
  const unload=event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}};
  globalThis.addEventListener('beforeunload',unload);
  void refreshReview();
  return {
    canLeave,
    hasUnsavedChanges:()=>dirty||busy,
    clear(){generation++;state=null;dirty=false;busy=false;root.replaceChildren();globalThis.removeEventListener('beforeunload',unload);}
  };
}

export function mountStudentFeedback({root, load, sessionKey}) {
  let generation=0, context=null;
  const clear=()=>{generation++;context=null;root.replaceChildren();root.hidden=true;};
  const run=async(value)=>{
    const request=++generation,session=sessionKey();context=value;
    root.replaceChildren();root.hidden=false;root.classList.add('marking-panel');
    root.append(element('h4','Teacher feedback'));
    const content=element('div'),status=element('p', 'Loading teacher feedback…','marking-status');
    const refresh=element('button','Refresh feedback','text-button');refresh.type='button';refresh.disabled=true;
    status.setAttribute('role','status');root.append(content,status,refresh);
    refresh.addEventListener('click',()=>{if(context)void run(context);});
    if(!session)return;
    try{
      const result=await load(value);
      const marking=parseMarking(result.snapshot,result.submissionUpdatedAt);
      if(request!==generation||session!==sessionKey())return;
      if(marking){renderPublished(content,marking);status.textContent='Your teacher has published feedback.';}
      else status.textContent='Your work is awaiting teacher feedback.';
    }catch{
      if(request!==generation||session!==sessionKey())return;
      content.replaceChildren();status.textContent='Teacher feedback could not be loaded. Check your connection and student access, then try Refresh feedback.';
    }finally{if(request===generation&&session===sessionKey())refresh.disabled=false;}
  };
  return {clear,show:value=>void run(value)};
}
