'use strict';

// Give a new playthrough a few immediate upgrade choices without weakening
// the later progression gates.
(function(){
  'use strict';

  if (typeof DEFAULT_SAVE === 'undefined' || typeof UPGRADE_DEFS === 'undefined') return;

  const STARTER_VALUE = 125;

  // Fresh save slots begin with enough value to buy Radius rank 1 and then
  // choose one or two of the inexpensive early branches.
  DEFAULT_SAVE.currency = STARTER_VALUE;

  // Radius rank 1 opens the tree at Level 1. Later ranks remain career-gated.
  UPGRADE_DEFS[1].rankGates = [1, 15, 25, 40];
  UPGRADE_DEFS[1].desc = 'Expand the Basic/Precision mining footprint one tile at a time. The first rank is available immediately; later ranks require career progress.';
  UPGRADE_DEFS[1].effect = 'Rank gates: Level 1 / 15 / 25 / 40. Rank 4 completes the Basic/Precision 3×3 footprint.';

  function hasAnyUpgrade(){
    return Object.values(save?.upgrades || {}).some(value => Number(value) > 0);
  }

  function applyStarterGrant(){
    if (typeof save === 'undefined' || !save) return;
    save.auditMigrations = { ...(save.auditMigrations || {}) };
    if (save.auditMigrations.starterUpgradeValueV1) return;

    // Help existing test slots that are still at the opening and have not
    // purchased anything yet. Do not alter progressed saves.
    if (Number(save.level || 1) === 1 && !hasAnyUpgrade()) {
      save.currency = Math.max(Number(save.currency || 0), STARTER_VALUE);
    }

    save.auditMigrations.starterUpgradeValueV1 = true;
    if (typeof persist === 'function') persist();
  }

  applyStarterGrant();

  // Save-slot switching replaces the global save object, so re-check when a
  // mine is built after loading another slot.
  if (typeof buildMine === 'function') {
    const buildMineBeforeStarterGrant = buildMine;
    buildMine = function(){
      applyStarterGrant();
      return buildMineBeforeStarterGrant.apply(this, arguments);
    };
  }

  try { if (typeof renderAll === 'function') renderAll(); } catch {}
})();
