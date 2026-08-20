'use strict';

// UI integration for the Skeleton Mining Co. progression rebalance.

const resultActions = document.querySelector('.result-actions');
const deepDiveButton = document.createElement('button');
deepDiveButton.id = 'deepDiveButton';
deepDiveButton.className = 'primary';
deepDiveButton.textContent = 'Enter Deep Mine';
deepDiveButton.hidden = true;

const deepCashButton = document.createElement('button');
deepCashButton.id = 'deepCashButton';
deepCashButton.textContent = 'Cash Out';
deepCashButton.hidden = true;

if (resultActions) resultActions.append(deepDiveButton, deepCashButton);

function requiredRankLevel(id){
  const d = UPGRADE_DEFS[id];
  const r = rank(id);
  return d?.rankGates?.[r] || 0;
}

const rebalanceUiBaseBuyUpgrade = buyUpgrade;
buyUpgrade = function(id){
  const gate = requiredRankLevel(id);
  if (gate && save.level < gate) {
    showUpgradeDetail(id);
    return;
  }
  rebalanceUiBaseBuyUpgrade(id);
};

const rebalanceUiBaseShowUpgradeDetail = showUpgradeDetail;
showUpgradeDetail = function(id){
  rebalanceUiBaseShowUpgradeDetail(id);
  const gate = requiredRankLevel(id);
  if (gate && save.level < gate) {
    ui.detailRank.textContent += ` • Next rank unlocks at Level ${gate}`;
    ui.buyUpgradeButton.disabled = true;
    ui.buyUpgradeButton.textContent = `Unlocks at Level ${gate}`;
  }
};

const rebalanceUiBaseRenderTree = renderTree;
renderTree = function(){
  rebalanceUiBaseRenderTree();
  for (const node of ui.treeNodes.querySelectorAll('.tree-node')) {
    const match = node.textContent.match(/^(\d+)\./);
    if (!match) continue;
    const id = Number(match[1]);
    const gate = requiredRankLevel(id);
    if (gate && save.level < gate) {
      node.classList.remove('affordable');
      node.title = `Next rank unlocks at Level ${gate}`;
    }
  }
};

const rebalanceUiBaseRenderMineControls = renderMineControls;
renderMineControls = function(){
  rebalanceUiBaseRenderMineControls();
  ui.blastButton.classList.add('hidden');
  ui.blastButton.disabled = true;

  if (deepMode) {
    ui.levelTitle.textContent = `Deep Mine — Depth ${deepDepth}`;
    ui.levelGoal.textContent = `Find the Golden Key. Rock HP ${currentRockHp()}. Unbanked Deep value: ${formatNumber(deepBank)}.`;
  } else {
    ui.levelGoal.textContent = `Find the Golden Key before time runs out. Rock HP ${currentRockHp()}.`;
  }

  if (!running) {
    const next = placements.length + 1;
    if (placements.length < crewSize()) {
      const typeName = MINER_TYPES[save.crewLoadout[next - 1] || 'basic'].name;
      const foreman = rank(19) > 0 && next === 1 ? ' This first miner will be the Foreman.' : '';
      ui.placementHint.textContent = `Tap the mine to place ${typeName} ${next} of ${crewSize()}.${foreman}`;
    } else {
      ui.placementHint.textContent = rank(19) > 0
        ? 'Crew placed. Skeleton 1 is the Foreman. Ready to start.'
        : 'Crew placed. Ready to start.';
    }
  }
};

const rebalanceUiBaseRenderTopbar = renderTopbar;
renderTopbar = function(){
  rebalanceUiBaseRenderTopbar();
  if (deepMode) ui.levelStat.textContent = `D${deepDepth}`;
};

function configureDeepResultButtons(success){
  ui.resultMineButton.hidden = false;
  deepDiveButton.hidden = true;
  deepCashButton.hidden = true;

  if (deepResultContext?.wasDeep) {
    if (deepResultContext.success && deepMode) {
      ui.resultMineButton.hidden = true;
      deepDiveButton.hidden = false;
      deepDiveButton.textContent = `Descend to Depth ${deepDepth + 1}`;
      deepCashButton.hidden = false;
      deepCashButton.textContent = `Cash Out ${formatNumber(deepBank)}`;
    } else {
      ui.resultMineButton.textContent = 'Return to Mine';
    }
    return;
  }

  if (success && rank(30) > 0) {
    deepDiveButton.hidden = false;
    deepDiveButton.textContent = 'Enter Deep Mine';
  }
}

const rebalanceUiBaseShowResults = showResults;
showResults = function(success, reason){
  if (!deepResultContext?.wasDeep) {
    rebalanceUiBaseShowResults(success, reason);
    configureDeepResultButtons(success);
    return;
  }

  const ctx = deepResultContext;
  ui.resultStatus.textContent = ctx.success ? 'DEEP FLOOR CLEARED' : 'DEEP MINE FAILED';
  ui.resultTitle.textContent = `Deep Mine — Depth ${ctx.depth}`;
  ui.resultOreList.innerHTML = '';

  for (const o of rebalanceBaseActiveOres(ctx.virtualLevel)) {
    const count = runOre[o.id] || 0;
    const d = document.createElement('div');
    d.className = 'result-ore';
    d.innerHTML = `<span>${o.name}</span><strong>${count}</strong>`;
    ui.resultOreList.appendChild(d);
  }

  const notes = [reason, `Blocks mined: ${blocksBroken}`, ...runBonusNotes];
  if (ctx.success) notes.push(`Deep Mine bank: ${formatNumber(deepBank)}`);
  else notes.push(`Unbanked Deep Mine value lost: ${formatNumber(ctx.lostBank)}`);
  ui.resultBreakdown.innerHTML = notes.map(n => `<div>• ${n}</div>`).join('');
  ui.resultEarned.textContent = formatNumber(runCurrency);
  ui.resultTotal.textContent = ctx.success ? formatNumber(deepBank) : formatNumber(save.currency);
  configureDeepResultButtons(success);
  showScreen('resultScreen');
};

deepDiveButton.addEventListener('click', () => {
  if (deepMode && deepResultContext?.success) descendDeepMine();
  else enterDeepMine(Math.max(1, save.level - 1));
});

deepCashButton.addEventListener('click', cashOutDeepMine);

// Add proper dynamic-HP damage shading, Miner's Notes markers, Key Clues,
// and a Foreman marker on top of the existing terrain renderer.
const rebalanceUiBaseDraw = draw;
draw = function(){
  // Suppress the retired Key Sense overlay inside the existing terrain renderer.
  const rankDuringBaseDraw = rank;
  rank = function(id){ return Number(id) === 17 ? 0 : rankDuringBaseDraw(id); };
  try { rebalanceUiBaseDraw(); } finally { rank = rankDuringBaseDraw; }
  if (!mine.length) return;
  const {cell,left,top} = canvasMetrics();

  for (const c of mine.flat()) {
    if (c.mined || c.hp >= c.maxHp) continue;
    const x = left + c.x * cell;
    const y = top + c.y * cell;
    const lostFraction = Math.max(0, Math.min(1, (c.maxHp - c.hp) / Math.max(1, c.maxHp)));
    ctx.fillStyle = `rgba(30,12,7,${Math.min(.30, .06 + lostFraction * .24)})`;
    ctx.fillRect(x + 2, y + 2, Math.max(1, cell - 4), Math.max(1, cell - 4));
  }

  if (!running && !deepMode && notesTiles.length) {
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
  }

  const kr = rank(17);
  if (running && kr > 0 && !keyFound && keyCell && !keyCell.mined) {
    const progress = initialTime > 0 ? runElapsed / initialTime : 0;
    let stage = 0;
    if (kr >= 1 && progress >= .25) stage = 1;
    if (kr >= 2 && progress >= .50) stage = 2;
    if (kr >= 3 && progress >= .65) stage = 3;
    if (kr >= 4 && progress >= .75) stage = 4;
    if (kr >= 5 && progress >= .85) stage = 5;

    if (stage) {
      const cfg = levelConfig();
      let minX = 0, minY = 0, maxX = cfg.width - 1, maxY = cfg.height - 1;
      if (stage === 1) {
        const half = Math.ceil(cfg.width / 2);
        if (keyCell.x < half) maxX = half - 1; else minX = half;
      } else if (stage === 2) {
        const halfX = Math.ceil(cfg.width / 2), halfY = Math.ceil(cfg.height / 2);
        if (keyCell.x < halfX) maxX = halfX - 1; else minX = halfX;
        if (keyCell.y < halfY) maxY = halfY - 1; else minY = halfY;
      } else {
        const size = stage === 3 ? 7 : stage === 4 ? 5 : 3;
        const radius = Math.floor(size / 2);
        minX = Math.max(0, keyCell.x - radius);
        maxX = Math.min(cfg.width - 1, keyCell.x + radius);
        minY = Math.max(0, keyCell.y - radius);
        maxY = Math.min(cfg.height - 1, keyCell.y + radius);
      }

      const x = left + minX * cell;
      const y = top + minY * cell;
      const w = (maxX - minX + 1) * cell;
      const h = (maxY - minY + 1) * cell;
      ctx.strokeStyle = '#f1cc55';
      ctx.lineWidth = Math.max(3, cell * .055);
      ctx.setLineDash([Math.max(6, cell * .12), Math.max(4, cell * .08)]);
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe59a';
      ctx.font = `bold ${Math.max(10, cell * .16)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('KEY CLUE', x + 8, y + 8);
    }
  }

  if (rank(19) > 0 && placements[0]) {
    const m = placements[0];
    const x = left + (m.x + .5) * cell;
    const y = top + (m.y + .5) * cell;
    ctx.fillStyle = '#f1cc55';
    ctx.font = `bold ${Math.max(9, cell * .13)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('FOREMAN', x, y - cell * .22);
  }
};

renderAll();
draw();
