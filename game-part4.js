function renderDynamicStats(){ ui.timeStat.textContent=endless&&running?'∞':Math.max(0,timeLeft).toFixed(1); ui.currencyStat.textContent=formatNumber(save.currency); }
function renderTopbar(){ ui.levelStat.textContent=save.level; ui.currencyStat.textContent=formatNumber(save.currency); ui.timeStat.textContent=endless&&running?'∞':Math.max(0,timeLeft).toFixed(1); const found=Object.keys(save.artifacts.discovered||{}).length>0; ui.artifactsButton.classList.toggle('hidden',!found); ui.resultArtifactsButton.classList.toggle('hidden',!found); }
function renderOreLegend(){
  ui.oreLegend.innerHTML=''; for(const o of activeOres()){const d=document.createElement('div');d.className='ore-chip';d.innerHTML=`<span class="ore-dot" style="background:${o.color}"></span><span>${o.name}${favoredOre===o.id?' ★':''}</span><span>${formatNumber(o.value)}</span>`;ui.oreLegend.appendChild(d);}
}
function renderCrewPicker(){
  normalizeCrewLoadout(); ui.crewPicker.innerHTML=''; const allowed=unlockedMinerTypes();
  for(let i=0;i<crewSize();i++){
    const wrap=document.createElement('div');wrap.className='crew-slot';const label=document.createElement('label');label.textContent=`Skeleton ${i+1}`;const select=document.createElement('select');select.disabled=running||placements.length>0;
    for(const id of allowed){const opt=document.createElement('option');opt.value=id;opt.textContent=MINER_TYPES[id].name;opt.selected=save.crewLoadout[i]===id;select.appendChild(opt);}
    select.addEventListener('change',()=>{save.crewLoadout[i]=select.value;persist();renderMineControls();});wrap.append(label,select);ui.crewPicker.appendChild(wrap);
  }
  const p=prospectorSlots(); ui.prospectorSummary.textContent=p?`${p} Prospector${p>1?'s':''} automatically deployed. They seek the highest-value ore while considering travel distance.`:'Prospectors unlock at Level 20.';
}
function renderMineControls(){
  ui.levelTitle.textContent=`Level ${save.level}`; ui.levelGoal.textContent=rank(30)?'Endless Extraction active: clear the entire mine. All ore is worth 2×.':'Find the Golden Key before time runs out.'; ui.crewCount.textContent=`${crewSize()} standard slot${crewSize()===1?'':'s'}`;
  const next=placements.length+1; ui.placementHint.textContent=running?'Mining in progress…':placements.length<crewSize()?`Tap the mine to place ${MINER_TYPES[save.crewLoadout[next-1]||'basic'].name} ${next} of ${crewSize()}.`:`Crew placed${rank(19)?'. Place a blast charge or start mining.':'. Ready to start.'}`;
  ui.startButton.disabled=running||placements.length!==crewSize(); ui.endAttemptButton.disabled=!running; ui.undoButton.disabled=running||placements.length===0; ui.resetPlacementButton.disabled=running||placements.length===0; ui.blastButton.classList.toggle('hidden',rank(19)===0); ui.blastButton.disabled=running||placements.length!==crewSize(); ui.blastButton.textContent=blastCell?'Move Blast':'Place Blast';
  renderCrewPicker();
}
function renderAll(){ renderTopbar(); renderOreLegend(); renderMineControls(); renderTree(); renderArtifacts(); }
function showMessage(text){ui.messageOverlay.textContent=text;ui.messageOverlay.classList.remove('hidden');} function hideMessage(){ui.messageOverlay.classList.add('hidden');}

function showScreen(id){
  for(const s of [ui.mineScreen,ui.upgradeScreen,ui.artifactScreen,ui.resultScreen]) s.classList.remove('active-screen'); ui[id].classList.add('active-screen');
  ui.screenTitle.textContent=id==='mineScreen'?'Mine':id==='upgradeScreen'?'Upgrades':id==='artifactScreen'?'Artifacts':'Results';
  if(id==='mineScreen'&&needsBuild){needsBuild=false;buildMine();}
  if(id==='upgradeScreen'){renderTree();centerTree();}
  if(id==='artifactScreen')renderArtifacts(); renderTopbar();
}

function showResults(success,reason){
  const completed=success?save.level-1:save.level; ui.resultStatus.textContent=success?'LEVEL COMPLETE':'KEY NOT FOUND';ui.resultTitle.textContent=`Level ${completed} Results`; ui.resultOreList.innerHTML='';
  for(const o of activeOres(completed)){const count=runOre[o.id]||0;const d=document.createElement('div');d.className='result-ore';d.innerHTML=`<span>${o.name}</span><strong>${count}</strong>`;ui.resultOreList.appendChild(d);}
  const notes=[reason,`Blocks mined: ${blocksBroken}`,...runBonusNotes]; ui.resultBreakdown.innerHTML=notes.map(n=>`<div>• ${n}</div>`).join(''); ui.resultEarned.textContent=formatNumber(runCurrency);ui.resultTotal.textContent=formatNumber(save.currency);ui.resultMineButton.textContent=success?'Next Level':'Try Again'; showScreen('resultScreen');
}

function prereqSatisfied(id){
  const d=UPGRADE_DEFS[id]; if(!d.pre?.length)return id===1;
  const vals=d.pre.map(p=>rank(p)>0); return d.allPre?vals.every(Boolean):vals.some(Boolean);
}
function isRevealed(id){ const d=UPGRADE_DEFS[id]; if(id===1)return true; if(d.levelGate&&save.level<d.levelGate)return false; return prereqSatisfied(id); }
function nextCost(id){const d=UPGRADE_DEFS[id],r=rank(id);return d.cost[r]??Infinity;}
function buyUpgrade(id){
  const d=UPGRADE_DEFS[id],r=rank(id); if(!isRevealed(id)||r>=maxRank(id)||save.currency<nextCost(id))return;
  save.currency-=nextCost(id); save.upgrades[id]=r+1; normalizeCrewLoadout(); persist(); renderAll(); showUpgradeDetail(id);
}

function renderTree(){
  ui.treeNodes.innerHTML=''; ui.treeLines.innerHTML='';
  for(const [a,b] of TREE_CONNECTIONS){const da=UPGRADE_DEFS[a],db=UPGRADE_DEFS[b];const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',da.pos[0]);line.setAttribute('y1',da.pos[1]);line.setAttribute('x2',db.pos[0]);line.setAttribute('y2',db.pos[1]);line.setAttribute('class',`tree-line ${rank(a)>0&&isRevealed(b)?'lit':''}`);ui.treeLines.appendChild(line);}
  for(const [idStr,d] of Object.entries(UPGRADE_DEFS)){
    const id=Number(idStr),revealed=isRevealed(id),r=rank(id),node=document.createElement('button');node.className=`tree-node ${d.major?'major ':''}${revealed?'revealed':'unknown'} ${r>0?'purchased':''} ${r>=maxRank(id)?'maxed':''} ${revealed&&r<maxRank(id)&&save.currency>=nextCost(id)?'affordable':''}`;node.style.left=`${d.pos[0]}px`;node.style.top=`${d.pos[1]}px`;node.textContent=revealed?`${id}. ${d.name}`:'?';node.disabled=!revealed;node.addEventListener('click',()=>showUpgradeDetail(id));ui.treeNodes.appendChild(node);
  }
}
let selectedUpgrade=null;
function showUpgradeDetail(id){
  const d=UPGRADE_DEFS[id]; if(!isRevealed(id))return; selectedUpgrade=id; const r=rank(id),max=maxRank(id);ui.detailKind.textContent=d.major?'MAJOR ORB':'UPGRADE ORB';ui.detailName.textContent=`${id}. ${d.name}`;ui.detailDesc.textContent=d.desc;ui.detailRank.textContent=d.major?(r?'Purchased':'One-time purchase'):`Rank ${r}/${max}`;ui.detailEffect.textContent=d.effect;ui.buyUpgradeButton.disabled=r>=max||save.currency<nextCost(id);ui.buyUpgradeButton.textContent=r>=max?'Maxed':`Upgrade — ${formatNumber(nextCost(id))}`;ui.upgradeDetail.classList.remove('hidden');
}

let treeScale=.72,treeX=0,treeY=0,dragging=false,lastPointer=null,pointers=new Map(),lastPinch=null;
function applyTreeTransform(){ui.treeWorld.style.transform=`translate(${treeX}px,${treeY}px) scale(${treeScale})`;}
function centerTree(){const r=ui.treeViewport.getBoundingClientRect();treeScale=Math.min(.82,Math.max(.5,r.width/1200));treeX=r.width/2-800*treeScale;treeY=r.height-1080*treeScale-30;applyTreeTransform();}
function setScale(s,cx,cy){const old=treeScale;treeScale=Math.max(.4,Math.min(1.35,s));if(cx!=null){treeX=cx-(cx-treeX)*(treeScale/old);treeY=cy-(cy-treeY)*(treeScale/old);}applyTreeTransform();}

function renderArtifacts(){
  const keys=['reset','magnet','totem','timepiece','charm'];ui.artifactGrid.innerHTML='';let found=0;
  for(const key of keys){const a=ARTIFACTS[key],dis=!!save.artifacts.discovered[key];if(dis)found++;const card=document.createElement('div');card.className=`artifact-card ${dis?'':'unknown'}`;if(!dis){card.innerHTML='<span class="artifact-status">UNDISCOVERED</span><h2>???</h2><p>Find this artifact while mining.</p>';}else{const owned=key==='reset'?save.artifacts.resetRelics:save.artifacts[key];card.innerHTML=`<span class="artifact-status">${a.permanent?'ACTIVE':`${save.artifacts.resetRelics} OWNED`}</span><h2>${a.name}</h2><p>${a.desc}</p>`;if(key==='reset'){const b=document.createElement('button');b.textContent='Use Reset Relic';b.disabled=!owned;b.addEventListener('click',()=>confirmAction('Reset upgrade tree?',`Refund all spent upgrade value and consume one Reset Relic? You currently own ${save.artifacts.resetRelics}.`,()=>useResetRelic()));card.appendChild(b);}}ui.artifactGrid.appendChild(card);}
  ui.artifactProgress.textContent=`${found}/5 found`;
}

let confirmCallback=null;
function confirmAction(title,text,cb){confirmCallback=cb;ui.confirmTitle.textContent=title;ui.confirmText.textContent=text;ui.confirmModal.classList.remove('hidden');}

// ---- Event wiring ----
canvas.addEventListener('pointerdown',e=>{
  if(running)return;const c=pointerCell(e);if(!c)return;
  if(blastMode){blastCell=c;blastMode=false;renderMineControls();draw();return;}
  placeSkeleton(c);
});
ui.startButton.addEventListener('click',startRun);
ui.endAttemptButton.addEventListener('click',()=>finishRun(keyFound,keyFound?'Attempt ended after key':'Attempt ended early'));
ui.undoButton.addEventListener('click',()=>{if(!running&&placements.length){placements.pop();renderMineControls();draw();}});
ui.resetPlacementButton.addEventListener('click',()=>{if(!running){placements=[];blastCell=null;renderMineControls();draw();}});
ui.resetCrewButton.addEventListener('click',()=>{if(!running&&!placements.length){save.crewLoadout=Array(crewSize()).fill('basic');persist();renderMineControls();}});
ui.blastButton.addEventListener('click',()=>{if(!running&&placements.length===crewSize()){blastMode=true;ui.placementHint.textContent='Tap the mine to place the 3×3 blast charge.';}});
ui.backToMineButton.addEventListener('click',()=>showScreen('mineScreen'));
ui.resultMineButton.addEventListener('click',()=>showScreen('mineScreen'));
ui.resultUpgradeButton.addEventListener('click',()=>showScreen('upgradeScreen'));
ui.resultArtifactsButton.addEventListener('click',()=>{previousScreen='resultScreen';showScreen('artifactScreen');});
ui.artifactsButton.addEventListener('click',()=>{if(running)return;previousScreen=document.querySelector('.active-screen')?.id||'mineScreen';showScreen('artifactScreen');});
ui.artifactBackButton.addEventListener('click',()=>showScreen(previousScreen));
ui.newGameButton.addEventListener('click',()=>confirmAction('Start a new game?','This permanently deletes the current local playthrough, upgrades, artifacts, and progress.',()=>{localStorage.removeItem('skeletonMiningSave');save=clone(DEFAULT_SAVE);persist();needsBuild=false;buildMine();showScreen('mineScreen');}));
ui.keepArtifactButton.addEventListener('click',()=>{ui.artifactFoundModal.classList.add('hidden');pausedForArtifact=false;pendingArtifact=null;renderAll();});
ui.confirmCancel.addEventListener('click',()=>{confirmCallback=null;ui.confirmModal.classList.add('hidden');});
ui.confirmAccept.addEventListener('click',()=>{const cb=confirmCallback;confirmCallback=null;ui.confirmModal.classList.add('hidden');cb?.();});
ui.closeUpgradeDetail.addEventListener('click',()=>ui.upgradeDetail.classList.add('hidden'));
ui.buyUpgradeButton.addEventListener('click',()=>{if(selectedUpgrade)buyUpgrade(selectedUpgrade);});
ui.zoomInButton.addEventListener('click',()=>setScale(treeScale+.1));ui.zoomOutButton.addEventListener('click',()=>setScale(treeScale-.1));ui.centerTreeButton.addEventListener('click',centerTree);
ui.treeViewport.addEventListener('wheel',e=>{e.preventDefault();const r=ui.treeViewport.getBoundingClientRect();setScale(treeScale*(e.deltaY<0?1.08:.92),e.clientX-r.left,e.clientY-r.top);},{passive:false});
ui.treeViewport.addEventListener('pointerdown',e=>{ui.treeViewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragging=true;lastPointer={x:e.clientX,y:e.clientY};});
ui.treeViewport.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const vals=[...pointers.values()];if(vals.length===2){const d=Math.hypot(vals[0].x-vals[1].x,vals[0].y-vals[1].y),mid={x:(vals[0].x+vals[1].x)/2,y:(vals[0].y+vals[1].y)/2},r=ui.treeViewport.getBoundingClientRect();if(lastPinch)setScale(treeScale*(d/lastPinch.d),mid.x-r.left,mid.y-r.top);lastPinch={d};return;}
  if(dragging&&lastPointer){treeX+=e.clientX-lastPointer.x;treeY+=e.clientY-lastPointer.y;lastPointer={x:e.clientX,y:e.clientY};applyTreeTransform();}
});
function endPointer(e){pointers.delete(e.pointerId);dragging=pointers.size>0;lastPointer=null;lastPinch=null;}
ui.treeViewport.addEventListener('pointerup',endPointer);ui.treeViewport.addEventListener('pointercancel',endPointer);

buildMine(); showScreen('mineScreen'); requestAnimationFrame(t=>{lastFrame=t;requestAnimationFrame(frame);});
