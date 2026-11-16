import {createCompanion,chapterSticker} from './hub-art.mjs?v=anime-1';

// A visual preference only. It never includes an account, response or grade.
const preferenceKey='maplewood-hub-reduced-motion';
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
let chosenReduced=false;
try {chosenReduced=localStorage.getItem(preferenceKey)==='true';} catch {}
const controls=[...document.querySelectorAll('[data-motion-toggle]')];
function syncMotion(){
  const reduced=systemMotion.matches || chosenReduced;
  document.documentElement.classList.toggle('motion-reduced',reduced);
  for(const control of controls){
    control.disabled=systemMotion.matches;
    control.setAttribute('aria-pressed',String(reduced));
    control.textContent=reduced?'Motion reduced':'Reduce motion';
    control.title=systemMotion.matches?'Your device is set to reduce motion.':'Pause or enable decorative animations. Game controls are unchanged.';
  }
}
for(const control of controls)control.addEventListener('click',()=>{
  chosenReduced=!chosenReduced;
  try {localStorage.setItem(preferenceKey,String(chosenReduced));} catch {}
  syncMotion();
});
systemMotion.addEventListener('change',syncMotion);syncMotion();
for(const holder of document.querySelectorAll('[data-maple]'))holder.replaceChildren(createCompanion(holder.dataset.maple || undefined));
for(const holder of document.querySelectorAll('[data-chapter-sticker]'))holder.replaceChildren(chapterSticker(holder.dataset.chapterSticker));
