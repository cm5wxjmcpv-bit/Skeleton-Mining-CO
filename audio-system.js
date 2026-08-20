(function(){
  'use strict';

  const SETTINGS_KEY='skeletonMiningAudioSettings';
  const defaults={enabled:true,musicVolume:0.50,sfxVolume:0.34};
  let settings={...defaults};
  try{settings={...defaults,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}catch{}
  if(settings.musicVolume<0.50){settings.musicVolume=0.50;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}}

  let ctx=null, master=null, musicBus=null, sfxBus=null;
  let interacted=false, currentMusic='home', musicTimer=null, nextStepTime=0, musicStep=0;
  const lastPlayed={};

  function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}}
  function ensureAudio(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return false;
      ctx=new AC();
      master=ctx.createGain();musicBus=ctx.createGain();sfxBus=ctx.createGain();
      musicBus.gain.value=settings.musicVolume;sfxBus.gain.value=settings.sfxVolume;master.gain.value=1;
      musicBus.connect(master);sfxBus.connect(master);master.connect(ctx.destination);
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return true;
  }
  function setEnabled(value){
    settings.enabled=!!value;saveSettings();renderToggle();
    if(!settings.enabled){stopMusic();if(master)master.gain.setTargetAtTime(0,ctx.currentTime,.02);}
    else if(ensureAudio()){master.gain.setTargetAtTime(1,ctx.currentTime,.02);syncMusic(true);}
  }
  function gainNode(bus,when,attack,peak,releaseAt,release){
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),when+attack);
    g.gain.setValueAtTime(Math.max(.0002,peak),releaseAt);g.gain.exponentialRampToValueAtTime(.0001,releaseAt+release);g.connect(bus);return g;
  }
  function tone(freq,dur,vol=.2,type='sine',when=null,attack=.006,release=.08){
    if(!settings.enabled||!ensureAudio())return;
    when=when??ctx.currentTime;
    const o=ctx.createOscillator(),g=gainNode(sfxBus,when,attack,vol,Math.max(when+attack+.005,when+dur-release),release);
    o.type=type;o.frequency.setValueAtTime(freq,when);o.connect(g);o.start(when);o.stop(when+dur+.02);
  }
  function musicTone(freq,dur,vol=.08,type='triangle',when=null,attack=.015,release=.08){
    if(!settings.enabled||!ensureAudio())return;
    when=when??ctx.currentTime;
    const o=ctx.createOscillator(),g=gainNode(musicBus,when,attack,vol,Math.max(when+attack+.005,when+dur-release),release);
    o.type=type;o.frequency.setValueAtTime(freq,when);o.connect(g);o.start(when);o.stop(when+dur+.02);
  }
  function noiseBurst(dur=.12,vol=.2,when=null,lowpass=1000,highpass=0){
    if(!settings.enabled||!ensureAudio())return;
    when=when??ctx.currentTime;
    const length=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,length,ctx.sampleRate),data=buf.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/length*4);
    const src=ctx.createBufferSource();src.buffer=buf;
    let node=src;
    if(lowpass){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=lowpass;node.connect(f);node=f;}
    if(highpass){const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=highpass;node.connect(f);node=f;}
    const g=gainNode(sfxBus,when,.002,vol,when+Math.max(.01,dur-.04),.04);node.connect(g);src.start(when);src.stop(when+dur+.02);
  }
  function sweep(from,to,dur,vol=.2,type='sine',when=null){
    if(!settings.enabled||!ensureAudio())return;
    when=when??ctx.currentTime;
    const o=ctx.createOscillator(),g=gainNode(sfxBus,when,.004,vol,when+Math.max(.01,dur-.08),.08);
    o.type=type;o.frequency.setValueAtTime(from,when);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),when+dur);o.connect(g);o.start(when);o.stop(when+dur+.02);
  }
  function throttled(name,ms){const n=performance.now();if(ms&&n-(lastPlayed[name]||0)<ms)return true;lastPlayed[name]=n;return false;}

  const SFX={
    pickaxe_hit_stone(options={}){
      if(throttled('pickaxe_hit_stone',options.throttle??80)||!ensureAudio())return;
      const w=ctx.currentTime,rate=options.rate||1;
      sweep(185*rate,62*rate,.16,.24,'sine',w);
      tone(205*rate,.095,.115,'sine',w,.002,.05);
      noiseBurst(.13,.19,w,720,70);
      setTimeout(()=>noiseBurst(.045,.055,null,540,120),38);
    },
    pickaxe_hit_ore(){if(throttled('pickaxe_hit_ore',80)||!ensureAudio())return;SFX.pickaxe_hit_stone({throttle:0});tone(520,.16,.055,'sine',ctx.currentTime+.025,.005,.10);},
    block_break(){if(throttled('block_break',55)||!ensureAudio())return;const w=ctx.currentTime;noiseBurst(.22,.15,w,560,35);sweep(105,48,.18,.11,'sine',w);},
    ore_collect(){if(throttled('ore_collect',75)||!ensureAudio())return;const w=ctx.currentTime;[523.25,659.25,783.99].forEach((f,i)=>tone(f,.20,.075,'sine',w+i*.055,.012,.10));},
    cash_gain(){if(throttled('cash_gain',80)||!ensureAudio())return;const w=ctx.currentTime;tone(880,.14,.06,'sine',w,.01,.08);tone(1174.66,.16,.065,'sine',w+.06,.01,.09);},
    xp_gain(){if(throttled('xp_gain',70)||!ensureAudio())return;const w=ctx.currentTime;tone(587.33,.12,.05,'triangle',w,.01,.07);tone(783.99,.16,.055,'triangle',w+.045,.01,.09);},
    level_up(){
      if(throttled('level_up',450)||!ensureAudio())return;
      const w=ctx.currentTime+.01;const notes=[261.63,329.63,392,523.25],starts=[0,.20,.40,.62];
      notes.forEach((f,i)=>tone(f,.47,[.055,.058,.061,.072][i],'sine',w+starts[i],.045,.18));
      [261.63,329.63,392].forEach((f,i)=>tone(f,.48,.025,'sine',w+.68+i*.012,.055,.20));
      tone(130.81,.50,.026,'sine',w+.62,.05,.22);
    },
    skill_point_ready(){if(throttled('skill_point_ready',250)||!ensureAudio())return;const w=ctx.currentTime;[659.25,783.99,987.77].forEach((f,i)=>tone(f,.34,.045,'sine',w+i*.10,.025,.15));},
    key_found(){if(throttled('key_found',280)||!ensureAudio())return;const w=ctx.currentTime;[392,523.25,659.25,783.99].forEach((f,i)=>tone(f,.30,.055,'triangle',w+i*.075,.012,.12));},
    button_click(){if(throttled('button_click',32)||!ensureAudio())return;tone(310,.055,.035,'sine',ctx.currentTime,.002,.035);},
    start_mining(){if(throttled('start_mining',300)||!ensureAudio())return;const w=ctx.currentTime;sweep(115,380,.42,.09,'sine',w);noiseBurst(.10,.06,w,650,80);},
    end_mining(){if(throttled('end_mining',300)||!ensureAudio())return;sweep(390,105,.42,.085,'sine',ctx.currentTime);},
    lottery_scratch(){if(throttled('lottery_scratch',250)||!ensureAudio())return;const w=ctx.currentTime;for(let i=0;i<7;i++)noiseBurst(.07,.045,w+i*.055,1600,500);},
    lottery_win(){if(throttled('lottery_win',350)||!ensureAudio())return;const w=ctx.currentTime;[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>tone(f,.30,.055,'sine',w+i*.065,.012,.13));}
  };
  function playSfx(name,volume=1,options={}){
    if(!settings.enabled||!interacted)return;
    const fn=SFX[name];if(!fn)return;
    if(name==='pickaxe_hit_stone')fn(options);else fn();
  }

  const mineMelody=[146.83,174.61,220,174.61,130.81,146.83,174.61,164.81];
  const mineBass=[73.42,65.41,61.74,69.30];
  const storeMelody=[523.25,659.25,783.99,659.25,523.25,783.99,659.25,783.99];
  const titleNotes=[164.81,196,130.81,146.83,164.81,196,146.83,164.81];

  function activeScreenId(){return document.querySelector('.active-screen')?.id||'';}
  function musicForScreen(id){if(id==='homeScreen')return 'home';if(id==='storeScreen'||id==='generalStoreScreen')return 'store';return 'mine';}
  function scheduleStep(when){
    if(!settings.enabled||!ctx)return;
    if(currentMusic==='mine'){
      const bpm=98,beat=60/bpm,idx=musicStep%8,bar=Math.floor((musicStep%16)/4);
      musicTone(mineMelody[idx],Math.min(.28,beat*.46),.034,'triangle',when,.012,.10);
      musicTone(mineBass[bar%4],beat*.72,.042,'sine',when,.025,.12);
      if(idx%2===1)noiseMusicSnare(when+.02,.010);
      if(idx===0||idx===4)musicTone(mineBass[bar%4]/2,beat*.42,.030,'sine',when,.008,.11);
      if(idx===6)musicTone(mineMelody[idx]*2,.42,.012,'sine',when+.05,.07,.20);
      nextStepTime+=beat;
    }else if(currentMusic==='store'){
      const bpm=126,stepDur=(60/bpm)/2,idx=musicStep%8;
      musicTone(storeMelody[idx],.22,.029,'triangle',when,.008,.07);
      if(idx%2===0)musicTone([130.81,110,98,87.31][Math.floor((musicStep%32)/8)],.30,.03,'sine',when,.015,.10);
      nextStepTime+=stepDur;
    }else{
      const bpm=80,beat=60/bpm,idx=musicStep%8;
      if(idx%2===0)musicTone(titleNotes[idx],.82,.050,'sine',when,.10,.22);
      if(idx===0)musicTone(titleNotes[idx]/2,beat*3.5,.045,'sine',when,.18,.35);
      nextStepTime+=beat;
    }
    musicStep++;
  }
  function noiseMusicHat(when,vol){
    const length=Math.floor(ctx.sampleRate*.045),buf=ctx.createBuffer(1,length,ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const s=ctx.createBufferSource();s.buffer=buf;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=4200;const g=ctx.createGain();g.gain.setValueAtTime(vol,when);g.gain.exponentialRampToValueAtTime(.0001,when+.045);s.connect(f);f.connect(g);g.connect(musicBus);s.start(when);s.stop(when+.05);
  }
  function noiseMusicSnare(when,vol){
    const length=Math.floor(ctx.sampleRate*.09),buf=ctx.createBuffer(1,length,ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/length*5);
    const s=ctx.createBufferSource();s.buffer=buf;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1500;const g=ctx.createGain();g.gain.setValueAtTime(vol,when);g.gain.exponentialRampToValueAtTime(.0001,when+.09);s.connect(f);f.connect(g);g.connect(musicBus);s.start(when);s.stop(when+.10);
  }
  function scheduler(){
    if(!ctx||!settings.enabled||document.hidden)return;
    while(nextStepTime<ctx.currentTime+.12)scheduleStep(nextStepTime);
  }
  function startMusic(){
    if(!settings.enabled||!interacted||!ensureAudio()||document.hidden)return;
    if(musicTimer)return;
    nextStepTime=ctx.currentTime+.04;musicStep=0;musicTimer=setInterval(scheduler,30);scheduler();
  }
  function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}musicStep=0;if(ctx)nextStepTime=ctx.currentTime+.04;}
  function syncMusic(force=false){
    const wanted=musicForScreen(activeScreenId());
    if(force||wanted!==currentMusic){currentMusic=wanted;stopMusic();}
    if(settings.enabled&&interacted)startMusic();
  }

  let toggle=null;
  function renderToggle(){if(toggle){toggle.textContent=settings.enabled?'Sound On':'Sound Off';toggle.setAttribute('aria-pressed',settings.enabled?'true':'false');}}
  function positionToggle(){
    if(!toggle)return;
    if(document.body.classList.contains('home-mode')){
      if(toggle.parentNode!==document.body)document.body.appendChild(toggle);
      return;
    }
    const controls=document.querySelector('.home-game-controls')||document.querySelector('.top-actions');
    if(controls&&toggle.parentNode!==controls)controls.appendChild(toggle);
    else if(!controls&&toggle.parentNode!==document.body)document.body.appendChild(toggle);
  }
  function createToggle(){
    if(document.getElementById('audioToggle'))return;
    toggle=document.createElement('button');toggle.id='audioToggle';toggle.type='button';toggle.className='compact audio-toggle';toggle.setAttribute('aria-label','Toggle game audio');
    const style=document.createElement('style');style.textContent=`
      .audio-toggle{min-width:78px;opacity:.9}
      body.home-mode .audio-toggle{position:fixed;z-index:140;right:max(8px,env(safe-area-inset-right));top:max(8px,env(safe-area-inset-top))}
      body:not(.home-mode) .audio-toggle{position:static;z-index:auto;right:auto;top:auto}
      @media(max-height:520px){body:not(.home-mode) .audio-toggle{min-height:30px;padding:4px 7px}}
    `;document.head.appendChild(style);document.body.appendChild(toggle);positionToggle();
    toggle.addEventListener('click',()=>{interacted=true;setEnabled(!settings.enabled);if(settings.enabled)SFX.button_click();});renderToggle();
  }

  function unlock(){if(interacted)return;interacted=true;if(ensureAudio()&&settings.enabled){master.gain.value=1;syncMusic(true);}}
  document.addEventListener('pointerdown',unlock,{capture:true,once:true});
  document.addEventListener('keydown',unlock,{capture:true,once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else syncMusic(true);});
  document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b||b.disabled||b.id==='audioToggle')return;playSfx('button_click');},true);

  if(typeof showScreen==='function'){
    const originalShowScreen=showScreen;showScreen=function(id){const r=originalShowScreen(id);setTimeout(()=>{positionToggle();syncMusic();},0);return r;};
  }
  if(typeof startRun==='function'){
    const originalStartRun=startRun;startRun=function(){const was=typeof running!=='undefined'&&running;const r=originalStartRun.apply(this,arguments);if(!was&&typeof running!=='undefined'&&running){playSfx('start_mining');syncMusic();}return r;};
  }
  if(typeof mineCell==='function'){
    const originalMineCell=mineCell;mineCell=function(c,power,source,chainDepth){
      if(c&&!c.mined&&source?.kind==='miner')playSfx('pickaxe_hit_stone',.58,{throttle:85,rate:.96+Math.random()*.08});
      const was=!!c?.mined;const r=originalMineCell.apply(this,arguments);if(c&&!was&&c.mined)playSfx('block_break');return r;
    };
  }
  if(typeof rewardOres==='function'){
    const originalRewardOres=rewardOres;rewardOres=function(types){const r=originalRewardOres.apply(this,arguments);if(types?.length)playSfx('ore_collect');return r;};
  }
  if(typeof onKeyFound==='function'){
    const originalOnKeyFound=onKeyFound;onKeyFound=function(){playSfx('key_found');return originalOnKeyFound.apply(this,arguments);};
  }
  if(typeof finishRun==='function'){
    const originalFinishRun=finishRun;finishRun=function(success,reason){const shown=typeof resultShown!=='undefined'&&resultShown;const r=originalFinishRun.apply(this,arguments);if(!shown){if(success)setTimeout(()=>playSfx('level_up'),420);else playSfx('end_mining');}return r;};
  }

  createToggle();syncMusic();
  window.SkeletonAudio={playSfx,syncMusic,setEnabled,get settings(){return {...settings};}};
})();