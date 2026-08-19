// Hide ore until it is actually uncovered, and make early mines richer.
const ORE_LAYOUT_VERSION = 6;

oreChance = function(ore, level) {
  // Give the opening five levels a richer start, then return to the
  // previously established ore-density progression from Level 6 onward.
  if (level >= 1 && level <= 5) return 0.30;
  const age = Math.min(4, Math.max(0, Math.floor((level - ore.unlockLevel) / 5)));
  return 0.14 + age * 0.015;
};

createLevelLayout = function(level = save.level) {
  const cfg = levelConfig(level), ores = activeOres(level);
  const key = { x: Math.floor(Math.random() * cfg.width), y: Math.floor(Math.random() * cfg.height) };
  const deposits = [];
  for (let y = 0; y < cfg.height; y++) for (let x = 0; x < cfg.width; x++) {
    if (x === key.x && y === key.y) continue;
    for (const ore of ores) if (Math.random() < oreChance(ore, level)) deposits.push({ x, y, type: ore.id });
  }
  return { version: ORE_LAYOUT_VERSION, width: cfg.width, height: cfg.height, key, ores: deposits };
};

layoutForLevel = function() {
  const k = String(save.level), cfg = levelConfig();
  let l = save.levelLayouts[k];
  if (!l || l.version !== ORE_LAYOUT_VERSION || l.width !== cfg.width || l.height !== cfg.height) {
    l = createLevelLayout();
    save.levelLayouts[k] = l;
    persist();
  }
  return l;
};

function drawExposedOre(c, x, y, cell) {
  if (!c.oreTypes.length) return;
  const positions = c.oreTypes.length === 1
    ? [[.5, .5]]
    : c.oreTypes.length === 2
      ? [[.36, .5], [.64, .5]]
      : [[.5, .34], [.34, .64], [.66, .64]];

  c.oreTypes.slice(0, 3).forEach((type, i) => {
    const ore = ORE_BY_ID[type];
    if (!ore) return;
    const [px, py] = positions[i] || positions[positions.length - 1];
    ctx.fillStyle = ore.color;
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = Math.max(1.5, cell * .025);
    ctx.beginPath();
    ctx.arc(x + cell * px, y + cell * py, Math.max(5, cell * .105), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

draw = function() {
  if (!mine.length) return;
  const { cell, left, top } = canvasMetrics();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#080706';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Before the run, show exact grid cells each standard skeleton can reach.
  const coverage = new Map();
  if (!running && placements.length) {
    for (const m of placements) {
      for (const c of mine.flat()) {
        if (c.mined || !inRadius(c, m)) continue;
        const key = `${c.x},${c.y}`;
        coverage.set(key, (coverage.get(key) || 0) + 1);
      }
    }
  }

  for (const row of mine) for (const c of row) {
    const x = left + c.x * cell, y = top + c.y * cell;
    ctx.fillStyle = c.mined ? '#11100e' : c.hp <= 1 ? '#493d33' : c.hp < CONFIG.rockHp ? '#3e352d' : '#302923';
    ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    ctx.strokeStyle = '#504238';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);

    if (!c.mined) {
      // Ore remains hidden under rock. Survey/Artifact reveals only mark the tile itself.
      if (surveyTiles.includes(c)) {
        ctx.strokeStyle = '#e1b84b';
        ctx.lineWidth = Math.max(2, cell * .04);
        ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
        if (rank(27) === 5) {
          ctx.fillStyle = '#ffe59a';
          ctx.font = `${Math.max(10, cell * .14)}px sans-serif`;
          ctx.fillText(c.oreTypes.length ? c.oreTypes.map(t => ORE_BY_ID[t].name[0]).join('') : '?', x + 6, y + cell - 7);
        }
      }
      if (blastCell === c) {
        ctx.strokeStyle = '#d85e50';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
      }

      const coverCount = coverage.get(`${c.x},${c.y}`) || 0;
      if (coverCount) {
        const inset = Math.max(3, cell * .045);
        ctx.strokeStyle = coverCount > 1 ? 'rgba(225,184,75,.98)' : 'rgba(238,226,206,.68)';
        ctx.lineWidth = Math.max(2, cell * (coverCount > 1 ? .045 : .03));
        ctx.strokeRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
      }
    } else {
      // Once the rock is broken, leave the discovered ore visible on the cleared tile.
      drawExposedOre(c, x, y, cell);
      if (c.hasKey) {
        ctx.fillStyle = '#f5cf55';
        ctx.font = `${Math.max(12, cell * .3)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◆', x + cell / 2, y + cell / 2);
      }
    }
  }

  for (const m of placements) {
    const x = left + (m.x + .5) * cell, y = top + (m.y + .5) * cell;
    const customMinerDrawn = typeof drawStandardMinerVisual === 'function' && drawStandardMinerVisual(m, x, y, cell);
    if (!customMinerDrawn) {
      ctx.fillStyle = m.index === eliteIndex ? '#ffe59a' : m.index === totemIndex ? '#c9efc4' : '#eee2ce';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(5, cell * .16), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#17130f';
      ctx.font = `bold ${Math.max(8, cell * .12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(MINER_TYPES[m.type].name[0], x, y);
    }

    const kr = rank(17);
    if (kr > 0 && !keyFound && !keyCell.mined) {
      const d = Math.hypot(keyCell.x - m.x, keyCell.y - m.y);
      if (d <= kr) {
        ctx.strokeStyle = '#f1cc55';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(9, cell * .24), 0, Math.PI * 2);
        ctx.stroke();
        if (kr === 5) {
          ctx.fillStyle = '#f1cc55';
          ctx.font = `${Math.max(10, cell * .18)}px sans-serif`;
          ctx.fillText(Math.abs(keyCell.x - m.x) > Math.abs(keyCell.y - m.y) ? (keyCell.x > m.x ? '→' : '←') : (keyCell.y > m.y ? '↓' : '↑'), x, y - cell * .3);
        }
      }
    }
  }

  for (const p of prospectors) {
    const x = left + (p.x + .5) * cell, y = top + (p.y + .5) * cell;
    ctx.fillStyle = '#d9b348';
    ctx.beginPath();
    ctx.moveTo(x, y - cell * .18);
    ctx.lineTo(x + cell * .14, y);
    ctx.lineTo(x, y + cell * .18);
    ctx.lineTo(x - cell * .14, y);
    ctx.closePath();
    ctx.fill();
  }
};
