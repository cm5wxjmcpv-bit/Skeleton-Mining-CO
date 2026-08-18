(() => {
  'use strict';

  const canvas = document.getElementById('mineCanvas');
  const ctx = canvas.getContext('2d');

  const ui = {
    levelStat: document.getElementById('levelStat'),
    goldStat: document.getElementById('goldStat'),
    timeStat: document.getElementById('timeStat'),
    levelTitle: document.getElementById('levelTitle'),
    levelGoal: document.getElementById('levelGoal'),
    startButton: document.getElementById('startButton'),
    endAttemptButton: document.getElementById('endAttemptButton'),
    undoButton: document.getElementById('undoButton'),
    resetPlacementButton: document.getElementById('resetPlacementButton'),
    resetSaveButton: document.getElementById('resetSaveButton'),
    placementHint: document.getElementById('placementHint'),
    crewList: document.getElementById('crewList'),
    crewCount: document.getElementById('crewCount'),
    upgradeList: document.getElementById('upgradeList'),
    levelButtons: document.getElementById('levelButtons'),
    messageOverlay: document.getElementById('messageOverlay')
  };

  const LEVELS = [
    { width: 9, height: 6, time: 42, rockHp: 2, goldChance: 0.14 },
    { width: 11, height: 7, time: 45, rockHp: 2, goldChance: 0.14 },
    { width: 13, height: 8, time: 48, rockHp: 3, goldChance: 0.15 },
    { width: 14, height: 9, time: 50, rockHp: 3, goldChance: 0.16 },
    { width: 16, height: 10, time: 54, rockHp: 4, goldChance: 0.17 }
  ];

  const UPGRADE_DEFS = {
    radius: { name: 'Mining Radius', desc: '+0.15 tiles to every standard skeleton.', base: 25, scale: 1.85 },
    speed: { name: 'Mining Speed', desc: 'Skeletons strike 12% faster per rank.', base: 30, scale: 1.9 },
    crew: { name: 'Crew Size', desc: '+1 standard skeleton you can deploy.', base: 120, scale: 2.4 },
    time: { name: 'Longer Shift', desc: '+4 seconds to every round.', base: 70, scale: 2.1 }
  };

  const DEFAULT_SAVE = {
    gold: 0,
    maxLevel: 1,
    selectedLevel: 1,
    upgrades: { radius: 0, speed: 0, crew: 0, time: 0 },
    keyLocations: {}
  };

  let save = loadSave();
  let levelIndex = Math.max(0, Math.min(LEVELS.length - 1, save.selectedLevel - 1));
  let mine = [];
  let keyCell = null;
  let placements = [];
  let running = false;
  let resultShown = false;
  let timeLeft = 0;
  let lastFrame = performance.now();
  let miningAccumulator = 0;
  let goldDigger = null;

  function loadSave() {
    try {
      const parsed = JSON.parse(localStorage.getItem('skeletonMiningSave'));
      if (!parsed) return structuredClone(DEFAULT_SAVE);
      return {
        ...structuredClone(DEFAULT_SAVE),
        ...parsed,
        upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) },
        keyLocations: { ...(parsed.keyLocations || {}) }
      };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  function persist() {
    save.selectedLevel = levelIndex + 1;
    localStorage.setItem('skeletonMiningSave', JSON.stringify(save));
  }

  function levelConfig() {
    return LEVELS[levelIndex];
  }

  function radiusTiles() {
    return 1.25 + save.upgrades.radius * 0.15;
  }

  function crewSize() {
    return 2 + save.upgrades.crew;
  }

  function roundTime() {
    return levelConfig().time + save.upgrades.time * 4;
  }

  function miningInterval() {
    return Math.max(0.18, 0.78 * Math.pow(0.88, save.upgrades.speed));
  }

  function goldDiggerUnlocked() {
    return save.maxLevel >= 3;
  }

  function keyLocationForLevel() {
    const cfg = levelConfig();
    const key = String(levelIndex + 1);
    const stored = save.keyLocations[key];
    if (
      stored &&
      Number.isInteger(stored.x) && Number.isInteger(stored.y) &&
      stored.x >= 0 && stored.y >= 0 && stored.x < cfg.width && stored.y < cfg.height
    ) {
      return stored;
    }

    const location = {
      x: Math.floor(Math.random() * cfg.width),
      y: Math.floor(Math.random() * cfg.height)
    };
    save.keyLocations[key] = location;
    persist();
    return location;
  }

  function buildMine() {
    const cfg = levelConfig();
    mine = [];
    for (let y = 0; y < cfg.height; y++) {
      const row = [];
      for (let x = 0; x < cfg.width; x++) {
        const type = Math.random() < cfg.goldChance ? 'gold' : 'rock';
        row.push({ x, y, type, hp: cfg.rockHp, maxHp: cfg.rockHp, mined: false });
      }
      mine.push(row);
    }

    const keyLocation = keyLocationForLevel();
    keyCell = mine[keyLocation.y][keyLocation.x];
    keyCell.hasKey = true;

    placements = [];
    running = false;
    resultShown = false;
    timeLeft = roundTime();
    miningAccumulator = 0;
    goldDigger = goldDiggerUnlocked() ? { x: 0, y: cfg.height - 1, target: null, progress: 0 } : null;
    hideMessage();
    renderUi();
    draw();
  }

  function canvasMetrics() {
    const cfg = levelConfig();
    const pad = 28;
    const cell = Math.min((canvas.width - pad * 2) / cfg.width, (canvas.height - pad * 2) / cfg.height);
    const boardW = cell * cfg.width;
    const boardH = cell * cfg.height;
    const left = (canvas.width - boardW) / 2;
    const top = (canvas.height - boardH) / 2;
    return { cell, left, top, boardW, boardH };
  }

  function pointerToCell(event) {
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (canvas.width / rect.width);
    const py = (event.clientY - rect.top) * (canvas.height / rect.height);
    const { cell, left, top } = canvasMetrics();
    const x = Math.floor((px - left) / cell);
    const y = Math.floor((py - top) / cell);
    const cfg = levelConfig();
    if (x < 0 || y < 0 || x >= cfg.width || y >= cfg.height) return null;
    return { x, y };
  }

  function placeSkeleton(event) {
    if (running || placements.length >= crewSize()) return;
    const cell = pointerToCell(event);
    if (!cell) return;

    const duplicate = placements.some(p => p.x === cell.x && p.y === cell.y);
    if (duplicate) return;

    placements.push({ x: cell.x, y: cell.y });
    renderUi();
    draw();
  }

  function coveredBySkeleton(cell, skeleton) {
    const dx = cell.x + 0.5 - (skeleton.x + 0.5);
    const dy = cell.y + 0.5 - (skeleton.y + 0.5);
    return Math.hypot(dx, dy) <= radiusTiles();
  }

  function chooseTarget(skeleton) {
    let best = null;
    let bestDist = Infinity;
    for (const row of mine) {
      for (const cell of row) {
        if (cell.mined || !coveredBySkeleton(cell, skeleton)) continue;
        const dist = Math.hypot(cell.x - skeleton.x, cell.y - skeleton.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = cell;
        }
      }
    }
    return best;
  }

  function mineCell(cell, power = 1) {
    if (!cell || cell.mined) return;
    cell.hp -= power;
    if (cell.hp > 0) return;

    cell.mined = true;
    if (cell.type === 'gold') {
      const value = 7 + levelIndex * 2 + Math.floor(Math.random() * 5);
      save.gold += value;
      persist();
    }

    if (cell.hasKey) {
      finishRound(true);
    }
  }

  function standardMiningTick() {
    for (const skeleton of placements) {
      const target = chooseTarget(skeleton);
      if (target) mineCell(target, 1);
    }
  }

  function findGoldTarget() {
    let best = null;
    let bestDist = Infinity;
    if (!goldDigger) return null;
    for (const row of mine) {
      for (const cell of row) {
        if (cell.mined || cell.type !== 'gold' || cell.hasKey) continue;
        const d = Math.abs(cell.x - goldDigger.x) + Math.abs(cell.y - goldDigger.y);
        if (d < bestDist) {
          bestDist = d;
          best = cell;
        }
      }
    }
    return best;
  }

  function updateGoldDigger(dt) {
    if (!running || !goldDiggerUnlocked() || !goldDigger) return;
    if (!goldDigger.target || goldDigger.target.mined) goldDigger.target = findGoldTarget();
    const target = goldDigger.target;
    if (!target) return;

    goldDigger.progress += dt;
    if (goldDigger.progress < 0.22) return;
    goldDigger.progress = 0;

    if (goldDigger.x < target.x) goldDigger.x++;
    else if (goldDigger.x > target.x) goldDigger.x--;
    else if (goldDigger.y < target.y) goldDigger.y++;
    else if (goldDigger.y > target.y) goldDigger.y--;
    else {
      mineCell(target, 2);
      if (target.mined) goldDigger.target = null;
    }
  }

  function startRound() {
    if (running) return;
    if (placements.length === 0) {
      showMessage('PLACE AT LEAST ONE SKELETON');
      setTimeout(() => { if (!running) hideMessage(); }, 900);
      return;
    }
    running = true;
    resultShown = false;
    timeLeft = roundTime();
    renderUi();
  }

  function finishRound(success, reason = 'timeout') {
    if (resultShown) return;
    resultShown = true;
    running = false;

    if (success) {
      const completedLevel = levelIndex + 1;
      if (completedLevel === save.maxLevel && save.maxLevel < LEVELS.length) {
        save.maxLevel++;
      }
      persist();
      showMessage(`GOLDEN KEY FOUND!\nLevel ${completedLevel} complete`);
    } else if (reason === 'ended') {
      showMessage('ATTEMPT ENDED\nGold kept');
    } else {
      showMessage('SHIFT OVER\nKey not found — gold kept');
    }

    renderUi();
  }

  function endAttempt() {
    if (!running) return;
    finishRound(false, 'ended');
  }

  function nextAttempt() {
    if (resultShown) {
      hideMessage();
      if (keyCell && keyCell.mined && keyCell.hasKey && levelIndex + 1 < save.maxLevel) {
        levelIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
      }
      buildMine();
    }
  }

  function showMessage(text) {
    ui.messageOverlay.textContent = text;
    ui.messageOverlay.classList.remove('hidden');
  }

  function hideMessage() {
    ui.messageOverlay.classList.add('hidden');
  }

  function upgradeCost(key) {
    const def = UPGRADE_DEFS[key];
    const rank = save.upgrades[key];
    return Math.round(def.base * Math.pow(def.scale, rank));
  }

  function buyUpgrade(key) {
    if (running) return;
    const cost = upgradeCost(key);
    if (save.gold < cost) return;
    save.gold -= cost;
    save.upgrades[key]++;
    persist();
    timeLeft = roundTime();
    renderUi();
    draw();
  }

  function renderUi() {
    ui.levelStat.textContent = levelIndex + 1;
    ui.goldStat.textContent = save.gold;
    ui.timeStat.textContent = timeLeft.toFixed(1);
    ui.levelTitle.textContent = `Level ${levelIndex + 1}`;
    ui.levelGoal.textContent = `Find the Golden Key in ${roundTime()} seconds. The key stays put for this playthrough.`;

    const remaining = crewSize() - placements.length;
    ui.placementHint.textContent = running
      ? 'Mining is automatic. End the attempt early whenever you want to redeploy.'
      : remaining > 0
        ? `Tap the mine to place Skeleton ${placements.length + 1}. ${remaining} remaining.`
        : 'Crew placed. Start the shift or reset the deployment.';

    ui.startButton.disabled = running || placements.length === 0;
    ui.startButton.textContent = resultShown ? 'New Attempt' : 'Start Mining';
    ui.endAttemptButton.disabled = !running;
    ui.undoButton.disabled = running;
    ui.resetPlacementButton.disabled = running;
    ui.crewCount.textContent = `${crewSize()} standard`;

    ui.crewList.innerHTML = '';
    const standard = document.createElement('div');
    standard.className = 'crew-card';
    standard.innerHTML = `<strong>Standard Skeleton ×${crewSize()}</strong><span>Fixed after placement. Mines every block inside a ${radiusTiles().toFixed(2)} tile radius.</span>`;
    ui.crewList.appendChild(standard);

    const gold = document.createElement('div');
    gold.className = `crew-card ${goldDiggerUnlocked() ? '' : 'locked'}`;
    gold.innerHTML = goldDiggerUnlocked()
      ? '<strong>Gold Digger ×1 — UNLOCKED</strong><span>Roams the entire map automatically and hunts gold ore. It ignores the Golden Key.</span>'
      : '<strong>Gold Digger — Level 3</strong><span>Unlocks after reaching Level 3. Roams the entire mine searching for gold.</span>';
    ui.crewList.appendChild(gold);

    ui.upgradeList.innerHTML = '';
    for (const [key, def] of Object.entries(UPGRADE_DEFS)) {
      const cost = upgradeCost(key);
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `<div><strong>${def.name} — Rank ${save.upgrades[key]}</strong><span>${def.desc}</span></div>`;
      const button = document.createElement('button');
      button.textContent = `${cost}g`;
      button.disabled = running || save.gold < cost;
      button.addEventListener('click', () => buyUpgrade(key));
      card.appendChild(button);
      ui.upgradeList.appendChild(card);
    }

    ui.levelButtons.innerHTML = '';
    LEVELS.forEach((_, i) => {
      const levelNum = i + 1;
      const button = document.createElement('button');
      const locked = levelNum > save.maxLevel;
      button.textContent = levelNum;
      button.disabled = locked || running;
      button.className = `${levelNum === levelIndex + 1 ? 'active' : ''} ${locked ? 'locked' : ''}`;
      button.addEventListener('click', () => {
        if (locked || running) return;
        levelIndex = i;
        persist();
        buildMine();
      });
      ui.levelButtons.appendChild(button);
    });
  }

  function draw() {
    const cfg = levelConfig();
    const { cell, left, top } = canvasMetrics();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#090806';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const row of mine) {
      for (const tile of row) {
        const x = left + tile.x * cell;
        const y = top + tile.y * cell;
        ctx.strokeStyle = '#37291f';
        ctx.lineWidth = 1;

        if (tile.mined) {
          ctx.fillStyle = '#18130f';
          ctx.fillRect(x, y, cell, cell);
          if (tile.hasKey) {
            ctx.fillStyle = '#f5cf48';
            ctx.font = `${cell * 0.52}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🔑', x + cell / 2, y + cell / 2);
          } else if (tile.type === 'gold') {
            ctx.fillStyle = '#7c6627';
            ctx.beginPath();
            ctx.arc(x + cell / 2, y + cell / 2, cell * .12, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = '#332920';
          ctx.fillRect(x, y, cell, cell);
          ctx.fillStyle = '#4a3a2d';
          ctx.beginPath();
          ctx.arc(x + cell * .35, y + cell * .38, cell * .12, 0, Math.PI * 2);
          ctx.arc(x + cell * .63, y + cell * .61, cell * .15, 0, Math.PI * 2);
          ctx.fill();
          if (tile.hp < tile.maxHp) {
            ctx.fillStyle = '#786253';
            ctx.fillRect(x + cell * .18, y + cell * .77, cell * .64 * (tile.hp / tile.maxHp), cell * .055);
          }
        }
        ctx.strokeRect(x, y, cell, cell);
      }
    }

    for (let i = 0; i < placements.length; i++) {
      const s = placements[i];
      const cx = left + (s.x + .5) * cell;
      const cy = top + (s.y + .5) * cell;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusTiles() * cell, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(106, 166, 191, .10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(123, 199, 229, .82)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#e9e2d4';
      ctx.font = `700 ${cell * .45}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☠', cx, cy);
      ctx.fillStyle = '#d0ecf7';
      ctx.font = `700 ${Math.max(12, cell * .16)}px sans-serif`;
      ctx.fillText(String(i + 1), cx, cy + cell * .34);
    }

    if (goldDiggerUnlocked() && goldDigger) {
      const cx = left + (goldDigger.x + .5) * cell;
      const cy = top + (goldDigger.y + .5) * cell;
      ctx.fillStyle = '#f2c84e';
      ctx.font = `700 ${cell * .43}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☠', cx, cy);
      ctx.font = `700 ${Math.max(10, cell * .14)}px sans-serif`;
      ctx.fillText('GOLD', cx, cy + cell * .34);
    }

    ctx.strokeStyle = '#745a3f';
    ctx.lineWidth = 3;
    ctx.strokeRect(left, top, cfg.width * cell, cfg.height * cell);
  }

  function frame(now) {
    const dt = Math.min(.1, (now - lastFrame) / 1000);
    lastFrame = now;

    if (running) {
      timeLeft -= dt;
      miningAccumulator += dt;
      while (miningAccumulator >= miningInterval()) {
        miningAccumulator -= miningInterval();
        standardMiningTick();
      }
      updateGoldDigger(dt);
      if (timeLeft <= 0) {
        timeLeft = 0;
        finishRound(false);
      }
      ui.timeStat.textContent = timeLeft.toFixed(1);
      ui.goldStat.textContent = save.gold;
      draw();
    }

    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', placeSkeleton);
  ui.startButton.addEventListener('click', () => {
    if (resultShown) nextAttempt();
    else startRound();
  });
  ui.endAttemptButton.addEventListener('click', endAttempt);
  ui.messageOverlay.addEventListener('click', nextAttempt);
  ui.undoButton.addEventListener('click', () => {
    if (running) return;
    placements.pop();
    renderUi();
    draw();
  });
  ui.resetPlacementButton.addEventListener('click', () => {
    if (running) return;
    placements = [];
    renderUi();
    draw();
  });
  ui.resetSaveButton.addEventListener('click', () => {
    if (!confirm('Reset all gold, upgrades, unlocked levels, and key locations?')) return;
    save = structuredClone(DEFAULT_SAVE);
    levelIndex = 0;
    persist();
    buildMine();
  });

  buildMine();
  requestAnimationFrame(frame);
})();
