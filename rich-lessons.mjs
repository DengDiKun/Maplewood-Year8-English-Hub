import {RICH_CONTENT} from './rich-lessons-content.mjs?v=hub-complete-1';

function node(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
export function createRichLesson(definition){
  const material=RICH_CONTENT[definition.id];
  if(!material)throw new Error('Lesson material unavailable');
  const host=node('div'),shadow=host.attachShadow({mode:'open'}),root=node('section');
  root.className='lesson-body';root.hidden=true;
  const style=node('style',material.css+`
    :host{display:block;min-width:0}[hidden]{display:none!important}.lesson-body{background:transparent;overflow:visible;max-width:100%;color:#17384b}
    fieldset{border:0;padding:0;margin:0;min-width:0}legend{line-height:1.6;padding:12px 0;color:#526977;font-size:.9rem}
    main,.hero,.section,.card,.source,.mission,.work,.paper,.examMain{min-width:0;max-width:100%}.hero{padding:28px 18px;grid-template-columns:1fr}.hero h1{font-size:clamp(2.3rem,5vw,3.6rem)}
    .section{padding:30px 12px}.head{grid-template-columns:1fr}.pre-grid,.plan,.source-grid,.quote-grid,.paragraphs,.review-grid,.response-grid{grid-template-columns:1fr}
    .head h2{font-size:clamp(1.8rem,4vw,2.7rem)}.path-art{min-height:200px}.hero:after{display:none}.topbar,.sitebar,.progress-wrap,.progress-header,.sticky-progress,.progress-strip{position:static;top:auto}
    .identity-warning,.identity-warning.hidden,.floating,.submit-zone,.submit-panel,.submit-area,.result-panel,.results-panel{display:none!important}
    .question,.q,.answer,.card,.mission,.source,.paper,.note-table,.cell{min-width:0}textarea,input[type=text],select{max-width:100%;font:inherit}select{min-height:44px;border:1px solid #b7cdd2;border-radius:10px;padding:9px;background:#fff;color:#17384b}textarea{min-height:110px}
    .note-table{grid-template-columns:1fr}.cell.head{display:none}.note-table .cell:has(strong){background:#e7f2f1}.vote{display:grid;grid-template-columns:1fr}.chip[aria-pressed=true],.vote button[aria-pressed=true]{background:#0b2f47;color:white}
    .rich-top{font:normal 1.7rem Georgia,serif;color:#0b2f47;margin:18px 0}.rich-status{white-space:pre-wrap;line-height:1.6;color:#146b74;overflow-wrap:anywhere}
    .rich-actions{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.rich-actions button,.rich-feedback button{font:700 1rem system-ui;min-height:48px;border-radius:999px;padding:12px 20px;cursor:pointer;background:#e7f2f1;color:#0b2f47;border:1px solid #bad4d8}.rich-actions [data-submit]{background:#0b2f47;color:white}
    button:disabled,select:disabled,textarea:disabled{cursor:default}button:focus-visible,a:focus-visible,select:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #9f6c18;outline-offset:3px}
    .rich-feedback,.rich-guide{margin:22px 0;padding:20px;border:1px solid #c9dadd;border-radius:20px;background:#fff}.rich-feedback p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}.rich-guide .review{display:block;margin:0;padding:0;border:0;box-shadow:none}.rich-guide p{line-height:1.6}
    .hint-box.show{display:block}.rich-practice{padding:14px;background:#edf7f4;border-radius:14px;line-height:1.6}.footer{padding:20px}.vocab-grid,.matching,.match-grid,.text-grid,.exam-grid,.two-col{grid-template-columns:1fr}
    .match-chip,.word{cursor:default}.note-select{width:auto;max-width:100%}table{max-width:100%;font-size:.9rem}img,svg,video,iframe{max-width:100%}
    @media(max-width:560px){.rich-actions button{width:100%}.hero h1{font-size:2.4rem}.section{padding:22px 0}.pre,.source,.mission,.card{padding:16px}.step{grid-template-columns:1fr}.fork{width:220px}.s1{left:0}.s2{right:0}.plan{display:block}.plan .step{margin:6px 0}.question{padding:14px}.qtop{grid-template-columns:auto 1fr}.qmark{grid-column:2}.note-table .cell{padding:10px}.poem,.story{padding:14px}textarea,select{font-size:16px}.reader-grid,.section-grid{grid-template-columns:1fr}}
  `);
  const title=node('h3',definition.title);title.tabIndex=-1;title.className='rich-top';
  const fields=node('fieldset');fields.disabled=true;fields.append(node('legend','Save a draft whenever you need a break. Submit when the required responses are complete. Maximum 4,000 characters per response.'));
  // This is checked-in authored material. Answers are never inserted as HTML.
  const template=document.createElement('template');template.innerHTML=material.html;fields.append(template.content.cloneNode(true));
  for(const binding of material.bindings){
    if(binding.kind==='checkbox'){
      const control=fields.querySelector('#'+binding.id);control.id=binding.id+'-control';control.dataset.control=binding.id;
    }
    if(!fields.querySelector('#'+binding.id)){const input=node('input');input.type='hidden';input.id=binding.id;fields.append(input);}
  }
  const status=node('p');status.dataset.activityStatus='';status.className='rich-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=node('div');actions.className='rich-actions';
  for(const [label,key] of [['Save draft','saveDraft'],['Submit for teacher review','submit'],['Close activity','closeActivity']]){const button=node('button',label);button.type='button';button.dataset[key]='';actions.append(button);}
  const guide=node('section');guide.className='rich-guide';guide.hidden=true;guide.setAttribute('aria-label','Post-submission learning guide');
  if(material.review){const t=document.createElement('template');t.innerHTML=material.review;guide.append(t.content.cloneNode(true));}
  const practice=node('p');practice.className='rich-practice';guide.prepend(practice);
  const feedback=node('section');feedback.dataset.feedback='';feedback.className='rich-feedback';feedback.hidden=true;feedback.setAttribute('aria-label','Teacher feedback');
  root.append(title,fields,status,actions,guide,feedback);shadow.append(style,root);
  const input=id=>root.querySelector('#'+id),controls=id=>[...fields.querySelectorAll('[data-answer="'+id+'"]')];
  const changed=()=>fields.dispatchEvent(new Event('input',{bubbles:true}));
  const gateComplete=()=>material.gate.every(q=>input(q.id).value===q.correct);
  const preStatus=()=>root.querySelector('#preStatus');
  function updateWords(){
    for(const binding of material.bindings.filter(b=>b.kind==='text')){
      const value=input(binding.id),count=value.value.trim()?value.value.trim().split(/\s+/).length:0;
      const counter=value.parentElement.querySelector('.count,.counter');if(counter)counter.textContent=count+(definition.questions.find(q=>q.id===binding.id).minWords?' / 150 words':' words');
    }
    const progressText=root.querySelector('#progressText'),progressBar=root.querySelector('#progressBar');
    if(progressText){const required=definition.questions.filter(q=>q.required!==false),complete=required.filter(q=>input(q.id).value.trim() && (!q.minSelections || input(q.id).value.split('\n').length===q.minSelections)).length;progressText.textContent=complete+' / '+required.length+' responses completed';if(progressBar)progressBar.style.width=(complete/required.length*100)+'%';}
  }
  for(const binding of material.bindings){
    const id=binding.id;
    if(binding.kind==='checkbox'){
      const control=fields.querySelector('[data-control="'+id+'"]'),question=definition.questions.find(q=>q.id===id);
      control.addEventListener('change',()=>{input(id).value=question.options[control.checked?0:1];changed();if(!gateComplete()){const lesson=root.querySelector('#lessonContent');if(lesson){lesson.classList.add('locked');lesson.hidden=true;}}});
    }else if(['radio','checks'].includes(binding.kind)){
      for(const control of controls(id))control.addEventListener('change',()=>{
        if(binding.kind==='checks'){
          const selected=controls(id).filter(e=>e.checked),maximum=definition.questions.find(q=>q.id===id).minSelections;
          if(selected.length>maximum)control.checked=false;
          input(id).value=controls(id).filter(e=>e.checked).map(e=>e.dataset.choice).join('\n');
        }else input(id).value=control.value;
        changed();if(!gateComplete()){const lesson=root.querySelector('#lessonContent');if(lesson){lesson.classList.add('locked');lesson.hidden=true;}}
      });
    }else if(['multi','choice'].includes(binding.kind)){
      for(const button of controls(id))button.addEventListener('click',()=>{
        const selected=new Set(input(id).value.split('\n').filter(Boolean));
        if(binding.kind==='choice')selected.clear();
        selected.has(button.dataset.choice)?selected.delete(button.dataset.choice):selected.add(button.dataset.choice);
        input(id).value=controls(id).filter(e=>selected.has(e.dataset.choice)).map(e=>e.dataset.choice).join('\n');
        for(const b of controls(id)){const active=selected.has(b.dataset.choice);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));}changed();
      });
    }
  }
  fields.addEventListener('input',updateWords);
  if(definition.id==='extra-haze-v1'){
    const gaps=definition.questions.filter(q=>/^D[1-6] — Clear/.test(q.label)).map(q=>input(q.id));
    for(const gap of gaps)gap.addEventListener('change',()=>{if(gap.value)for(const other of gaps)if(other!==gap && other.value===gap.value)other.value='';changed();updateWords();});
  }
  for(const button of fields.querySelectorAll('.hint-btn'))button.addEventListener('click',()=>{const box=button.nextElementSibling;const shown=box.classList.toggle('show');button.setAttribute('aria-expanded',String(shown));});
  root.querySelector('#unlock')?.addEventListener('click',()=>{
    const ok=gateComplete(),lesson=root.querySelector('#lessonContent');lesson.classList.toggle('locked',!ok);lesson.hidden=!ok;
    preStatus().textContent=ok?'Pre-learning complete. The lesson is unlocked. Choose Save draft to keep these answers.':'Complete the video or fallback scenario and check all three quiz answers, then try again.';
    preStatus().className='pre-status '+(ok?'good':'bad');
  });
  function restore(){
    for(const binding of material.bindings){
      const id=binding.id,value=input(id).value;
      if(binding.kind==='checkbox'){
        const question=definition.questions.find(q=>q.id===id);input(id).value=value || question.options[1];fields.querySelector('[data-control="'+id+'"]').checked=input(id).value===question.options[0];
      }else if(['radio','checks','multi','choice'].includes(binding.kind)){
        const values=value.split('\n');
        for(const control of controls(id)){
          const active=values.includes(control.dataset.choice || control.value);
          if(control.tagName==='INPUT')control.checked=active;else{control.classList.toggle('selected',active);control.setAttribute('aria-pressed',String(active));}
        }
      }
    }
    if(material.gate.length){const complete=gateComplete();root.querySelector('#lessonContent').classList.toggle('locked',!complete);root.querySelector('#lessonContent').hidden=!complete;preStatus().textContent=complete?'Your completed pre-learning answers are restored.':'Watch the video or read the scenario, then complete the quick check.';}
    updateWords();
  }
  function stateChanged({submitted}){
    guide.hidden=!submitted;
    if(submitted){
      const checked=definition.questions.filter(q=>q.correct),correct=checked.filter(q=>input(q.id).value===q.correct).length;
      practice.textContent=checked.length?'Practice check: '+correct+' / '+checked.length+' fixed-choice responses match the guide. This practice check is separate from your teacher’s mark and comments.':'Use the learning guide to reflect on your method. Your teacher’s mark and comments appear below when published.';
      if(checked.length){const list=node('details'),summary=node('summary','Review fixed-choice answers');list.append(summary);for(const q of checked)list.append(node('p',q.label+'\nSuggested answer: '+q.correct));guide.querySelector('[data-practice-key]')?.remove();list.dataset.practiceKey='';guide.append(list);}
    }
  }
  return {host,root,restore,stateChanged};
}
