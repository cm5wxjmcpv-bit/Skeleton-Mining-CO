// Real in-game tutorial screenshots and pre-round skeleton movement instructions.
(function(){
  'use strict';

  const guideStep = document.getElementById('guideStep');
  const guideTitle = document.getElementById('guideTitle');
  const guideText = document.getElementById('guideText');
  const guideNext = document.getElementById('guideNext');
  const guideSkip = document.getElementById('guideSkip');
  const guide = guideStep?.closest('.simple-guide');
  const guideCard = guideStep?.closest('.guide-card');
  if(!guide || !guideCard || !guideTitle || !guideText || !guideNext || !guideSkip) return;

  const style = document.createElement('style');
  style.id = 'tutorialScreenshotStyles';
  style.textContent = `
    .guide-card.tutorial-with-shots{width:min(760px,94vw);max-height:94vh;overflow:auto}
    .guide-card.tutorial-with-shots h2{margin-bottom:5px}
    .guide-card.tutorial-with-shots #guideText{margin:6px 0 10px}
    .guide-visual{display:none;margin:8px 0 2px}
    .guide-visual.show{display:block}
    .guide-shot-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .guide-shot-grid.single{grid-template-columns:1fr}
    .guide-shot{margin:0;background:#0d0b09;border:1px solid #5d4935;border-radius:10px;overflow:hidden}
    .guide-shot img{display:block;width:100%;aspect-ratio:1.4/1;object-fit:cover;background:#080706}
    .guide-shot figcaption{padding:6px 8px;font-size:11px;font-weight:800;color:#d8c6aa;text-align:center}
    .guide-move-methods{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
    .guide-move-methods div{background:#15110e;border:1px solid #574431;border-radius:8px;padding:7px 9px;color:#d9cbb6;font-size:12px;line-height:1.35}
    .guide-move-methods strong{display:block;color:#f1cc55;margin-bottom:2px}
    @media(max-width:620px){.guide-shot-grid{grid-template-columns:1fr 1fr}.guide-card.tutorial-with-shots{padding:13px}.guide-move-methods{grid-template-columns:1fr 1fr}}
    @media(max-height:560px){.guide-card.tutorial-with-shots{max-height:96vh;padding:10px 12px}.guide-card.tutorial-with-shots h2{margin:4px 0}.guide-card.tutorial-with-shots #guideText{font-size:12px;line-height:1.28;margin:4px 0 6px}.guide-shot img{max-height:132px}.guide-shot figcaption{padding:3px 6px}.guide-move-methods{margin-top:5px}.guide-move-methods div{padding:4px 7px;font-size:10px}.guide-card.tutorial-with-shots .guide-actions{margin-top:7px}}
  `;
  document.head.appendChild(style);

  const visual = document.createElement('div');
  visual.id = 'guideVisual';
  visual.className = 'guide-visual';
  const actions = guideCard.querySelector('.guide-actions');
  guideCard.insertBefore(visual, actions || null);

  const steps = [
    {
      title:'Welcome',
      text:'Your skeleton crew mines automatically. Place them where they can uncover ore and find the Golden Key.',
      visual:'empty'
    },
    {
      title:'Place Your Crew',
      text:'Tap an empty block to place each skeleton. The outlined blocks show exactly which tiles that miner can reach before the round starts.',
      visual:'place'
    },
    {
      title:'Move Your Skeletons',
      text:'Before mining starts, reposition any skeleton either by tapping it and then tapping a new empty block, or by pressing it and dragging it to a new block.',
      visual:'move'
    },
    {
      title:'Start Mining',
      text:'When your crew is where you want them, tap Start Mining. They break rock automatically, collect exposed ore, and search for the Golden Key.',
      visual:'mine'
    },
    {
      title:'Round Results',
      text:'After every round you can Mine Again, buy Upgrades, or open Crew Loadout to change your miners.',
      visual:null
    },
    {
      title:'Upgrades',
      text:'Spend the value you earn on upgrades to make your crew stronger. That is all you need to start mining.',
      visual:null
    }
  ];

  function cloneMiner(miner){
    return {
      ...miner,
      target:null,
      cooldown:0,
      hits:0,
      cleanSweep:false
    };
  }

  function tutorialMiner(x,y,index=0){
    return cloneMiner({x,y,type:'basic',index,target:null,cooldown:0,hits:0,cleanSweep:false});
  }

  function copyMine(source){
    return source.map(row => row.map(cell => ({
      ...cell,
      oreTypes:[...(cell.oreTypes || [])],
      extracted:[...(cell.extracted || [])],
      extractedOres:[...(cell.extractedOres || [])]
    })));
  }

  function stageFrame(kind){
    if(typeof canvas === 'undefined' || !canvas || typeof draw !== 'function' || typeof canvasMetrics !== 'function' || typeof levelConfig !== 'function') return null;
    if(typeof mine === 'undefined' || !Array.isArray(mine) || !mine.length) return null;

    const original = {
      mine,
      placements,
      prospectors: typeof prospectors !== 'undefined' ? prospectors : null,
      keyCell: typeof keyCell !== 'undefined' ? keyCell : null,
      running: typeof running !== 'undefined' ? running : false,
      blastMode: typeof blastMode !== 'undefined' ? blastMode : false,
      surveyTiles: typeof surveyTiles !== 'undefined' ? surveyTiles : null
    };

    let annotation = null;
    try{
      mine = copyMine(original.mine);
      placements = [];
      if(typeof prospectors !== 'undefined') prospectors = [];
      if(typeof surveyTiles !== 'undefined') surveyTiles = [];
      if(typeof blastMode !== 'undefined') blastMode = false;
      if(typeof keyCell !== 'undefined' && original.keyCell){
        keyCell = mine[original.keyCell.y]?.[original.keyCell.x] || original.keyCell;
      }

      const cfg = levelConfig();
      const leftX = Math.max(1, Math.floor(cfg.width * .25));
      const rightX = Math.min(cfg.width - 2, Math.floor(cfg.width * .70));
      const midY = Math.min(cfg.height - 2, Math.max(1, Math.floor(cfg.height * .48)));
      const secondY = Math.min(cfg.height - 2, midY + 2);

      if(kind === 'empty'){
        if(typeof running !== 'undefined') running = false;
      }else if(kind === 'place'){
        placements = [tutorialMiner(leftX,midY,0), tutorialMiner(rightX,secondY,1)];
        if(typeof running !== 'undefined') running = false;
      }else if(kind === 'move-before'){
        placements = [tutorialMiner(leftX,midY,0)];
        if(typeof running !== 'undefined') running = false;
        annotation = {selected:{x:leftX,y:midY}, destination:{x:rightX,y:midY}};
      }else if(kind === 'move-after'){
        placements = [tutorialMiner(rightX,midY,0)];
        if(typeof running !== 'undefined') running = false;
        annotation = {selected:{x:rightX,y:midY}};
      }else if(kind === 'mine'){
        placements = [tutorialMiner(leftX,midY,0), tutorialMiner(rightX,secondY,1)];
        if(typeof running !== 'undefined') running = true;
        const oreList = typeof activeOres === 'function' ? activeOres() : [];
        const oreId = oreList[0]?.id || 'copper';
        const exposed = [
          [leftX,midY], [Math.min(cfg.width-1,leftX+1),midY],
          [rightX,secondY], [Math.max(0,rightX-1),secondY]
        ];
        exposed.forEach(([x,y],i) => {
          const cell = mine[y]?.[x];
          if(!cell) return;
          cell.mined = true;
          cell.hp = 0;
          cell.hasKey = false;
          cell.oreTypes = i % 2 === 0 ? [oreId] : [];
        });
      }

      draw();
      const m = canvasMetrics();
      const crop = document.createElement('canvas');
      crop.width = Math.max(1, Math.round(m.boardW));
      crop.height = Math.max(1, Math.round(m.boardH));
      const c = crop.getContext('2d');
      c.drawImage(canvas, m.left, m.top, m.boardW, m.boardH, 0, 0, crop.width, crop.height);

      if(annotation){
        const sx = crop.width / cfg.width;
        const sy = crop.height / cfg.height;
        c.save();
        if(annotation.destination){
          const d = annotation.destination;
          c.strokeStyle = 'rgba(255,255,255,.96)';
          c.lineWidth = Math.max(3, sx * .055);
          c.setLineDash([Math.max(5,sx*.13),Math.max(4,sx*.09)]);
          c.strokeRect(d.x*sx+4,d.y*sy+4,sx-8,sy-8);
          c.setLineDash([]);
        }
        if(annotation.selected){
          const s = annotation.selected;
          c.strokeStyle = '#ffd85a';
          c.lineWidth = Math.max(4, sx * .07);
          c.strokeRect(s.x*sx+3,s.y*sy+3,sx-6,sy-6);
        }
        if(annotation.destination && annotation.selected){
          const a = annotation.selected, d = annotation.destination;
          const ax=(a.x+.5)*sx, ay=(a.y+.5)*sy, bx=(d.x+.5)*sx, by=(d.y+.5)*sy;
          c.strokeStyle='#ffd85a';
          c.fillStyle='#ffd85a';
          c.lineWidth=Math.max(3,sx*.045);
          c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.stroke();
          const ang=Math.atan2(by-ay,bx-ax), size=Math.max(9,sx*.16);
          c.beginPath();c.moveTo(bx,by);c.lineTo(bx-size*Math.cos(ang-.45),by-size*Math.sin(ang-.45));c.lineTo(bx-size*Math.cos(ang+.45),by-size*Math.sin(ang+.45));c.closePath();c.fill();
        }
        c.restore();
      }

      return crop.toDataURL('image/png');
    }catch(error){
      console.warn('Tutorial screenshot capture failed', error);
      return null;
    }finally{
      mine = original.mine;
      placements = original.placements;
      if(typeof prospectors !== 'undefined' && original.prospectors) prospectors = original.prospectors;
      if(typeof keyCell !== 'undefined') keyCell = original.keyCell;
      if(typeof running !== 'undefined') running = original.running;
      if(typeof blastMode !== 'undefined') blastMode = original.blastMode;
      if(typeof surveyTiles !== 'undefined' && original.surveyTiles) surveyTiles = original.surveyTiles;
      try{ draw(); }catch{}
    }
  }

  function shot(src,label){
    if(!src) return '';
    return `<figure class="guide-shot"><img src="${src}" alt="Actual Skeleton Mining Co. gameplay screenshot: ${label}"><figcaption>${label}</figcaption></figure>`;
  }

  function renderVisual(kind){
    visual.className = 'guide-visual';
    visual.innerHTML = '';
    if(!kind) return;

    if(kind === 'move'){
      const before = stageFrame('move-before');
      const after = stageFrame('move-after');
      if(!before && !after) return;
      visual.innerHTML = `<div class="guide-shot-grid">${shot(before,'1. Select the skeleton')}${shot(after,'2. Move to the new block')}</div><div class="guide-move-methods"><div><strong>Tap method</strong>Tap the skeleton, then tap an empty destination block.</div><div><strong>Drag method</strong>Press the skeleton, drag to an empty block, then release.</div></div>`;
      visual.classList.add('show');
      return;
    }

    const image = stageFrame(kind);
    if(!image) return;
    const labels = {
      empty:'Your mine before placement',
      place:'Placed miners and their reachable blocks',
      mine:'Actual mining with uncovered ore'
    };
    visual.innerHTML = `<div class="guide-shot-grid single">${shot(image,labels[kind] || 'Gameplay')}</div>`;
    visual.classList.add('show');
  }

  let active = false;
  let index = 0;

  function render(){
    const step = steps[index];
    guideCard.classList.add('tutorial-with-shots');
    guideStep.textContent = `${index + 1} / ${steps.length}`;
    guideTitle.textContent = step.title;
    guideText.textContent = step.text;
    guideNext.textContent = index === steps.length - 1 ? 'Done' : 'Next';
    renderVisual(step.visual);
  }

  function finish(skipped){
    active = false;
    guide.classList.add('hidden');
    guideCard.classList.remove('tutorial-with-shots');
    visual.className = 'guide-visual';
    visual.innerHTML = '';
    try{
      const manager = window.SkeletonSaveManager;
      if(manager?.getActiveSlot?.()){
        save.tutorial = {completed:!skipped, skipped:!!skipped};
        persist();
      }
    }catch{}
  }

  guideNext.addEventListener('click', function(event){
    if(!active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(index < steps.length - 1){ index += 1; render(); }
    else finish(false);
  }, true);

  guideSkip.addEventListener('click', function(event){
    if(!active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish(true);
  }, true);

  const observer = new MutationObserver(function(){
    if(!guide.classList.contains('hidden') && !active){
      active = true;
      index = 0;
      render();
    }
  });
  observer.observe(guide,{attributes:true,attributeFilter:['class']});
})();
