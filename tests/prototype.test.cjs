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
    this.width = 900;
    this.height = 600;
    this.ctx = new Proxy({}, {
      get(target, prop) {
        if (!(prop in target)) target[prop] = () => {};
        return target[prop];
      },
      set(target, prop, value) { target[prop] = value; return true; }
    });
  }
  getContext() { return this.ctx; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 600 }; }
}

const IDS = [
  'mineCanvas','levelStat','goldStat','timeStat','levelTitle','levelGoal','startButton',
  'endAttemptButton','undoButton','resetPlacementButton','resetSaveButton','placementHint',
  'crewList','crewCount','upgradeList','levelButtons','messageOverlay'
];

function sequence(values, fallback = 0.5) {
  let i = 0;
  return () => i < values.length ? values[i++] : fallback;
}

function mineRandoms({ width = 9, height = 6, goldCells = [], keyX = 1, keyY = 1 }) {
  const gold = new Set(goldCells.map(([x, y]) => `${x},${y}`));
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out.push(gold.has(`${x},${y}`) ? 0.01 : 0.5);
  }
  out.push((keyX + 0.1) / width, (keyY + 0.1) / height);
  return out;
}

function boot({ randomValues = mineRandoms({}), savedState = null, randomFallback = 0.5 } = {}) {
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

  function pointForCell(x, y, width = 9, height = 6) {
    const pad = 28;
    const cell = Math.min((900 - pad * 2) / width, (600 - pad * 2) / height);
    const boardW = cell * width;
    const boardH = cell * height;
    const left = (900 - boardW) / 2;
    const top = (600 - boardH) / 2;
    return { clientX: left + (x + 0.5) * cell, clientY: top + (y + 0.5) * cell };
  }

  return {
    el: id => elements.get(id),
    step,
    place(x, y) { elements.get('mineCanvas').dispatch('pointerdown', pointForCell(x, y)); },
    save() { return JSON.parse(storage.get('skeletonMiningSave')); }
  };
}

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('boots with smaller 1.25 tile radius and two skeletons', () => {
  const g = boot();
  assert.strictEqual(g.el('levelStat').textContent, 1);
  assert.strictEqual(g.el('crewCount').textContent, '2 standard');
  assert.match(g.el('crewList').children[0].innerHTML, /1\.25 tile radius/);
  assert.strictEqual(g.el('startButton').disabled, true);
  assert.strictEqual(g.el('endAttemptButton').disabled, true);
});

test('placement starts mining and End Attempt stops immediately', () => {
  const g = boot();
  g.place(1, 1);
  g.el('startButton').click();
  assert.strictEqual(g.el('endAttemptButton').disabled, false);
  g.el('endAttemptButton').click();
  assert.match(g.el('messageOverlay').textContent, /ATTEMPT ENDED/);
  assert.strictEqual(g.el('endAttemptButton').disabled, true);
  assert.strictEqual(g.el('startButton').textContent, 'New Attempt');
});

test('key location stays fixed across attempts in the same playthrough', () => {
  const g = boot({ randomValues: mineRandoms({ keyX: 1, keyY: 1 }), randomFallback: 0.9 });
  const first = g.save().keyLocations['1'];
  assert.deepStrictEqual(first, { x: 1, y: 1 });
  g.place(0, 0);
  g.el('startButton').click();
  g.el('endAttemptButton').click();
  g.el('messageOverlay').click();
  const second = g.save().keyLocations['1'];
  assert.deepStrictEqual(second, first);
});

test('resetting the save starts a new playthrough with a new key location', () => {
  const g = boot({ randomValues: mineRandoms({ keyX: 1, keyY: 1 }), randomFallback: 0.9 });
  const first = g.save().keyLocations['1'];
  g.el('resetSaveButton').click();
  const second = g.save().keyLocations['1'];
  assert.notDeepStrictEqual(second, first);
});

test('finding the fixed key completes Level 1 and unlocks Level 2', () => {
  const g = boot({ randomValues: mineRandoms({ keyX: 1, keyY: 1 }) });
  g.place(1, 1);
  g.el('startButton').click();
  g.step(2.0);
  assert.match(g.el('messageOverlay').textContent, /GOLDEN KEY FOUND/);
  assert.strictEqual(g.save().maxLevel, 2);
});

test('gold is kept after manually ending an attempt', () => {
  const g = boot({ randomValues: mineRandoms({ goldCells: [[1,1]], keyX: 8, keyY: 5 }) });
  g.place(1, 1);
  g.el('startButton').click();
  g.step(2.0);
  const beforeEnd = g.save().gold;
  assert(beforeEnd > 0, 'gold should be mined before ending the attempt');
  g.el('endAttemptButton').click();
  assert.strictEqual(g.save().gold, beforeEnd);
});

test('radius upgrade is a smaller +0.15 tile increase', () => {
  const g = boot({ savedState: {
    gold: 100, maxLevel: 1, selectedLevel: 1,
    upgrades: { radius: 0, speed: 0, crew: 0, time: 0 }, keyLocations: { '1': { x: 8, y: 5 } }
  }});
  const radiusCard = g.el('upgradeList').children[0];
  radiusCard.children[0].click();
  assert.strictEqual(g.save().gold, 75);
  assert.strictEqual(g.save().upgrades.radius, 1);
  assert.match(g.el('crewList').children[0].innerHTML, /1\.40 tile radius/);
});

test('Gold Digger unlocks at Level 3 and collects distant gold', () => {
  const g = boot({
    randomValues: mineRandoms({ goldCells: [[8,5]], keyX: 4, keyY: 0 }),
    savedState: {
      gold: 0, maxLevel: 3, selectedLevel: 1,
      upgrades: { radius: 0, speed: 0, crew: 0, time: 0 }, keyLocations: { '1': { x: 4, y: 0 } }
    }
  });
  assert.match(g.el('crewList').children[1].innerHTML, /UNLOCKED/);
  g.place(0, 0);
  g.el('startButton').click();
  g.step(3.0);
  assert(g.save().gold > 0, 'Gold Digger should collect gold outside standard radius');
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
