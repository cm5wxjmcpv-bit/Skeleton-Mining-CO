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
