// Cap the Basic Miner at the 8 surrounding blocks: one tile in every direction.
const BASIC_MINER_MAX_RADIUS = Math.SQRT2 + 0.0001;
const minerRadiusBeforeBasicCap = minerRadius;
const chooseTargetBeforeBasicCap = chooseTarget;

minerRadius = function(m) {
  const radius = minerRadiusBeforeBasicCap(m);
  if (m?.type === 'basic' && !endless && !finalRush) {
    return Math.min(radius, BASIC_MINER_MAX_RADIUS);
  }
  return radius;
};

// The normal Rank-5 Long Reach and Clean Sweep reach extensions must not
// push a Basic Miner outside its one-block ring. Major effects that
// intentionally ignore radius (Final Rush / Endless Extraction) still work.
chooseTarget = function(m) {
  if (m?.type !== 'basic' || endless || finalRush) {
    return chooseTargetBeforeBasicCap(m);
  }

  let best = null;
  let bestDist = Infinity;
  for (const c of mine.flat()) {
    if (c.mined || !inRadius(c, m)) continue;
    const d = Math.hypot(c.x - m.x, c.y - m.y);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  if (!best && !m.cleanSweep && rank(26) > 0) {
    m.cleanSweep = true;
    return chooseTarget(m);
  }

  return best;
};

UPGRADE_DEFS[1].desc = 'Expand miner reach without letting the Basic Miner exceed its one-block ring.';
UPGRADE_DEFS[1].effect = 'Basic Miner maximum: the 8 surrounding blocks, one tile in every direction. Larger-reach miner types can still benefit from radius upgrades.';
