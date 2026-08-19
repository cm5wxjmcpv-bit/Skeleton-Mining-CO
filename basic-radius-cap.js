// Stepped mining-radius progression for the standard miners.
// Basic Miner starts with the same 5-block cross it originally used:
// placement tile + north/east/south/west. Radius upgrades then add the
// 4 diagonal blocks one at a time. Wide-Reach gets one additional full
// ring after the Basic footprint is complete.

const BASIC_START_CROSS = [
  [0,0],
  [0,-1],
  [1,0],
  [0,1],
  [-1,0]
];

const BASIC_DIAGONAL_ORDER = [
  [1,-1],   // Rank 1: northeast
  [1,1],    // Rank 2: southeast
  [-1,1],   // Rank 3: southwest
  [-1,-1]   // Rank 4: northwest
];

const previousMaxRankForRadiusSteps = maxRank;
maxRank = function(id){
  if (Number(id) === 1) return 4;
  return previousMaxRankForRadiusSteps(id);
};

// Keep the total cost to fully fill the Basic 3x3 footprint close to the
// original radius-upgrade total, but make every purchase visibly add 1 tile.
UPGRADE_DEFS[1].cost = [10,20,40,60];
UPGRADE_DEFS[1].desc = 'Start with 5 mining blocks, then add one surrounding block per rank.';
UPGRADE_DEFS[1].effect = 'Basic Miner starts with 5 blocks: center plus up/down/left/right. Each of 4 ranks adds one diagonal block. Rank 4 completes the 3×3 footprint. At max radius, a Wide-Reach Miner reaches one additional full block ring for a 5×5 footprint.';

MINER_TYPES.basic.desc = 'Balanced miner. Starts with a 5-block cross; radius upgrades add the four corners one at a time.';
MINER_TYPES.wide.desc = '25% slower. At max Mining Radius, reaches one additional full block ring beyond the Basic Miner.';

// Numeric radius is still used by the other standard miner types.
baseRadius = function(){
  return [1.25,1.45,1.75,2.05,2.45][Math.min(4,rank(1))] || 1.25;
};

function basicStepCoverage(cell,m){
  const dx = cell.x - m.x;
  const dy = cell.y - m.y;

  for (const [sx,sy] of BASIC_START_CROSS) {
    if (sx === dx && sy === dy) return true;
  }

  const unlocked = Math.min(4, rank(1));
  for (let i = 0; i < unlocked; i++) {
    if (BASIC_DIAGONAL_ORDER[i][0] === dx && BASIC_DIAGONAL_ORDER[i][1] === dy) return true;
  }
  return false;
}

const inRadiusBeforeSteppedRadius = inRadius;
inRadius = function(cell,m){
  if (endless || finalRush) return true;
  if (!cell || !m) return false;

  if (m.type === 'basic') return basicStepCoverage(cell,m);

  if (m.type === 'wide') {
    // While Radius is being upgraded, Wide-Reach follows the same inner
    // footprint. Once the Basic footprint is complete, it gains one full
    // additional ring, making a 5x5 square around its placement tile.
    if (rank(1) < 4) return basicStepCoverage(cell,m);
    const dx = Math.abs(cell.x - m.x);
    const dy = Math.abs(cell.y - m.y);
    return dx <= 2 && dy <= 2;
  }

  return inRadiusBeforeSteppedRadius(cell,m);
};

// Target selection must use the exact outlined-cell coverage. Do not let the
// old Long Reach / Clean Sweep radius fallbacks bypass the Basic/Wide limits.
const chooseTargetBeforeSteppedRadius = chooseTarget;
chooseTarget = function(m){
  if (m?.type !== 'basic' && m?.type !== 'wide') return chooseTargetBeforeSteppedRadius(m);

  let best = null;
  let bestDist = Infinity;
  for (const c of mine.flat()) {
    if (c.mined || !inRadius(c,m)) continue;
    const d = Math.hypot(c.x - m.x, c.y - m.y);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  if (!best && !m.cleanSweep && rank(26) > 0) m.cleanSweep = true;
  return best;
};

// Save migration from the temporary 8-rank radius test. Any rank above 4 is
// now simply treated as max radius. This avoids breaking current playtests.
if (rank(1) > 4) {
  save.upgrades[1] = 4;
  persist();
}
