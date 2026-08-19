// Stepped mining-radius progression for the standard miners.
// Basic Miner starts on its placement tile and earns the 8 neighboring tiles
// one at a time. Wide-Reach gets one additional full ring at max radius.

const BASIC_RING_ORDER = [
  [0,-1],   // 1: north
  [1,-1],   // 2: northeast
  [1,0],    // 3: east
  [1,1],    // 4: southeast
  [0,1],    // 5: south
  [-1,1],   // 6: southwest
  [-1,0],   // 7: west
  [-1,-1]   // 8: northwest
];

const previousMaxRankForRadiusSteps = maxRank;
maxRank = function(id){
  if (Number(id) === 1) return 8;
  return previousMaxRankForRadiusSteps(id);
};

// Keep the old five-rank total price about the same, but spread it over
// eight visible one-block upgrades.
UPGRADE_DEFS[1].cost = [5,8,12,15,18,20,24,28];
UPGRADE_DEFS[1].desc = 'Add the blocks surrounding each Basic Miner one at a time.';
UPGRADE_DEFS[1].effect = 'Basic Miner: starts with its placement block. Each rank adds exactly 1 of the 8 surrounding blocks. Rank 8 completes the 3×3 footprint. At max radius, a Wide-Reach Miner extends one additional block all the way around for a 5×5 footprint.';

MINER_TYPES.basic.desc = 'Balanced miner. Radius upgrades add its 8 surrounding blocks one at a time.';
MINER_TYPES.wide.desc = '25% slower. At max Mining Radius, reaches one additional full block ring beyond the Basic Miner.';

// Extend the numeric radius curve so other miner types do not fall back to
// the old rank-0 value when Mining Radius now reaches ranks 6-8.
baseRadius = function(){
  return [1.25,1.45,1.60,1.75,1.90,2.05,2.20,2.35,2.50][Math.min(8,rank(1))] || 1.25;
};

function basicStepCoverage(cell,m){
  const dx = cell.x - m.x;
  const dy = cell.y - m.y;
  if (dx === 0 && dy === 0) return true;
  const unlocked = Math.min(8, rank(1));
  for (let i = 0; i < unlocked; i++) {
    if (BASIC_RING_ORDER[i][0] === dx && BASIC_RING_ORDER[i][1] === dy) return true;
  }
  return false;
}

const inRadiusBeforeSteppedRadius = inRadius;
inRadius = function(cell,m){
  if (endless || finalRush) return true;
  if (!cell || !m) return false;

  if (m.type === 'basic') return basicStepCoverage(cell,m);

  if (m.type === 'wide') {
    // Wide-Reach follows the same one-at-a-time inner ring while upgrading.
    // Once Radius is maxed, it gains one complete extra ring: 5x5 total.
    if (rank(1) < 8) return basicStepCoverage(cell,m);
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
