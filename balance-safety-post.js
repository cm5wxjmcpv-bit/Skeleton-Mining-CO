'use strict';

// Small compatibility hardening for reset/new-game saves and Miner's Notes.
const rebalanceSafetyBuildMine = buildMine;
buildMine = function(){
  if (!save.minerNotes) save.minerNotes = {};
  if (deepMode && rank(30) === 0) {
    deepMode = false;
    deepDepth = 0;
    deepBank = 0;
    deepLayout = null;
    deepResultContext = null;
  }
  rebalanceSafetyBuildMine();
};

const rebalanceSafetyRewardOres = rewardOres;
rewardOres = function(types, c, source){
  if (source?.kind === 'prospector' && c?.oreTypes?.length) {
    discoveredOreThisRun.add(`${c.x},${c.y}`);
  }
  return rebalanceSafetyRewardOres(types, c, source);
};

const rebalanceSafetyDraw = draw;
draw = function(){
  rebalanceSafetyDraw();
  if (!running || deepMode || !notesTiles.length || !mine.length) return;
  const {cell,left,top} = canvasMetrics();
  for (const c of notesTiles) {
    if (c.mined) continue;
    const x = left + c.x * cell;
    const y = top + c.y * cell;
    const inset = Math.max(4, cell * .08);
    ctx.strokeStyle = '#78d7e8';
    ctx.lineWidth = Math.max(2, cell * .04);
    ctx.strokeRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
    ctx.fillStyle = '#bdf3ff';
    ctx.font = `bold ${Math.max(8, cell * .12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORE', x + cell / 2, y + cell * .18);
  }
};
