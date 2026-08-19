// Portrait/mobile Home Screen polish. Loaded after home-system.js so these rules win.
(function(){
  'use strict';
  const style=document.createElement('style');
  style.id='homeLayoutFixStyles';
  style.textContent=`
    body.home-mode{height:var(--app-height,100dvh);min-height:0;overflow:hidden}
    body.home-mode .app-shell{height:var(--app-height,100dvh);min-height:0;overflow:hidden;padding:0}
    #homeScreen{height:var(--app-height,100dvh);max-height:var(--app-height,100dvh);padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));gap:8px}
    #homeScreen.active-screen{display:grid;grid-template-rows:minmax(210px,44%) auto;align-content:start}
    #homeScreen .home-hero{min-height:210px;max-height:none;flex:none;background-image:url('assets/home-hero-v5.jpg?v=5')!important;background-position:center center;background-size:cover}
    #homeScreen .home-actions{left:10px;right:10px;bottom:10px;max-width:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
    #homeScreen .home-actions .home-primary{grid-column:auto}
    #homeScreen .home-actions button{min-width:0;min-height:38px;padding:6px 5px}
    #homeScreen .home-save-area{min-height:0;flex:none;gap:5px}
    #homeScreen .home-save-heading{min-height:27px}
    #homeScreen .home-save-heading span{display:none}
    #homeScreen .save-slot-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;flex:none;min-height:0}
    #homeScreen .slot-card{height:154px;min-height:154px;max-height:154px;padding:8px 6px;justify-content:center;gap:5px}
    #homeScreen .slot-empty .empty-picks{font-size:22px;margin:0}
    #homeScreen .slot-title{font-size:14px;line-height:1.05}
    #homeScreen .slot-empty>div:not(.empty-picks):not(.slot-title){display:none}
    #homeScreen .slot-empty button{width:100%;margin:3px 0 0;min-height:34px;padding:5px 3px;font-size:12px}
    #homeScreen .slot-meta{margin:3px 0;font-size:10px;gap:2px}
    #homeScreen .slot-meta strong{font-size:14px}
    #homeScreen .slot-last{font-size:9px}
    #homeScreen .slot-buttons{gap:3px}
    #homeScreen .slot-buttons button{min-height:32px;padding:4px 3px;font-size:11px}
    @media (orientation:landscape){
      #homeScreen.active-screen{grid-template-columns:minmax(0,1.35fr) minmax(320px,.9fr);grid-template-rows:1fr;gap:8px}
      #homeScreen .home-hero{height:100%;min-height:0}
      #homeScreen .home-save-area{height:100%;min-height:0}
      #homeScreen .save-slot-grid{grid-template-columns:1fr;grid-template-rows:repeat(3,minmax(0,1fr));height:100%}
      #homeScreen .slot-card{height:auto;min-height:0;max-height:none;display:grid;grid-template-columns:1fr auto;align-items:center;text-align:left;padding:7px 9px}
      #homeScreen .slot-empty{grid-template-columns:auto 1fr auto;gap:8px;text-align:left}
      #homeScreen .slot-empty .empty-picks{display:block}
      #homeScreen .slot-empty button{width:auto;min-width:92px;margin:0}
      #homeScreen .slot-meta{grid-template-columns:repeat(2,minmax(70px,1fr))}
    }
  `;
  document.head.appendChild(style);
})();
