// Original, decorative chapter stickers. No profile, answer or grade data is used.
const drawings = {
  1: '<path d="M40 70V35m0 19C14 55 14 23 14 23s27-2 27 25m0-7C43 15 69 16 69 16s4 30-28 31"/><path d="M22 76h39M40 55l-15-18m17 2 15-11"/>',
  2: '<path d="m8 72 25-43 20 43H8Zm29-15 17-30 27 45H52M25 43l8 7 8-7"/><path d="M64 21v19m0-19 15-4v18m-15 5c-8-3-9 7-2 7 4 0 4-3 2-7m15-5c-8-3-9 7-2 7 4 0 4-3 2-7"/>',
  3: '<path d="M12 74q12-9 24 0t24 0 20 0M19 66q22-18 47 0M47 62q10-20-1-39m0 0q-14-14-26 0 17-2 26 0Zm0 0q15-15 28-2-16-2-28 2Zm0 0q1-19 16-16-12 6-16 16Z"/><circle cx="19" cy="15" r="6"/>',
  4: '<rect x="12" y="20" width="65" height="44" rx="7"/><path d="M33 77h26M46 64v13m-24-38 10-7-10-7m41 1-9 8 9 8M44 31l-6 16"/><path d="m75 8 2-5m7 12 6-1"/>',
  5: '<path d="M45 10 74 23v20c0 20-29 35-29 35S16 63 16 43V23Z"/><path d="m45 25 6 12 14 2-10 10 2 14-12-6-12 6 2-14-10-10 14-2Z"/>',
  6: '<path d="M21 61C-1 56 7 25 27 31 33 9 66 17 66 39c24 0 20 32 4 33H26c-13 1-17-7-17-7m22-37-4-12m31 8 7-11"/><circle cx="37" cy="43" r="3"/><circle cx="59" cy="43" r="3"/><path d="M35 56q12 12 24 0m-18 5v-5m11 5v-5"/>',
  7: '<path d="M29 75V49M61 75V48M18 76h57M11 49l18-28 19 28Zm33-2 17-31 20 31ZM24 25l5-12 6 12M54 24l7-15 8 15"/><path d="M41 74q7-14 10-17"/>',
  8: '<path d="M34 79V56q0-10-11-15L11 33m43 46V55q0-10 11-15l13-8M7 40 11 29l13 1m42-2h14l-1 14M44 50V15m-9 10 9-11 10 11"/>',
  9: '<path d="M12 21q17-8 33 4 16-12 33-4v51q-17-8-33 4-16-12-33-4ZM45 25v51M21 35l15 3m-15 9 15 3m18-12 14-3m-14 15 14-3"/><path d="m68 10 3-7m7 13 8-3"/>'
};
const extraDrawings = {
  vocabulary:'<path d="M13 18h30v28H13Zm35 0h29v28H48ZM30 51h30v28H30Z"/><path d="m20 39 7-16 7 16m-12-5h10m25-11v16m0-16h9q9 4 0 8H57m0 0h9q10 5 0 8h-9M48 58H36v14h12"/>',
  arcade:'<path d="M23 29h44c18 0 25 44 12 46-6 1-11-12-17-13H28c-5 0-13 15-18 12-12-6-2-45 13-45Z"/><path d="M28 39v18m-9-9h18m-3-19 4-10h13l4 10"/><circle cx="61" cy="44" r="3"/><circle cx="71" cy="54" r="3"/>',
  reading:'<path d="M16 13h43l16 16v49H16ZM59 13v18h16M27 43h35M27 53h25M27 63h30"/><path d="m26 23 3 3 7-8"/>',
  blocks:'<path d="M13 15h23v23H13Zm24 0h23v23H37ZM37 39h23v23H37Zm24 0h23v23H61ZM13 63h23v18H13Zm24 0h23v18H37Z"/>',
  maze:'<path d="M9 25V10h30m14 0h25v25M9 42v36h26m18 0h25V49M26 29h30v18H41v13"/><path d="M28 54a9 9 0 1 0 0 14l-8-7Z"/><circle cx="57" cy="62" r="2"/><circle cx="70" cy="62" r="2"/>',
  memory:'<rect x="10" y="15" width="32" height="53" rx="5" transform="rotate(-8 26 40)"/><rect x="48" y="19" width="32" height="53" rx="5" transform="rotate(8 64 45)"/><path d="m21 43 5-10 5 10-5 10Zm37 3 5-10 5 10-5 10Z"/>'
};

export function chapterSticker(key) {
  const span=document.createElement('span');
  span.className='chapter-sticker';
  span.setAttribute('aria-hidden','true');
  span.innerHTML='<svg viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">'+(drawings[key] || extraDrawings[key] || drawings[1])+'</svg>';
  return span;
}

const encouragements=[
  'One small step is still a step. You’ve got this.',
  'Spot one interesting word today. Make it yours.',
  'Your first draft is a beginning, not a finish line.',
  'Curious minds ask good questions. Keep asking.',
  'Take a breath. Read it again. A new idea might appear.'
];
export function createCompanion(message='Ready for your next chapter?') {
  const stage=document.createElement('div');stage.className='maple-companion';
  const bubble=document.createElement('p');bubble.className='maple-bubble';bubble.textContent=message;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
  const character=document.createElement('button');character.type='button';character.className='maple-character';character.setAttribute('aria-label','Get encouragement from Maple');
  const image=document.createElement('img');image.src=new URL('./assets/maple-mascot.webp',import.meta.url).href;image.width=585;image.height=640;image.alt='Maple, an anime-style fox holding an open book';image.decoding='async';
  character.append(image);let index=0;
  character.addEventListener('click',()=>{bubble.textContent=encouragements[index++ % encouragements.length];character.classList.remove('maple-cheer');void character.offsetWidth;character.classList.add('maple-cheer');});
  character.addEventListener('animationend',event=>{if(event.animationName==='maple-cheer')character.classList.remove('maple-cheer');});
  stage.append(bubble,character);return stage;
}
