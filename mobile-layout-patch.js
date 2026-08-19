// Fixed mine geometry by device. Phone keeps the approved portrait board; desktop gets a wide board.
const DESKTOP_MINE_LAYOUT = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(min-width: 951px)').matches
  : false;
const MINE_LAYOUT_MODE = DESKTOP_MINE_LAYOUT ? 'desktop' : 'mobile';
const FIXED_MINE_SIZE = DESKTOP_MINE_LAYOUT
  ? { width: 18, height: 8 }
  : { width: 10, height: 13 };

// One fixed board size per device class. Levels no longer make the mine wider or taller.
CONFIG.mapStages = [
  { max: Infinity, width: FIXED_MINE_SIZE.width, height: FIXED_MINE_SIZE.height }
];

// Keep the existing phone canvas untouched. Desktop uses a wide intrinsic canvas so square tiles fill the screen naturally.
if (DESKTOP_MINE_LAYOUT) {
  canvas.width = 1800;
  canvas.height = 800;
  document.documentElement.classList.add('desktop-mine-layout');
} else {
  canvas.width = 900;
  canvas.height = 1250;
  document.documentElement.classList.add('mobile-mine-layout');
}

// Preserve a static ore/key layout separately for phone and desktop until that level is beaten.
function fixedMineLayoutKey(level = save.level) {
  return `${level}@${MINE_LAYOUT_MODE}`;
}

layoutForLevel = function () {
  const level = save.level;
  const cfg = levelConfig(level);
  const key = fixedMineLayoutKey(level);
  let layout = save.levelLayouts[key];

  // Reuse an older layout when it already matches the new fixed dimensions.
  const legacy = save.levelLayouts[String(level)];
  if (!layout && legacy && legacy.version === 4 && legacy.width === cfg.width && legacy.height === cfg.height) {
    layout = legacy;
    save.levelLayouts[key] = layout;
    persist();
  }

  if (!layout || layout.version !== 4 || layout.width !== cfg.width || layout.height !== cfg.height) {
    layout = createLevelLayout(level);
    save.levelLayouts[key] = layout;
    persist();
  }
  return layout;
};

// Desktop play is a fixed one-screen surface, just like the phone version.
if (DESKTOP_MINE_LAYOUT && !document.getElementById('desktopMineLayoutStyles')) {
  const style = document.createElement('style');
  style.id = 'desktopMineLayoutStyles';
  style.textContent = `
    @media (min-width: 951px) {
      body.mine-play-screen {
        height: var(--app-height, 100dvh);
        overflow: hidden;
        overscroll-behavior: none;
      }
      body.mine-play-screen .app-shell {
        height: var(--app-height, 100dvh);
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      body.mine-play-screen .topbar {
        flex: 0 0 auto;
        margin-bottom: 6px;
      }
      body.mine-play-screen #mineScreen.active-screen {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        overflow: hidden;
      }
      body.mine-play-screen #mineScreen .mine-card {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      body.mine-play-screen #mineScreen .mine-toolbar,
      body.mine-play-screen #mineScreen .ore-strip,
      body.mine-play-screen #mineScreen .placement-row {
        flex: 0 0 auto;
      }
      body.mine-play-screen #mineScreen .canvas-wrap {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        padding: 6px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      body.mine-play-screen #mineScreen .canvas-wrap canvas {
        display: block;
        width: auto !important;
        height: auto !important;
        max-width: 100% !important;
        max-height: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// Crew screen DOM references.
ui.crewScreen = document.getElementById('crewScreen');
ui.crewBackButton = document.getElementById('crewBackButton');
ui.resultCrewButton = document.getElementById('resultCrewButton');

// The original completion code removes only the old single layout key. Also clear both fixed device layouts.
window.addEventListener('load', () => {
  if (typeof finishRun !== 'function' || finishRun.__fixedMineLayoutCleanup) return;
  const finishRunBeforeFixedLayout = finishRun;
  const finishRunWithFixedLayoutCleanup = function (success, reason) {
    if (success && !resultShown) {
      const completedLevel = save.level;
      delete save.levelLayouts[`${completedLevel}@mobile`];
      delete save.levelLayouts[`${completedLevel}@desktop`];
    }
    return finishRunBeforeFixedLayout(success, reason);
  };
  finishRunWithFixedLayoutCleanup.__fixedMineLayoutCleanup = true;
  finishRun = finishRunWithFixedLayoutCleanup;
});
