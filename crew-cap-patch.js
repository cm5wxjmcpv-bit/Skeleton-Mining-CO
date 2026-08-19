// Cap the standard crew at five total skeletons.
const previousMaxRankForCrewCap = maxRank;
maxRank = function(id){
  if (Number(id) === 3) return 3;
  return previousMaxRankForCrewCap(id);
};

crewSize = function(){
  return Math.min(5, 2 + rank(3));
};

UPGRADE_DEFS[3].desc = 'Add one standard skeleton slot per rank, up to a maximum crew of 5.';
UPGRADE_DEFS[3].effect = 'Base crew is 2. Rank 1 = 3 miners, Rank 2 = 4 miners, Rank 3 = 5 miners. Maximum standard crew size is 5.';
UPGRADE_DEFS[3].cost = [20, 40, 80];

// Safely migrate any older save that somehow bought ranks above the new cap.
if (rank(3) > 3) {
  const oldCrewCosts = [20, 40, 80, 140, 240];
  let refund = 0;
  for (let i = 3; i < rank(3); i++) refund += oldCrewCosts[i] || 0;
  save.currency += refund;
  save.upgrades[3] = 3;
  save.crewLoadout = (save.crewLoadout || []).slice(0, 5);
  persist();
}
