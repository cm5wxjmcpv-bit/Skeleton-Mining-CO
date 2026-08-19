// iPhone/Safari double-tap zoom guard v9.
(function(){
  'use strict';

  // touch-action: manipulation handles normal Safari double-tap zoom.
  // Prevent native dblclick default behavior as a lightweight fallback.
  document.addEventListener('dblclick', function(event){
    event.preventDefault();
  }, { passive:false });
})();
