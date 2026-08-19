// Desktop upgrade-node click fix + iPhone/Safari double-tap guard v10.
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
})();
