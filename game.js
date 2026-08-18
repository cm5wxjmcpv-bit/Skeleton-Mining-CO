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
    specialistList: document.getElementById('specialistList'),
    upgradeList: document.getElementById('upgradeList'),
    levelButtons: document.getElementById('levelButtons'),
    oreLegend: document.getElementById('oreLegend'),
    messageOverlay: document.getElementById('messageOverlay')
  };

  const ORES = [
    { id: 'copper', name: 'Copper', unlockLevel: 1, value: 5, color: '#b87333' },
    { id: 'iron', name: 'Iron', unlockLevel: 6, value: 12, color: '#9ea7ad' },
    { id: 'silver', name: 'Silver', unlockLevel: 11, value: 30, color: '#dce4ea' },
    { id: 'gold', name: 'Gold', unlockLevel: 20, value: 70, color: '#e1b84b' },
    { id: 'emerald', name: 'Emerald', unlockLevel: 25, value: 160, color: '#46c98a' }
  ];
  const ORE_BY_ID = Object.fromEntries(ORES.map((ore, index) => [ore.id, { ...ore, index }]));

  const LEVELS = Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    return {
      width: 14 + Math.floor((level - 1) * 10 / 19),
      height: 10 + Math.floor((level - 1) * 7 / 19),
      time: 45 + Math.floor((level - 1) / 4) * 3,
      rockHp: 2 + Math.floor((level - 1) / 5)
    };
  });

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
    levelLayouts: {},
    oreTotals: {},
    specialists: { prospectors: 0, trainingTier: 0 }
  };

  let save = loadSave();
  let levelIndex = Math.max(0, Math.min(LEVELS.length - 1, save.selectedLevel - 1));
  let mine = [];
  let keyCell = null;
  let placements = [];
  let prospectors = [];
  let running = false;
  let resultShown = false;
  let timeLeft = 0;
  let lastFrame = performance.now();
  let miningAccumulator = 0;

  function loadSave() {
    try {
      const parsed = JSON.parse(localStorage.getItem('skeletonMiningSave'));
      if (!parsed) return structuredClone(DEFAULT_SAVE);
      return {
        ...structuredClone(DEFAULT_SAVE),
        ...parsed,
        upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) },
        levelLayouts: { ...(parsed.levelLayouts || {}) },
        oreTotals: { ...(parsed.oreTotals || {}) },
        specialists: { ...DEFAULT_SAVE.specialists, ...(parsed.specialists || {}) }
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

  function currentLevelNumber() {
    return levelIndex + 1;
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

  function oreChanceForOre(ore, level) {
    if (!ore || level < ore.unlockLevel) return 0;
    const growthStep = Math.min(4, level - ore.unlockLevel);
    return 0.14 + growthStep * 0.02;
  }

  function activeOresForLevel(level) {
    const unlocked = ORES.filter(ore => ore.unlockLevel <= level);
    return unlocked.slice(-3);
  }

  function validLayout(layout, cfg) {
    if (!layout || !layout.key || !Array.isArray(layout.ores)) return false;
    const { x, y } = layout.key;
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < cfg.width && y < cfg.height;
  }

  function createLevelLayout(fixedKey = null) {
    const cfg = levelConfig();
    const level = currentLevelNumber();
    const activeOres = activeOresForLevel(level);
    const key = fixedKey || {
      x: Math.floor(Math.random() * cfg.width),
      y: Math.floor(Math.random() * cfg.height)
    };
    const ores = [];
    const oreChances = Object.fromEntries(
      activeOres.map(ore => [ore.id, oreChanceForOre(ore, level)])
    );

    for (let y = 0; y < cfg.height; y++) {
      for (let x = 0; x < cfg.width; x++) {
        if (x === key.x && y === key.y) continue;
        for (const ore of activeOres) {
          if (Math.random() < oreChances[ore.id]) {
            ores.push({ x, y, type: ore.id });
          }
        }
      }
    }

    return {
      oreModelVersion: 2,
      key,
      ores,
      activeOres: activeOres.map(ore => ore.id),
      oreChances
    };
  }

  function layoutForLevel() {
    const cfg = levelConfig();
    const key = String(currentLevelNumber());
    const stored = save.levelLayouts[key];
    if (validLayout(stored, cfg) && stored.oreModelVersion === 2) return stored;

    const preservedKey = validLayout(stored, cfg) ? stored.key : null;
    const layout = createLevelLayout(preservedKey);
    save.levelLayouts[key] = layout;
    persist();
    return layout;
  }

  function buildMine() {
    const cfg = levelConfig();
    const layout = layoutForLevel();
    mine = [];

    const oreMap = new Map();
    for (const deposit of layout.ores) {
      const cellKey = `${deposit.x},${deposit.y}`;
      const existing = oreMap.get(cellKey) || [];
      if (existing.length < 3 && !existing.includes(deposit.type)) existing.push(deposit.type);
      oreMap.set(cellKey, existing);
    }

    for (let y = 0; y < cfg.height; y++) {
      const row = [];
      for (let x = 0; x < cfg.width; x++) {
        const oreTypes = [...(oreMap.get(`${x},${y}`) || [])];
        row.push({
          x, y,
          type: oreTypes.length ? 'ore' : 'rock',
          oreTypes,
          extractedOres: [],
          hp: cfg.rockHp,
          maxHp: cfg.rockHp,
          mined: false,
          hasKey: x === layout.key.x && y === layout.key.y
        });
      }
      mine.push(row);
    }

    keyCell = mine[layout.key.y][layout.key.x];
    placements = [];
    running = false;
    resultShown = false;
    timeLeft = roundTime();
    miningAccumulator = 0;
    prospectors = Array.from({ length: save.specialists.prospectors }, (_, i) => ({
      x: i % cfg.width,
      y: cfg.height - 1 - (Math.floor(i / cfg.width) % cfg.height),
      target: null,
      progress: 0
    }));

    hideMessage();
    renderUi();
    draw();
  }

  function canvasMetrics() {
    const cfg = levelConfig();
    const pad = 24;
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
    if (placements.some(p => p.x === cell.x && p.y === cell.y)) return;
    placements.push({ x: cell.x, y: cell.y });
    renderUi();
    draw();
  }

  function coveredBySkeleton(cell, skeleton) {
    const dx = cell.x - skeleton.x;
    const dy = cell.y - skeleton.y;
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

  function rewardOres(oreTypes) {
    let changed = false;
    for (const oreType of oreTypes) {
      const ore = ORE_BY_ID[oreType];
      if (!ore) continue;
      save.gold += ore.value;
      save.oreTotals[oreType] = (save.oreTotals[oreType] || 0) + 1;
      changed = true;
    }
    if (changed) persist();
  }

  function mineCell(cell, power = 1) {
    if (!cell || cell.mined) return;
    cell.hp -= power;
    if (cell.hp > 0) return;

    cell.mined = true;
    const remainingOres = cell.oreTypes.filter(type => !cell.extractedOres.includes(type));
    rewardOres(remainingOres);
    cell.extractedOres.push(...remainingOres);

    if (cell.hasKey) finishRound(true);
  }

  function standardMiningTick() {
    for (const skeleton of placements) {
      const target = chooseTarget(skeleton);
      if (target) mineCell(target, 1);
    }
  }

  function prospectorsAvailable() {
    return save.maxLevel >= 5;
  }

  function prospectorBuyCost() {
    return Math.round(500 * Math.pow(2.6, save.specialists.prospectors));
  }

  function nextTrainingOre() {
    return ORES[save.specialists.trainingTier + 1] || null;
  }

  function prospectorTrainingCost() {
    return Math.round(1500 * Math.pow(4, save.specialists.trainingTier));
  }

  function canTrainProspectors() {
    const next = nextTrainingOre();
    return !!next && save.maxLevel >= next.unlockLevel;
  }

  function buyProspector() {
    if (running || !prospectorsAvailable()) return;
    const cost = prospectorBuyCost();
    if (save.gold < cost) return;
    save.gold -= cost;
    save.specialists.prospectors += 1;
    persist();
    buildMine();
  }

  function trainProspectors() {
    if (running || save.specialists.prospectors < 1 || !canTrainProspectors()) return;
    const cost = prospectorTrainingCost();
    if (save.gold < cost) return;
    save.gold -= cost;
    save.specialists.trainingTier += 1;
    persist();
    renderUi();
    draw();
  }

  function eligibleProspectorOres(cell) {
    if (!cell || cell.mined || cell.hasKey) return [];
    return cell.oreTypes.filter(type => {
      const ore = ORE_BY_ID[type];
      return ore && ore.index <= save.specialists.trainingTier && !cell.extractedOres.includes(type);
    });
  }

  function prospectorCanMine(cell) {
    return eligibleProspectorOres(cell).length > 0;
  }

  function findProspectorTarget(prospector) {
    let best = null;
    let bestScore = -Infinity;
    for (const row of mine) {
      for (const cell of row) {
        const eligible = eligibleProspectorOres(cell);
        if (eligible.length === 0) continue;
        const bestOreValue = Math.max(...eligible.map(type => ORE_BY_ID[type].value));
        const distance = Math.abs(cell.x - prospector.x) + Math.abs(cell.y - prospector.y);
        const score = bestOreValue * 100 - distance;
        if (score > bestScore) {
          bestScore = score;
          best = cell;
        }
      }
    }
    return best;
  }

  function extractProspectorOres(cell) {
    const eligible = eligibleProspectorOres(cell);
    if (eligible.length === 0) return;
    rewardOres(eligible);
    cell.extractedOres.push(...eligible);
  }

  function updateProspectors(dt) {
    if (!running || prospectors.length === 0) return;

    for (const prospector of prospectors) {
      if (!prospector.target || prospector.target.mined || !prospectorCanMine(prospector.target)) {
        prospector.target = findProspectorTarget(prospector);
      }
      const target = prospector.target;
      if (!target) continue;

      prospector.progress += dt;
      if (prospector.progress < 0.20) continue;
      prospector.progress = 0;

      if (prospector.x < target.x) prospector.x++;
      else if (prospector.x > target.x) prospector.x--;
      else if (prospector.y < target.y) prospector.y++;
      else if (prospector.y > target.y) prospector.y--;
      else {
        extractProspectorOres(target);
        prospector.target = null;
      }
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
      const completedLevel = currentLevelNumber();
      delete save.levelLayouts[String(completedLevel)];
      if (completedLevel === save.maxLevel && save.maxLevel < LEVELS.length) save.maxLevel++;
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
    if (!resultShown) return;
    hideMessage();
    if (keyCell && keyCell.mined && keyCell.hasKey && levelIndex + 1 < save.maxLevel) {
      levelIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
    }
    buildMine();
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
    return Math.round(def.base * Math.pow(def.scale, save.upgrades[key]));
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

  function renderOreLegend() {
    const level = currentLevelNumber();
    const active = activeOresForLevel(level);
    ui.oreLegend.innerHTML = '';
    for (const ore of active) {
      const chip = document.createElement('div');
      chip.className = 'ore-chip';
      const chance = Math.round(oreChanceForOre(ore, level) * 100);
      chip.innerHTML = `<span class="ore-dot" style="background:${ore.color}"></span><strong>${ore.name}</strong><span>${ore.value}g · ${chance}%</span>`;
      ui.oreLegend.appendChild(chip);
    }
  }

  function renderSpecialists() {
    ui.specialistList.innerHTML = '';
    const card = document.createElement('div');
    card.className = `specialist-card ${prospectorsAvailable() ? '' : 'locked'}`;

    if (!prospectorsAvailable()) {
      card.innerHTML = '<div><strong>Prospector Skeleton — Level 5</strong><span>Unlocks for purchase at Level 5. Roams the whole mine and hunts ore.</span></div>';
      ui.specialistList.appendChild(card);
      return;
    }

    const trainedOre = ORES[Math.min(save.specialists.trainingTier, ORES.length - 1)];
    const buyCost = prospectorBuyCost();
    const buyButton = document.createElement('button');
    buyButton.textContent = `Buy ${buyCost}g`;
    buyButton.disabled = running || save.gold < buyCost;
    buyButton.addEventListener('click', buyProspector);

    const info = document.createElement('div');
    info.innerHTML = `<strong>Prospector Skeleton ×${save.specialists.prospectors}</strong><span>Roams the whole mine. Current training: ${trainedOre.name} and lower ores.</span>`;
    card.appendChild(info);
    card.appendChild(buyButton);
    ui.specialistList.appendChild(card);

    const training = document.createElement('div');
    training.className = 'specialist-card';
    const next = nextTrainingOre();
    const text = document.createElement('div');

    if (!next) {
      text.innerHTML = '<strong>Prospector Training — MAX</strong><span>Can hunt every ore currently in the prototype.</span>';
      training.appendChild(text);
    } else if (save.maxLevel < next.unlockLevel) {
      text.innerHTML = `<strong>Next Training: ${next.name}</strong><span>Available when Level ${next.unlockLevel} is reached.</span>`;
      training.classList.add('locked');
      training.appendChild(text);
    } else {
      const cost = prospectorTrainingCost();
      text.innerHTML = `<strong>Train for ${next.name}</strong><span>All owned Prospectors learn to hunt ${next.name} and lower ores.</span>`;
      const button = document.createElement('button');
      button.textContent = `${cost}g`;
      button.disabled = running || save.specialists.prospectors < 1 || save.gold < cost;
      button.addEventListener('click', trainProspectors);
      training.appendChild(text);
      training.appendChild(button);
    }
    ui.specialistList.appendChild(training);
  }

  function renderUi() {
    const level = currentLevelNumber();
    const layout = save.levelLayouts[String(level)];
    const active = activeOresForLevel(level);

    ui.levelStat.textContent = level;
    ui.goldStat.textContent = save.gold;
    ui.timeStat.textContent = timeLeft.toFixed(1);
    ui.levelTitle.textContent = `Level ${level}`;
    ui.levelGoal.textContent = `Find the Golden Key in ${roundTime()} seconds. Ore and key stay fixed until this level is beaten.`;

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

    const density = document.createElement('div');
    density.className = 'crew-card subtle';
    const mixText = active
      .map(ore => `${ore.name} ${Math.round(oreChanceForOre(ore, level) * 100)}%`)
      .join(', ');
    const occupiedBlocks = layout
      ? new Set(layout.ores.map(ore => `${ore.x},${ore.y}`)).size
      : 0;
    density.innerHTML = `<strong>Level Ore Mix</strong><span>${mixText}. Up to 3 ores can share one block.${layout ? ` ${layout.ores.length} ore deposits across ${occupiedBlocks} blocks.` : ''}</span>`;
    ui.crewList.appendChild(density);

    renderSpecialists();
    renderOreLegend();

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
      button.className = `${levelNum === level ? 'active' : ''} ${locked ? 'locked' : ''}`;
      button.addEventListener('click', () => {
        if (locked || running) return;
        levelIndex = i;
        persist();
        buildMine();
      });
      ui.levelButtons.appendChild(button);
    });
  }

  function drawOreMarkers(tile, x, y, cell) {
    const oreTypes = tile.oreTypes || [];
    if (oreTypes.length === 0) return;

    const positions = oreTypes.length === 1
      ? [[0.5, 0.5]]
      : oreTypes.length === 2
        ? [[0.38, 0.5], [0.62, 0.5]]
        : [[0.5, 0.35], [0.37, 0.62], [0.63, 0.62]];

    oreTypes.slice(0, 3).forEach((oreType, index) => {
      const ore = ORE_BY_ID[oreType];
      if (!ore) return;
      const [px, py] = positions[index];
      ctx.fillStyle = ore.color;
      ctx.beginPath();
      ctx.arc(x + cell * px, y + cell * py, cell * .10, 0, Math.PI * 2);
      ctx.fill();
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
          } else if (tile.oreTypes.length) {
            drawOreMarkers(tile, x, y, cell);
          }
        } else {
          ctx.fillStyle = '#332920';
          ctx.fillRect(x, y, cell, cell);
          ctx.fillStyle = '#4a3a2d';
          ctx.beginPath();
          ctx.arc(x + cell * .35, y + cell * .38, cell * .11, 0, Math.PI * 2);
          ctx.arc(x + cell * .63, y + cell * .61, cell * .14, 0, Math.PI * 2);
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
      ctx.font = `700 ${Math.max(11, cell * .16)}px sans-serif`;
      ctx.fillText(String(i + 1), cx, cy + cell * .34);
    }

    prospectors.forEach((p, i) => {
      const cx = left + (p.x + .5) * cell;
      const cy = top + (p.y + .5) * cell;
      ctx.fillStyle = '#d88b42';
      ctx.font = `700 ${cell * .40}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☠', cx, cy);
      ctx.font = `700 ${Math.max(9, cell * .12)}px sans-serif`;
      ctx.fillText(`P${i + 1}`, cx, cy + cell * .33);
    });

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
      updateProspectors(dt);

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
    if (!confirm('Start a new playthrough? This resets gold, upgrades, specialists, unlocked levels, ore layouts, and key locations.')) return;
    save = structuredClone(DEFAULT_SAVE);
    levelIndex = 0;
    persist();
    buildMine();
  });

  buildMine();
  requestAnimationFrame(frame);
})();