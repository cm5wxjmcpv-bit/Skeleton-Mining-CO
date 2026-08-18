function buildMine(){
  const cfg=levelConfig(), layout=layoutForLevel();
  const oreMap=new Map();
  for(const d of layout.ores){ const k=`${d.x},${d.y}`, arr=oreMap.get(k)||[]; if(arr.length<3&&!arr.includes(d.type)) arr.push(d.type); oreMap.set(k,arr); }
  mine=[];
  for(let y=0;y<cfg.height;y++){
    const row=[];
    for(let x=0;x<cfg.width;x++) row.push({x,y,oreTypes:[...(oreMap.get(`${x},${y}`)||[])],extracted:[],hp:CONFIG.rockHp,maxHp:CONFIG.rockHp,mined:false,hasKey:x===layout.key.x&&y===layout.key.y});
    mine.push(row);
  }
  keyCell=mine[layout.key.y][layout.key.x];
  placements=[]; prospectors=[]; running=false; pausedForArtifact=false; resultShown=false; timeLeft=roundTime(); initialTime=timeLeft; runElapsed=0; keyFound=false; postKeyRemaining=0; finalRush=false; endless=rank(30)>0;
  overtimeUsed=false; timepieceUsed=false; blastMode=false; blastCell=null; treasureRushRemaining=0; oreStreak=0; oreStreakShield=false; blocksBroken=0; runCurrency=0; runOre={}; runBonusNotes=new Set(); artifactFoundThisRun=false; pendingArtifact=null;
  normalizeCrewLoadout();
  favoredOre=save.artifacts.charm?activeOres()[Math.floor(Math.random()*activeOres().length)]?.id:null;
  eliteIndex=rank(28)>0?Math.floor(Math.random()*crewSize()):-1;
  totemIndex=save.artifacts.totem?Math.floor(Math.random()*crewSize()):-1;
  applySoftRock();
  planSurveyTiles();
  planArtifact();
  artifactCell=null;
  if(artifactPlanned){ const cells=mine.flat().filter(c=>!c.hasKey); artifactCell=cells[Math.floor(Math.random()*cells.length)]||null; }
  buildProspectors();
  hideMessage();
  renderAll();
  draw();
}

function normalizeCrewLoadout(){
  const allowed=unlockedMinerTypes(), n=crewSize();
  save.crewLoadout=(save.crewLoadout||[]).slice(0,n).map(t=>allowed.includes(t)?t:'basic');
  while(save.crewLoadout.length<n) save.crewLoadout.push('basic');
  persist();
}
function applySoftRock(){
  const r=rank(11); if(!r) return;
  const chance=r*.05;
  for(const c of mine.flat()) if(Math.random()<chance){ c.hp=r===5?1:2; c.maxHp=CONFIG.rockHp; }
}
function planSurveyTiles(){
  const count=[0,3,5,7,9,12][rank(27)]||0;
  const weighted=mine.flat().filter(c=>c.oreTypes.length).map(c=>({c,v:c.oreTypes.reduce((s,t)=>s+(ORE_BY_ID[t]?.value||0),0)})).sort((a,b)=>b.v-a.v);
  surveyTiles=weighted.slice(0,count).map(x=>x.c);
  if(save.artifacts.magnet && weighted.length){ const pick=weighted[Math.floor(Math.random()*Math.min(weighted.length,Math.max(1,Math.ceil(weighted.length*.3))))]?.c; if(pick&&!surveyTiles.includes(pick)) surveyTiles.push(pick); }
}
let artifactPlanned=false;
function planArtifact(){ artifactPlanned=Math.random()<currentArtifactChance(); }
function buildProspectors(){
  const cfg=levelConfig();
  prospectors=Array.from({length:prospectorSlots()},(_,i)=>({x:i%2?cfg.width-1:0,y:cfg.height-1-Math.floor(i/2),target:null,moveProgress:0,extractProgress:0,firstDeposit:true,speedBurst:0}));
}

function enrichRichStart(){
  if(!rank(10)||!placements.length) return;
  const ores=activeOres(), first=placements[0];
  for(let y=Math.max(0,first.y-1);y<=Math.min(mine.length-1,first.y+1);y++) for(let x=Math.max(0,first.x-1);x<=Math.min(mine[0].length-1,first.x+1);x++){
    const c=mine[y][x]; if(c.hasKey) continue;
    const shuffled=[...ores].sort(()=>Math.random()-.5);
    const wanted=1+Math.floor(Math.random()*3);
    for(const o of shuffled){ if(c.oreTypes.length>=wanted||c.oreTypes.length>=3) break; if(!c.oreTypes.includes(o.id)) c.oreTypes.push(o.id); }
  }
  const current=mine.flat().reduce((s,c)=>s+c.oreTypes.length,0), bonus=Math.floor(current*.25);
  for(let i=0;i<bonus;i++){
    const c=mine[Math.floor(Math.random()*mine.length)][Math.floor(Math.random()*mine[0].length)];
    if(c.hasKey||c.oreTypes.length>=3) continue;
    const o=ores[Math.floor(Math.random()*ores.length)]; if(o&&!c.oreTypes.includes(o.id)) c.oreTypes.push(o.id);
  }
  runBonusNotes.add('Rich Start added bonus ore');
}

function placeSkeleton(cell){
  if(running||placements.length>=crewSize()) return;
  if(placements.some(p=>p.x===cell.x&&p.y===cell.y)) return;
  const index=placements.length, type=save.crewLoadout[index]||'basic';
  placements.push({x:cell.x,y:cell.y,type,index,target:null,cooldown:0,hits:0,cleanSweep:false});
  renderMineControls(); draw();
}
function minerRadius(m){
  let r=baseRadius()*MINER_TYPES[m.type].radius;
  if(rank(3)===5&&m.index===0) r+=.25;
  if(m.index===totemIndex) r*=1.25;
  if(m.cleanSweep&&rank(26)===5) r+=1;
  return r;
}
function inRadius(cell,m){ if(endless||finalRush) return true; return Math.hypot(cell.x-m.x,cell.y-m.y)<=minerRadius(m); }
function chooseTarget(m){
  let best=null,bestDist=Infinity;
  for(const c of mine.flat()){
    if(c.mined||!inRadius(c,m)) continue;
    const d=Math.hypot(c.x-m.x,c.y-m.y); if(d<bestDist){bestDist=d;best=c;}
  }
  if(!best&&!m.cleanSweep&&rank(26)>0){ m.cleanSweep=true; return chooseTarget(m); }
  if(!best&&rank(1)===5&&!endless&&!finalRush){
    for(const c of mine.flat()) if(!c.mined){ const d=Math.hypot(c.x-m.x,c.y-m.y); if(d<=minerRadius(m)+1&&d<bestDist){bestDist=d;best=c;} }
  }
  return best;
}
function miningPower(m){ let p=1+rank(5)*.25; m.hits++; if(rank(5)===5&&m.hits%5===0) p*=2; return p; }
function minerSpeedMult(m){
  let mult=1+rank(2)*.10;
  if(m.index===eliteIndex) mult*=1+rank(28)*.20;
  if(m.index===totemIndex) mult*=1.25;
  if(m.cleanSweep) mult*=1+rank(26)*.10;
  if(timeLeft<=initialTime/2) mult*=1+rank(16)*.10;
  mult*=1+Math.min(rank(23)*.10,blocksBroken*.01);
  if(treasureRushRemaining>0) mult*=1+rank(29)*.10;
  if(finalRush) mult*=2;
  if(keyFound&&postKeyRemaining>0&&rank(18)===5&&!finalRush) mult*=1.25;
  const idle=placements.filter(x=>!x.target).length; if(m.target&&idle) mult*=1+idle*rank(14)*.10;
  if(m.target){ const same=placements.filter(x=>x.target===m.target).length; if(same>1) mult*=1+(same-1)*rank(7)*.10; }
  return mult;
}
function updateStandardMiners(dt){
  for(const m of placements){
    if(!m.target||m.target.mined||!inRadius(m.target,m)) m.target=chooseTarget(m);
  }
  for(const m of placements){
    if(!m.target) continue;
    m.cooldown-=dt*minerSpeedMult(m);
    if(m.cooldown<=0){
      const target=m.target; mineCell(target,miningPower(m),{kind:'miner',miner:m});
      if(target.mined){ m.target=null; m.cooldown=rank(2)===5?0:MINER_TYPES[m.type].interval; }
      else m.cooldown=MINER_TYPES[m.type].interval;
    }
  }
}

function prospectorTarget(p){
  let best=null,bestScore=-Infinity;
  for(const c of mine.flat()){
    if(c.mined) continue;
    const remaining=c.oreTypes.filter(t=>!c.extracted.includes(t)); if(!remaining.length) continue;
    const value=remaining.reduce((s,t)=>s+(ORE_BY_ID[t]?.value||0),0), dist=Math.abs(c.x-p.x)+Math.abs(c.y-p.y);
    const score=value*100-dist*25; if(score>bestScore){bestScore=score;best=c;}
  }
  return best;
}
function updateProspectors(dt){
  for(const p of prospectors){
    if(p.speedBurst>0) p.speedBurst=Math.max(0,p.speedBurst-dt);
    if(!p.target||p.target.mined||!p.target.oreTypes.some(t=>!p.target.extracted.includes(t))) p.target=prospectorTarget(p);
    if(!p.target) continue;
    if(p.x!==p.target.x||p.y!==p.target.y){
      const moveSpeed=1.2*(1+rank(9)*.10)*(p.speedBurst>0?1.5:1);
      p.moveProgress+=dt*moveSpeed;
      while(p.moveProgress>=1&&(p.x!==p.target.x||p.y!==p.target.y)){
        p.moveProgress-=1;
        if(p.x!==p.target.x) p.x+=Math.sign(p.target.x-p.x); else p.y+=Math.sign(p.target.y-p.y);
      }
      continue;
    }
    const extraction=1.2/(1+rank(8)*.10);
    p.extractProgress+=dt;
    if(p.extractProgress>=extraction){ p.extractProgress=0; extractProspector(p,p.target); p.target=null; if(rank(8)===5) p.speedBurst=3; }
  }
}
function extractProspector(p,c){
  const types=c.oreTypes.filter(t=>!c.extracted.includes(t)); if(!types.length)return;
  rewardOres(types,c,{kind:'prospector',prospector:p}); c.extracted.push(...types); p.firstDeposit=false;
}

function oreValueMultiplier(type,c,source){
  let mult=1+rank(6)*.10;
  if(rank(6)===5&&Math.random()<.10){mult*=2;runBonusNotes.add('Ore Value double proc');}
  if(favoredOre===type){mult*=1.5;runBonusNotes.add("Miner's Charm +50%");}
  if(rank(30)>0){mult*=2;runBonusNotes.add('Endless Extraction ×2 all ore');}
  if(source.kind==='blast'){mult*=3;runBonusNotes.add('Blast Charge ×3');}
  if(source.kind==='miner'){
    const m=source.miner;
    mult*=MINER_TYPES[m.type].value;
    if(m.type==='value') runBonusNotes.add('High-Value Miner +50%');
    if(rank(28)===5&&m.index===eliteIndex){mult*=2;runBonusNotes.add('Elite Miner ×2');}
  }
  if(source.kind==='prospector'){
    const p=source.prospector, vals=[0,.10,.175,.25,.325,.40]; mult*=1+(vals[rank(20)]||0);
    if(rank(20)===5&&p.firstDeposit){mult*=2;runBonusNotes.add('Prospector first deposit ×2');}
  }
  if(timeLeft<=10&&rank(21)>0){ if(rank(21)===5&&timeLeft<=5) mult*=2; else mult*=1+rank(21)*.10; runBonusNotes.add('Overtime Pay'); }
  if(c.oreTypes.length>=2&&rank(25)>0){ const vals=[0,.10,.20,.30,.40,1]; mult*=1+(vals[rank(25)]||0); runBonusNotes.add('Treasure Hunter'); }
  if(treasureRushRemaining>0&&rank(29)===5){mult*=1.5;runBonusNotes.add('Treasure Rush +50%');}
  if(oreStreak>0&&rank(22)>0){mult*=1+oreStreak*rank(22)*.05;runBonusNotes.add('Ore Streak');}
  return mult;
}
function rewardOres(types,c,source){
  let tileValue=0;
  for(const type of types){
    const ore=ORE_BY_ID[type]; if(!ore)continue;
    const value=Math.round(ore.value*oreValueMultiplier(type,c,source));
    tileValue+=value; runOre[type]=(runOre[type]||0)+1; save.totalOre[type]=(save.totalOre[type]||0)+1;
  }
  runCurrency+=tileValue; save.currency+=tileValue; persist();
}

function mineCell(c,power,source,chainDepth=0){
  if(!c||c.mined)return;
  c.hp-=power; if(c.hp>0)return;
  c.mined=true; blocksBroken++; save.stats.blocks++;
  const remaining=c.oreTypes.filter(t=>!c.extracted.includes(t));
  if(remaining.length){ rewardOres(remaining,c,source); c.extracted.push(...remaining); oreStreak++; oreStreakShield=false; }
  else{
    if(rank(12)>0&&Math.random()<rank(12)*.03){
      const ores=activeOres(); const count=rank(12)===5&&Math.random()<.2?2:1, bonus=[];
      for(let i=0;i<count&&c.oreTypes.length<3;i++){const o=ores[Math.floor(Math.random()*ores.length)];if(o&&!c.oreTypes.includes(o.id)){c.oreTypes.push(o.id);bonus.push(o.id);}}
      if(bonus.length){rewardOres(bonus,c,source);c.extracted.push(...bonus);runBonusNotes.add('Lucky Break');oreStreak++;}
    }else if(rank(22)===5&&!oreStreakShield){oreStreakShield=true;} else {oreStreak=0;oreStreakShield=false;}
  }
  if(c.oreTypes.length===3&&rank(29)>0){treasureRushRemaining=5;runBonusNotes.add('Treasure Rush');}
  if(c===artifactCell&&!artifactFoundThisRun) discoverArtifact();
  if(c.hasKey&&!keyFound) onKeyFound();
  if(source.kind==='miner'&&rank(13)>0&&Math.random()<rank(13)*.03) triggerWideSweep(c,source,chainDepth);
  if(endless&&mine.flat().every(x=>x.mined)) finishRun(true,'Mine cleared');
}
function adjacentCells(c){ const out=[]; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=c.x+dx,y=c.y+dy;if(mine[y]?.[x]&&!mine[y][x].mined)out.push(mine[y][x]);}return out; }
function triggerWideSweep(c,source,chainDepth){
  const n=rank(13)===5?2:1; const choices=adjacentCells(c).sort(()=>Math.random()-.5).slice(0,n);
  for(const target of choices){ target.hp=0; mineCell(target,0,source,chainDepth); if(rank(15)>0&&chainDepth<3&&Math.random()<rank(15)*.05){ const next=adjacentCells(target)[0]; if(next){next.hp=0;mineCell(next,0,source,chainDepth+1);runBonusNotes.add('Chain Reaction');} } }
  runBonusNotes.add('Wide Sweep');
}

function onKeyFound(){
  keyFound=true;
  if(endless){runBonusNotes.add('Key found — Endless Extraction continues');return;}
  if(rank(24)>0){finalRush=true;runBonusNotes.add('Final Rush: double speed + full-map mining');return;}
  if(rank(18)>0){postKeyRemaining=rank(18);runBonusNotes.add(`Last Chance Mining +${rank(18)}s`);return;}
  finishRun(true,'Golden Key found');
}

function executeBlast(){
  if(!rank(19)||!blastCell)return;
  for(let y=blastCell.y-1;y<=blastCell.y+1;y++) for(let x=blastCell.x-1;x<=blastCell.x+1;x++){
    const c=mine[y]?.[x]; if(c&&!c.mined){c.hp=0;mineCell(c,0,{kind:'blast'});}
  }
}

function startRun(){
  if(running||placements.length!==crewSize())return;
  enrichRichStart();
  running=true; save.stats.runs++; initialTime=roundTime(); timeLeft=initialTime; runElapsed=0;
  endless=rank(30)>0;
  for(const m of placements){m.target=null;m.cooldown=0;m.hits=0;m.cleanSweep=false;}
  executeBlast();
  ui.startButton.disabled=true; ui.endAttemptButton.disabled=false; ui.undoButton.disabled=true; ui.resetPlacementButton.disabled=true; ui.blastButton.disabled=true; renderMineControls(); persist();
}

function handleTimerEnd(){
  if(endless)return;
  if(keyFound){finishRun(true,'Time complete');return;}
  if(save.artifacts.timepiece&&!timepieceUsed){timepieceUsed=true;timeLeft+=10;runBonusNotes.add('Timepiece +10s');return;}
  if(rank(4)===5&&!overtimeUsed){overtimeUsed=true;timeLeft+=5;runBonusNotes.add('Longer Shift overtime +5s');return;}
  finishRun(false,'Key not found');
}

function finishRun(success,reason){
  if(resultShown)return;
  resultShown=true; running=false; pausedForArtifact=false; ui.endAttemptButton.disabled=true;
  if(success){ save.stats.wins++; if(!artifactFoundThisRun) save.artifactPity=Math.min(.10,(save.artifactPity||0)+.01); else save.artifactPity=0; delete save.levelLayouts[String(save.level)]; save.level++; }
  needsBuild=true;
  persist(); showResults(success,reason);
}
