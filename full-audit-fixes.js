'use strict';

// Final runtime compatibility pass for the live modular build.
// This file intentionally loads after Home/touch/tutorial patches so it can
// protect the rebalance from late overrides without rewriting the core files.
(function(){
  'use strict';

  if (typeof MINER_TYPES === 'undefined' || typeof save === 'undefined') return;

  // ---------------------------------------------------------------------------
  // Miner progression: Home used to overwrite the new Precision Miner with the
  // retired Wide-Reach values after the rebalance had already loaded.
  // ---------------------------------------------------------------------------
  Object.assign(MINER_TYPES.wide, {
    name: 'Precision Miner',
    unlock: 35,
    interval: 0.78,
    radius: 1,
    value: 1.20,
    desc: 'Only mines ore-bearing blocks and the Golden Key inside the Basic Miner footprint. Ignores ordinary rock. Ore mined by this miner is worth +20%.'
  });
  MINER_TYPES.fast.unlock = 10;
  MINER_TYPES.value.unlock = 50;

  // The stepped Basic/Precision footprint cannot apply the old numeric Totem
  // radius multiplier consistently. Keep the artifact useful and predictable
  // without reintroducing oversized coverage: Totem is now speed-only.
  if (typeof ARTIFACTS !== 'undefined' && ARTIFACTS.totem) {
    ARTIFACTS.totem.desc = 'One random standard skeleton gets +25% mining speed each run.';
  }
  if (typeof minerRadius === 'function') {
    minerRadius = function(m){
      return baseRadius() * (MINER_TYPES[m.type]?.radius || 1);
    };
  }

  // ---------------------------------------------------------------------------
  // Upgrade-spend ledger. Reset Relics previously calculated refunds using the
  // NEW price table, which could massively over-refund old saves after the
  // radius/crew rebalance. Track actual purchase spend going forward and seed
  // legacy saves with the prices that were in use before this rebalance.
  // ---------------------------------------------------------------------------
  const LEGACY_COSTS = {
    1: [10, 20, 40, 60],
    3: [20, 40],
    29: [375, 750, 1500, 2625, 4500]
  };

  function numericRank(id){
    return Number(save.upgrades?.[id] || 0);
  }

  function sumCosts(costs, count){
    let total = 0;
    for (let i = 0; i < count; i++) total += Number(costs?.[i] || 0);
    return total;
  }

  function ensureUpgradeSpend(){
    save.upgrades = { ...(save.upgrades || {}) };
    save.auditMigrations = { ...(save.auditMigrations || {}) };

    if (!save.upgradeSpend || typeof save.upgradeSpend !== 'object') {
      const ledger = {};
      for (const [id, rawRank] of Object.entries(save.upgrades)) {
        const r = Math.max(0, Number(rawRank) || 0);
        const costs = LEGACY_COSTS[id] || UPGRADE_DEFS[id]?.cost || [];
        ledger[id] = sumCosts(costs, r);
      }
      save.upgradeSpend = ledger;
    }

    // Treasure Rush used to have five ranks; Miner's Notes is intentionally a
    // one-rank utility. Clamp old saves and refund only the ranks that vanished.
    if (!save.auditMigrations.minersNotesRankV1) {
      const oldRank = numericRank(29);
      if (oldRank > 1) {
        const oldSpend = sumCosts(LEGACY_COSTS[29], oldRank);
        const keptSpend = LEGACY_COSTS[29][0];
        save.currency += Math.max(0, oldSpend - keptSpend);
        save.upgrades[29] = 1;
        save.upgradeSpend[29] = keptSpend;
      }
      save.auditMigrations.minersNotesRankV1 = true;
    }

    if (typeof persist === 'function') persist();
  }

  ensureUpgradeSpend();

  if (typeof buildMine === 'function') {
    const buildMineBeforeAudit = buildMine;
    buildMine = function(){
      ensureUpgradeSpend();
      const result = buildMineBeforeAudit.apply(this, arguments);
      // A Reset Relic removes Miner's Notes. Do not keep showing remembered
      // markers after the upgrade itself is gone.
      if (numericRank(29) === 0 && typeof notesTiles !== 'undefined') {
        notesTiles = [];
        try { if (typeof draw === 'function') draw(); } catch {}
      }
      return result;
    };
  }

  if (typeof buyUpgrade === 'function') {
    const buyUpgradeBeforeAudit = buyUpgrade;
    buyUpgrade = function(id){
      ensureUpgradeSpend();
      const beforeRank = numericRank(id);
      const cost = typeof nextCost === 'function' ? Number(nextCost(id)) : NaN;
      const result = buyUpgradeBeforeAudit.apply(this, arguments);
      const afterRank = numericRank(id);
      if (afterRank > beforeRank && Number.isFinite(cost)) {
        save.upgradeSpend[id] = Number(save.upgradeSpend[id] || 0) + cost;
        persist();
      }
      return result;
    };
  }

  // Reset Relic refund is based on the spend ledger rather than today's price
  // table. This keeps both legacy and newly purchased upgrades fair.
  if (typeof useResetRelic === 'function') {
    useResetRelic = function(){
      if (save.artifacts.resetRelics < 1) return;
      if (typeof deepMode !== 'undefined' && deepMode) {
        flashAuditNotice('Cash out or finish the Deep Mine before resetting upgrades.');
        return;
      }
      ensureUpgradeSpend();
      const refund = Object.values(save.upgradeSpend || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
      save.currency += refund;
      save.upgrades = {};
      save.upgradeSpend = {};
      save.minerNotes = {};
      save.artifacts.resetRelics--;
      if (typeof notesTiles !== 'undefined') notesTiles = [];
      normalizeCrewLoadout();
      persist();
      renderAll();
      try { draw(); } catch {}
    };
  }

  // ---------------------------------------------------------------------------
  // Deep Mine safety. A successful Deep floor must end with exactly two valid
  // choices: descend or cash out. Leaving through Upgrades/Crew previously let
  // the same cleared floor rebuild and be farmed repeatedly.
  // ---------------------------------------------------------------------------
  function deepResultLocked(){
    return !!(typeof deepMode !== 'undefined' && deepMode && typeof deepResultContext !== 'undefined' && deepResultContext?.wasDeep && deepResultContext?.success);
  }

  if (typeof showResults === 'function') {
    const showResultsBeforeAudit = showResults;
    showResults = function(){
      const result = showResultsBeforeAudit.apply(this, arguments);
      const locked = deepResultLocked();
      if (ui.resultUpgradeButton) ui.resultUpgradeButton.hidden = locked;
      if (ui.resultCrewButton) ui.resultCrewButton.hidden = locked;
      if (ui.resultArtifactsButton) ui.resultArtifactsButton.hidden = locked;
      return result;
    };
  }

  if (typeof renderTopbar === 'function') {
    const renderTopbarBeforeAudit = renderTopbar;
    renderTopbar = function(){
      const result = renderTopbarBeforeAudit.apply(this, arguments);
      if (typeof deepMode !== 'undefined' && deepMode) {
        ui.artifactsButton?.classList.add('hidden');
        ui.resultArtifactsButton?.classList.add('hidden');
      }
      return result;
    };
  }

  // Deep Mine is intentionally unbanked. Do not let Save/Home imply that the
  // current bank is protected or allow cross-save in-memory state to leak.
  function flashAuditNotice(text){
    let notice = document.getElementById('auditGameNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'auditGameNotice';
      notice.style.cssText = 'position:fixed;z-index:220;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(92vw,620px);padding:10px 14px;border:1px solid #8d6a1f;border-radius:10px;background:#211a14;color:#f4ead8;font-weight:800;text-align:center;box-shadow:0 8px 28px rgba(0,0,0,.5);pointer-events:none;opacity:0;transition:opacity .15s';
      document.body.appendChild(notice);
    }
    notice.textContent = text;
    notice.style.opacity = '1';
    clearTimeout(notice._hideTimer);
    notice._hideTimer = setTimeout(() => { notice.style.opacity = '0'; }, 1700);
  }

  function guardDeepNavigation(event){
    if (!(typeof deepMode !== 'undefined' && deepMode)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    flashAuditNotice('Deep Mine value is unbanked. Cash out or finish the Deep Mine first.');
  }

  ['gameHomeButton','gameHomeButtonMobile','gameSaveButton','gameSaveButtonMobile'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', guardDeepNavigation, { capture:true });
  });

  // Cash Out used the full-canvas message overlay, but nothing dismissed it,
  // leaving the next normal mine impossible to place miners on. Auto-dismiss it
  // and also allow a tap to dismiss any future informational overlay.
  document.getElementById('deepCashButton')?.addEventListener('click', () => {
    setTimeout(() => { try { hideMessage(); } catch {} }, 1400);
  }, { capture:true });
  ui.messageOverlay?.addEventListener('click', () => { try { hideMessage(); } catch {} });

  // Render Deep Mine terrain using its virtual depth level rather than the
  // normal career level. Only the draw call sees the temporary value.
  if (typeof draw === 'function' && typeof deepVirtualLevel === 'function') {
    const drawBeforeAudit = draw;
    draw = function(){
      if (!(typeof deepMode !== 'undefined' && deepMode)) return drawBeforeAudit.apply(this, arguments);
      const careerLevel = save.level;
      try {
        save.level = deepVirtualLevel();
        return drawBeforeAudit.apply(this, arguments);
      } finally {
        save.level = careerLevel;
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Correct late miner-unlock notices without rewriting Home's save-slot UI.
  // Home's old 20/30 notices are suppressed; the replacement miners announce
  // at their actual Level 35/50 unlocks.
  // ---------------------------------------------------------------------------
  function showCorrectMinerUnlock(kind){
    const info = kind === 'precision'
      ? {
          name:'Precision Miner', level:35, tone:'orange',
          summary:'Mines only ore + key', tradeoff:'Ignores ordinary rock',
          desc:'Uses the Basic Miner footprint and gives +20% value on ore it mines.'
        }
      : {
          name:'High-Value Miner', level:50, tone:'purple',
          summary:'Ore worth 50% more', tradeoff:'30% slower mining',
          desc:'Slower swings, but every ore it collects pays more.'
        };

    const card = document.getElementById('unlockCard');
    const modal = card?.closest('.simple-guide');
    if (!card || !modal) return;
    card.className = `guide-card unlock-card ${info.tone}`;
    document.getElementById('unlockName').textContent = info.name;
    document.getElementById('unlockLevel').textContent = `Unlocked at Level ${info.level}`;
    document.getElementById('unlockStat1').textContent = info.summary;
    document.getElementById('unlockStat2').textContent = info.tradeoff;
    document.getElementById('unlockDesc').textContent = info.desc;
    modal.classList.remove('hidden');
  }

  if (typeof finishRun === 'function') {
    const finishRunBeforeAudit = finishRun;
    finishRun = function(success, reason){
      const wasDeep = typeof deepMode !== 'undefined' && deepMode;
      const before = Number(save.level || 1);

      if (success && !wasDeep) {
        save.unlockNotices = { ...(save.unlockNotices || {}) };
        // Prevent the retired Home notices from firing at Levels 20 and 30.
        if (before < 20 && before + 1 >= 20) save.unlockNotices.wide = true;
        if (before < 30 && before + 1 >= 30) save.unlockNotices.value = true;
      }

      const result = finishRunBeforeAudit.apply(this, arguments);

      if (success && !wasDeep) {
        const after = Number(save.level || before);
        save.correctedUnlockNotices = { ...(save.correctedUnlockNotices || {}) };
        if (before < 35 && after >= 35 && !save.correctedUnlockNotices.precision35) {
          save.correctedUnlockNotices.precision35 = true;
          persist();
          setTimeout(() => showCorrectMinerUnlock('precision'), 100);
        }
        if (before < 50 && after >= 50 && !save.correctedUnlockNotices.value50) {
          save.correctedUnlockNotices.value50 = true;
          persist();
          setTimeout(() => showCorrectMinerUnlock('value'), 100);
        }
      }
      return result;
    };
  }

  // Refresh anything already rendered before this late compatibility file ran.
  try { renderAll(); } catch {}
  try { draw(); } catch {}
})();
