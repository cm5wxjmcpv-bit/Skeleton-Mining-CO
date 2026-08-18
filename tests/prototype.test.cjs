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

function noOreLayoutRandoms(width, height, keyX, keyY) {
  const out = [(keyX + 0.1) / width, (keyY + 0.1) / height];
  for (let i = 0; i < width * height; i++) out.push(0.9);
  return out;
}

function cfg(level) {
  return {
    width: 14 + Math.floor((level - 1) * 10 / 19),
    height: 10 + Math.floor((level - 1) * 7 / 19)
  };
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

function layout(level, { key = { x: 10, y: 8 }, ores = [], activeOres = ['copper'] } = {}) {
  return { key, ores, activeOres, oreChance: 0.05 };
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
    place(x, y, level = 1) { elements.get('mineCanvas').dispatch('pointerdown', pointForCell(x, y, level)); },
    save() { return JSON.parse(storage.get('skeletonMiningSave')); }
  };
}

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('prototype has 20 levels and a larger Level 1 mine', () => {
  const c = cfg(1);
  const g = boot({ randomValues: noOreLayoutRandoms(c.width, c.height, 5, 5) });
  assert.strictEqual(g.el('levelButtons').children.length, 20);
  assert.strictEqual(c.width, 14);
  assert.strictEqual(c.height, 10);
  assert.match(g.el('crewList').children[0].innerHTML, /1\.25 tile radius/);
});

test('Level 1 begins with only Copper and sparse ore density', () => {
  const c = cfg(1);
  const g = boot({ randomValues: noOreLayoutRandoms(c.width, c.height, 5, 5) });
  const saved = g.save().levelLayouts['1'];
  assert.deepStrictEqual(saved.activeOres, ['copper']);
  assert(saved.oreChance < 0.06);
});

test('ore and key layout stays static across failed attempts', () => {
  const savedState = baseSave({
    levelLayouts: { '1': layout(1, { key: {x:12,y:9}, ores:[{x:2,y:2,type:'copper'}] }) }
  });
  const g = boot({ savedState });
  const first = JSON.stringify(g.save().levelLayouts['1']);
  g.place(0, 0);
  g.el('startButton').click();
  g.el('endAttemptButton').click();
  g.el('messageOverlay').click();
  assert.strictEqual(JSON.stringify(g.save().levelLayouts['1']), first);
});

test('new playthrough generates a different Level 1 layout', () => {
  const c = cfg(1);
  const firstSeq = noOreLayoutRandoms(c.width, c.height, 1, 1);
  const secondSeq = noOreLayoutRandoms(c.width, c.height, 11, 8);
  const g = boot({ randomValues: firstSeq.concat(secondSeq) });
  const first = g.save().levelLayouts['1'].key;
  g.el('resetSaveButton').click();
  const second = g.save().levelLayouts['1'].key;
  assert.notDeepStrictEqual(second, first);
});

test('new ore appears every five levels and only three remain active', () => {
  const g = boot({
    savedState: baseSave({ maxLevel: 20, selectedLevel: 20 }),
    randomFallback: 0.9
  });
  assert.deepStrictEqual(g.save().levelLayouts['20'].activeOres, ['silver','gold','emerald']);
  assert(g.save().levelLayouts['20'].oreChance <= 0.11);
});

test('Prospector is buyable at Level 5 instead of being free', () => {
  const savedState = baseSave({
    gold: 500,
    maxLevel: 5,
    selectedLevel: 5,
    levelLayouts: { '5': layout(5, { key:{x:10,y:8}, activeOres:['copper','iron'] }) }
  });
  const g = boot({ savedState });
  assert.match(g.el('specialistList').children[0].children[0].innerHTML, /Prospector Skeleton ×0/);
  g.el('specialistList').children[0].children[1].click();
  assert.strictEqual(g.save().specialists.prospectors, 1);
  assert.strictEqual(g.save().gold, 0);
});

test('Prospector training unlocks the next ore tier and is expensive', () => {
  const savedState = baseSave({
    gold: 1500,
    maxLevel: 5,
    selectedLevel: 5,
    specialists: { prospectors: 1, trainingTier: 0 },
    levelLayouts: { '5': layout(5, { key:{x:10,y:8}, activeOres:['copper','iron'] }) }
  });
  const g = boot({ savedState });
  const trainingCard = g.el('specialistList').children[1];
  assert.match(trainingCard.children[0].innerHTML, /Train for Iron/);
  trainingCard.children[1].click();
  assert.strictEqual(g.save().specialists.trainingTier, 1);
  assert.strictEqual(g.save().gold, 0);
});

test('trained Prospector roams the map and mines distant eligible ore', () => {
  const c = cfg(5);
  const savedState = baseSave({
    gold: 0,
    maxLevel: 5,
    selectedLevel: 5,
    specialists: { prospectors: 1, trainingTier: 1 },
    levelLayouts: {
      '5': layout(5, {
        key:{x:8,y:1},
        activeOres:['copper','iron'],
        ores:[{x:c.width-1,y:c.height-1,type:'iron'}]
      })
    }
  });
  const g = boot({ savedState });
  g.place(0, 0, 5);
  g.el('startButton').click();
  g.step(5.0);
  assert(g.save().gold >= 12, 'Prospector should mine the distant Iron deposit');
});

test('beating a level clears that layout so a replay can rerandomize', () => {
  const savedState = baseSave({
    maxLevel: 1,
    selectedLevel: 1,
    levelLayouts: { '1': layout(1, { key:{x:1,y:1}, ores:[] }) }
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