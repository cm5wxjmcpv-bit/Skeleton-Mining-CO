const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...items) { items.forEach(v => this.values.add(v)); }
  remove(...items) { items.forEach(v => this.values.delete(v)); }
  contains(item) { return this.values.has(item); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.textContent = '';
    this._innerHTML = '';
    this.disabled = false;
    this.className = '';
    this.children = [];
    this.listeners = {};
    this.classList = new FakeClassList();
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (value === '') this.children = [];
  }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); }
  click() { this.dispatch('click', {}); }
  appendChild(child) { this.children.push(child); return child; }
}

class FakeCanvas extends FakeElement {
  constructor(id) {
    super(id);
    this.width = 1400;
    this.height = 900;
    this.ctx = new Proxy({}, {
      get(target, prop) {
        if (!(prop in target)) target[prop] = () => {};
        return target[prop];
      },
      set(target, prop, value) { target[prop] = value; return true; }
    });
  }
  getContext() { return this.ctx; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1400, height: 900 }; }
}

const IDS = [
  'mineCanvas','levelStat','goldStat','timeStat','levelTitle','levelGoal','startButton',
  'endAttemptButton','undoButton','resetPlacementButton','resetSaveButton','placementHint',
  'crewList','crewCount','specialistList','upgradeList','levelButtons','oreLegend','messageOverlay'
];

function sequence(values, fallback = 0.9) {
  let i = 0;
  return () => i < values.length ? values[i++] : fallback;
}

function cfg(level) {
  return {
    width: 14 + Math.floor((level - 1) * 10 / 19),
    height: 10 + Math.floor((level - 1) * 7 / 19)
  };
}

function noOreRandoms(level, keyX = 1, keyY = 1) {
  const c = cfg(level);
  const activeCount = level >= 20 ? 3 : level >= 11 ? 3 : level >= 6 ? 2 : 1;
  const out = [(keyX + 0.1) / c.width, (keyY + 0.1) / c.height];
  for (let i = 0; i < c.width * c.height * activeCount; i++) out.push(0.9);
  return out;
}

function baseSave(overrides = {}) {
  return {
    gold: 0,
    maxLevel: 1,
    selectedLevel: 1,
    upgrades: { radius: 0, speed: 0, crew: 0, time: 0 },
    levelLayouts: {},
    oreTotals: {},
    specialists: { prospectors: 0, trainingTier: 0 },
    ...overrides
  };
}

function makeLayout({
  key = { x: 10, y: 8 },
  deposits = [],
  activeOres = ['copper'],
  oreChances = { copper: 0.14 }
} = {}) {
  return {
    oreModelVersion: 2,
    key,
    ores: deposits,
    activeOres,
    oreChances
  };
}

function boot({ randomValues = [], savedState = null, randomFallback = 0.9 } = {}) {
  const elements = new Map();
  for (const id of IDS) elements.set(id, id === 'mineCanvas' ? new FakeCanvas(id) : new FakeElement(id));

  const storage = new Map();
  if (savedState) storage.set('skeletonMiningSave', JSON.stringify(savedState));

  let now = 0;
  let raf = null;
  const sandbox = {
    console,
    structuredClone,
    Math: Object.create(Math),
    JSON,
    Date,
    setTimeout: () => 0,
    clearTimeout: () => {},
    confirm: () => true,
    performance: { now: () => now },
    requestAnimationFrame: cb => { raf = cb; return 1; },
    localStorage: {
      getItem: k => storage.has(k) ? storage.get(k) : null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k),
      clear: () => storage.clear()
    },
    document: {
      getElementById: id => elements.get(id),
      createElement: () => new FakeElement()
    }
  };
  sandbox.Math.random = sequence(randomValues, randomFallback);
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
  vm.runInNewContext(source, sandbox, { filename: 'game.js' });

  function step(seconds) {
    const frames = Math.ceil(seconds / 0.1);
    for (let i = 0; i < frames; i++) {
      now += 100;
      const cb = raf;
      raf = null;
      assert(cb, 'animation frame should remain scheduled');
      cb(now);
    }
  }

  function pointForCell(x, y, level = 1) {
    const c = cfg(level);
    const pad = 24;
    const cell = Math.min((1400 - pad * 2) / c.width, (900 - pad * 2) / c.height);
    const left = (1400 - cell * c.width) / 2;
    const top = (900 - cell * c.height) / 2;
    return { clientX: left + (x + 0.5) * cell, clientY: top + (y + 0.5) * cell };
  }

  return {
    el: id => elements.get(id),
    step,
    place(x, y, level = 1) {
      elements.get('mineCanvas').dispatch('pointerdown', pointForCell(x, y, level));
    },
    save() { return JSON.parse(storage.get('skeletonMiningSave')); }
  };
}

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('prototype still has 20 levels and 1.25 starting radius', () => {
  const g = boot({ randomValues: noOreRandoms(1) });
  assert.strictEqual(g.el('levelButtons').children.length, 20);
  assert.match(g.el('crewList').children[0].innerHTML, /1\.25 tile radius/);
});

test('Copper starts at 14% and grows 2% per level to 22% at Level 5', () => {
  const g1 = boot({ randomValues: noOreRandoms(1) });
  assert.strictEqual(g1.save().levelLayouts['1'].oreChances.copper, 0.14);

  const g5 = boot({
    savedState: baseSave({ maxLevel: 5, selectedLevel: 5 }),
    randomValues: noOreRandoms(5)
  });
  assert(Math.abs(g5.save().levelLayouts['5'].oreChances.copper - 0.22) < 1e-9);
});

test('Iron starts at 14% on Level 6 and reaches 22% on Level 10', () => {
  const g6 = boot({
    savedState: baseSave({ maxLevel: 6, selectedLevel: 6 }),
    randomValues: noOreRandoms(6)
  });
  const l6 = g6.save().levelLayouts['6'];
  assert.deepStrictEqual(l6.activeOres, ['copper', 'iron']);
  assert(Math.abs(l6.oreChances.copper - 0.22) < 1e-9);
  assert.strictEqual(l6.oreChances.iron, 0.14);

  const g10 = boot({
    savedState: baseSave({ maxLevel: 10, selectedLevel: 10 }),
    randomValues: noOreRandoms(10)
  });
  assert(Math.abs(g10.save().levelLayouts['10'].oreChances.iron - 0.22) < 1e-9);
});

test('Silver starts at 14% on Level 11 and reaches 22% on Level 15', () => {
  const g11 = boot({
    savedState: baseSave({ maxLevel: 11, selectedLevel: 11 }),
    randomValues: noOreRandoms(11)
  });
  const l11 = g11.save().levelLayouts['11'];
  assert.deepStrictEqual(l11.activeOres, ['copper', 'iron', 'silver']);
  assert.strictEqual(l11.oreChances.silver, 0.14);

  const g15 = boot({
    savedState: baseSave({ maxLevel: 15, selectedLevel: 15 }),
    randomValues: noOreRandoms(15)
  });
  assert(Math.abs(g15.save().levelLayouts['15'].oreChances.silver - 0.22) < 1e-9);
});

test('Level 20 drops Copper, keeps max three ore types, and starts Gold at 14%', () => {
  const g = boot({
    savedState: baseSave({ maxLevel: 20, selectedLevel: 20 }),
    randomValues: noOreRandoms(20)
  });
  const l20 = g.save().levelLayouts['20'];
  assert.deepStrictEqual(l20.activeOres, ['iron', 'silver', 'gold']);
  assert(Math.abs(l20.oreChances.iron - 0.22) < 1e-9);
  assert(Math.abs(l20.oreChances.silver - 0.22) < 1e-9);
  assert.strictEqual(l20.oreChances.gold, 0.14);
  assert.strictEqual(l20.oreChances.copper, undefined);
});

test('a block can contain up to all three active ore types', () => {
  const g = boot({
    savedState: baseSave({ maxLevel: 11, selectedLevel: 11 }),
    randomFallback: 0
  });
  const deposits = g.save().levelLayouts['11'].ores;
  const perBlock = new Map();
  for (const ore of deposits) {
    const key = `${ore.x},${ore.y}`;
    perBlock.set(key, (perBlock.get(key) || 0) + 1);
  }
  const counts = [...perBlock.values()];
  assert(counts.some(count => count === 3), 'at least one block should contain three ores');
  assert(Math.max(...counts) <= 3, 'no block may contain more than three ores');
});

test('ore and key layout stays static across failed attempts', () => {
  const savedState = baseSave({
    levelLayouts: {
      '1': makeLayout({
        key: { x: 12, y: 9 },
        deposits: [{ x: 2, y: 2, type: 'copper' }]
      })
    }
  });
  const g = boot({ savedState });
  const first = JSON.stringify(g.save().levelLayouts['1']);
  g.place(0, 0);
  g.el('startButton').click();
  g.el('endAttemptButton').click();
  g.el('messageOverlay').click();
  assert.strictEqual(JSON.stringify(g.save().levelLayouts['1']), first);
});

test('new playthrough generates a different layout', () => {
  const first = noOreRandoms(1, 1, 1);
  const second = noOreRandoms(1, 11, 8);
  const g = boot({ randomValues: first.concat(second) });
  const firstKey = g.save().levelLayouts['1'].key;
  g.el('resetSaveButton').click();
  const secondKey = g.save().levelLayouts['1'].key;
  assert.notDeepStrictEqual(secondKey, firstKey);
});

test('standard skeleton collects every ore stacked in a mined block', () => {
  const savedState = baseSave({
    maxLevel: 11,
    selectedLevel: 11,
    levelLayouts: {
      '11': makeLayout({
        key: { x: 10, y: 8 },
        activeOres: ['copper', 'iron', 'silver'],
        oreChances: { copper: 0.22, iron: 0.22, silver: 0.14 },
        deposits: [
          { x: 1, y: 1, type: 'copper' },
          { x: 1, y: 1, type: 'iron' },
          { x: 1, y: 1, type: 'silver' }
        ]
      })
    }
  });
  const g = boot({ savedState });
  g.place(1, 1, 11);
  g.el('startButton').click();
  g.step(4.0);
  assert.strictEqual(g.save().gold, 47);
});

test('Prospector is purchased rather than granted for free', () => {
  const savedState = baseSave({
    gold: 500,
    maxLevel: 5,
    selectedLevel: 5,
    levelLayouts: {
      '5': makeLayout({
        key: { x: 10, y: 8 },
        oreChances: { copper: 0.22 }
      })
    }
  });
  const g = boot({ savedState });
  const card = g.el('specialistList').children[0];
  assert.match(card.children[0].innerHTML, /Prospector Skeleton ×0/);
  card.children[1].click();
  assert.strictEqual(g.save().specialists.prospectors, 1);
  assert.strictEqual(g.save().gold, 0);
});

test('Prospector Iron training becomes available when Iron enters at Level 6', () => {
  const savedState = baseSave({
    gold: 1500,
    maxLevel: 6,
    selectedLevel: 6,
    specialists: { prospectors: 1, trainingTier: 0 },
    levelLayouts: {
      '6': makeLayout({
        key: { x: 10, y: 8 },
        activeOres: ['copper', 'iron'],
        oreChances: { copper: 0.22, iron: 0.14 }
      })
    }
  });
  const g = boot({ savedState });
  const training = g.el('specialistList').children[1];
  assert.match(training.children[0].innerHTML, /Train for Iron/);
  training.children[1].click();
  assert.strictEqual(g.save().specialists.trainingTier, 1);
  assert.strictEqual(g.save().gold, 0);
});

test('Prospector extracts only ores within its training from a stacked block', () => {
  const c = cfg(11);
  const savedState = baseSave({
    maxLevel: 11,
    selectedLevel: 11,
    specialists: { prospectors: 1, trainingTier: 1 },
    levelLayouts: {
      '11': makeLayout({
        key: { x: 10, y: 1 },
        activeOres: ['copper', 'iron', 'silver'],
        oreChances: { copper: 0.22, iron: 0.22, silver: 0.14 },
        deposits: [
          { x: 5, y: c.height - 1, type: 'iron' },
          { x: 5, y: c.height - 1, type: 'silver' }
        ]
      })
    }
  });
  const g = boot({ savedState });
  g.place(0, 0, 11);
  g.el('startButton').click();
  g.step(3.0);
  assert.strictEqual(g.save().gold, 12, 'Iron-trained Prospector should not extract Silver yet');
});

test('beating a level clears its static layout so replay can rerandomize', () => {
  const savedState = baseSave({
    levelLayouts: {
      '1': makeLayout({ key: { x: 1, y: 1 } })
    }
  });
  const g = boot({ savedState });
  g.place(1, 1);
  g.el('startButton').click();
  g.step(2.0);
  assert.strictEqual(g.save().maxLevel, 2);
  assert.strictEqual(g.save().levelLayouts['1'], undefined);
});

let failures = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL  ${name}`);
    console.error(err.stack || err);
  }
}

if (failures) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log(`\n${tests.length} automated gameplay tests passed.`);
