// Keep the live mine inside Safari's actual visible viewport and avoid page scrolling.
(function(){
  const root=document.documentElement;
  function fitVisibleViewport(){
    const height=Math.max(320,Math.round(window.visualViewport?.height||window.innerHeight||document.documentElement.clientHeight));
    root.style.setProperty('--app-height',`${height}px`);
  }

  function applySkeletonScale(){
    const draw=window.drawStandardMinerVisual;
    if(typeof draw!=='function'||draw.__skeletonScale110) return;
    const scaledDraw=function(m,x,y,cell){
      return draw(m,x,y,cell*1.10);
    };
    scaledDraw.__skeletonScale110=true;
    window.drawStandardMinerVisual=scaledDraw;
  }

  const showScreenBeforeViewportFit=showScreen;
  showScreen=function(id){
    showScreenBeforeViewportFit(id);
    document.body.classList.toggle('mine-play-screen',id==='mineScreen');
    fitVisibleViewport();
  };

  const renderMineControlsBeforeViewportFit=renderMineControls;
  renderMineControls=function(){
    renderMineControlsBeforeViewportFit();
    document.body.classList.toggle('round-running',!!running);
  };

  window.addEventListener('resize',fitVisibleViewport,{passive:true});
  window.addEventListener('orientationchange',fitVisibleViewport,{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',fitVisibleViewport,{passive:true});
    window.visualViewport.addEventListener('scroll',fitVisibleViewport,{passive:true});
  }

  document.body.classList.toggle('mine-play-screen',document.querySelector('.active-screen')?.id==='mineScreen');
  document.body.classList.toggle('round-running',!!running);
  fitVisibleViewport();

  // Keep miner art in a late-loaded module so it can be replaced independently.
  // The normal marker remains as a fallback until the animation module finishes loading.
  if(!window.SkeletonMinerArt){
    const minerAnimationScript=document.createElement('script');
    minerAnimationScript.src='miner-animation.js';
    minerAnimationScript.async=true;
    minerAnimationScript.onload=applySkeletonScale;
    document.body.appendChild(minerAnimationScript);
  } else {
    applySkeletonScale();
  }

  // Approved terrain progression: one visual theme for each five-level band.
  // Lava Rock is the final terrain and remains active from Level 46 onward.
  const terrainStages=[
    {max:5,id:'grass',sprite:0},
    {max:10,id:'dirt',sprite:1},
    {max:15,id:'dirt-rocks',sprite:2},
    {max:20,id:'rocky-ground',sprite:3},
    {max:25,id:'stone',sprite:4},
    {max:30,id:'deep-stone',sprite:5},
    {max:35,id:'dark-stone',sprite:6},
    {max:40,id:'cracked-stone',sprite:7},
    {max:45,id:'volcanic-rock',sprite:8},
    {max:Infinity,id:'lava-rock',sprite:9}
  ];
  const terrainSprite=new Image();
  terrainSprite.decoding='async';
  terrainSprite.src='assets/terrain/terrain-sprite.png?v=2';
  terrainSprite.addEventListener('load',()=>{ if(typeof draw==='function') draw(); },{once:true});
  window.SkeletonTerrain={
    stages:terrainStages,
    stageForLevel(level){return terrainStages.find(stage=>level<=stage.max)||terrainStages[terrainStages.length-1];},
    drawTile(context,level,x,y,size){
      if(!terrainSprite.complete||terrainSprite.naturalWidth<=0||terrainSprite.naturalHeight<=0) return false;
      const stage=this.stageForLevel(level), index=stage.sprite;
      const sourceWidth=terrainSprite.naturalWidth/5;
      const sourceHeight=terrainSprite.naturalHeight/2;
      const sourceX=(index%5)*sourceWidth;
      const sourceY=Math.floor(index/5)*sourceHeight;
      const smoothing=context.imageSmoothingEnabled;
      context.imageSmoothingEnabled=false;
      context.drawImage(terrainSprite,sourceX,sourceY,sourceWidth,sourceHeight,x,y,size,size);
      context.imageSmoothingEnabled=smoothing;
      return true;
    }
  };
})();
