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
    this.innerHTML = '';
    this.disabled = false;
    this.className = '';
    this.children = [];
    this.listeners = {};
    this.classList = new FakeClassList();
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  dispatch(type, event = {}) {
    for (const fn of this.listeners[type] || []) fn(event);
  }
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
  'undoButton','resetPlacementButton','resetSaveButton','placementHint','crewList','crewCount',
  'upgradeList','levelButtons','messageOverlay'
];

function sequence(values, fallback = 0.5) {
  let i = 0;
  return () => i < values.length ? values[i++] : fallback;
}

function mineRandoms({ width = 9, height = 6, goldCells = [], keyX = 1, keyY = 1 }) {
  const gold = new Set(goldCells.map(([x,y]) => `${x},${y}`));
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out.push(gold.has(`${x},${y}`) ? 0.01 : 0.5);
  }
  out.push((keyX + 0.1) / width, (keyY + 0.1) / height);
  return out;
}

function boot({ randomValues = mineRandoms({}), savedState = null } = {}) {
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
  sandbox.Math.random = sequence(randomValues);
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
    storage,
    step,
    place(x, y) { elements.get('mineCanvas').dispatch('pointerdown', pointForCell(x, y)); },
    save() { return JSON.parse(storage.get('skeletonMiningSave')); }
  };
}

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('boots with Level 1 and two standard skeletons', () => {
  const g = boot();
  assert.strictEqual(g.el('levelStat').textContent, 1);
  assert.strictEqual(g.el('crewCount').textContent, '2 standard');
  assert.strictEqual(g.el('startButton').disabled, true);
});

test('placement enables mining and duplicate placement is rejected', () => {
  const g = boot();
  g.place(1, 1);
  assert.strictEqual(g.el('startButton').disabled, false);
  const hintAfterOne = g.el('placementHint').textContent;
  g.place(1, 1);
  assert.strictEqual(g.el('placementHint').textContent, hintAfterOne);
  g.place(5, 1);
  assert.match(g.el('placementHint').textContent, /Crew placed/);
});

test('finding the randomized key completes Level 1 and unlocks Level 2', () => {
  const g = boot({ randomValues: mineRandoms({ keyX: 1, keyY: 1 }) });
  g.place(1, 1);
  g.el('startButton').click();
  g.step(2.0);
  assert.match(g.el('messageOverlay').textContent, /GOLDEN KEY FOUND/);
  assert.strictEqual(g.save().maxLevel, 2);
  g.el('messageOverlay').click();
  assert.strictEqual(g.el('levelStat').textContent, 2);
});

test('gold is kept when a shift fails', () => {
  const g = boot({ randomValues: mineRandoms({ goldCells: [[1,1]], keyX: 8, keyY: 5 }) });
  g.place(1, 1);
  g.el('startButton').click();
  g.step(43);
  assert.match(g.el('messageOverlay').textContent, /SHIFT OVER/);
  assert(g.save().gold > 0, 'gold mined during a failed run should persist');
});

test('radius upgrade spends gold and visibly increases the radius', () => {
  const g = boot({ savedState: { gold: 100, maxLevel: 1, selectedLevel: 1, upgrades: { radius: 0, speed: 0, crew: 0, time: 0 } } });
  const radiusCard = g.el('upgradeList').children[0];
  const buyButton = radiusCard.children[0];
  buyButton.click();
  assert.strictEqual(g.save().gold, 75);
  assert.strictEqual(g.save().upgrades.radius, 1);
  assert.match(g.el('crewList').children[0].innerHTML, /2\.15 tile radius/);
});

test('Gold Digger unlocks when Level 3 is reached', () => {
  const g = boot({ savedState: { gold: 0, maxLevel: 3, selectedLevel: 1, upgrades: { radius: 0, speed: 0, crew: 0, time: 0 } } });
  assert.match(g.el('crewList').children[1].innerHTML, /UNLOCKED/);
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

// Balance diagnostics: these do not fail the build, but flag things worth testing by feel.
const startingRadius = 1.7;
const offsets = [];
for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y) <= startingRadius) offsets.push([x,y]);
const reachablePerSkeleton = offsets.length;
const level1Cells = 9 * 6;
const maxUniqueReach = reachablePerSkeleton * 2;
const clearTimeSeconds = reachablePerSkeleton * 2 * 0.78;
const idleTime = 42 - clearTimeSeconds;
console.log(`DIAG  Starting radius reaches about ${reachablePerSkeleton} cells per skeleton; two non-overlapping skeletons can cover ${maxUniqueReach}/${level1Cells} cells (${Math.round(maxUniqueReach/level1Cells*100)}%).`);
console.log(`DIAG  A starting skeleton can clear its full 9-cell radius in about ${clearTimeSeconds.toFixed(1)}s, leaving up to ${idleTime.toFixed(1)}s on the Level 1 timer if the key is outside coverage.`);

if (failures) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log(`\n${tests.length} automated gameplay tests passed.`);
