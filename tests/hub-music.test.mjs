import test from 'node:test';
import assert from 'node:assert/strict';
import {readMusicSettings,createMusicController} from '../hub-music-state.mjs';
import {bindMusicLifecycle} from '../hub-music.mjs';

class Media extends EventTarget {
  paused=true;volume=1;muted=false;playCalls=0;pauseCalls=0;
  start=()=>{this.paused=false;this.dispatchEvent(new Event('play'));this.dispatchEvent(new Event('playing'));return Promise.resolve();};
  play(){this.playCalls++;return this.start();}
  pause(){this.pauseCalls++;const changed=!this.paused;this.paused=true;if(changed)this.dispatchEvent(new Event('pause'));}
}
function storage(value){return {value,writes:[],getItem(){return this.value;},setItem(key,next){this.writes.push({key,value:next});this.value=next;}};}

test('saved volume is validated and a new player stays off even if storage says playing',()=>{
  for(const value of [null,'bad JSON','{"volume":null}','{"volume":2}','{"volume":"0.8"}'])assert.equal(readMusicSettings(storage(value)).volume,.25);
  assert.deepEqual(readMusicSettings({getItem(){throw Error('blocked');}}),{volume:.25,muted:false});
  const media=new Media(),controller=createMusicController({media,storage:storage('{"volume":0.6,"muted":true,"playing":true}')});
  assert.equal(controller.getState().volume,.6);assert.equal(controller.getState().muted,true);assert.equal(controller.getState().phase,'idle');assert.equal(media.paused,true);assert.equal(media.autoplay,false);assert.equal(media.preload,'none');assert.equal(media.playCalls,0);controller.destroy();
});
test('only an explicit play starts music; volume and mute save preferences without playback intent',async()=>{
  const media=new Media(),saved=storage(null),controller=createMusicController({media,storage:saved});
  controller.setVolume(.45);controller.toggleMute();assert.equal(media.playCalls,0);assert.equal(media.volume,.45);assert.equal(media.muted,true);
  await controller.play();assert.equal(media.playCalls,1);assert.equal(controller.getState().phase,'playing');assert.equal(media.paused,false);
  controller.pause();assert.equal(media.paused,true);assert.equal(controller.getState().phase,'idle');
  assert.deepEqual(JSON.parse(saved.value),{volume:.45,muted:true});controller.destroy();
});
test('cancelling a pending start cannot allow a late play result to turn music back on',async()=>{
  const media=new Media();let finish;
  media.start=()=>new Promise(resolve=>{finish=()=>{media.paused=false;media.dispatchEvent(new Event('playing'));resolve();};});
  const controller=createMusicController({media}),pending=controller.play();assert.equal(controller.getState().phase,'starting');controller.pause();finish();await pending;
  assert.equal(media.paused,true);assert.equal(controller.getState().phase,'idle');controller.destroy();
});
test('a blocked or failed play remains off, explains the failure and can be retried',async()=>{
  const media=new Media();media.start=()=>Promise.reject(Error('browser or network'));const controller=createMusicController({media});
  await controller.play();assert.equal(media.paused,true);assert.equal(controller.getState().phase,'idle');assert.match(controller.getState().error,/choose Play music/);
  media.start=()=>{media.paused=false;media.dispatchEvent(new Event('playing'));return Promise.resolve();};
  await controller.play();assert.equal(controller.getState().phase,'playing');assert.equal(controller.getState().error,'');controller.destroy();
});
test('external pauses and errors update the player, while unsolicited play is stopped',async()=>{
  const media=new Media(),controller=createMusicController({media});
  await controller.play();media.pause();assert.equal(controller.getState().phase,'idle');
  media.paused=false;media.dispatchEvent(new Event('play'));assert.equal(media.paused,true);assert.equal(controller.getState().phase,'idle');
  await controller.play();media.dispatchEvent(new Event('error'));assert.equal(media.paused,true);assert.match(controller.getState().error,/could not start/);controller.destroy();
});
test('destroy stops pending playback and leaves no controller that can restart it',async()=>{
  const media=new Media();let finish;media.start=()=>new Promise(resolve=>{finish=()=>{media.paused=false;resolve();};});
  let updates=0;const controller=createMusicController({media,onChange:()=>updates++}),pending=controller.play();controller.destroy();const before=updates;finish();await pending;await controller.play();controller.setVolume(.9);controller.toggleMute();
  assert.equal(media.paused,true);assert.equal(media.playCalls,1);assert.equal(updates,before);
});
test('hiding or leaving a page pauses music, and returning cannot resume it',async()=>{
  const media=new Media(),controller=createMusicController({media}),doc=new EventTarget(),win=new EventTarget(),events=new AbortController();
  doc.hidden=false;doc.querySelector=()=>null;doc.activeElement=null;
  const unbind=bindMusicLifecycle({doc,win,media,pause:()=>controller.pause(),signal:events.signal});
  await controller.play();doc.dispatchEvent(new Event('visibilitychange'));assert.equal(media.paused,false);
  doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(media.paused,true);
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(media.paused,true);
  await controller.play();win.dispatchEvent(new Event('pagehide'));assert.equal(media.paused,true);
  events.abort();unbind();controller.destroy();
});
test('embedded-video focus and sign-out pause the player without restarting on sign-in',async()=>{
  const media=new Media(),controller=createMusicController({media}),doc=new EventTarget(),win=new EventTarget(),events=new AbortController();
  let signedIn=true,notify;
  const main={classList:{contains:()=>signedIn}};doc.querySelector=selector=>selector==='main'?main:{};doc.hidden=false;doc.activeElement={shadowRoot:{activeElement:{tagName:'IFRAME'}}};
  win.MutationObserver=class {constructor(callback){notify=callback;}observe(){}disconnect(){}};
  const unbind=bindMusicLifecycle({doc,win,media,pause:()=>controller.pause(),signal:events.signal});
  await controller.play();win.dispatchEvent(new Event('blur'));assert.equal(media.paused,true);
  await controller.play();signedIn=false;notify();assert.equal(media.paused,true);
  signedIn=true;notify();assert.equal(media.paused,true);
  events.abort();unbind();controller.destroy();
});
