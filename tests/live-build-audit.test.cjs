const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const cleanUrl = value => value.split('?')[0].split('#')[0];

function collect(regex, text) {
  return [...text.matchAll(regex)].map(match => match[1]);
}

const index = read('index.html');
const scripts = collect(/<script\s+src=["']([^"']+)["']/g, index).map(cleanUrl);
const styles = collect(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g, index).map(cleanUrl);

assert(scripts.length > 10, 'live page should load the modular game script chain');
assert(!scripts.includes('game.js'), 'obsolete monolithic game.js must not be the live browser runtime');

for (const file of [...scripts, ...styles]) {
  if (/^(?:https?:|data:)/.test(file)) continue;
  assert(exists(file), `index references missing local file: ${file}`);
}

// Compile every root JavaScript file. This is a syntax check without executing
// browser-only globals and catches a broken patch before it reaches the page.
for (const file of fs.readdirSync(root).filter(name => name.endsWith('.js')).sort()) {
  const source = read(file);
  assert.doesNotThrow(
    () => new vm.Script(source, { filename: file }),
    `JavaScript syntax error in ${file}`
  );
}

function scriptIndex(file) {
  const i = scripts.indexOf(file);
  assert(i >= 0, `${file} must be loaded by index.html`);
  return i;
}

assert(scriptIndex('save-manager.js') < scriptIndex('game-part1.js'), 'save routing must load before the game reads localStorage');
assert(scriptIndex('game-patch.js') < scriptIndex('balance-rework.js'), 'rebalance must override legacy runtime patches');
assert(scriptIndex('balance-rework.js') < scriptIndex('game-part4.js'), 'rebalance definitions must exist before UI/event wiring');
assert(scriptIndex('game-part4.js') < scriptIndex('balance-ui-post.js'), 'rebalance UI must wrap live UI functions');
assert(scriptIndex('balance-ui-post.js') < scriptIndex('balance-safety-post.js'), 'safety hardening must load after rebalance UI');
assert(scriptIndex('home-system.js') < scriptIndex('full-audit-fixes.js'), 'final audit fixes must correct Home late overrides');
assert(scriptIndex('touch-fix.js') < scriptIndex('full-audit-fixes.js'), 'final audit fixes must wrap the final pre-audio draw/interaction layer');
assert(scriptIndex('tutorial-screenshot-patch.js') < scriptIndex('full-audit-fixes.js'), 'tutorial integration must be present before final audit fixes');
assert(scriptIndex('full-audit-fixes.js') < scriptIndex('audio-system.js'), 'audio should wrap the fully corrected runtime');

// Validate direct dynamic script references used by the live files.
const loadedSources = scripts.filter(exists).map(read).join('\n');
for (const dynamic of collect(/\.src\s*=\s*["']([^"']+\.js(?:\?[^"']*)?)["']/g, loadedSources).map(cleanUrl)) {
  assert(exists(dynamic), `runtime dynamically loads missing script: ${dynamic}`);
}
assert(exists('miner-animation.js'), 'miner-animation.js must exist for the dynamic miner renderer');

// Detect duplicate static DOM ids in the page.
const staticIds = collect(/\sid=["']([^"']+)["']/g, index);
const duplicateIds = staticIds.filter((id, i) => staticIds.indexOf(id) !== i);
assert.deepStrictEqual([...new Set(duplicateIds)], [], `duplicate static DOM ids: ${[...new Set(duplicateIds)].join(', ')}`);

// Check literal getElementById references against IDs declared either in the
// static HTML or dynamically by the loaded scripts.
const requestedIds = new Set(collect(/getElementById\(["']([^"']+)["']\)/g, loadedSources));
const declaredIds = new Set(staticIds);
for (const id of collect(/\bid=["']([^"']+)["']/g, loadedSources)) declaredIds.add(id);
for (const id of collect(/\.id\s*=\s*["']([^"']+)["']/g, loadedSources)) declaredIds.add(id);
const missingIds = [...requestedIds].filter(id => !declaredIds.has(id));
assert.deepStrictEqual(missingIds, [], `scripts request undeclared DOM ids: ${missingIds.join(', ')}`);

const balance = read('balance-rework.js');
const audit = read('full-audit-fixes.js');
const home = read('home-system.js');

assert(balance.includes("UPGRADE_DEFS[30].name = 'Deep Mine'"), 'Deep Mine replacement must remain active');
assert(balance.includes("UPGRADE_DEFS[29].name = \"Miner's Notes\""), "Miner's Notes replacement must remain active");
assert(audit.includes("name: 'Precision Miner'"), 'late runtime must restore Precision Miner after Home loads');
assert(audit.includes('unlock: 35'), 'Precision Miner must unlock at Level 35');
assert(audit.includes('MINER_TYPES.value.unlock = 50'), 'High-Value Miner must unlock at Level 50');
assert(audit.includes('upgradeSpend'), 'Reset Relic must use a spend ledger after price rebalance');
assert(audit.includes('deepResultLocked'), 'Deep Mine successful results must be navigation-locked');
assert(audit.includes('Cash out or finish the Deep Mine'), 'Deep Mine must guard unsafe save/home/reset exits');
assert(home.includes("MINER_TYPES.wide.unlock=20"), 'test expects the known legacy Home override to remain detectable and corrected later');

assert(exists('assets/home-hero-v2.webp'), 'primary high-resolution home hero is missing');

console.log(`Live build audit passed: ${scripts.length} scripts, ${styles.length} stylesheets, ${requestedIds.size} DOM references checked.`);
