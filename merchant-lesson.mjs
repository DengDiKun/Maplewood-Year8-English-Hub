import {MERCHANT_MARKUP,MERCHANT_CSS} from './merchant-content.mjs?v=merchant-1';
import {MERCHANT_CLAIMS,MERCHANT_EVIDENCE,MERCHANT_CORRECT,MERCHANT_EVIDENCE_KEY} from './merchant-data.mjs?v=merchant-1';

function element(tag,text) {const node=document.createElement(tag);if(text)node.textContent=text;return node;}
// Shadow DOM contains only authored lesson content and isolates its established
// styles. Authentication, server saves and marking remain with the dashboard.
export function createMerchantLesson() {
  const host=element('div'),shadow=host.attachShadow({mode:'open'});
  const style=element('style',MERCHANT_CSS+`
    :host{display:block;min-width:0}[hidden]{display:none!important}.lesson-body{overflow:visible;background:transparent}.wrap{padding:0 0 18px}.hero{min-height:0;grid-template-columns:1fr;padding:28px}.hero h1{font-size:clamp(2.2rem,5vw,3.8rem)}.hero:after{display:none}.guide{min-height:250px}.guide svg{max-height:250px}.bubble{font-size:.85rem}.sheet,.claims-layout{grid-template-columns:1fr}.suitors{grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))}.suitor select{max-width:100%}.stage{animation:none}.nav{position:static;transform:none;left:auto;bottom:auto;width:100%;margin:20px 0;justify-content:center;box-shadow:none}.nav button:focus-visible,button:focus-visible,a:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #8b621d;outline-offset:3px}.lesson-top{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:14px 0}.lesson-top h3{font:normal 1.6rem Georgia,serif;margin:0;color:var(--navy)}.lesson-top .xp{font-size:.85rem}.bar{margin-bottom:18px}fieldset{border:0;margin:0;padding:0;min-width:0}legend{color:var(--muted);line-height:1.6;padding:0 0 16px;font-size:.9rem}.lesson-actions{display:flex;flex-wrap:wrap;gap:10px}.lesson-status{color:#126b73;line-height:1.6;overflow-wrap:anywhere}.toast{position:static;opacity:1;transform:none;padding:12px;margin:16px 0;box-shadow:none}.toast:empty{display:none}.confetti{display:none}.lesson-feedback{border:1px solid var(--line);border-radius:18px;padding:18px;margin-top:22px}.lesson-feedback p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}.lesson-feedback button{min-height:44px;padding:10px 16px;border:1px solid var(--line);border-radius:999px;background:#edf4f4;color:var(--navy);font:inherit;cursor:pointer}.portrait{max-width:100%}.exit{grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr))}.paper,.extract,.suitor,.explain,.writing-prompt{min-width:0}.writing-grid{grid-template-columns:1fr}.final-hero{padding:26px}.final-hero h2{font-size:clamp(2rem,5vw,3rem)}.section-title h2{font-size:clamp(1.7rem,4vw,2.4rem)}@media(max-width:560px){.hero{padding:24px 18px}.hero h1{font-size:2.5rem}.guide{min-height:220px}.bubble{max-width:130px}.nav button{padding:10px 12px}.lesson-actions .btn{width:100%}}
  `);
  // The only HTML insertion is this checked-in static textbook/activity template.
  // Student answers and feedback are assigned with value/textContent below.
  const template=document.createElement('template');template.innerHTML=MERCHANT_MARKUP;
  const root=element('section');root.className='lesson-body';root.hidden=true;
  const top=element('div');top.className='lesson-top';
  const title=element('h3','8.1 The Merchant of Venice');title.tabIndex=-1;
  const points=element('span','Practice points: 0');points.className='xp';top.append(title,points);
  const bar=element('div');bar.className='bar';const progress=element('div');progress.className='fill';bar.append(progress);
  const fields=element('fieldset');fields.disabled=true;
  fields.append(element('legend','Complete Activities 4 and 5 and choose a final interpretation. Save a draft to continue later. Maximum 4,000 characters per answer.'),template.content.cloneNode(true));
  for(const id of ['q9','q10','q12']){const input=element('input');input.type='hidden';input.id=id;fields.append(input);}
  const nav=element('nav');nav.className='nav';nav.setAttribute('aria-label','Lesson pages');
  const previous=element('button','← Back'),next=element('button','Next →'),pageIndicator=element('span');pageIndicator.className='page-ind';
  previous.type=next.type='button';nav.append(previous,pageIndicator,next);
  const toast=element('p');toast.className='toast';toast.setAttribute('role','status');
  const status=element('p');status.className='lesson-status';status.dataset.activityStatus='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=element('div');actions.className='lesson-actions';
  for(const [label,key] of [['Save draft','saveDraft'],['Submit for teacher review','submit'],['Close activity','closeActivity']]){
    const button=element('button',label);button.type='button';button.className='btn '+(key==='submit'?'primary':'secondary');button.dataset[key]='';actions.append(button);
  }
  const feedback=element('section');feedback.dataset.feedback='';feedback.className='lesson-feedback';feedback.hidden=true;feedback.setAttribute('aria-label','Teacher feedback');
  root.append(top,bar,fields,nav,toast,status,actions,feedback);shadow.append(style,root);
  const $=id=>root.querySelector('#'+id),all=selector=>[...root.querySelectorAll(selector)];
  let page=1,claim='a';
  function showPage(number){page=Math.max(1,Math.min(5,number));all('.stage').forEach(stage=>stage.classList.toggle('active',Number(stage.dataset.page)===page));previous.disabled=page===1;next.disabled=page===5;pageIndicator.textContent=page+' / 5';progress.style.width=(page/5*100)+'%';}
  previous.addEventListener('click',()=>{showPage(page-1);title.focus();});next.addEventListener('click',()=>{showPage(page+1);title.focus();});
  const setAnswer=(id,value)=>{$(id).value=value;fields.dispatchEvent(new Event('input',{bubbles:true}));};
  const evidenceKey=()=>MERCHANT_EVIDENCE.find(item=>item.text===$('q10').value)?.key;
  function practicePoints(){
    const correct=MERCHANT_CORRECT.filter((answer,index)=>$('q'+(index+1)).value===answer).length;
    const strong=Boolean($('q9').value && MERCHANT_EVIDENCE_KEY[claim].includes(evidenceKey()));
    const total=correct*10+(strong?15:0)+($('q11').value.trim().length>=20?5:0);
    points.textContent='Practice points: '+total;$('finalXP').textContent=String(total);
  }
  function showChoice(){
    all('.claim').forEach(button=>{const selected=button.dataset.claim===claim;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
    all('.evidence').forEach(button=>{const selected=button.dataset.e===evidenceKey();button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    all('.exit button').forEach(button=>{const selected=button.textContent.trim()===$('q12').value;button.classList.toggle('chosen',selected);button.setAttribute('aria-pressed',String(selected));});
    const box=$('exitResponse');box.style.display=$('q12').value?'block':'none';box.textContent=$('q12').value?'Defend that interpretation using one quotation from the extract.':'';
    practicePoints();
  }
  for(const button of all('.claim'))button.addEventListener('click',()=>{
    claim=button.dataset.claim;setAnswer('q9',MERCHANT_CLAIMS.find(item=>item.key===claim).text);setAnswer('q10','');showChoice();$('evidenceFeedback').textContent='Now choose the strongest evidence for Claim '+claim.toUpperCase()+'.';
  });
  for(const button of all('.evidence'))button.addEventListener('click',()=>{
    setAnswer('q9',MERCHANT_CLAIMS.find(item=>item.key===claim).text);setAnswer('q10',MERCHANT_EVIDENCE.find(item=>item.key===button.dataset.e).text);showChoice();
    $('evidenceFeedback').textContent=MERCHANT_EVIDENCE_KEY[claim].includes(button.dataset.e)?'Strong evidence. Now explain how this line supports the view.':'This line is relevant to the scene, but it is not the strongest support for this view. Try again.';
  });
  for(const button of all('.exit button'))button.addEventListener('click',()=>{setAnswer('q12',button.textContent.trim());showChoice();});
  $('check4').addEventListener('click',()=>{
    all('.suitor').forEach((card,index)=>{const okA=$('q'+(index*2+1)).value===MERCHANT_CORRECT[index*2],okM=$('q'+(index*2+2)).value===MERCHANT_CORRECT[index*2+1],message=card.querySelector('.feedback');message.className='feedback '+(okA&&okM?'good':'bad');message.textContent=okA&&okM?'Excellent — both choices match the extract.':okA||okM?'Almost! One answer is correct. Re-read the scroll or the character’s words.':'Not yet. Look closely at what the character values or fears.';});practicePoints();
  });
  $('reset4').addEventListener('click',()=>{for(let i=1;i<=6;i++)setAnswer('q'+i,'');all('.feedback').forEach(node=>{node.textContent='';node.className='feedback';});practicePoints();});
  $('saveReflection').addEventListener('click',()=>{toast.textContent=$('q11').value.trim().length>=20?'Your explanation is ready to review. Choose Save draft below to save your work.':'Write at least one complete explanation first.';practicePoints();});
  $('celebrate').addEventListener('click',()=>{toast.textContent='Well done! Save your draft, or submit when every response is complete.';});
  $('resetAll').addEventListener('click',()=>{
    if(!confirm('Clear this draft’s answers? Choose Save draft afterwards to store the reset.'))return;
    for(let i=1;i<=12;i++)setAnswer('q'+i,'');restore();toast.textContent='Answers cleared on this page. Choose Save draft to save this change.';
  });
  function restore(){claim=MERCHANT_CLAIMS.find(item=>item.text===$('q9').value)?.key || 'a';showPage(1);showChoice();toast.textContent='';all('.feedback').forEach(node=>{node.textContent='';node.className='feedback';});$('evidenceFeedback').textContent='Select a claim and then tap the strongest evidence.';}
  return {host,root,restore};
}
