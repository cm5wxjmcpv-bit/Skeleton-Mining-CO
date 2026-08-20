'use strict';

// Skeleton Mining Co. progression rebalance + replacement upgrade mechanics.
// Loaded after the radius/crew compatibility patches and before UI/event wiring.

// ----- Upgrade definitions / balance -----
UPGRADE_DEFS[1].cost = [100, 350, 1000, 3000];
UPGRADE_DEFS[1].rankGates = [5, 15, 25, 40];
UPGRADE_DEFS[1].desc = 'Expand the Basic/Precision mining footprint one tile at a time. Higher ranks require career progress.';
UPGRADE_DEFS[1].effect = 'Rank gates: Level 5 / 15 / 25 / 40. Rank 4 completes the Basic/Precision 3×3 footprint.';

UPGRADE_DEFS[2].desc = 'Standard skeletons strike 5% faster per rank.';
UPGRADE_DEFS[2].effect = '+5% mining speed per rank, up to +25%. Target switching keeps its normal delay.';

UPGRADE_DEFS[3].cost = [500, 10000];
UPGRADE_DEFS[3].desc = 'Add one standard skeleton slot per rank, up to a maximum crew of 4.';
UPGRADE_DEFS[3].effect = 'Base crew is 2. Rank 1 = 3 miners (500). Rank 2 = 4 miners (10,000). Maximum crew size is 4.';

UPGRADE_DEFS[5].desc = 'Increase damage per strike by 10% per rank.';
UPGRADE_DEFS[5].effect = '+10% mining power per rank. Rank 5 makes every fifth strike a 1.5× Heavy Hit.';

UPGRADE_DEFS[11].desc = 'A small portion of rock begins each run weakened.';
UPGRADE_DEFS[11].effect = '3% more weakened rock per rank, up to 15%. Weakened rock starts 1 HP below normal and is never reduced to 1 HP by this upgrade.';

UPGRADE_DEFS[12].name = 'Ore Preservation';
UPGRADE_DEFS[12].desc = 'Careful mining can preserve extra value from an ore-bearing block.';
UPGRADE_DEFS[12].effect = '5% chance per rank that one ore from a mined ore block pays an additional 50% preservation bonus.';

UPGRADE_DEFS[13].name = 'Cracked Rock';
UPGRADE_DEFS[13].desc = 'Breaking a block can crack a neighboring block without destroying it.';
UPGRADE_DEFS[13].effect = '5% chance per rank to reduce one adjacent unmined block by 1 HP. Cracked Rock never destroys a block outright.';

UPGRADE_DEFS[14].name = 'Shared Experience';
UPGRADE_DEFS[14].desc = 'Nearby miners learn from each successful break.';
UPGRADE_DEFS[14].effect = 'When a miner breaks a block, nearby miners reduce their current strike cooldown by 3% per rank, up to 15%.';

UPGRADE_DEFS[15].desc = 'A Cracked Rock trigger can spread one additional crack.';
UPGRADE_DEFS[15].effect = '3% / 6% / 9% / 12% / 15% chance for Cracked Rock to crack one additional neighboring block. Maximum one extra chain.';

UPGRADE_DEFS[16].desc = 'The crew speeds up modestly in the second half of the run.';
UPGRADE_DEFS[16].effect = '+5% mining speed per rank after the timer reaches halfway, up to +25%.';

UPGRADE_DEFS[17].name = 'Key Clues';
UPGRADE_DEFS[17].desc = 'As the round continues, clues narrow the part of the mine that can contain the key.';
UPGRADE_DEFS[17].effect = 'Ranks add progressively stronger timed clues: half-map, quadrant, 7×7 area, 5×5 area, then a 3×3 key zone late in the round.';

UPGRADE_DEFS[19].name = 'Foreman';
UPGRADE_DEFS[19].desc = 'Major: the first placed miner becomes the crew Foreman.';
UPGRADE_DEFS[19].effect = 'The Foreman mines 20% slower, but other miners within 2 tiles gain +15% mining speed. Placement and crew order determine the benefit.';

UPGRADE_DEFS[21].desc = 'Ore becomes modestly more valuable in the final 10 seconds.';
UPGRADE_DEFS[21].effect = '+5% ore value per rank in the final 10 seconds, up to +25%. No double-value finish.';

UPGRADE_DEFS[22].desc = 'Consecutive ore-bearing tiles build a value streak with a hard cap.';
UPGRADE_DEFS[22].effect = 'Each consecutive ore tile builds value faster at higher ranks, but the total Ore Streak bonus can never exceed +50%. Rank 5 can survive one empty tile.';

UPGRADE_DEFS[23].name = 'Hardened Picks';
UPGRADE_DEFS[23].desc = 'Repeated successful mining charges a stronger next strike.';
UPGRADE_DEFS[23].effect = 'Every 5 blocks cleared by a miner charges its next strike for +10% damage per rank, up to +50%.';

UPGRADE_DEFS[24].name = 'Extra Shift';
UPGRADE_DEFS[24].desc = 'Major: if the crew still has not found the key when time expires, keep working the same partially-mined layout once.';
UPGRADE_DEFS[24].effect = 'Once per run, after all normal time extensions are used, gain a shortened extra shift equal to 40% of the normal round time (minimum 7 seconds).';

UPGRADE_DEFS[25].desc = 'Multi-ore tiles are worth more.';
UPGRADE_DEFS[25].effect = '+10% / +20% / +30% / +40% / +50% value on multi-ore tiles. No double-value rank.';

UPGRADE_DEFS[26].name = 'Repositioning';
UPGRADE_DEFS[26].desc = 'Miners that clear everything they can reach slowly move toward remaining work.';
UPGRADE_DEFS[26].effect = 'When idle, a miner may move one tile toward the nearest valid unmined target. Higher ranks reduce the delay between moves.';

UPGRADE_DEFS[28].desc = 'One random standard miner becomes Elite each run.';
UPGRADE_DEFS[28].effect = '+10% mining speed per rank for the Elite Miner, up to +50%. No double ore-value bonus.';

UPGRADE_DEFS[29].name = "Miner's Notes";
UPGRADE_DEFS[29].cost = [375];
UPGRADE_DEFS[29].desc = 'Remember ore locations discovered during a failed attempt.';
UPGRADE_DEFS[29].effect = 'If the key is not found, every ore-bearing block actually mined during that failed attempt is marked on the next try of that same level.';

UPGRADE_DEFS[30].name = 'Deep Mine';
UPGRADE_DEFS[30].desc = 'Major: unlock an optional high-risk Deep Mine after successful normal levels.';
UPGRADE_DEFS[30].effect = 'Descend through harder procedural floors for richer ore. Deep earnings are unbanked until you cash out; failing a Deep Mine floor loses the current Deep Mine bank.';

// Replace Wide-Reach in place so old saves/loadouts migrate automatically.
MINER_TYPES.wide.name = 'Precision Miner';
MINER_TYPES.wide.unlock = 35;
MINER_TYPES.wide.interval = 0.78;
MINER_TYPES.wide.radius = 1;
MINER_TYPES.wide.value = 1.20;
MINER_TYPES.wide.desc = 'Only mines ore-bearing blocks and the Golden Key inside the Basic Miner footprint. Ignores ordinary rock. Ore mined by this miner is worth +20%.';

// ----- Rank caps / save migration -----
const rebalancePreviousMaxRank = maxRank;
maxRank = function(id){
  id = Number(id);
  if (id === 3) return 2;
  if (id === 29) return 1;
  return rebalancePreviousMaxRank(id);
};

crewSize = function(){ return Math.min(4, 2 + rank(3)); };

if (rank(3) > 2) {
  // The removed fifth slot previously cost 80 under the compatibility patch.
  save.currency += 80;
  save.upgrades[3] = 2;
  save.crewLoadout = (save.crewLoadout || []).slice(0, 4);
}

save.minerNotes = { ...(save.minerNotes || {}) };
persist();

// ----- Deep Mine / run state -----
let deepMode = false;
let deepDepth = 0;
let deepBaseLevel = 1;
let deepBank = 0;
let deepLayout = null;
let deepResultContext = null;
let extraShiftUsed = false;
let notesTiles = [];
let discoveredOreThisRun = new Set();

function deepVirtualLevel(){ return Math.max(1, deepBaseLevel + deepDepth * 5); }

const rebalanceBaseLevelConfig = levelConfig;
levelConfig = function(level){
  if (arguments.length === 0 && deepMode) return rebalanceBaseLevelConfig(deepVirtualLevel());
  return rebalanceBaseLevelConfig(level == null ? save.level : level);
};

const rebalanceBaseActiveOres = activeOres;
activeOres = function(level){
  if (arguments.length === 0 && deepMode) return rebalanceBaseActiveOres(deepVirtualLevel());
  return rebalanceBaseActiveOres(level == null ? save.level : level);
};

const rebalanceBaseCreateLevelLayout = createLevelLayout;
const rebalanceBaseLayoutForLevel = layoutForLevel;
layoutForLevel = function(){
  if (!deepMode) return rebalanceBaseLayoutForLevel();
  if (!deepLayout) deepLayout = rebalanceBaseCreateLevelLayout(deepVirtualLevel());
  return deepLayout;
};

function rockHpForLevel(level){
  if (level < 10) return 3;
  if (level < 20) return 4;
  if (level < 30) return 5;
  if (level < 40) return 6;
  if (level < 50) return 7;
  if (level < 60) return 8;
  if (level < 70) return 10;
  if (level < 80) return 12;
  return 15;
}

function currentRockHp(){
  const level = deepMode ? deepVirtualLevel() : save.level;
  return rockHpForLevel(level) + (deepMode ? Math.max(0, deepDepth - 1) * 2 : 0);
}

// Prevent the original buildMine from applying the old fixed-HP Soft Rock logic.
applySoftRock = function(){};

function applyBalancedSoftRock(){
  const r = rank(11);
  if (!r) return;
  const chance = r * 0.03;
  for (const c of mine.flat()) {
    if (Math.random() < chance) c.hp = Math.max(2, c.maxHp - 1);
  }
}

const rebalanceBaseBuildMine = buildMine;
buildMine = function(){
  rebalanceBaseBuildMine();
  endless = false;
  finalRush = false;
  blastMode = false;
  blastCell = null;
  extraShiftUsed = false;
  discoveredOreThisRun = new Set();

  const hp = currentRockHp();
  for (const c of mine.flat()) {
    c.maxHp = hp;
    c.hp = hp;
  }
  applyBalancedSoftRock();

  notesTiles = [];
  if (!deepMode) {
    const remembered = save.minerNotes[String(save.level)] || [];
    for (const pos of remembered) {
      const c = mine[pos.y]?.[pos.x];
      if (c && c.oreTypes.length) notesTiles.push(c);
    }
  }

  if (typeof renderAll === 'function') renderAll();
  if (typeof draw === 'function') draw();
};

// ----- Coverage and miner behavior -----
minerRadius = function(m){
  let r = baseRadius() * (MINER_TYPES[m.type]?.radius || 1);
  if (m.index === totemIndex) r *= 1.25;
  return r;
};

inRadius = function(cell, m){
  if (!cell || !m) return false;
  if (m.type === 'basic' || m.type === 'wide') return basicStepCoverage(cell, m);
  return Math.hypot(cell.x - m.x, cell.y - m.y) <= minerRadius(m);
};

function validTargetForMiner(c, m){
  if (!c || c.mined) return false;
  if (m.type === 'wide') return c.hasKey || c.oreTypes.length > 0;
  return true;
}

chooseTarget = function(m){
  let best = null;
  let bestDist = Infinity;
  for (const c of mine.flat()) {
    if (!validTargetForMiner(c, m) || !inRadius(c, m)) continue;
    const d = Math.hypot(c.x - m.x, c.y - m.y);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
};

function nearestValidUnmined(m){
  let best = null;
  let bestDist = Infinity;
  for (const c of mine.flat()) {
    if (!validTargetForMiner(c, m)) continue;
    const d = Math.abs(c.x - m.x) + Math.abs(c.y - m.y);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

function repositionMiner(m, dt){
  const r = rank(26);
  if (!r) return false;
  const target = nearestValidUnmined(m);
  if (!target) return false;
  const delays = [0, 2.5, 2.0, 1.5, 1.0, 0.6];
  m.repositionCooldown = (m.repositionCooldown == null ? delays[r] : m.repositionCooldown) - dt;
  if (m.repositionCooldown > 0) return false;

  const dx = target.x - m.x;
  const dy = target.y - m.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) m.x += Math.sign(dx);
  else if (dy !== 0) m.y += Math.sign(dy);
  m.repositionCooldown = delays[r];
  return true;
}

miningPower = function(m){
  let p = 1 + rank(5) * 0.10;
  m.hits = (m.hits || 0) + 1;
  if (rank(5) === 5 && m.hits % 5 === 0) p *= 1.5;
  if (m.hardenedReady && rank(23) > 0) {
    p *= 1 + rank(23) * 0.10;
    m.hardenedReady = false;
    runBonusNotes.add('Hardened Picks');
  }
  return p;
};

minerSpeedMult = function(m){
  let mult = 1 + rank(2) * 0.05;
  if (m.index === eliteIndex) mult *= 1 + rank(28) * 0.10;
  if (m.index === totemIndex) mult *= 1.25;
  if (timeLeft <= initialTime / 2) mult *= 1 + rank(16) * 0.05;
  if (keyFound && postKeyRemaining > 0 && rank(18) === 5) mult *= 1.25;

  if (rank(19) > 0 && placements.length) {
    const foreman = placements[0];
    if (m.index === 0) mult *= 0.80;
    else if (Math.hypot(m.x - foreman.x, m.y - foreman.y) <= 2) mult *= 1.15;
  }

  if (m.target) {
    const same = placements.filter(x => x.target === m.target).length;
    if (same > 1) mult *= 1 + (same - 1) * rank(7) * 0.10;
  }
  return mult;
};

function applySharedExperience(sourceMiner){
  const r = rank(14);
  if (!r || !sourceMiner) return;
  for (const other of placements) {
    if (other === sourceMiner) continue;
    if (Math.hypot(other.x - sourceMiner.x, other.y - sourceMiner.y) > 2) continue;
    const interval = MINER_TYPES[other.type]?.interval || 0.78;
    other.cooldown = Math.max(0, (other.cooldown || 0) - interval * r * 0.03);
  }
  runBonusNotes.add('Shared Experience');
}

function crackOneAdjacent(c){
  const candidates = adjacentCells(c).filter(x => x.hp > 1);
  if (!candidates.length) return null;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  target.hp = Math.max(1, target.hp - 1);
  return target;
}

function applyCrackedRock(c){
  const r = rank(13);
  if (!r || Math.random() >= r * 0.05) return;
  const first = crackOneAdjacent(c);
  if (!first) return;
  runBonusNotes.add('Cracked Rock');

  const chainRank = rank(15);
  if (chainRank && Math.random() < chainRank * 0.03) {
    const second = crackOneAdjacent(first);
    if (second) runBonusNotes.add('Chain Reaction');
  }
}

function addPreservationBonus(types, c, source){
  const r = rank(12);
  if (!r || !types.length || Math.random() >= r * 0.05) return;
  const type = types[Math.floor(Math.random() * types.length)];
  const ore = ORE_BY_ID[type];
  if (!ore) return;
  const bonus = Math.max(1, Math.round(ore.value * oreValueMultiplier(type, c, source) * 0.5));
  runCurrency += bonus;
  if (deepMode) deepBank += bonus;
  else save.currency += bonus;
  runBonusNotes.add(`Ore Preservation +${formatNumber(bonus)}`);
  persist();
}

updateStandardMiners = function(dt){
  for (const m of placements) {
    if (!m.target || m.target.mined || !inRadius(m.target, m) || !validTargetForMiner(m.target, m)) {
      m.target = chooseTarget(m);
    }
    if (!m.target) {
      if (repositionMiner(m, dt)) m.target = chooseTarget(m);
      continue;
    }
    m.repositionCooldown = null;
  }

  for (const m of placements) {
    if (!m.target) continue;
    m.cooldown -= dt * minerSpeedMult(m);
    if (m.cooldown <= 0) {
      const target = m.target;
      mineCell(target, miningPower(m), { kind:'miner', miner:m });
      if (target.mined) {
        m.target = null;
        m.cooldown = MINER_TYPES[m.type]?.interval || 0.78;
      } else {
        m.cooldown = MINER_TYPES[m.type]?.interval || 0.78;
      }
    }
  }
};

// ----- Economy / block resolution -----
oreValueMultiplier = function(type, c, source){
  source = source || { kind:'unknown' };
  let mult = 1 + rank(6) * 0.10;
  if (rank(6) === 5 && Math.random() < 0.10) { mult *= 2; runBonusNotes.add('Ore Value double proc'); }
  if (favoredOre === type) { mult *= 1.5; runBonusNotes.add("Miner's Charm +50%"); }

  if (source.kind === 'miner' && source.miner) {
    const m = source.miner;
    mult *= MINER_TYPES[m.type]?.value || 1;
    if (m.type === 'value') runBonusNotes.add('High-Value Miner +50%');
    if (m.type === 'wide') runBonusNotes.add('Precision Miner +20%');
  }

  if (source.kind === 'prospector' && source.prospector) {
    const p = source.prospector;
    const vals = [0, .10, .175, .25, .325, .40];
    mult *= 1 + (vals[rank(20)] || 0);
    if (rank(20) === 5 && p.firstDeposit) { mult *= 2; runBonusNotes.add('Prospector first deposit ×2'); }
  }

  if (timeLeft <= 10 && rank(21) > 0) {
    mult *= 1 + rank(21) * 0.05;
    runBonusNotes.add('Overtime Pay');
  }

  if (c.oreTypes.length >= 2 && rank(25) > 0) {
    const vals = [0, .10, .20, .30, .40, .50];
    mult *= 1 + (vals[rank(25)] || 0);
    runBonusNotes.add('Treasure Hunter');
  }

  if (oreStreak > 0 && rank(22) > 0) {
    const streakBonus = Math.min(0.50, oreStreak * rank(22) * 0.02);
    mult *= 1 + streakBonus;
    runBonusNotes.add('Ore Streak');
  }

  if (deepMode) {
    mult *= 1 + deepDepth * 0.10;
    runBonusNotes.add(`Deep Mine +${deepDepth * 10}%`);
  }
  return mult;
};

rewardOres = function(types, c, source){
  let tileValue = 0;
  for (const type of types) {
    const ore = ORE_BY_ID[type];
    if (!ore) continue;
    const value = Math.round(ore.value * oreValueMultiplier(type, c, source));
    tileValue += value;
    runOre[type] = (runOre[type] || 0) + 1;
    save.totalOre[type] = (save.totalOre[type] || 0) + 1;
  }
  runCurrency += tileValue;
  if (deepMode) deepBank += tileValue;
  else save.currency += tileValue;
  persist();
};

mineCell = function(c, power, source){
  if (!c || c.mined) return;
  c.hp -= power;
  if (c.hp > 0) return;

  c.mined = true;
  blocksBroken++;
  save.stats.blocks++;

  const remaining = c.oreTypes.filter(t => !c.extracted.includes(t));
  if (remaining.length) {
    rewardOres(remaining, c, source);
    addPreservationBonus(remaining, c, source);
    c.extracted.push(...remaining);
    oreStreak++;
    oreStreakShield = false;
    discoveredOreThisRun.add(`${c.x},${c.y}`);
  } else if (rank(22) === 5 && !oreStreakShield) {
    oreStreakShield = true;
  } else {
    oreStreak = 0;
    oreStreakShield = false;
  }

  if (source?.kind === 'miner' && source.miner) {
    const m = source.miner;
    m.blocksCleared = (m.blocksCleared || 0) + 1;
    if (rank(23) > 0 && m.blocksCleared % 5 === 0) m.hardenedReady = true;
    applySharedExperience(m);
    applyCrackedRock(c);
  }

  if (c === artifactCell && !artifactFoundThisRun) discoverArtifact();
  if (c.hasKey && !keyFound) onKeyFound();
  persist();
};

// ----- Run lifecycle / replacement major upgrades -----
onKeyFound = function(){
  keyFound = true;
  if (rank(18) > 0) {
    postKeyRemaining = rank(18);
    runBonusNotes.add(`Last Chance Mining +${rank(18)}s`);
    return;
  }
  finishRun(true, 'Golden Key found');
};

startRun = function(){
  if (running || placements.length !== crewSize()) return;
  enrichRichStart();
  running = true;
  save.stats.runs++;
  initialTime = roundTime();
  timeLeft = initialTime;
  runElapsed = 0;
  endless = false;
  finalRush = false;
  extraShiftUsed = false;

  for (const m of placements) {
    m.target = null;
    m.cooldown = 0;
    m.hits = 0;
    m.blocksCleared = 0;
    m.hardenedReady = false;
    m.repositionCooldown = null;
  }

  ui.startButton.disabled = true;
  ui.endAttemptButton.disabled = false;
  ui.undoButton.disabled = true;
  ui.resetPlacementButton.disabled = true;
  ui.blastButton.disabled = true;
  renderMineControls();
  persist();
};

handleTimerEnd = function(){
  if (keyFound) { finishRun(true, 'Time complete'); return; }
  if (save.artifacts.timepiece && !timepieceUsed) {
    timepieceUsed = true;
    timeLeft += 10;
    runBonusNotes.add('Timepiece +10s');
    return;
  }
  if (rank(4) === 5 && !overtimeUsed) {
    overtimeUsed = true;
    timeLeft += 5;
    runBonusNotes.add('Longer Shift overtime +5s');
    return;
  }
  if (rank(24) > 0 && !extraShiftUsed) {
    extraShiftUsed = true;
    timeLeft = Math.max(7, Math.round(roundTime() * 0.40));
    runBonusNotes.add(`Extra Shift +${timeLeft}s on the same mine`);
    return;
  }
  finishRun(false, 'Key not found');
};

function rememberFailedOre(level){
  if (!rank(29) || !discoveredOreThisRun.size || deepMode) return;
  const key = String(level);
  const previous = new Set((save.minerNotes[key] || []).map(p => `${p.x},${p.y}`));
  for (const pos of discoveredOreThisRun) previous.add(pos);
  save.minerNotes[key] = [...previous].map(pos => {
    const [x,y] = pos.split(',').map(Number);
    return {x,y};
  });
}

finishRun = function(success, reason){
  if (resultShown) return;
  resultShown = true;
  running = false;
  pausedForArtifact = false;
  ui.endAttemptButton.disabled = true;

  if (deepMode) {
    const context = {
      wasDeep:true,
      success,
      depth:deepDepth,
      virtualLevel:deepVirtualLevel(),
      reason,
      bank:deepBank,
      runCurrency,
      lostBank: success ? 0 : deepBank
    };

    if (success) {
      save.stats.wins++;
      if (!artifactFoundThisRun) save.artifactPity = Math.min(.05, (save.artifactPity || 0) + .005);
      else save.artifactPity = 0;
      deepResultContext = context;
      needsBuild = true;
      persist();
      showResults(true, reason);
      return;
    }

    deepBank = 0;
    deepMode = false;
    deepDepth = 0;
    deepLayout = null;
    deepResultContext = context;
    needsBuild = true;
    persist();
    showResults(false, reason);
    return;
  }

  deepResultContext = null;
  if (success) {
    save.stats.wins++;
    if (!artifactFoundThisRun) save.artifactPity = Math.min(.05, (save.artifactPity || 0) + .005);
    else save.artifactPity = 0;
    delete save.levelLayouts[String(save.level)];
    delete save.minerNotes[String(save.level)];
    save.level++;
  } else {
    rememberFailedOre(save.level);
  }

  needsBuild = true;
  persist();
  showResults(success, reason);
};

function enterDeepMine(completedLevel){
  deepMode = true;
  deepDepth = 1;
  deepBaseLevel = Math.max(1, completedLevel);
  deepBank = 0;
  deepLayout = null;
  deepResultContext = null;
  needsBuild = true;
  showScreen('mineScreen');
}

function descendDeepMine(){
  if (!deepMode) return;
  deepDepth++;
  deepLayout = null;
  deepResultContext = null;
  needsBuild = true;
  showScreen('mineScreen');
}

function cashOutDeepMine(){
  if (!deepMode) return;
  save.currency += deepBank;
  const banked = deepBank;
  deepBank = 0;
  deepMode = false;
  deepDepth = 0;
  deepLayout = null;
  deepResultContext = null;
  needsBuild = true;
  persist();
  showScreen('mineScreen');
  showMessage(`Deep Mine cashed out: ${formatNumber(banked)}`);
}
