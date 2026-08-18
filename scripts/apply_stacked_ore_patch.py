from pathlib import Path
import re

path = Path("game.js")
text = path.read_text()

def sub(label, pattern, replacement):
    global text
    new, count = re.subn(pattern, replacement, text, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 replacement, got {count}")
    text = new

sub("ore definitions",
    r"""  const ORES = \[\n.*?  \];\n  const ORE_BY_ID = Object\.fromEntries\(ORES\.map\(\(ore, index\) => \[ore\.id, \{ \.\.\.ore, index \}\]\)\);""",
    """  const ORES = [
    { id: 'copper', name: 'Copper', unlockLevel: 1, value: 5, color: '#b87333' },
    { id: 'iron', name: 'Iron', unlockLevel: 6, value: 12, color: '#9ea7ad' },
    { id: 'silver', name: 'Silver', unlockLevel: 11, value: 30, color: '#dce4ea' },
    { id: 'gold', name: 'Gold', unlockLevel: 20, value: 70, color: '#e1b84b' },
    { id: 'emerald', name: 'Emerald', unlockLevel: 25, value: 160, color: '#46c98a' }
  ];
  const ORE_BY_ID = Object.fromEntries(ORES.map((ore, index) => [ore.id, { ...ore, index }]));""")

sub("ore chances",
    r"""  function oreChanceForLevel\(level\) \{\n.*?  function activeOresForLevel\(level\) \{\n    const unlocked = ORES\.filter\(ore => ore\.unlockLevel <= level\);\n    return unlocked\.slice\(-3\);\n  \}\n\n  function chooseOre\(activeOres\) \{\n.*?  \}\n\n  function validLayout""",
    """  function oreChanceForOre(ore, level) {
    if (!ore || level < ore.unlockLevel) return 0;
    const growthStep = Math.min(4, level - ore.unlockLevel);
    return 0.14 + growthStep * 0.02;
  }

  function activeOresForLevel(level) {
    const unlocked = ORES.filter(ore => ore.unlockLevel <= level);
    return unlocked.slice(-3);
  }

  function validLayout""")

sub("layout generation",
    r"""  function createLevelLayout\(\) \{\n.*?  function buildMine\(\) \{""",
    """  function createLevelLayout(fixedKey = null) {
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

  function buildMine() {""")

sub("stacked cell build",
    r"""    const oreMap = new Map\(layout\.ores\.map\(ore => \[`\$\{ore\.x\},\$\{ore\.y\}`, ore\.type\]\)\);\n    for \(let y = 0; y < cfg\.height; y\+\+\) \{\n      const row = \[\];\n      for \(let x = 0; x < cfg\.width; x\+\+\) \{\n        const oreType = oreMap\.get\(`\$\{x\},\$\{y\}`\) \|\| null;\n        row\.push\(\{\n          x, y,\n          type: oreType \|\| 'rock',\n          oreType,\n          hp: cfg\.rockHp,\n          maxHp: cfg\.rockHp,\n          mined: false,\n          hasKey: x === layout\.key\.x && y === layout\.key\.y\n        \}\);\n      \}\n      mine\.push\(row\);\n    \}""",
    """    const oreMap = new Map();
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
    }""")

sub("ore rewards",
    r"""  function rewardOre\(cell\) \{\n.*?  function standardMiningTick""",
    """  function rewardOres(oreTypes) {
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

  function standardMiningTick""")

sub("prospector stacked ores",
    r"""  function prospectorCanMine\(cell\) \{\n.*?  function updateProspectors\(dt\) \{""",
    """  function eligibleProspectorOres(cell) {
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

  function updateProspectors(dt) {""")

old = """      else {
        mineCell(target, 2);
        if (target.mined) prospector.target = null;
      }"""
new = """      else {
        extractProspectorOres(target);
        prospector.target = null;
      }"""
if old not in text:
    raise SystemExit("prospector extraction action not found")
text = text.replace(old, new, 1)

sub("ore legend",
    r"""  function renderOreLegend\(\) \{\n.*?  function renderSpecialists""",
    """  function renderOreLegend() {
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

  function renderSpecialists""")

sub("ore mix card",
    r"""    const density = document\.createElement\('div'\);\n    density\.className = 'crew-card subtle';\n    const orePercent = Math\.round\(oreChanceForLevel\(level\) \* 100\);\n    density\.innerHTML = `<strong>Level Ore Mix</strong><span>\$\{orePercent\}% ore chance\. Active: \$\{active\.map\(o => o\.name\)\.join\(', '\)\}\.\$\{layout \? ` \$\{layout\.ores\.length\} ore deposits in this layout\.` : ''\}</span>`;\n    ui\.crewList\.appendChild\(density\);""",
    """    const density = document.createElement('div');
    density.className = 'crew-card subtle';
    const mixText = active
      .map(ore => `${ore.name} ${Math.round(oreChanceForOre(ore, level) * 100)}%`)
      .join(', ');
    const occupiedBlocks = layout
      ? new Set(layout.ores.map(ore => `${ore.x},${ore.y}`)).size
      : 0;
    density.innerHTML = `<strong>Level Ore Mix</strong><span>${mixText}. Up to 3 ores can share one block.${layout ? ` ${layout.ores.length} ore deposits across ${occupiedBlocks} blocks.` : ''}</span>`;
    ui.crewList.appendChild(density);""")

sub("stacked ore drawing",
    r"""  function drawOreMarker\(tile, x, y, cell\) \{\n.*?  function draw\(\) \{""",
    """  function drawOreMarkers(tile, x, y, cell) {
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

  function draw() {""")

old = """          } else if (tile.oreType) {
            drawOreMarker(tile, x, y, cell);
          }"""
new = """          } else if (tile.oreTypes.length) {
            drawOreMarkers(tile, x, y, cell);
          }"""
if old not in text:
    raise SystemExit("single ore drawing call not found")
text = text.replace(old, new, 1)

path.write_text(text)
print("Patched game.js")
