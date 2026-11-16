import {UNITS} from './learning-catalogue.mjs?v=merchant-1';
import {mountStudentActivity} from './activity-responses.mjs?v=merchant-1';
import {mountStudentFeedback} from './marking-ui.mjs?v=merchant-1';
import {createMerchantLesson} from './merchant-lesson.mjs?v=merchant-1';

function node(tag,text,className) {
  const result=document.createElement(tag);
  if(text)result.textContent=text;
  if(className)result.className=className;
  return result;
}
function button(text,action,className='secondary') {
  const result=node('button',text,className);result.type='button';
  result.addEventListener('click',action);return result;
}
function heading(text) {const h=node('h3',text);h.tabIndex=-1;return h;}

// One verified session, one activity editor at a time. No legacy login keys,
// detached windows or client-supplied enrollment identifiers are used.
export function mountLearningUnits({root,challengeTemplate,load,save,loadFeedback,sessionKey}) {
  let profile=null,editor=null;
  const dispose=()=>{editor?.destroy();editor=null;};
  const clear=()=>{dispose();profile=null;root.replaceChildren();};
  const canLeave=()=>editor?.canLeave() ?? true;
  function showHome(focus=true) {
    dispose();root.replaceChildren();
    const title=heading('Choose a unit');
    const cards=node('div',null,'unit-grid');
    for(const unit of UNITS){
      const card=node('article',null,'unit-card');
      card.append(node('span','Unit '+unit.number,'unit-number'),node('h4',unit.title),
        node('p',unit.activities.length+' activities · Reading, writing, speaking and language'),
        button('Open Unit '+unit.number,()=>{if(canLeave())showUnit(unit);}));
      cards.append(card);
    }
    root.append(title,cards);if(focus)title.focus();
  }
  function navigation(unit) {
    const nav=node('nav',null,'learning-nav');nav.setAttribute('aria-label','Learning navigation');
    nav.append(button('All units',()=>{if(canLeave())showHome();}));
    if(unit)nav.append(button('Unit '+unit.number+' activities',()=>{if(canLeave())showUnit(unit);}));
    return nav;
  }
  function showUnit(unit,focusId) {
    dispose();root.replaceChildren(navigation());
    const title=heading('Unit '+unit.number+' — '+unit.title);
    const overview=node('section',null,'unit-overview');
    overview.append(title,node('p','Learner’s Book page '+unit.page+' · '+unit.types),
      node('p','For reading responses, use the textbook text assigned by your teacher. These prompts support your reading; the full textbook text is not included.'));
    const outcomes=node('details'),summary=node('summary','Unit outcomes and video');outcomes.append(summary);
    for(const [label,value] of [['Writing',unit.writing],['Speaking / listening',unit.speaking],['Language',unit.language]])outcomes.append(node('p',label+': '+value));
    const link=node('a',unit.video.label);
    link.href=unit.video.kind==='youtube'?'https://www.youtube.com/watch?v='+unit.video.id:unit.video.url;
    link.target='_blank';link.rel='noopener noreferrer';outcomes.append(link);overview.append(outcomes);
    const list=node('ul',null,'unit-activities');
    for(const definition of unit.activities){
      const row=node('li'),open=button(definition.title,()=>void openActivity(unit,definition));
      open.dataset.activityId=definition.id;row.append(open);list.append(row);
    }
    overview.append(node('h4','Activities'),node('p','Save a draft to continue later. Submit only when your answers are complete; submitted answers become read-only.'),list);
    const practice=node('details');practice.append(node('summary','Skill Lab — practice check'));
    practice.append(node('p','Practice only. This check is not saved or submitted to your teacher.'));
    const selects=[];
    unit.quiz.forEach((question,index)=>{
      const label=node('label',(index+1)+'. '+question[0]),select=node('select');
      const empty=node('option','Choose…');empty.value='';select.append(empty);
      for(const answer of question[2]){const option=node('option',answer);option.value=answer;select.append(option);}
      selects.push(select);label.append(select);practice.append(label);
    });
    const result=node('p',null,'practice-status');result.setAttribute('role','status');
    practice.append(button('Check practice',()=>{
      if(selects.some(select=>!select.value)){result.textContent='Choose an answer for each practice question.';return;}
      result.textContent='Practice score: '+selects.filter((select,index)=>select.value===unit.quiz[index][1]).length+' / '+selects.length+'.';
    }),result);overview.append(practice);root.append(overview);
    const target=focusId && [...list.querySelectorAll('button')].find(b=>b.dataset.activityId===focusId);
    (target || title).focus();
  }
  async function openActivity(unit,definition) {
    if(!profile || !sessionKey() || !canLeave())return;
    dispose();root.replaceChildren(navigation(unit));
    let activityRoot,merchant;
    if(definition.kind==='merchant') {merchant=createMerchantLesson();activityRoot=merchant.root;root.append(merchant.host);}
    else if(definition.kind==='challenge')activityRoot=challengeTemplate.content.firstElementChild.cloneNode(true);
    else {
      activityRoot=node('section',null,'learning-activity');activityRoot.hidden=true;
      activityRoot.append(heading(definition.title),node('p',definition.intro,'section-intro'));
      const fields=node('fieldset');fields.disabled=true;
      fields.append(node('legend','Complete every response before submitting. Maximum 4,000 characters per answer.','section-intro'));
      for(const question of definition.questions){
        const card=node('div',null,'q'),label=node('label',question.label),input=node('textarea');
        input.id=question.id;input.maxLength=4000;label.htmlFor=question.id;card.append(label,input);fields.append(card);
      }
      const status=node('p');status.dataset.activityStatus='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
      const actions=node('div',null,'activity-actions');
      for(const [label,dataKey,className] of [['Save draft','saveDraft','secondary'],['Submit for teacher review','submit','secondary'],['Close activity','closeActivity','text-button']]){
        const action=button(label,()=>{},className);action.dataset[dataKey]='';actions.append(action);
      }
      const feedback=node('section');feedback.dataset.feedback='';feedback.hidden=true;feedback.setAttribute('aria-label','Teacher feedback');
      activityRoot.append(fields,status,actions,feedback);
    }
    if(!merchant)root.append(activityRoot);
    const feedback=mountStudentFeedback({root:activityRoot.querySelector('[data-feedback]'),sessionKey,
      load:value=>loadFeedback(value,definition.id)});
    editor=mountStudentActivity({root:activityRoot,activityId:definition.id,sessionKey,feedback,
      load:value=>load(value,definition.id),save:(value,payload)=>save(value,payload,definition.id),
      onClose:()=>showUnit(unit,definition.id),afterRestore:merchant?.restore});
    await editor.open(profile);
  }
  return {clear,canLeave,hasUnsavedChanges:()=>editor?.hasUnsavedChanges() ?? false,
    show(value){clear();profile=value;showHome(false);}};
}
