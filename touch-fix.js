// Desktop upgrade-node click fix + iPhone/Safari double-tap guard + pre-round miner repositioning v12.
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

  // Before mining starts, players can either tap a placed skeleton and then
  // tap a destination, or press/hold and drag that skeleton across the grid.
  let selectedPlacementIndex = null;
  let dragPlacement = null;
  const DRAG_THRESHOLD_PX = 7;

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

  function resetMinerForPlacement(miner){
    if(!miner) return;
    miner.target = null;
    miner.cooldown = 0;
    miner.hits = 0;
    miner.cleanSweep = false;
  }

  function clearPlacementSelection(){
    selectedPlacementIndex = null;
    dragPlacement = null;
  }

  function releaseCanvasPointer(pointerId){
    try {
      if(canvas.hasPointerCapture && canvas.hasPointerCapture(pointerId)){
        canvas.releasePointerCapture(pointerId);
      }
    } catch {}
  }

  if(typeof renderMineControls === 'function'){
    const renderMineControlsBeforeMoveSelection = renderMineControls;
    renderMineControls = function(){
      const result = renderMineControlsBeforeMoveSelection.apply(this, arguments);
      const miner = !running ? selectedPlacement() : null;
      if(miner && ui && ui.placementHint){
        const label = MINER_TYPES[miner.type]?.name || 'Skeleton';
        ui.placementHint.textContent = dragPlacement?.dragging
          ? `${label} ${miner.index + 1} moving — release on an empty tile to drop him.`
          : `${label} ${miner.index + 1} selected — tap a new tile or hold and drag him.`;
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
    // The mine itself does not need browser panning/zoom gestures. Disabling
    // them here makes press-and-drag reliable on iPhone Safari as well as Mac.
    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', function(event){
      // Mining and blast-placement behavior remain unchanged.
      if(running || blastMode){
        clearPlacementSelection();
        return;
      }

      const cell = pointerCell(event);
      if(!cell) return;
      const hitIndex = placementIndexAt(cell);

      // Pressing a placed skeleton starts a pending drag. If the pointer never
      // moves far enough, pointerup treats it as the normal tap/select action.
      if(hitIndex >= 0){
        event.preventDefault();
        event.stopImmediatePropagation();

        const miner = placements[hitIndex];
        const wasSelected = selectedPlacementIndex === hitIndex;
        selectedPlacementIndex = hitIndex;
        dragPlacement = {
          pointerId: event.pointerId,
          index: hitIndex,
          startClientX: event.clientX,
          startClientY: event.clientY,
          originalX: miner.x,
          originalY: miner.y,
          wasSelected,
          dragging: false
        };

        try { canvas.setPointerCapture(event.pointerId); } catch {}
        renderMineControls();
        draw();
        return;
      }

      if(selectedPlacementIndex != null){
        event.preventDefault();
        event.stopImmediatePropagation();

        // Empty-cell tap: move the selected miner while preserving type/index.
        const miner = selectedPlacement();
        if(miner){
          miner.x = cell.x;
          miner.y = cell.y;
          resetMinerForPlacement(miner);
        }
        clearPlacementSelection();
        renderMineControls();
        draw();
        return;
      }

      // Empty-cell taps with no selection fall through to the game's original
      // pointerdown handler, which places the next skeleton normally.
    }, { capture:true, passive:false });

    canvas.addEventListener('pointermove', function(event){
      if(!dragPlacement || dragPlacement.pointerId !== event.pointerId || running || blastMode) return;

      const dx = event.clientX - dragPlacement.startClientX;
      const dy = event.clientY - dragPlacement.startClientY;
      if(!dragPlacement.dragging && Math.hypot(dx,dy) < DRAG_THRESHOLD_PX) return;

      dragPlacement.dragging = true;
      event.preventDefault();
      event.stopImmediatePropagation();

      const cell = pointerCell(event);
      if(!cell) return;
      const occupiedIndex = placementIndexAt(cell);
      if(occupiedIndex >= 0 && occupiedIndex !== dragPlacement.index) return;

      const miner = placements[dragPlacement.index];
      if(!miner) return;
      if(miner.x === cell.x && miner.y === cell.y) return;

      miner.x = cell.x;
      miner.y = cell.y;
      resetMinerForPlacement(miner);
      renderMineControls();
      draw();
    }, { capture:true, passive:false });

    canvas.addEventListener('pointerup', function(event){
      if(!dragPlacement || dragPlacement.pointerId !== event.pointerId) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      const drag = dragPlacement;
      releaseCanvasPointer(event.pointerId);
      dragPlacement = null;

      if(drag.dragging){
        // The miner already follows each valid tile during pointermove, so the
        // last valid empty tile is the drop location.
        selectedPlacementIndex = null;
      }else if(drag.wasSelected){
        // A plain tap on an already-selected miner cancels selection.
        selectedPlacementIndex = null;
      }else{
        // A plain tap on a different miner selects him for tap-to-move mode.
        selectedPlacementIndex = drag.index;
      }

      renderMineControls();
      draw();
    }, { capture:true, passive:false });

    canvas.addEventListener('pointercancel', function(event){
      if(!dragPlacement || dragPlacement.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const drag = dragPlacement;
      const miner = placements[drag.index];
      if(miner && drag.dragging){
        miner.x = drag.originalX;
        miner.y = drag.originalY;
        resetMinerForPlacement(miner);
      }
      releaseCanvasPointer(event.pointerId);
      clearPlacementSelection();
      renderMineControls();
      draw();
    }, { capture:true, passive:false });
  }

  // Clear any pending selection when the placement state changes by controls.
  [ui?.undoButton, ui?.resetPlacementButton, ui?.startButton, ui?.blastButton].forEach(function(button){
    if(!button) return;
    button.addEventListener('click', clearPlacementSelection, { capture:true });
  });
})();
