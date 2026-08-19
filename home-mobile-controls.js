// Keep Save/Home reachable on the compact mobile mine layout without taking space from the board.
(function(){
  'use strict';

  const style=document.createElement('style');
  style.textContent='#gameSaveButtonMobile,#gameHomeButtonMobile{display:none}@media(max-width:700px){#gameSaveButtonMobile,#gameHomeButtonMobile{display:inline-block}}';
  document.head.appendChild(style);

  const row=document.querySelector('#mineScreen .placement-row .placement-actions');
  if(row){
    const saveButton=document.createElement('button');
    saveButton.id='gameSaveButtonMobile';
    saveButton.textContent='Save';
    saveButton.addEventListener('click',()=>document.getElementById('gameSaveButton')?.click());

    const homeButton=document.createElement('button');
    homeButton.id='gameHomeButtonMobile';
    homeButton.textContent='Home';
    homeButton.addEventListener('click',()=>document.getElementById('gameHomeButton')?.click());

    row.append(saveButton,homeButton);
  }

  // viewport-fit intentionally adds mine-only body classes. Clear them before Home renders.
  const showScreenBeforeHomeMobileControls=showScreen;
  showScreen=function(id){
    if(id==='homeScreen') document.body.classList.remove('mine-play-screen','round-running');
    return showScreenBeforeHomeMobileControls(id);
  };
})();
