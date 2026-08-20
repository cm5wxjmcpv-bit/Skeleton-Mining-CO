'use strict';

// ---- Testable balance configuration ----
const CONFIG = {
  baseRoundTime: 45,
  rockHp: 3,
  oreUnlockEvery: 5,
  maxActiveOres: 3,
  mapStages: [
    { max: 20, width: 14, height: 10 },
    { max: 50, width: 16, height: 11 },
    { max: 100, width: 18, height: 12 },
    { max: 200, width: 20, height: 13 },
    { max: Infinity, width: 22, height: 14 }
  ],
  artifactChance: [
    { min: 3, max: 5, chance: 0.02 },
    { min: 6, max: 10, chance: 0.04 },
    { min: 11, max: 15, chance: 0.07 },
    { min: 16, max: Infinity, chance: 0.10 }
  ]
};

const ORES = [
  ['copper','Copper',1,5,'#b87333'],
  ['iron','Iron',10,12,'#9ea7ad'],
  ['silver','Silver',15,30,'#dce4ea'],
  ['gold','Gold',20,70,'#e1b84b'],
  ['emerald','Emerald',25,160,'#46c98a'],
  ['ruby','Ruby',30,360,'#cf4d5b'],
  ['sapphire','Sapphire',35,800,'#4e79d8'],
  ['platinum','Platinum',40,1800,'#d8d7cf'],
  ['obsidian','Obsidian',45,4000,'#645572'],
  ['diamond','Diamond',50,9000,'#9fe7ef'],
  ['mythril','Mythril',55,20000,'#7fd2c9'],
  ['starstone','Starstone',60,45000,'#f1a8ff'],
  ['voidcrystal','Void Crystal',65,100000,'#9a7cff'],
  ['sunore','Sun Ore',70,225000,'#ffd270'],
  ['dragonite','Dragonite',75,500000,'#db7357'],
  ['eternium','Eternium',80,1100000,'#9fffa8']
].map(([id,name,unlockLevel,value,color],index)=>({id,name,unlockLevel,value,color,index}));
const ORE_BY_ID = Object.fromEntries(ORES.map(o=>[o.id,o]));

const MINER_TYPES = {
  basic: { name:'Basic Miner', unlock:1, interval:0.78, radius:1, value:1, desc:'Balanced mining speed and reach.' },
  fast: { name:'Fast Miner', unlock:10, interval:0.78/1.35, radius:0.8, value:1, desc:'35% faster, 20% smaller radius.' },
  wide: { name:'Wide-Reach Miner', unlock:35, interval:0.78*1.25, radius:1.4, value:1, desc:'40% more reach, 25% slower.' },
  value: { name:'High-Value Miner', unlock:50, interval:0.78*1.30, radius:1, value:1.5, desc:'30% slower; ore is worth 50% more.' }
};

const ARTIFACTS = {
  reset: { name:'Reset Relic', permanent:false, desc:'Consume one to reset all 30 upgrade orbs and refund 100% of spent upgrade value.' },
  magnet: { name:'Ore Magnet', permanent:true, desc:'Reveals one ore-rich tile before placement every run.' },
  totem: { name:'Skeleton Totem', permanent:true, desc:'One random standard skeleton gets +25% mining speed and +25% radius each run.' },
  timepiece: { name:'Timepiece', permanent:true, desc:'If time expires before the key is found, automatically grants 10 extra seconds once per run.' },
  charm: { name:"Miner's Charm", permanent:true, desc:'One active ore type is randomly favored each run and is worth +50%.' }
};

const UPGRADE_DEFS = {
  1:{name:'Mining Radius',desc:'Expand how far standard skeletons can reach.',cost:[5,10,20,35,60],pos:[800,1040],effect:'Ranks: radius 1.45 / 1.75 / 2.05 / 2.45 / 2.85. Rank 5 can reach one nearest block just outside normal radius.'},
  2:{name:'Mining Speed',desc:'Standard skeletons strike 10% faster per rank.',cost:[8,16,32,56,96],pos:[650,920],effect:'Rank 5 switches to a new target without waiting for another mining tick.',pre:[1]},
  3:{name:'Crew Size',desc:'Add one standard skeleton slot per rank.',cost:[20,40,80,140,240],pos:[800,880],effect:'Base crew is 2. Rank 5 also gives the first placed skeleton a small radius bonus.',pre:[1]},
  4:{name:'Longer Shift',desc:'Add 3 seconds to every mining run per rank.',cost:[10,20,40,70,120],pos:[950,920],effect:'Rank 5 grants one extra 5-second overtime period if the key has not been found.',pre:[1]},
  5:{name:'Mining Power',desc:'Increase damage per strike.',cost:[15,30,60,105,180],pos:[540,790],effect:'Each rank adds mining power. Rank 5 makes every fifth strike a Heavy Hit.',pre:[2]},
  6:{name:'Ore Value',desc:'Increase the upgrade value earned from every ore.',cost:[15,30,60,105,180],pos:[690,750],effect:'+10% ore value per rank. Rank 5 also gives each ore a small chance to pay double.',pre:[2]},
  7:{name:'Crew Coordination',desc:'Skeletons working the same block become more efficient.',cost:[25,50,100,175,300],pos:[830,720],effect:'Each rank improves the teamwork speed bonus when miners overlap.',pre:[3]},
  8:{name:'Prospector Speed',desc:'Prospectors extract ore 10% faster per rank.',cost:[30,60,120,210,360],pos:[720,590],effect:'Rank 5 gives a movement-speed burst after extracting a deposit.',pre:[6],levelGate:20},
  9:{name:'Prospector Movement',desc:'Prospectors move between deposits 10% faster per rank.',cost:[35,70,140,245,420],pos:[720,450],effect:'Rank 5 removes the normal transition delay when arriving at a deposit.',pre:[8],levelGate:20},
  10:{name:'Rich Start',desc:'Major: enrich the first skeleton area and the whole level.',cost:[450],pos:[555,650],effect:'Tiles around the first skeleton become ore-rich, and the level receives about 25% more ore deposits.',pre:[5,6],allPre:true,major:true},
  11:{name:'Soft Rock',desc:'A portion of rock begins each run weakened.',cost:[40,80,160,280,480],pos:[390,650],effect:'5% more weakened rock per rank. At rank 5, many weakened tiles break in one hit.',pre:[5]},
  12:{name:'Lucky Break',desc:'Breaking ordinary rock can reveal bonus ore.',cost:[45,90,180,315,540],pos:[550,515],effect:'3% / 6% / 9% / 12% / 15% chance. Rank 5 can reveal two bonus ores.',pre:[6]},
  13:{name:'Wide Sweep',desc:'Finishing a block can instantly break an adjacent block.',cost:[55,110,220,385,660],pos:[390,500],effect:'3% / 6% / 9% / 12% / 15% chance. Rank 5 can break two adjacent blocks.',pre:[11]},
  14:{name:'Helping Hand',desc:'Idle skeletons boost miners that still have work.',cost:[60,120,240,420,720],pos:[980,650],effect:'Each idle skeleton contributes a larger speed bonus with each rank.',pre:[7]},
  15:{name:'Chain Reaction',desc:'Wide Sweep breaks can trigger more instant breaks.',cost:[75,150,300,525,900],pos:[280,380],effect:'5% to 25% chain chance. Rank 5 can continue up to three additional blocks.',pre:[13]},
  16:{name:'Second Wind',desc:'The crew speeds up in the second half of the run.',cost:[80,160,320,560,960],pos:[900,535],effect:'+10% to +50% mining speed after the timer reaches halfway.',pre:[7]},
  17:{name:'Key Sense',desc:'Skeletons detect when the hidden key is nearby.',cost:[65,130,260,455,780],pos:[1080,780],effect:'Detection range grows from 1 to 5 tiles. Rank 5 also indicates rough direction.',pre:[4]},
  18:{name:'Last Chance Mining',desc:'Keep mining briefly after the key is found.',cost:[90,180,360,630,1080],pos:[1160,640],effect:'Continue 1 to 5 seconds after key discovery. Rank 5 also boosts speed during the bonus time.',pre:[17]},
  19:{name:'Blast Charge',desc:'Major: place one 3×3 blast before each run.',cost:[2500],pos:[430,300],effect:'The blast instantly breaks a 3×3 area. Ore collected by the blast is worth 3×.',pre:[12,13],allPre:true,major:true},
  20:{name:'Prospector Value',desc:'Every ore collected by a prospector is worth more.',cost:[110,220,440,770,1320],pos:[730,310],effect:'+10% / 17.5% / 25% / 32.5% / 40%. Rank 5 doubles each prospector’s first deposit.',pre:[9],levelGate:20},
  21:{name:'Overtime Pay',desc:'Ore becomes more valuable in the final 10 seconds.',cost:[120,240,480,840,1440],pos:[1240,500],effect:'+10% to +50% in the final 10 seconds. Rank 5 makes the final 5 seconds worth double.',pre:[18]},
  22:{name:'Ore Streak',desc:'Consecutive ore-bearing tiles build a value streak.',cost:[135,270,540,945,1620],pos:[620,365],effect:'+5% to +25% per consecutive ore tile. Rank 5 can survive one empty tile.',pre:[12]},
  23:{name:'Mining Momentum',desc:'Every block cleared makes the crew faster for that run.',cost:[150,300,600,1050,1800],pos:[970,395],effect:'Speed snowballs up to +10% / +20% / +30% / +40% / +50%.',pre:[16]},
  24:{name:'Final Rush',desc:'Major: after finding the key, double speed and ignore radius until time expires.',cost:[9000],pos:[1130,300],effect:'After key discovery, miners move to any remaining tile and mine at double speed until the timer ends.',pre:[18,23],allPre:true,major:true},
  25:{name:'Treasure Hunter',desc:'Multi-ore tiles are worth much more.',cost:[200,400,800,1400,2400],pos:[710,210],effect:'+10% / +20% / +30% / +40%; rank 5 doubles the value of all ore on multi-ore tiles.',pre:[22]},
  26:{name:'Clean Sweep',desc:'Clearing a skeleton’s local area gives it a lasting speed bonus.',cost:[220,440,880,1540,2640],pos:[1060,515],effect:'+10% to +50% speed after clearing its radius. Rank 5 can reach one tile farther afterward.',pre:[14]},
  27:{name:'Ore Survey',desc:'Reveal the richest ore tiles before placing miners.',cost:[250,500,1000,1750,3000],pos:[1320,690],effect:'Reveal 3 / 5 / 7 / 9 / 12 richest tiles. Rank 5 shows exact ore contents.',pre:[17]},
  28:{name:'Skeleton Specialist',desc:'One random standard miner becomes Elite each run.',cost:[300,600,1200,2100,3600],pos:[1190,415],effect:'+20% to +100% mining speed. At rank 5, that Elite Miner’s ore is worth double.',pre:[26]},
  29:{name:'Treasure Rush',desc:'Mining a 3-ore tile temporarily speeds up the whole crew.',cost:[375,750,1500,2625,4500],pos:[820,110],effect:'+10% to +50% temporary speed. Rank 5 also grants +50% ore value while active.',pre:[25]},
  30:{name:'Endless Extraction',desc:'Major: remove the timer, clear the entire mine, and double all ore value.',cost:[30000],pos:[1080,100],effect:'From the start of every run, miners ignore the timer and can reach the whole map until every tile is gone. ALL ore is worth 2×.',pre:[24,28,29],allPre:true,major:true}
};

const TREE_CONNECTIONS = Object.entries(UPGRADE_DEFS).flatMap(([id,d])=>(d.pre||[]).map(p=>[Number(p),Number(id)]));

const DEFAULT_SAVE = {
  version:4,
  level:1,
  currency:0,
  upgrades:{},
  crewLoadout:['basic','basic'],
  levelLayouts:{},
  artifacts:{resetRelics:0,magnet:false,totem:false,timepiece:false,charm:false,discovered:{}},
  artifactPity:0,
  totalOre:{},
  stats:{runs:0,wins:0,blocks:0}
};

const ui = Object.fromEntries([
  'screenTitle','levelStat','currencyStat','timeStat','artifactsButton','newGameButton','mineScreen','upgradeScreen','artifactScreen','resultScreen',
  'levelTitle','levelGoal','blastButton','endAttemptButton','startButton','oreLegend','mineCanvas','messageOverlay','placementHint','undoButton','resetPlacementButton',
  'crewCount','resetCrewButton','crewPicker','prospectorSummary','backToMineButton','zoomOutButton','centerTreeButton','zoomInButton','treeViewport','treeWorld','treeLines','treeNodes',
  'upgradeDetail','closeUpgradeDetail','detailKind','detailName','detailDesc','detailRank','detailEffect','buyUpgradeButton','artifactBackButton','artifactProgress','artifactGrid',
  'resultStatus','resultTitle','resultOreList','resultBreakdown','resultEarned','resultTotal','resultMineButton','resultUpgradeButton','resultArtifactsButton',
  'artifactFoundModal','artifactFoundName','artifactFoundDesc','keepArtifactButton','confirmModal','confirmTitle','confirmText','confirmCancel','confirmAccept'
].map(id=>[id,document.getElementById(id)]));
const canvas = ui.mineCanvas;
const ctx = canvas.getContext('2d');

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function rank(id){ return Number(save.upgrades[id]||0); }
function maxRank(id){ return UPGRADE_DEFS[id].major?1:5; }
function formatNumber(n){
  if(!Number.isFinite(n)) return '∞';
  const a=Math.abs(n); if(a<1000) return Math.round(n).toLocaleString();
  const units=[['T',1e12],['B',1e9],['M',1e6],['K',1e3]];
  for(const [s,v] of units) if(a>=v) return `${(n/v).toFixed(a>=v*100?0:a>=v*10?1:2)}${s}`;
  return Math.round(n).toLocaleString();
}
function loadSave(){
  try{
    const p=JSON.parse(localStorage.getItem('skeletonMiningSave'));
    if(!p) return clone(DEFAULT_SAVE);
    const s={...clone(DEFAULT_SAVE),...p};
    s.currency = p.currency ?? p.gold ?? 0;
    s.level = p.level ?? p.maxLevel ?? p.selectedLevel ?? 1;
    s.upgrades={...(p.upgrades||{})};
    if(p.upgrades && ('radius' in p.upgrades || 'speed' in p.upgrades)){
      s.upgrades={1:Math.min(5,p.upgrades.radius||0),2:Math.min(5,p.upgrades.speed||0),3:Math.min(5,p.upgrades.crew||0),4:Math.min(5,p.upgrades.time||0)};
    }
    s.artifacts={...clone(DEFAULT_SAVE.artifacts),...(p.artifacts||{}),discovered:{...(p.artifacts?.discovered||{})}};
    s.crewLoadout=Array.isArray(p.crewLoadout)?p.crewLoadout:['basic','basic'];
    s.levelLayouts={...(p.levelLayouts||{})};
    s.totalOre={...(p.totalOre||p.oreTotals||{})};
    s.stats={...DEFAULT_SAVE.stats,...(p.stats||{})};
    return s;
  }catch{return clone(DEFAULT_SAVE);}
}
let save=loadSave();
function persist(){ localStorage.setItem('skeletonMiningSave',JSON.stringify(save)); }

function levelConfig(level=save.level){ return CONFIG.mapStages.find(s=>level<=s.max)||CONFIG.mapStages.at(-1); }
function activeOres(level=save.level){ const u=ORES.filter(o=>o.unlockLevel<=level); return u.slice(-CONFIG.maxActiveOres); }
function oreChance(ore,level){ const age=Math.min(4,Math.max(0,Math.floor((level-ore.unlockLevel)/5))); return 0.09+age*0.015; }
function baseRadius(){ return [1.25,1.45,1.75,2.05,2.45,2.85][rank(1)]||1.25; }
function crewSize(){ return 2+rank(3); }
function prospectorSlots(level=save.level){ return [20,60,120].filter(n=>level>=n).length; }
function roundTime(){ return CONFIG.baseRoundTime+rank(4)*3; }
function unlockedMinerTypes(){ return Object.entries(MINER_TYPES).filter(([,d])=>save.level>=d.unlock).map(([id])=>id); }
function currentArtifactChance(){
  if(save.level<3) return 0;
  const band=CONFIG.artifactChance.find(b=>save.level>=b.min&&save.level<=b.max);
  return Math.min(1,(band?.chance||0.10)+Math.min(.10,save.artifactPity||0));
}

function createLevelLayout(level=save.level){
  const cfg=levelConfig(level), ores=activeOres(level);
  const key={x:Math.floor(Math.random()*cfg.width),y:Math.floor(Math.random()*cfg.height)};
  const deposits=[];
  for(let y=0;y<cfg.height;y++) for(let x=0;x<cfg.width;x++){
    if(x===key.x&&y===key.y) continue;
    for(const ore of ores) if(Math.random()<oreChance(ore,level)) deposits.push({x,y,type:ore.id});
  }
  return {version:4,width:cfg.width,height:cfg.height,key,ores:deposits};
}
function layoutForLevel(){
  const k=String(save.level), cfg=levelConfig(); let l=save.levelLayouts[k];
  if(!l||l.version!==4||l.width!==cfg.width||l.height!==cfg.height){ l=createLevelLayout(); save.levelLayouts[k]=l; persist(); }
  return l;
}

let mine=[], placements=[], prospectors=[], keyCell=null, running=false, pausedForArtifact=false, resultShown=false;
let timeLeft=0, initialTime=0, runElapsed=0, keyFound=false, postKeyRemaining=0, finalRush=false, endless=false;
let overtimeUsed=false,timepieceUsed=false,blastMode=false,blastCell=null,surveyTiles=[],favoredOre=null,eliteIndex=-1,totemIndex=-1;
let artifactCell=null,artifactFoundThisRun=false,pendingArtifact=null,treasureRushRemaining=0,oreStreak=0,oreStreakShield=false;
let blocksBroken=0, runCurrency=0, runOre={}, runBonusNotes=new Set(), lastFrame=performance.now(), needsBuild=false;
let previousScreen='mineScreen';
