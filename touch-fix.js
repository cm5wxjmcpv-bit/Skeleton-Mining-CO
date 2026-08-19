// Desktop upgrade-node click fix + iPhone/Safari double-tap guard + pre-round miner repositioning v11.
(function(){
  'use strict';

  // touch-action: manipulation handles normal Safari double-tap zoom.
  // Prevent native dblclick default behavior as a lightweight fallback.
  document.addEventListener('dblclick', function(event){
    event.preventDefault();
  }, { passive:false });

  const desktopTree = typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 951px)')
    : null;

  function protectDesktopTreeNodes(){
    if(!desktopTree || !desktopTree.matches) return;
    document.querySelectorAll('.tree-node').forEach(function(node){
      if(node.dataset.desktopClickFix === '1') return;
      node.dataset.desktopClickFix = '1';

      // The tree viewport uses pointerdown to start panning. On desktop that
      // parent handler can capture the pointer before a node receives a click.
      // Stop only node pointerdowns from bubbling so normal node clicks work;
      // dragging the empty tree background still pans exactly as before.
      node.addEventListener('pointerdown', function(event){
        event.stopPropagation();
      });
    });
  }

  if(desktopTree && desktopTree.matches && typeof renderTree === 'function'){
    const renderTreeBeforeDesktopClickFix = renderTree;
    renderTree = function(){
      const result = renderTreeBeforeDesktopClickFix.apply(this, arguments);
      protectDesktopTreeNodes();
      return result;
    };
    protectDesktopTreeNodes();
  }

  // Before mining starts, let the player tap/click an already placed skeleton
  // and then tap/click a different empty cell to move that same skeleton.
  let selectedPlacementIndex = null;

  function selectedPlacement(){
    if(selectedPlacementIndex == null) return null;
    const miner = placements[selectedPlacementIndex];
    if(!miner) selectedPlacementIndex = null;
    return miner || null;
  }

  function placementIndexAt(cell){
    if(!cell) return -1;
    return placements.findIndex(function(miner){
      return miner.x === cell.x && miner.y === cell.y;
    });
  }

  function clearPlacementSelection(){
    selectedPlacementIndex = null;
  }

  if(typeof renderMineControls === 'function'){
    const renderMineControlsBeforeMoveSelection = renderMineControls;
    renderMineControls = function(){
      const result = renderMineControlsBeforeMoveSelection.apply(this, arguments);
      const miner = !running ? selectedPlacement() : null;
      if(miner && ui && ui.placementHint){
        const label = MINER_TYPES[miner.type]?.name || 'Skeleton';
        ui.placementHint.textContent = `${label} ${miner.index + 1} selected — tap a new tile to move him, or tap him again to cancel.`;
      }
      return result;
    };
  }

  if(typeof draw === 'function'){
    const drawBeforeMoveSelection = draw;
    draw = function(){
      const result = drawBeforeMoveSelection.apply(this, arguments);
      const miner = !running ? selectedPlacement() : null;
      if(miner){
        const metrics = canvasMetrics();
        const x = metrics.left + miner.x * metrics.cell;
        const y = metrics.top + miner.y * metrics.cell;
        const inset = Math.max(3, metrics.cell * .055);
        ctx.save();
        ctx.strokeStyle = '#ffd85a';
        ctx.lineWidth = Math.max(3, metrics.cell * .045);
        ctx.shadowColor = 'rgba(255,216,90,.7)';
        ctx.shadowBlur = Math.max(4, metrics.cell * .07);
        ctx.strokeRect(x + inset, y + inset, metrics.cell - inset * 2, metrics.cell - inset * 2);
        ctx.restore();
      }
      return result;
    };
  }

  if(canvas && typeof pointerCell === 'function'){
    canvas.addEventListener('pointerdown', function(event){
      // Mining and blast-placement behavior remain unchanged.
      if(running || blastMode){
        clearPlacementSelection();
        return;
      }

      const cell = pointerCell(event);
      if(!cell) return;
      const hitIndex = placementIndexAt(cell);

      if(selectedPlacementIndex != null){
        event.preventDefault();
        event.stopImmediatePropagation();

        // Tap the selected miner again to cancel move mode.
        if(hitIndex === selectedPlacementIndex){
          clearPlacementSelection();
          renderMineControls();
          draw();
          return;
        }

        // Tapping another placed miner simply switches the selected miner.
        if(hitIndex >= 0){
          selectedPlacementIndex = hitIndex;
          renderMineControls();
          draw();
          return;
        }

        // Empty cell: move the selected miner while preserving its type/index.
        const miner = selectedPlacement();
        if(miner){
          miner.x = cell.x;
          miner.y = cell.y;
          miner.target = null;
          miner.cooldown = 0;
          miner.hits = 0;
          miner.cleanSweep = false;
        }
        clearPlacementSelection();
        renderMineControls();
        draw();
        return;
      }

      // Tapping an existing miner enters move mode. Empty-cell taps still fall
      // through to the game's normal placement handler for new skeletons.
      if(hitIndex >= 0){
        event.preventDefault();
        event.stopImmediatePropagation();
        selectedPlacementIndex = hitIndex;
        renderMineControls();
        draw();
      }
    }, { capture:true, passive:false });
  }

  // Clear any pending selection when the placement state changes by controls.
  [ui?.undoButton, ui?.resetPlacementButton, ui?.startButton, ui?.blastButton].forEach(function(button){
    if(!button) return;
    button.addEventListener('click', clearPlacementSelection, { capture:true });
  });
})();
