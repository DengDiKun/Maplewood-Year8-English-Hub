const DEFAULT_VOLUME=.25;
const SETTINGS_KEY='maplewood-hub-music-settings';

export function readMusicSettings(storage){
  try {
    const value=JSON.parse(storage?.getItem(SETTINGS_KEY) || 'null');
    if(value && typeof value==='object')return {
      volume:typeof value.volume==='number' && Number.isFinite(value.volume) && value.volume>=0 && value.volume<=1?value.volume:DEFAULT_VOLUME,
      muted:value.muted===true
    };
  } catch {}
  return {volume:DEFAULT_VOLUME,muted:false};
}

// Playback intent is never saved. Loading a page cannot start the soundtrack.
export function createMusicController({media,storage,onChange=()=>{},preparePlayback=()=>{},setOutput}){
  let state={...readMusicSettings(storage),phase:'idle',error:''};
  let generation=0,wanted=false,disposed=false;
  const listeners=new AbortController();
  const snapshot=()=>({...state});
  const emit=()=>{if(!disposed)onChange(snapshot());};
  const levels=()=>{
    if(setOutput)setOutput(state.volume,state.muted);
    else {media.volume=state.volume;media.muted=state.muted;}
  };
  function remember(){
    try {storage?.setItem(SETTINGS_KEY,JSON.stringify({volume:state.volume,muted:state.muted}));} catch {}
  }
  function pause(){
    if(disposed)return;
    generation++;wanted=false;state.phase='idle';state.error='';media.pause();emit();
  }
  function fail(){
    if(disposed)return;
    generation++;wanted=false;state.phase='idle';state.error='Music could not start. Check your connection and choose Play music to try again.';media.pause();emit();
  }
  async function play(){
    if(disposed || wanted)return;
    const request=++generation;wanted=true;state.phase='starting';state.error='';levels();emit();
    try {
      // Both calls begin inside the actual click, before any await/user-gesture loss.
      const prepared=preparePlayback(),started=media.play();
      await Promise.all([prepared,started]);
      if(disposed || request!==generation){if(disposed || !wanted)media.pause();return;}
      if(media.paused){wanted=false;state.phase='idle';}else state.phase='playing';
      emit();
    }catch {if(!disposed && request===generation)fail();}
  }
  media.addEventListener('playing',()=>{
    if(!wanted || disposed){media.pause();return;}
    if(state.phase!=='starting'){state.phase='playing';emit();}
  },{signal:listeners.signal});
  media.addEventListener('pause',()=>{
    if(disposed || !media.paused)return;
    generation++;wanted=false;state.phase='idle';emit();
  },{signal:listeners.signal});
  media.addEventListener('error',fail,{signal:listeners.signal});
  // Do not accept autoplay restored by a browser or an external media action.
  media.addEventListener('play',()=>{if(!wanted)media.pause();},{signal:listeners.signal});
  media.autoplay=false;media.loop=true;media.preload='none';media.pause();levels();emit();
  return {
    getState:snapshot,play,pause,
    setVolume(value){
      if(disposed || !Number.isFinite(value))return;
      state.volume=Math.min(1,Math.max(0,value));levels();remember();emit();
    },
    toggleMute(){if(disposed)return;state.muted=!state.muted;levels();remember();emit();},
    destroy(){
      if(disposed)return;
      generation++;wanted=false;state.phase='idle';listeners.abort();disposed=true;media.pause();
    }
  };
}
