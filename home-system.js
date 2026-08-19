// Home screen, manual save, simple tutorial, and one-time miner unlock notices.
(function(){
  'use strict';

  const manager=window.SkeletonSaveManager;
  if(!manager) return;

  // Approved progression: new miner choices at levels 10, 20, and 30.
  MINER_TYPES.fast.unlock=10;
  MINER_TYPES.wide.unlock=20;
  MINER_TYPES.value.unlock=30;

  const unlockInfo={
    fast:{name:'Fast Miner',level:10,tone:'green',summary:'35% faster mining',tradeoff:'20% smaller mining area',desc:'Best when you want to clear a smaller area quickly.'},
    wide:{name:'Wide-Reach Miner',level:20,tone:'orange',summary:'40% more reach',tradeoff:'25% slower mining',desc:'Covers more ground with every placement.'},
    value:{name:'High-Value Miner',level:30,tone:'purple',summary:'Ore worth 50% more',tradeoff:'30% slower mining',desc:'Slower swings, but every ore it collects pays more.'}
  };

  const style=document.createElement('style');
  style.id='homeSystemStyles';
  style.textContent=`
    body.home-mode{overflow:hidden;background:#080706}
    body.home-mode .topbar{display:none!important}
    #homeScreen{display:none;position:fixed;inset:0;z-index:30;background:#080706;color:#f4e8d1;padding:clamp(8px,1.5vw,18px);box-sizing:border-box;overflow:hidden}
    #homeScreen.active-screen{display:flex;flex-direction:column;gap:10px}
    .home-hero{position:relative;flex:1 1 48%;min-height:0;border:1px solid #5b4634;border-radius:14px;overflow:hidden;background:#17120e url('assets/home-hero.webp') center/cover no-repeat;box-shadow:0 12px 35px rgba(0,0,0,.45)}
    .home-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,4,3,.72),rgba(5,4,3,.1) 50%,rgba(5,4,3,.28));pointer-events:none}
    .home-actions{position:absolute;z-index:2;left:clamp(12px,2.4vw,34px);bottom:clamp(12px,2.4vw,30px);display:grid;grid-template-columns:repeat(2,minmax(125px,190px));gap:8px;max-width:420px}
    .home-actions button,.slot-card button,.game-toast button{min-height:42px;font-weight:800}
    .home-actions .home-primary{grid-column:1/-1;background:#346d37;border-color:#6fa36d;color:#fff}
    .home-actions button:disabled{opacity:.45}
    .home-save-area{flex:0 0 42%;min-height:0;display:flex;flex-direction:column;gap:7px}
    .home-save-heading{display:flex;align-items:center;justify-content:space-between;padding:0 3px}
    .home-save-heading strong{font-size:clamp(15px,2vw,22px)}
    .home-save-heading span{font-size:12px;color:#b9aa95}
    .save-slot-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;min-height:0;flex:1}
    .slot-card{position:relative;min-width:0;border:1px solid #5b4634;border-radius:12px;background:linear-gradient(#211a15,#15110e);padding:10px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
    .slot-card.active-slot{outline:2px solid #d6a634;outline-offset:-3px}
    .slot-title{font-weight:900;color:#e5b84c;letter-spacing:.02em}.slot-meta{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:7px 0;font-size:13px}.slot-meta strong{font-size:clamp(16px,2vw,23px);display:block;color:#fff}.slot-last{font-size:11px;color:#a99b89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .slot-buttons{display:flex;gap:6px}.slot-buttons button{flex:1;padding:6px}.slot-delete{flex:0 0 auto!important;color:#e5998f}
    .slot-empty{align-items:center;text-align:center;justify-content:center;border-style:dashed;color:#c3b39d}.slot-empty .empty-picks{font-size:30px;margin-bottom:4px}.slot-empty button{margin-top:8px;width:80%}
    .home-game-controls{display:flex;gap:6px;align-items:center}.home-game-controls button{min-width:58px}
    #gameSaveButton.saved-flash{box-shadow:0 0 0 2px #d9b84f inset}
    .game-toast{position:fixed;z-index:120;left:50%;bottom:18px;transform:translateX(-50%);background:#1c1712;border:1px solid #796044;border-radius:10px;padding:9px 14px;color:#f4e8d1;font-weight:700;box-shadow:0 7px 24px rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .16s}
    .game-toast.show{opacity:1}
    .simple-guide{position:fixed;z-index:110;inset:0;background:rgba(4,3,3,.72);display:flex;align-items:center;justify-content:center;padding:14px}.simple-guide.hidden{display:none}
    .guide-card{width:min(460px,88vw);background:#211a14;border:2px solid #795b37;border-radius:14px;padding:18px;box-shadow:0 18px 55px rgba(0,0,0,.55);color:#f4e8d1}.guide-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.guide-step{color:#d9ae48;font-size:12px;font-weight:800}.guide-card h2{margin:8px 0}.guide-card p{line-height:1.42;color:#ded0bc}.guide-actions{display:flex;justify-content:space-between;gap:8px;margin-top:16px}.guide-actions button{min-width:100px}.guide-skip{background:transparent;color:#baa994}
    .unlock-card{width:min(500px,90vw)}.unlock-badge{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;font-size:40px;background:#2e281f;border:2px solid #8b6d44;margin:8px auto 10px}.unlock-card.green .unlock-badge{box-shadow:0 0 26px rgba(108,171,36,.32)}.unlock-card.orange .unlock-badge{box-shadow:0 0 26px rgba(220,122,21,.32)}.unlock-card.purple .unlock-badge{box-shadow:0 0 26px rgba(132,68,191,.38)}.unlock-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.unlock-stats div{background:#15110e;border:1px solid #58442f;border-radius:8px;padding:9px;text-align:center}.unlock-card h2{text-align:center}.unlock-card p{text-align:center}.unlock-card .guide-actions{justify-content:center}
    @media(max-height:520px){#homeScreen{gap:6px}.home-hero{flex-basis:43%}.home-save-area{flex-basis:48%}.home-actions{bottom:8px;left:10px;grid-template-columns:repeat(2,minmax(105px,150px))}.home-actions button{min-height:35px;padding:5px}.slot-card{padding:7px}.slot-meta{margin:3px 0}.slot-buttons button{min-height:32px}.guide-card{padding:13px}.guide-card p{margin:7px 0}.guide-actions{margin-top:10px}}
  `;
  document.head.appendChild(style);

  const home=document.createElement('section');
  home.id='homeScreen';
  home.className='screen';
  home.innerHTML=`
    <div class="home-hero">
      <div class="home-actions">
        <button id="homeContinue" class="home-primary">Continue</button>
        <button id="homeNewGame">New Game</button>
        <button id="homeTutorial">Tutorial</button>
      </div>
    </div>
    <div class="home-save-area">
      <div class="home-save-heading"><strong>Save Games</strong><span>3 independent playthroughs</span></div>
      <div id="saveSlotGrid" class="save-slot-grid"></div>
    </div>`;
  document.querySelector('.app-shell')?.prepend(home);

  const toast=document.createElement('div');toast.className='game-toast';document.body.appendChild(toast);
  let toastTimer=null;
  function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),1400);}

  const guide=document.createElement('div');
  guide.className='simple-guide hidden';
  guide.innerHTML=`<div class="guide-card"><div class="guide-top"><span id="guideStep" class="guide-step"></span><button id="guideSkip" class="guide-skip">Skip</button></div><h2 id="guideTitle"></h2><p id="guideText"></p><div class="guide-actions"><span></span><button id="guideNext" class="primary">Next</button></div></div>`;
  document.body.appendChild(guide);

  const unlockModal=document.createElement('div');
  unlockModal.className='simple-guide hidden';
  unlockModal.innerHTML=`<div id="unlockCard" class="guide-card unlock-card"><div class="unlock-badge">☠</div><span class="guide-step">NEW MINER UNLOCKED</span><h2 id="unlockName"></h2><p id="unlockLevel"></p><div class="unlock-stats"><div><strong id="unlockStat1"></strong></div><div><strong id="unlockStat2"></strong></div></div><p id="unlockDesc"></p><p>Change miners from <strong>Crew Loadout</strong> between rounds.</p><div class="guide-actions"><button id="unlockCrew">Crew Loadout</button><button id="unlockContinue" class="primary">Continue</button></div></div>`;
  document.body.appendChild(unlockModal);

  const topActions=document.querySelector('.top-actions');
  if(topActions){
    const controls=document.createElement('div');controls.className='home-game-controls';
    controls.innerHTML='<button id="gameSaveButton" class="compact">Save</button><button id="gameHomeButton" class="compact">Home</button>';
    topActions.prepend(controls);
    if(ui.newGameButton) ui.newGameButton.classList.add('hidden');
  }

  const tutorialSteps=[
    ['Welcome','Your skeleton crew mines automatically. Place them where they can uncover ore and find the Golden Key.'],
    ['Place Your Crew','Tap the mine to place your skeletons. The outlined blocks show exactly which tiles each miner can reach.'],
    ['Start Mining','When your crew is placed, tap Start Mining. Break rock, collect ore, and find the Golden Key before time runs out.'],
    ['Round Results','After every round you can Mine Again, buy Upgrades, or open Crew Loadout to change your miners.'],
    ['Upgrades','Spend the value you earn on upgrades to make your crew stronger. That is all you need to start mining.']
  ];
  let tutorialIndex=0,tutorialReplay=false;
  const guideStep=document.getElementById('guideStep'),guideTitle=document.getElementById('guideTitle'),guideText=document.getElementById('guideText'),guideNext=document.getElementById('guideNext');
  function renderTutorial(){
    const step=tutorialSteps[tutorialIndex];guideStep.textContent=`${tutorialIndex+1} / ${tutorialSteps.length}`;guideTitle.textContent=step[0];guideText.textContent=step[1];guideNext.textContent=tutorialIndex===tutorialSteps.length-1?'Done':'Next';
  }
  function startTutorial(replay=false){tutorialReplay=replay;tutorialIndex=0;renderTutorial();guide.classList.remove('hidden');}
  function finishTutorial(skipped=false){
    guide.classList.add('hidden');
    if(!tutorialReplay && manager.getActiveSlot()){
      save.tutorial={completed:!skipped,skipped:!!skipped};persist();
    }
  }
  document.getElementById('guideSkip').addEventListener('click',()=>finishTutorial(true));
  guideNext.addEventListener('click',()=>{if(tutorialIndex<tutorialSteps.length-1){tutorialIndex++;renderTutorial();}else finishTutorial(false);});

  function formatMoney(n){return typeof formatNumber==='function'?formatNumber(n):Math.round(n||0).toLocaleString();}
  function relativeTime(ms){
    if(!ms) return 'Not played yet';
    const diff=Date.now()-ms,min=Math.floor(diff/60000);if(min<1)return 'Just now';if(min<60)return `${min}m ago`;const hr=Math.floor(min/60);if(hr<24)return `${hr}h ago`;const d=Math.floor(hr/24);return `${d}d ago`;
  }

  function renderHome(){
    const slots=manager.getSlots(),grid=document.getElementById('saveSlotGrid'),active=manager.getActiveSlot();grid.innerHTML='';
    for(const info of slots){
      const card=document.createElement('div');card.className=`slot-card ${info.empty?'slot-empty':''} ${active===info.slot&&!info.empty?'active-slot':''}`;
      if(info.empty){
        card.innerHTML=`<div class="empty-picks">⚒</div><div class="slot-title">Empty Slot ${info.slot}</div><div>Start a new playthrough</div><button class="primary">New Game</button>`;
        card.querySelector('button').addEventListener('click',()=>createNewGame(info.slot));
      }else{
        card.innerHTML=`<div><div class="slot-title">Save Slot ${info.slot}</div><div class="slot-meta"><div><span>Level</span><strong>${info.level}</strong></div><div><span>Money</span><strong>${formatMoney(info.currency)}</strong></div></div><div class="slot-last">Last played: ${relativeTime(info.lastPlayed)}</div></div><div class="slot-buttons"><button class="primary slot-load">Play</button><button class="slot-delete" aria-label="Delete save">Delete</button></div>`;
        card.querySelector('.slot-load').addEventListener('click',()=>loadSlot(info.slot));
        card.querySelector('.slot-delete').addEventListener('click',()=>deleteSlot(info.slot));
      }
      grid.appendChild(card);
    }
    const continueSlot=manager.getContinueSlot();
    const cont=document.getElementById('homeContinue');cont.disabled=!continueSlot;cont.textContent=continueSlot?`Continue — Slot ${continueSlot}`:'Continue';
  }

  const gameShowScreen=showScreen;
  showScreen=function(id){
    home.classList.remove('active-screen');
    if(id==='homeScreen'){
      for(const screen of [ui.mineScreen,ui.upgradeScreen,ui.artifactScreen,ui.resultScreen,ui.crewScreen]) screen?.classList.remove('active-screen');
      home.classList.add('active-screen');document.body.classList.add('home-mode');renderHome();return;
    }
    document.body.classList.remove('home-mode');gameShowScreen(id);
  };

  function activateCurrentSlot(){
    save=loadSave();
    if(!save.tutorial) save.tutorial={completed:true,skipped:false};
    if(!save.unlockNotices) save.unlockNotices={};
    needsBuild=false;buildMine();renderAll();showScreen('mineScreen');
  }
  function loadSlot(slot){if(manager.selectSlot(slot)){activateCurrentSlot();showToast(`Loaded Save Slot ${slot}`);}}
  function createNewGame(slot){
    const fresh=clone(DEFAULT_SAVE);fresh.tutorial={completed:false,skipped:false};fresh.unlockNotices={};
    if(!manager.createSlot(slot,fresh)){showToast('That save slot is already in use.');return;}
    activateCurrentSlot();setTimeout(()=>startTutorial(false),80);
  }
  function deleteSlot(slot){
    const info=manager.getSlots().find(s=>s.slot===slot);if(!info||info.empty)return;
    confirmAction('Delete this save?',`Delete Save Slot ${slot} at Level ${info.level}? This cannot be undone.`,()=>{manager.deleteSlot(slot);save=loadSave();renderHome();showToast(`Save Slot ${slot} deleted`);});
  }

  document.getElementById('homeContinue').addEventListener('click',()=>{const slot=manager.getContinueSlot();if(slot)loadSlot(slot);});
  document.getElementById('homeNewGame').addEventListener('click',()=>{const empty=manager.getSlots().find(s=>s.empty);if(empty)createNewGame(empty.slot);else showToast('All 3 save slots are full. Delete one before starting a new game.');});
  document.getElementById('homeTutorial').addEventListener('click',()=>startTutorial(true));
  document.getElementById('gameSaveButton')?.addEventListener('click',()=>{if(!manager.getActiveSlot()){showToast('No active save.');return;}persist();manager.touchActive();const b=document.getElementById('gameSaveButton');b.classList.add('saved-flash');setTimeout(()=>b.classList.remove('saved-flash'),500);showToast('Game Saved');});
  document.getElementById('gameHomeButton')?.addEventListener('click',()=>{if(running){showToast('End the current attempt before returning Home.');return;}if(manager.getActiveSlot()){persist();manager.touchActive();}showScreen('homeScreen');});

  function showMinerUnlock(id){
    const info=unlockInfo[id];if(!info)return;
    const card=document.getElementById('unlockCard');card.className=`guide-card unlock-card ${info.tone}`;
    document.getElementById('unlockName').textContent=info.name;document.getElementById('unlockLevel').textContent=`Unlocked at Level ${info.level}`;document.getElementById('unlockStat1').textContent=info.summary;document.getElementById('unlockStat2').textContent=info.tradeoff;document.getElementById('unlockDesc').textContent=info.desc;unlockModal.classList.remove('hidden');
  }
  document.getElementById('unlockContinue').addEventListener('click',()=>unlockModal.classList.add('hidden'));
  document.getElementById('unlockCrew').addEventListener('click',()=>{unlockModal.classList.add('hidden');showScreen('crewScreen');});

  const finishRunBeforeHomeSystem=finishRun;
  finishRun=function(success,reason){
    const levelBefore=save.level;
    const result=finishRunBeforeHomeSystem(success,reason);
    if(success){
      save.unlockNotices={...(save.unlockNotices||{})};
      const entry=Object.entries(unlockInfo).find(([,d])=>levelBefore<d.level&&save.level>=d.level);
      if(entry&&!save.unlockNotices[entry[0]]){
        save.unlockNotices[entry[0]]=true;persist();setTimeout(()=>showMinerUnlock(entry[0]),90);
      }
    }
    return result;
  };

  // Existing installs land on Home with their old save safely migrated to Slot 1.
  // Fresh installs stay save-less until New Game is explicitly chosen.
  showScreen('homeScreen');
})();
