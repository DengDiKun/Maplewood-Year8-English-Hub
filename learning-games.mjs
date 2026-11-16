import {VOCABULARY} from './vocabulary-bank.mjs?v=hub-complete-1';
import {shuffled,vocabularyQuestion,BLOCKS,rotate,collides,mergeBlocks,MAZE,mazeStep,memoryDeck} from './game-logic.mjs?v=hub-complete-1';

const STYLE=`:host{display:block;min-width:0;color:#17384b;font:16px/1.6 system-ui}*{box-sizing:border-box}h3,h4{font-family:Georgia,serif;color:#0b2f47;line-height:1.15}h3{font-size:2rem;margin:12px 0}h4{font-size:1.5rem;margin:12px 0}button,select{font:inherit}button{cursor:pointer;min-height:46px;padding:10px 17px;border:1px solid #b9d5d9;border-radius:14px;color:#0b2f47;background:#e8f3f2;font-weight:750}button:disabled{cursor:default;opacity:.6}button:focus-visible,select:focus-visible,canvas:focus-visible{outline:3px solid #a57117;outline-offset:3px}.primary{background:#0b2f47;color:#fff}.back{margin-bottom:12px}.eyebrow{color:#0d7e89;font-size:.75rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:14px;margin:22px 0}.card{padding:22px;border:1px solid #cadce0;background:linear-gradient(145deg,#fffdf5,#eaf5f4);border-radius:22px;min-width:0}.card p{font-size:.92rem;color:#526977}.symbol{display:block;font-size:2.7rem;color:#0e7e89}.note{font-size:.9rem;color:#526977}.toolbar{display:flex;align-items:end;gap:12px;flex-wrap:wrap;margin:20px 0}.toolbar label{display:flex;flex-direction:column;font-size:.85rem;font-weight:700;gap:5px}select{min-height:46px;border:1px solid #b7ccd1;border-radius:12px;padding:8px;background:white;color:#17384b;max-width:100%}.stats{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.stat{background:#e6f2ef;padding:8px 14px;border-radius:12px;font-weight:800}.question{border:1px solid #d3dfe0;border-radius:24px;padding:24px;background:#fffdf8}.word{font-size:clamp(1.8rem,5vw,2.7rem);font-family:Georgia,serif;font-weight:700;color:#0b2f47}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0}.choices button{text-align:left;font-weight:600}.correct{background:#daf0df!important;border-color:#388b5c!important}.wrong{background:#ffe5e3!important;border-color:#bb6262!important}.status{min-height:28px;white-space:pre-wrap;color:#146c72;font-weight:650}.missed{margin-top:18px}.missed span{display:inline-block;border-radius:999px;background:#fff0d4;padding:4px 10px;margin:4px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.play-grid{display:grid;grid-template-columns:minmax(170px,300px) minmax(160px,1fr);gap:20px;align-items:start}.play-grid.maze{grid-template-columns:minmax(220px,420px) minmax(150px,1fr)}canvas{display:block;max-width:100%;height:auto;border-radius:16px;background:#071c30;box-shadow:0 12px 28px #0b2f4722;touch-action:none}.game-side{padding:18px;background:#f2f8f5;border-radius:18px}.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:14px 0;max-width:300px}.controls button{padding:10px 5px;touch-action:manipulation}.instructions{font-size:.87rem;color:#526977}.memory{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:20px 0}.memory button{min-height:108px;padding:12px;background:#0b2f47;color:#fff;font-weight:650}.memory button.open{background:#fff5dc;color:#17384b}.memory button.matched{background:#d7eee3;color:#176a50}.badges{color:#916015;background:#fff2d2;padding:10px 14px;border-radius:14px}.result{border-radius:18px;padding:18px;background:#fff2d2;color:#76551c;font-weight:750}@media(max-width:600px){.play-grid,.play-grid.maze{grid-template-columns:1fr}.play-grid canvas{width:210px;margin:auto}.play-grid.maze canvas{width:100%;max-width:360px}.choices{grid-template-columns:1fr}.memory{grid-template-columns:repeat(2,minmax(0,1fr))}.memory button{font-size:.85rem;min-height:110px}.question{padding:18px}.toolbar{align-items:stretch}.toolbar label{flex:1;min-width:120px}.game-side{padding:14px}.card{padding:18px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}`;
function el(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
function button(text,action,cls){const e=el('button',text,cls);e.type='button';e.addEventListener('click',action);return e;}

// Extras never read or write student responses, identities or official marks.
// Every game owns and disposes its keyboard handlers, timers and animation frame.
export function mountLearningGames({root,mode='arcade',onBack}){
  const host=el('div'),shadow=host.attachShadow({mode:'open'}),screen=el('section');
  shadow.append(el('style',STYLE),screen);root.append(host);
  let disposeGame=()=>{},disposed=false;
  function clear(){disposeGame();disposeGame=()=>{};screen.replaceChildren();}
  function heading(name,back=onBack){screen.append(button('← '+(back===onBack?'Hub extras':'Learning Arcade'),back,'back'),el('div','Extra practice · Play at your own pace','eyebrow'));const h=el('h3',name);h.tabIndex=-1;screen.append(h);h.focus();}
  function arcade(){
    clear();heading('Learning Arcade');screen.append(el('p','Choose a game, challenge yourself and play again whenever you like.'),el('p','Games are optional extras. Their points belong to the current game session and are separate from lesson submissions and teacher marks.','note'));
    const cards=el('div',null,'cards');
    for(const [icon,title,description,open] of [['▦','Block Stacker','Fit falling blocks, clear lines and build your score.',blocks],['◉','Maze Chase','Collect the glowing dots, dodge the chasers and find every power star.',maze],['✦','Word Match','Match words with meanings. Try to finish in fewer moves.',memory]]){
      const card=el('article',null,'card');card.append(el('span',icon,'symbol'),el('h4',title),el('p',description),button('Play '+title,open,'primary'));cards.append(card);
    }
    screen.append(cards,button('Open Vocabulary Arena',vocabulary));
  }
  function vocabulary(){
    clear();heading('Unlimited Vocabulary Arena');
    screen.append(el('p','Choose a level and challenge type. Endless mode keeps generating questions; you can finish and start another round at any time.'));
    const toolbar=el('div',null,'toolbar'),selects={};
    for(const [id,label,options] of [['level','Level',[['ALL','All levels'],['A2','A2 · Building confidence'],['B1','B1 · Developing'],['B2','B2 · Challenge']]],['kind','Challenge',[['mixed','Mixed challenge'],['definition','Definitions'],['context','Sentence gaps'],['synonym','Synonyms'],['antonym','Antonyms'],['family','Word families']]],['length','Round',[['endless','Endless'],['10','10 questions'],['20','20 questions']]]]){
      const lab=el('label',label),select=el('select');select.setAttribute('aria-label',label);for(const [value,name] of options){const option=el('option',name);option.value=value;select.append(option);}selects[id]=select;lab.append(select);toolbar.append(lab);
    }
    const stats=el('div',null,'stats'),question=el('section',null,'question'),status=el('p',null,'status'),missed=el('div',null,'missed'),badge=el('p',null,'badges');status.setAttribute('role','status');
    screen.append(toolbar,stats,question,status,badge,missed);
    let pool=[],bag=[],current=null,index=0,total=0,score=0,streak=0,locked=false,ended=false,settings=null;
    const revisit=new Set();
    function update(){stats.replaceChildren(el('span','Answered: '+total,'stat'),el('span','Correct: '+score,'stat'),el('span','Streak: '+streak,'stat'),el('span','Accuracy: '+(total?Math.round(score/total*100):0)+'%','stat'));badge.textContent=streak>=10?'★ Word master · 10 in a row':streak>=5?'★ On a roll · 5 in a row':score>=10?'★ Explorer · 10 correct answers':'Build a streak to earn a practice badge.';missed.replaceChildren(el('h4','Words to revisit'));for(const w of revisit)missed.append(el('span',w));if(!revisit.size)missed.append(el('p','None yet. Keep exploring.','note'));}
    function finish(){ended=true;question.replaceChildren(el('h4','Round complete'),el('p',total?'You answered '+score+' of '+total+' correctly. Your accuracy is '+Math.round(score/total*100)+'%.':'No questions answered yet.'),button('Start another round',start,'primary'));status.textContent='Choose another level or challenge, or play again with new questions.';}
    function next(){
      if(disposed||ended)return;
      if(settings.length!=='endless'&&index>=Number(settings.length)){finish();return;}
      if(!bag.length)bag=shuffled(pool);
      const entry=bag.pop();current=vocabularyQuestion(entry,settings.kind,VOCABULARY);index++;locked=false;
      question.replaceChildren(el('div','Question '+index+' · '+current.level+' · '+current.kind,'eyebrow'),el('div',current.label,'word'),el('p',current.prompt));
      const choices=el('div',null,'choices'),nextButton=button('Next question →',next,'primary');nextButton.disabled=true;
      for(const value of current.options){const choice=button(value,()=>{
        if(locked)return;locked=true;total++;const correct=value===current.correct;if(correct){score++;streak++;choice.classList.add('correct');}else{streak=0;revisit.add(current.word);choice.classList.add('wrong');}
        for(const b of choices.children){b.disabled=true;if(b.textContent===current.correct)b.classList.add('correct');}
        status.textContent=(correct?'Correct. ':'The best answer is “'+current.correct+'”. ')+current.word+': '+current.definition+'.';nextButton.disabled=false;update();
      });choices.append(choice);}
      const actions=el('div',null,'actions');actions.append(nextButton,button('Finish round',finish));question.append(choices,actions);status.textContent='Choose your answer.';update();
    }
    function start(){settings=Object.fromEntries(Object.entries(selects).map(([key,value])=>[key,value.value]));pool=VOCABULARY.filter(w=>settings.level==='ALL'||w.l===settings.level);bag=[];index=total=score=streak=0;revisit.clear();ended=false;next();}
    toolbar.append(button('Start new round',start,'primary'));start();
  }
  function gameScreen(title,width,height){
    clear();heading(title,arcade);
    const layout=el('div',null,'play-grid'+(width===height?' maze':'')),canvas=el('canvas');canvas.width=width;canvas.height=height;canvas.tabIndex=0;canvas.setAttribute('aria-label',title+' playfield. Use the buttons below or keyboard controls.');
    const side=el('div',null,'game-side'),stats=el('p',null,'stat'),status=el('p','Choose Start when you are ready.','status');status.setAttribute('role','status');side.append(stats,status);layout.append(canvas,side);screen.append(layout);
    const controller=new AbortController();let frame=0;
    const bind=(target,name,action)=>target.addEventListener(name,action,{signal:controller.signal});
    const context=canvas.getContext('2d');
    disposeGame=()=>{controller.abort();cancelAnimationFrame(frame);};
    return {canvas,side,stats,status,context,bind,animate(fn){const loop=time=>{if(disposed||controller.signal.aborted)return;fn(time);frame=requestAnimationFrame(loop);};frame=requestAnimationFrame(loop);},focused:()=>Boolean(shadow.activeElement)};
  }
  function blocks(){
    const game=gameScreen('Block Stacker',280,560),{canvas,context:c,side,stats,status,bind}=game;
    const colors=['','#36b8bb','#e7b249','#d688b4','#8fc87f','#df7f69','#7d9cdd','#b99bdf'];
    let board,piece,nextIndex,score,lines,paused=true,over=false,last=0,elapsed=0;
    const randomPiece=()=>Math.floor(Math.random()*BLOCKS.length);
    function spawn(){const index=nextIndex;nextIndex=randomPiece();piece={x:3,y:-1,shape:BLOCKS[index].map(r=>[...r]),color:index+1};if(collides(board,piece)){over=true;paused=true;status.textContent='Game over. You cleared '+lines+' lines. Choose Restart to try again.';}update();}
    function update(){stats.textContent='Points '+score+' · Lines '+lines+' · Level '+(1+Math.floor(lines/10));}
    function reset(){board=Array.from({length:20},()=>Array(10).fill(0));score=lines=0;nextIndex=randomPiece();paused=true;over=false;elapsed=0;spawn();status.textContent='Stack blocks to make full lines. Choose Start.';draw();}
    function lock(){const result=mergeBlocks(board,piece);board=result.board;lines+=result.lines;score+=[0,100,300,500,800][result.lines]||0;if(result.overflow){over=true;paused=true;status.textContent='Game over. Choose Restart to play again.';return;}spawn();if(result.lines)status.textContent='Nice! '+result.lines+' line'+(result.lines>1?'s':'')+' cleared.';}
    function move(dx,dy){if(paused||over)return;const candidate={...piece,x:piece.x+dx,y:piece.y+dy};if(!collides(board,candidate)){piece=candidate;if(dy)score++;}else if(dy)lock();update();draw();}
    function turn(){if(paused||over)return;const shape=rotate(piece.shape);for(const kick of [0,-1,1,-2,2]){const candidate={...piece,shape,x:piece.x+kick};if(!collides(board,candidate)){piece=candidate;break;}}draw();}
    function drop(){if(paused||over)return;while(!collides(board,{...piece,y:piece.y+1})){piece.y++;score+=2;}lock();elapsed=0;update();draw();}
    function toggle(){if(over)return;paused=!paused;status.textContent=paused?'Paused. Choose Resume or press P.':'Game on. Arrow keys move, ↑ rotates and Space drops.';start.textContent=paused?'Resume':'Pause';canvas.focus();}
    function draw(){c.fillStyle='#071c30';c.fillRect(0,0,280,560);c.strokeStyle='#ffffff0b';for(let y=0;y<20;y++)for(let x=0;x<10;x++)c.strokeRect(x*28,y*28,28,28);const square=(x,y,color)=>{if(y<0)return;c.fillStyle=colors[color];c.fillRect(x*28+1,y*28+1,26,26);c.fillStyle='#ffffff26';c.fillRect(x*28+3,y*28+3,22,4);};board.forEach((row,y)=>row.forEach((v,x)=>{if(v)square(x,y,v);}));if(piece)piece.shape.forEach((row,y)=>row.forEach((v,x)=>{if(v)square(piece.x+x,piece.y+y,piece.color);}));if(paused){c.fillStyle='#071c30bd';c.fillRect(0,210,280,115);c.fillStyle='#f5dd95';c.textAlign='center';c.font='bold 22px system-ui';c.fillText(over?'GAME OVER':'READY / PAUSED',140,265);}}
    const start=button('Start',toggle,'primary'),actions=el('div',null,'actions');actions.append(start,button('Restart',()=>{reset();start.textContent='Start';}));side.append(actions,el('p','Keyboard: ← → move · ↑ rotate · ↓ soft drop · Space hard drop · P pause.','instructions'));
    const controls=el('div',null,'controls');for(const [label,action] of [['← Left',()=>move(-1,0)],['↻ Rotate',turn],['Right →',()=>move(1,0)],['↓ Down',()=>move(0,1)],['Drop',drop],['Pause',toggle]])controls.append(button(label,action));side.append(controls);
    bind(document,'keydown',event=>{if(!game.focused()||event.target?.matches('input,textarea,select'))return;const actions={ArrowLeft:()=>move(-1,0),ArrowRight:()=>move(1,0),ArrowDown:()=>move(0,1),ArrowUp:turn,' ':drop,p:toggle,P:toggle};if(actions[event.key]){event.preventDefault();actions[event.key]();}});
    bind(document,'visibilitychange',()=>{if(document.hidden&&!paused){paused=true;start.textContent='Resume';status.textContent='Paused while this tab is hidden.';}});
    reset();game.animate(time=>{const delta=last?Math.min(time-last,100):0;last=time;if(!paused&&!over){elapsed+=delta;if(elapsed>=Math.max(110,650-Math.floor(lines/10)*65)){elapsed=0;move(0,1);}}draw();});
  }
  function maze(){
    const game=gameScreen('Maze Chase',420,420),{canvas,context:c,side,stats,status,bind}=game;
    let player,direction,wanted,enemies,dots,powers,score,lives,paused=true,over=false,last=0,tick=0,powered=0,invulnerable=0;
    const directions=[{x:0,y:-1},{x:-1,y:0},{x:0,y:1},{x:1,y:0}],starts=[{x:13,y:13},{x:13,y:1},{x:1,y:13}];
    function reset(){player={x:1,y:1};direction=wanted={x:0,y:0};enemies=starts.map(p=>({...p}));dots=new Set();powers=new Set();MAZE.forEach((row,y)=>[...row].forEach((v,x)=>{if(v!== '#')dots.add(x+','+y);if(v==='o')powers.add(x+','+y);}));score=0;lives=3;powered=invulnerable=0;paused=true;over=false;tick=0;status.textContent='Collect every dot. Power stars let you send chasers back home for a few seconds.';update();draw(performance.now());}
    function update(){stats.textContent='Points '+score+' · Lives '+lives+' · Dots left '+dots.size;}
    function toggle(){if(over)return;paused=!paused;start.textContent=paused?'Resume':'Pause';status.textContent=paused?'Paused. Choose Resume to continue.':'Find the dots and avoid the chasers.';canvas.focus();}
    function aim(d){wanted=d;canvas.focus();}
    function step(now){
      const next=mazeStep(MAZE,player,wanted);if(next!==player)direction=wanted;player=mazeStep(MAZE,player,direction);
      const key=player.x+','+player.y;if(dots.delete(key))score+=10;if(powers.delete(key)){powered=now+6500;score+=50;status.textContent='Power star! Chasers are vulnerable for a few seconds.';}
      enemies=enemies.map((enemy,index)=>{
        const options=directions.map(d=>mazeStep(MAZE,enemy,d)).filter(p=>p!==enemy);
        if(!options.length)return enemy;
        const order=shuffled(options).sort((a,b)=>{const distance=p=>Math.abs(p.x-player.x)+Math.abs(p.y-player.y);return powered>now?distance(b)-distance(a):distance(a)-distance(b);});
        return Math.random()<.68?order[0]:options[Math.floor(Math.random()*options.length)];
      });
      for(let i=0;i<enemies.length;i++)if(enemies[i].x===player.x&&enemies[i].y===player.y){
        if(powered>now){enemies[i]={...starts[i]};score+=150;}else if(now>invulnerable){lives--;player={x:1,y:1};direction=wanted={x:0,y:0};enemies=starts.map(p=>({...p}));invulnerable=now+1800;if(lives<=0){over=true;paused=true;status.textContent='Game over. Your score is '+score+'. Choose Restart for another run.';}else status.textContent='One life lost. Choose a direction to continue.';}
      }
      if(!dots.size){over=true;paused=true;status.textContent='Maze cleared! You collected every dot. Choose Restart for another run.';}update();
    }
    function draw(now){c.fillStyle='#071c30';c.fillRect(0,0,420,420);MAZE.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='#'){c.fillStyle='#145568';c.fillRect(x*28+2,y*28+2,24,24);c.fillStyle='#207c8d';c.fillRect(x*28+3,y*28+3,22,3);}}));for(const key of dots){const [x,y]=key.split(',').map(Number);c.fillStyle=powers.has(key)?'#f9cc66':'#d7eee5';c.beginPath();c.arc(x*28+14,y*28+14,powers.has(key)?6:2.5,0,Math.PI*2);c.fill();}c.fillStyle=now<invulnerable&&Math.floor(now/160)%2?'#ffffff55':'#f4bf53';c.beginPath();c.arc(player.x*28+14,player.y*28+14,10,.22,Math.PI*2-.22);c.lineTo(player.x*28+14,player.y*28+14);c.fill();enemies.forEach((e,i)=>{c.fillStyle=powered>now?'#86a3ed':['#e18f9f','#95cf9c','#ab99d3'][i];c.fillRect(e.x*28+5,e.y*28+5,18,18);c.fillStyle='#fff';c.fillRect(e.x*28+8,e.y*28+9,4,5);c.fillRect(e.x*28+16,e.y*28+9,4,5);});if(paused){c.fillStyle='#071c30dd';c.fillRect(35,172,350,70);c.fillStyle='#f8d68b';c.font='bold 22px system-ui';c.textAlign='center';c.fillText(over?'RUN COMPLETE':'READY / PAUSED',210,214);}}
    const start=button('Start',toggle,'primary'),actions=el('div',null,'actions');actions.append(start,button('Restart',()=>{reset();start.textContent='Start';}));side.append(actions,el('p','Keyboard: arrow keys move · P pauses. Use the direction buttons on a phone.','instructions'));
    const controls=el('div',null,'controls');for(const [label,d]of [['↑ Up',directions[0]],['← Left',directions[1]],['↓ Down',directions[2]],['Right →',directions[3]]])controls.append(button(label,()=>aim(d)));side.append(controls);
    bind(document,'keydown',e=>{if(!game.focused())return;const keys={ArrowUp:directions[0],ArrowLeft:directions[1],ArrowDown:directions[2],ArrowRight:directions[3]};if(keys[e.key]){e.preventDefault();aim(keys[e.key]);}else if(e.key.toLowerCase()==='p'){e.preventDefault();toggle();}});
    bind(document,'visibilitychange',()=>{if(document.hidden&&!paused){paused=true;start.textContent='Resume';}});reset();game.animate(now=>{const dt=last?Math.min(now-last,100):0;last=now;if(!paused&&!over){tick+=dt;if(tick>=190){tick=0;step(now);}}draw(now);});
  }
  function memory(){
    clear();heading('Word Match',arcade);screen.append(el('p','Turn over two cards. Match a word to its meaning. Finish the board in as few moves as possible.'));
    const stats=el('p',null,'stat'),status=el('p','Choose your first card.','status'),grid=el('div',null,'memory');status.setAttribute('role','status');screen.append(stats,status,button('New board',memory),grid);
    const deck=memoryDeck(shuffled(VOCABULARY).slice(0,6)),cards=[],matched=new Set();let open=[],moves=0,waiting=false,timer=null;
    const update=()=>{stats.textContent='Pairs '+matched.size+' / 6 · Moves '+moves;};
    disposeGame=()=>{if(timer)clearTimeout(timer);};
    deck.forEach((item,index)=>{
      const card=button('✦ Card '+(index+1),()=>{
        if(waiting||open.includes(index)||matched.has(item.pair))return;
        card.textContent=item.text;card.classList.add('open');open.push(index);
        if(open.length===2){moves++;const [a,b]=open;if(deck[a].pair===deck[b].pair){matched.add(item.pair);for(const i of open){cards[i].classList.add('matched');cards[i].disabled=true;}open=[];status.textContent=matched.size===6?'Board complete! '+moves+' moves. Choose New board for another challenge.':'A match! Keep going.';}else{waiting=true;status.textContent='Not a match. Remember these cards.';timer=setTimeout(()=>{for(const i of open){cards[i].textContent='✦ Card '+(i+1);cards[i].classList.remove('open');}open=[];waiting=false;status.textContent='Choose another pair.';},1100);}update();}
      });cards.push(card);grid.append(card);
    });update();
  }
  if(mode==='vocabulary')vocabulary();else arcade();
  return {destroy(){disposed=true;clear();host.remove();}};
}
