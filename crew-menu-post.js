// Keep Crew Loadout off the live mine and make it a between-round menu.
const showScreenBeforeCrewMenu = showScreen;
showScreen = function(id){
  ui.crewScreen.classList.remove('active-screen');
  if(id === 'crewScreen'){
    for(const screen of [ui.mineScreen, ui.upgradeScreen, ui.artifactScreen, ui.resultScreen]) screen.classList.remove('active-screen');
    ui.crewScreen.classList.add('active-screen');
    ui.screenTitle.textContent = 'Crew';
    // A completed attempt is already queued to rebuild, so old placements can be cleared safely.
    placements = [];
    renderCrewPicker();
    renderTopbar();
    return;
  }
  showScreenBeforeCrewMenu(id);
};
ui.resultCrewButton.addEventListener('click', () => showScreen('crewScreen'));
ui.crewBackButton.addEventListener('click', () => showScreen('resultScreen'));
