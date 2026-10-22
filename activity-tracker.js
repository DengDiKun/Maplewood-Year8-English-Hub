(function(){
  const WEB_APP_URL='https://script.google.com/macros/s/AKfycbz0KfRexC2OtoWqAYwXOFbnGReN10dmyvqL-ex8d3rW0-PUFprZY77gEfVl4Lv_55Dh/exec';
  const IDLE_MS=120000, HEARTBEAT_MS=60000, TICK_MS=5000;
  let profile=null,started=false,sessionId='',lastInteraction=Date.now(),lastTick=Date.now();
  let activeMs=0,idleMs=0,awayMs=0,focusLosses=0,idle=false,away=document.hidden||!document.hasFocus();

  function readProfile(){try{return JSON.parse(localStorage.getItem('maplewood_y8_code_profile')||'{}')}catch(e){return{}}}
  function isStudent(p){return p&&/^\d{4}$/.test(String(p.code||''))&&p.name&&String(p.classroom||'').toLowerCase()!=='teacher'}
  function page(){return location.pathname.split('/').pop()||'index.html'}
  function payload(type){return {
    action:'activityevent',studentCode:profile.code,sessionId,eventType:type,page:page(),pageTitle:document.title||page(),
    clientTime:new Date().toISOString(),activeMs:Math.round(activeMs),idleMs:Math.round(idleMs),awayMs:Math.round(awayMs),focusLosses
  }}
  function send(type,beacon){
    if(!started||!profile)return;
    const body=JSON.stringify(payload(type));
    try{
      if(beacon&&navigator.sendBeacon){navigator.sendBeacon(WEB_APP_URL,new Blob([body],{type:'text/plain;charset=utf-8'}));}
      else fetch(WEB_APP_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body,keepalive:true});
    }catch(e){}
  }
  function tick(){
    const now=Date.now(),delta=Math.max(0,Math.min(now-lastTick,TICK_MS*2));lastTick=now;
    idle=now-lastInteraction>=IDLE_MS;
    away=document.hidden||!document.hasFocus();
    if(away)awayMs+=delta; else if(idle)idleMs+=delta; else activeMs+=delta;
  }
  function interact(){
    const wasIdle=idle;lastInteraction=Date.now();idle=false;
    if(wasIdle)send('idle_end');
  }
  function addBadge(){
    if(document.getElementById('mwTrackingBadge'))return;
    const style=document.createElement('style');style.textContent='#mwTrackingBadge{position:fixed;left:12px;bottom:12px;z-index:9998;background:rgba(11,47,71,.92);color:#fff;border-radius:999px;padding:7px 10px;font:700 11px/1.2 Inter,system-ui;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer;max-width:220px}#mwTrackingBadge.open{border-radius:14px;padding:10px 12px;line-height:1.4}';document.head.appendChild(style);
    const b=document.createElement('div');b.id='mwTrackingBadge';b.textContent='● Session tracking active';b.title='This Learning Hub records login/session time, Hub pages, idle time and time away from the Hub. It cannot see which external website you visit.';
    b.addEventListener('click',()=>{b.classList.toggle('open');b.textContent=b.classList.contains('open')?'Session tracking records time in the Hub, idle time, Hub pages and time away from the Hub. It cannot see the external website you visit.':'● Session tracking active'});
    document.body.appendChild(b);
  }
  function start(p){
    if(started||!isStudent(p))return;profile=p;started=true;sessionId='S-'+p.code+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);lastInteraction=Date.now();lastTick=Date.now();addBadge();send('session_start');send('page_view');
    ['mousemove','mousedown','keydown','touchstart','scroll','pointerdown'].forEach(ev=>window.addEventListener(ev,interact,{passive:true}));
    document.addEventListener('visibilitychange',()=>{tick();if(document.hidden){focusLosses++;send('away_start')}else{lastInteraction=Date.now();send('away_end')}});
    window.addEventListener('blur',()=>{tick();focusLosses++;send('focus_lost')});
    window.addEventListener('focus',()=>{tick();lastInteraction=Date.now();send('focus_return')});
    setInterval(()=>{const wasIdle=idle;tick();if(idle&&!wasIdle)send('idle_start')},TICK_MS);
    setInterval(()=>{tick();send('heartbeat')},HEARTBEAT_MS);
    window.addEventListener('pagehide',()=>{tick();send('page_exit',true)});
  }
  let attempts=0;const timer=setInterval(()=>{attempts++;const p=readProfile();if(isStudent(p)){clearInterval(timer);start(p)}else if(attempts>120)clearInterval(timer)},1000);
})();