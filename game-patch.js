// Small runtime fixes kept separate so the first test build stays easy to adjust.
startRun = function(){
  if(running||placements.length!==crewSize())return;
  enrichRichStart();
  running=true; save.stats.runs++; initialTime=roundTime(); timeLeft=initialTime; runElapsed=0;
  endless=rank(30)>0;
  for(const m of placements){m.target=null;m.cooldown=0;m.hits=0;m.cleanSweep=false;}
  executeBlast();
  // A blast can uncover the key and finish the run before normal mining starts.
  if(resultShown)return;
  ui.startButton.disabled=true; ui.endAttemptButton.disabled=false; ui.undoButton.disabled=true; ui.resetPlacementButton.disabled=true; ui.blastButton.disabled=true; renderMineControls(); persist();
};

function chainBreakFrom(cell,source,depth){
  if(rank(15)===0||depth>3||Math.random()>=rank(15)*.05)return;
  const next=adjacentCells(cell).sort(()=>Math.random()-.5)[0];
  if(!next)return;
  next.hp=0;
  mineCell(next,0,source,depth);
  runBonusNotes.add('Chain Reaction');
  chainBreakFrom(next,source,depth+1);
}

triggerWideSweep = function(c,source,chainDepth){
  const n=rank(13)===5?2:1;
  const choices=adjacentCells(c).sort(()=>Math.random()-.5).slice(0,n);
  for(const target of choices){
    target.hp=0;
    mineCell(target,0,source,chainDepth||0);
    chainBreakFrom(target,source,1);
  }
  runBonusNotes.add('Wide Sweep');
};

// ---- Playtest balance pass: shorter rounds + rarer artifacts ----
CONFIG.baseRoundTime = 20;
CONFIG.artifactChance = [
  { min: 3, max: 5, chance: 0.02 },
  { min: 6, max: 10, chance: 0.03 },
  { min: 11, max: 20, chance: 0.04 },
  { min: 21, max: Infinity, chance: 0.05 }
];

currentArtifactChance = function(){
  if(save.level < 3) return 0;
  const band = CONFIG.artifactChance.find(b => save.level >= b.min && save.level <= b.max);
  const pity = Math.min(0.05, save.artifactPity || 0);
  let chance = (band?.chance || 0.05) + pity;

  // Once all permanent artifacts are owned, only repeat Reset Relics remain.
  // Cut that repeat-only rate in half so relics do not flood late-game runs.
  const repeatRelicOnly = ['magnet','totem','timepiece','charm'].every(k => !!save.artifacts[k]);
  if(repeatRelicOnly) chance *= 0.5;

  return Math.min(1, chance);
};

const finishRunBeforeArtifactBalance = finishRun;
finishRun = function(success, reason){
  const pityBefore = save.artifactPity || 0;
  const foundArtifact = artifactFoundThisRun;
  finishRunBeforeArtifactBalance(success, reason);

  if(success){
    save.artifactPity = foundArtifact ? 0 : Math.min(0.05, pityBefore + 0.005);
    persist();
  }
};
