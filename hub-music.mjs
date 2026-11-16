import {createMusicController} from './hub-music-state.mjs?v=music-1';

function node(tag,text,className){
  const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;
}
const NOTE='<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="18" cy="16" rx="3" ry="2.5"/></svg>';
const SETTINGS='<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg>';

export function bindMusicLifecycle({doc,win,media,pause,signal}){
  const listen=(target,event,handler,extra={})=>target.addEventListener(event,handler,{...extra,signal});
  listen(doc,'visibilitychange',()=>{if(doc.hidden)pause();});
  listen(win,'pagehide',pause);
  listen(doc,'play',event=>{if(event.target!==media)pause();},{capture:true});
  listen(win,'blur',()=>{
    let active=doc.activeElement;
    while(active?.shadowRoot?.activeElement)active=active.shadowRoot.activeElement;
    if(active?.tagName==='IFRAME')pause();
  });
  const main=doc.querySelector('main');let observer=null;
  if(main && doc.querySelector('#account')){
    let wasSignedIn=main.classList.contains('signed-in');
    observer=new win.MutationObserver(()=>{
      const signedIn=main.classList.contains('signed-in');if(wasSignedIn && !signedIn)pause();wasSignedIn=signedIn;
    });
    observer.observe(main,{attributes:true,attributeFilter:['class']});
  }
  return ()=>observer?.disconnect();
}

export function mountHubMusic({root=document.querySelector('.header-actions,.brand-actions')}={}){
  if(!root || root.querySelector('.hub-music'))return null;
  const doc=root.ownerDocument,win=doc.defaultView;
  const player=node('section',null,'hub-music');player.setAttribute('aria-label','Background music');
  const play=node('button',null,'hub-music-play');play.type='button';play.id='hub-music-play';
  const icon=node('span');icon.innerHTML=NOTE;const label=node('span','Play music');play.append(icon,label);
  const settings=node('details',null,'hub-music-settings'),summary=node('summary');
  summary.innerHTML=SETTINGS;summary.setAttribute('aria-label','Music options');summary.title='Music options';
  const panel=node('div',null,'hub-music-panel');panel.id='hub-music-options';
  panel.append(node('p','Maple After School','hub-track-title'),node('p','Original piano-inspired study loop.','hub-track-description'));
  const volumeLabel=node('label',null,'hub-music-volume-label'),volumeName=node('span','Volume'),output=node('output','25%');
  volumeLabel.htmlFor='hub-music-volume';volumeLabel.append(volumeName,output);
  const volume=node('input');volume.type='range';volume.id='hub-music-volume';volume.min='0';volume.max='100';volume.step='5';volume.value='25';volume.setAttribute('aria-label','Music volume');
  const mute=node('button','Mute','hub-music-mute');mute.type='button';mute.id='hub-music-mute';mute.setAttribute('aria-pressed','false');
  const stateText=node('p','Music is off. Choose Play music when you are ready.','hub-music-description');
  panel.append(volumeLabel,volume,mute,stateText,node('p','Music pauses when you leave this tab.','hub-music-small'));
  settings.append(summary,panel);
  const feedback=node('p',null,'hub-music-feedback');feedback.hidden=true;feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const media=node('audio');media.id='hub-background-audio';media.hidden=true;media.setAttribute('aria-hidden','true');media.setAttribute('playsinline','');media.preload='none';media.loop=true;media.autoplay=false;media.src=new URL('./assets/maple-study-loop.mp3',import.meta.url).href;
  player.append(play,settings,feedback,media);root.append(player);
  let context=null,gain=null,source=null,controller;
  const connections=new AbortController();
  let storage;try {storage=win.localStorage;} catch {}
  function setOutput(level,muted){
    media.muted=muted;
    if(gain){media.volume=1;gain.gain.setTargetAtTime(level,context.currentTime,.025);}
    else media.volume=level;
  }
  function preparePlayback(){
    // GainNode provides a real volume control on mobile browsers too.
    const AudioContext=win.AudioContext || win.webkitAudioContext;
    if(!AudioContext)return;
    if(!context){
      context=new AudioContext();source=context.createMediaElementSource(media);gain=context.createGain();
      gain.gain.value=controller.getState().volume;
      source.connect(gain);gain.connect(context.destination);
    }
    const state=controller.getState();setOutput(state.volume,state.muted);
    return context.state==='running'?undefined:context.resume();
  }
  function render(state){
    label.textContent=state.phase==='starting'?'Cancel music':state.phase==='playing'?'Pause music':'Play music';
    play.setAttribute('aria-pressed',String(state.phase==='playing'));
    play.setAttribute('aria-busy',String(state.phase==='starting'));
    player.dataset.state=state.phase;player.dataset.muted=String(state.muted);
    mute.textContent=state.muted?'Unmute':'Mute';mute.setAttribute('aria-pressed',String(state.muted));
    const percent=Math.round(state.volume*100);volume.value=String(percent);output.textContent=percent+'%';volume.setAttribute('aria-valuetext',percent+' percent');
    summary.title=state.muted?'Music options — currently muted':'Music options';
    stateText.textContent=state.phase==='starting'?'Starting music…':state.phase==='playing'?(state.muted?'Playing · muted.':'Playing · choose Pause music whenever you need quiet.'):'Music is off. Choose Play music when you are ready.';
    feedback.textContent=state.error;feedback.hidden=!state.error;
  }
  controller=createMusicController({media,storage,preparePlayback,setOutput,onChange:render});
  const listen=(target,event,handler,extra={})=>target.addEventListener(event,handler,{...extra,signal:connections.signal});
  listen(play,'click',()=>{if(controller.getState().phase==='idle')void controller.play();else controller.pause();});
  listen(mute,'click',()=>controller.toggleMute());
  listen(volume,'input',()=>controller.setVolume(Number(volume.value)/100));
  listen(settings,'keydown',event=>{if(event.key==='Escape'){settings.open=false;summary.focus();}});
  listen(doc,'pointerdown',event=>{if(!player.contains(event.target))settings.open=false;});
  const unbindLifecycle=bindMusicLifecycle({doc,win,media,pause:()=>controller.pause(),signal:connections.signal});
  return {destroy(){connections.abort();unbindLifecycle();controller.destroy();source?.disconnect();gain?.disconnect();void context?.close();player.remove();}};
}
