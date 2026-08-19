function discoverArtifact(){
  artifactFoundThisRun=true; save.artifactPity=0;
  const candidates=['reset',...['magnet','totem','timepiece','charm'].filter(k=>!save.artifacts[k])];
  const key=candidates[Math.floor(Math.random()*candidates.length)]||'reset';
  if(key==='reset') save.artifacts.resetRelics++; else save.artifacts[key]=true;
  save.artifacts.discovered[key]=true; pendingArtifact=key; pausedForArtifact=true; persist();
  const a=ARTIFACTS[key]; ui.artifactFoundName.textContent=a.name; ui.artifactFoundDesc.textContent=a.desc; ui.artifactFoundModal.classList.remove('hidden'); renderTopbar();
}

function useResetRelic(){
  if(save.artifacts.resetRelics<1)return;
  let refund=0;
  for(const [id,r] of Object.entries(save.upgrades)){
    const def=UPGRADE_DEFS[id]; for(let i=0;i<Number(r);i++) refund+=def?.cost[i]||0;
  }
  save.currency+=refund; save.upgrades={}; save.artifacts.resetRelics--; normalizeCrewLoadout(); persist(); renderAll();
}

function update(dt){
  if(!running||pausedForArtifact||resultShown)return;
  runElapsed+=dt; if(treasureRushRemaining>0) treasureRushRemaining=Math.max(0,treasureRushRemaining-dt);
  updateStandardMiners(dt); updateProspectors(dt);
  if(!endless){
    if(keyFound&&postKeyRemaining>0&&!finalRush){ postKeyRemaining-=dt; if(postKeyRemaining<=0){finishRun(true,'Bonus mining complete');} return; }
    timeLeft-=dt; if(timeLeft<=0){timeLeft=0;handleTimerEnd();}
  }
}

function frame(now){ const dt=Math.min(.05,(now-lastFrame)/1000); lastFrame=now; update(dt); draw(); renderDynamicStats(); requestAnimationFrame(frame); }

function canvasMetrics(){ const cfg=levelConfig(); const pad=24; const cell=Math.min((canvas.width-pad*2)/cfg.width,(canvas.height-pad*2)/cfg.height); const boardW=cell*cfg.width,boardH=cell*cfg.height; return {cell,left:(canvas.width-boardW)/2,top:(canvas.height-boardH)/2,boardW,boardH}; }
function pointerCell(e){ const r=canvas.getBoundingClientRect(),px=(e.clientX-r.left)*(canvas.width/r.width),py=(e.clientY-r.top)*(canvas.height/r.height),m=canvasMetrics(); const x=Math.floor((px-m.left)/m.cell),y=Math.floor((py-m.top)/m.cell); return mine[y]?.[x]||null; }

// Terrain art is owned by the mine renderer so it cannot be lost to script load order.
// Each style lasts five levels; Lava Rock remains active from Level 46 onward.
const TERRAIN_STAGES=[
  {max:5,id:'grass',sprite:0,fallback:'#71951f'},
  {max:10,id:'dirt',sprite:1,fallback:'#875a35'},
  {max:15,id:'dirt-rocks',sprite:2,fallback:'#765034'},
  {max:20,id:'rocky-ground',sprite:3,fallback:'#554536'},
  {max:25,id:'stone',sprite:4,fallback:'#626262'},
  {max:30,id:'deep-stone',sprite:5,fallback:'#4a4a4a'},
  {max:35,id:'dark-stone',sprite:6,fallback:'#343434'},
  {max:40,id:'cracked-stone',sprite:7,fallback:'#555555'},
  {max:45,id:'volcanic-rock',sprite:8,fallback:'#24201f'},
  {max:Infinity,id:'lava-rock',sprite:9,fallback:'#54271d'}
];
const terrainSprite=new Image();
terrainSprite.decoding='async';
terrainSprite.src='assets/terrain/terrain-sprite.png?v=3';
terrainSprite.addEventListener('load',()=>{ if(typeof draw==='function') draw(); },{once:true});

function terrainStageForLevel(level){
  return TERRAIN_STAGES.find(stage=>level<=stage.max)||TERRAIN_STAGES[TERRAIN_STAGES.length-1];
}

function drawTerrainTile(context,level,x,y,size){
  const stage=terrainStageForLevel(level);
  if(terrainSprite.complete&&terrainSprite.naturalWidth>0&&terrainSprite.naturalHeight>0){
    const sourceWidth=terrainSprite.naturalWidth/5;
    const sourceHeight=terrainSprite.naturalHeight/2;
    const sourceX=(stage.sprite%5)*sourceWidth;
    const sourceY=Math.floor(stage.sprite/5)*sourceHeight;
    const smoothing=context.imageSmoothingEnabled;
    context.imageSmoothingEnabled=false;
    context.drawImage(terrainSprite,sourceX,sourceY,sourceWidth,sourceHeight,x,y,size,size);
    context.imageSmoothingEnabled=smoothing;
  }else{
    // Theme-colored fallback makes terrain progression visible even before the PNG finishes loading.
    context.fillStyle=stage.fallback;
    context.fillRect(x,y,size,size);
  }
  return stage;
}

function draw(){
  if(!mine.length)return;
  const {cell,left,top}=canvasMetrics();
  ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#080706';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const row of mine) for(const c of row){
    const x=left+c.x*cell,y=top+c.y*cell;
    const tileX=x+1,tileY=y+1,tileSize=Math.max(1,cell-2);
    if(c.mined){
      ctx.fillStyle='#11100e';
      ctx.fillRect(tileX,tileY,tileSize,tileSize);
    }else{
      drawTerrainTile(ctx,save.level,tileX,tileY,tileSize);
      if(c.hp<CONFIG.rockHp){
        const damage=Math.min(.34,.12+(CONFIG.rockHp-c.hp)*.09);
        ctx.fillStyle=`rgba(24,10,5,${damage})`;
        ctx.fillRect(tileX,tileY,tileSize,tileSize);
      }
    }
    ctx.strokeStyle='rgba(80,66,56,.8)';ctx.lineWidth=1;ctx.strokeRect(tileX,tileY,tileSize,tileSize);
    if(!c.mined){
      c.oreTypes.forEach((t,i)=>{const o=ORE_BY_ID[t];if(!o)return;ctx.fillStyle=o.color;const ox=x+cell*(.34+(i%2)*.30),oy=y+cell*(.36+Math.floor(i/2)*.28);ctx.beginPath();ctx.arc(ox,oy,Math.max(2,cell*.07),0,Math.PI*2);ctx.fill();});
      if(surveyTiles.includes(c)){ctx.strokeStyle='#e1b84b';ctx.lineWidth=Math.max(2,cell*.04);ctx.strokeRect(x+4,y+4,cell-8,cell-8); if(rank(27)===5){ctx.fillStyle='#ffe59a';ctx.font=`${Math.max(10,cell*.14)}px sans-serif`;ctx.fillText(c.oreTypes.length?c.oreTypes.map(t=>ORE_BY_ID[t].name[0]).join(''):'?',x+6,y+cell-7);}}
      if(blastCell===c){ctx.strokeStyle='#d85e50';ctx.lineWidth=4;ctx.strokeRect(x+3,y+3,cell-6,cell-6);}
    } else if(c.hasKey){ ctx.fillStyle='#f5cf55';ctx.font=`${Math.max(12,cell*.3)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('◆',x+cell/2,y+cell/2); }
  }
  for(const m of placements){
    const x=left+(m.x+.5)*cell,y=top+(m.y+.5)*cell,r=minerRadius(m)*cell; if(!running){ctx.strokeStyle=m.index===eliteIndex?'#f2d166':'rgba(238,226,206,.28)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}
    ctx.fillStyle=m.index===eliteIndex?'#ffe59a':m.index===totemIndex?'#c9efc4':'#eee2ce';ctx.beginPath();ctx.arc(x,y,Math.max(5,cell*.16),0,Math.PI*2);ctx.fill();ctx.fillStyle='#17130f';ctx.font=`bold ${Math.max(8,cell*.12)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(MINER_TYPES[m.type].name[0],x,y);
    const kr=rank(17); if(kr>0&&!keyFound&&!keyCell.mined){const d=Math.hypot(keyCell.x-m.x,keyCell.y-m.y); if(d<=kr){ctx.strokeStyle='#f1cc55';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,Math.max(9,cell*.24),0,Math.PI*2);ctx.stroke(); if(kr===5){ctx.fillStyle='#f1cc55';ctx.font=`${Math.max(10,cell*.18)}px sans-serif`;ctx.fillText(Math.abs(keyCell.x-m.x)>Math.abs(keyCell.y-m.y)?(keyCell.x>m.x?'→':'←'):(keyCell.y>m.y?'↓':'↑'),x,y-cell*.3);}}}
  }
  for(const p of prospectors){const x=left+(p.x+.5)*cell,y=top+(p.y+.5)*cell;ctx.fillStyle='#d9b348';ctx.beginPath();ctx.moveTo(x,y-cell*.18);ctx.lineTo(x+cell*.14,y);ctx.lineTo(x,y+cell*.18);ctx.lineTo(x-cell*.14,y);ctx.closePath();ctx.fill();}
}
