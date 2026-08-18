// Mobile-first board geometry and Crew screen DOM references.
CONFIG.mapStages = [
  { max: 20, width: 10, height: 13 },
  { max: 50, width: 11, height: 14 },
  { max: 100, width: 12, height: 15 },
  { max: 200, width: 13, height: 16 },
  { max: Infinity, width: 14, height: 17 }
];
canvas.width = 900;
canvas.height = 1250;
ui.crewScreen = document.getElementById('crewScreen');
ui.crewBackButton = document.getElementById('crewBackButton');
ui.resultCrewButton = document.getElementById('resultCrewButton');
