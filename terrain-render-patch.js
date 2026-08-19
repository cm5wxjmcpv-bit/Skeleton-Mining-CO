// Final terrain-aware mine renderer.
// Loaded after ore-tuning-patch.js so terrain always wins the draw order.
// Terrain faces are drawn directly on the canvas; no image load is required.
(function(){
  'use strict';

  const TERRAIN_THEMES = [
    { max:5,  id:'grass',          base:'#6f9f2f', edge:'#42651d' },
    { max:10, id:'dirt',           base:'#83572f', edge:'#56371f' },
    { max:15, id:'dirt-rocks',     base:'#765038', edge:'#4d3628' },
    { max:20, id:'rocky-ground',   base:'#5b5145', edge:'#3c3730' },
    { max:25, id:'stone',          base:'#76746e', edge:'#4b4a46' },
    { max:30, id:'deep-stone',     base:'#55575b', edge:'#34363a' },
    { max:35, id:'dark-stone',     base:'#383b3f', edge:'#242629' },
    { max:40, id:'cracked-stone',  base:'#626260', edge:'#3d3d3b' },
    { max:45, id:'volcanic-rock',  base:'#2d2725', edge:'#181514' },
    { max:Infinity, id:'lava-rock',base:'#42241d', edge:'#211310' }
  ];

  function themeForLevel(level){
    return TERRAIN_THEMES.find(t => level <= t.max) || TERRAIN_THEMES[TERRAIN_THEMES.length - 1];
  }

  // Deterministic per-cell variation so texture never flickers between frames.
  function noise(x,y,k=0){
    const n = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + k * 37.719) * 43758.5453123;
    return n - Math.floor(n);
  }

  function dot(context,x,y,r,color){
    context.fillStyle=color;
    context.beginPath();
    context.arc(x,y,r,0,Math.PI*2);
    context.fill();
  }

  function line(context,x1,y1,x2,y2,width,color){
    context.strokeStyle=color;
    context.lineWidth=width;
    context.lineCap='round';
    context.beginPath();
    context.moveTo(x1,y1);
    context.lineTo(x2,y2);
    context.stroke();
  }

  function drawTerrainFace(context,c,x,y,size,level){
    const theme=themeForLevel(level);
    const pad=Math.max(1,size*.055);
    const small=Math.max(1.2,size*.026);
    const medium=Math.max(2,size*.045);

    context.save();
    context.fillStyle=theme.base;
    context.fillRect(x,y,size,size);
    context.beginPath();
    context.rect(x,y,size,size);
    context.clip();

    if(theme.id==='grass'){
      // Bright grassy surface with darker patches and small blades.
      for(let i=0;i<5;i++){
        const px=x+pad+noise(c.x,c.y,i)*Math.max(1,size-pad*2);
        const py=y+pad+noise(c.x,c.y,i+10)*Math.max(1,size-pad*2);
        const h=size*(.05+.04*noise(c.x,c.y,i+20));
        line(context,px,py,px-size*.018,py-h,small,i%2?'#4e7b22':'#94bd45');
        if(i<3) line(context,px,py,px+size*.025,py-h*.72,small,'#5d8728');
      }
      context.fillStyle='rgba(173,208,76,.14)';
      context.fillRect(x,y,size,size*.18);
    } else if(theme.id==='dirt'){
      for(let i=0;i<7;i++){
        const px=x+noise(c.x,c.y,i)*size;
        const py=y+noise(c.x,c.y,i+20)*size;
        dot(context,px,py,small*(.55+noise(c.x,c.y,i+40)),i%2?'#684326':'#a06e3d');
      }
    } else if(theme.id==='dirt-rocks'){
      for(let i=0;i<4;i++){
        const px=x+size*(.14+noise(c.x,c.y,i)*.72);
        const py=y+size*(.14+noise(c.x,c.y,i+10)*.72);
        dot(context,px,py,medium*(.65+noise(c.x,c.y,i+30)),'#8a8173');
        dot(context,px-size*.012,py-size*.012,small*.65,'#aaa091');
      }
      for(let i=0;i<4;i++) dot(context,x+noise(c.x,c.y,i+50)*size,y+noise(c.x,c.y,i+60)*size,small*.6,'#563923');
    } else if(theme.id==='rocky-ground'){
      for(let i=0;i<6;i++){
        const px=x+size*(.1+noise(c.x,c.y,i)*.8);
        const py=y+size*(.1+noise(c.x,c.y,i+10)*.8);
        const r=medium*(.7+noise(c.x,c.y,i+20)*1.3);
        dot(context,px,py,r,i%2?'#756d61':'#464038');
        if(i<3) dot(context,px-r*.2,py-r*.25,r*.35,'#91877a');
      }
    } else if(theme.id==='stone'){
      context.fillStyle='rgba(255,255,255,.045)';
      context.fillRect(x+size*.08,y+size*.10,size*.38,size*.22);
      const sx=x+size*(.12+noise(c.x,c.y,1)*.25);
      const sy=y+size*(.28+noise(c.x,c.y,2)*.2);
      line(context,sx,sy,sx+size*.20,sy+size*.10,small,'#565550');
      line(context,sx+size*.20,sy+size*.10,sx+size*.34,sy+size*.04,small,'#565550');
      for(let i=0;i<3;i++) dot(context,x+noise(c.x,c.y,i+30)*size,y+noise(c.x,c.y,i+40)*size,small*.7,'#898780');
    } else if(theme.id==='deep-stone'){
      for(let i=0;i<5;i++){
        const px=x+noise(c.x,c.y,i)*size;
        const py=y+noise(c.x,c.y,i+12)*size;
        dot(context,px,py,small*(.6+noise(c.x,c.y,i+24)) ,i%2?'#696c70':'#404246');
      }
      line(context,x+size*.18,y+size*.66,x+size*.48,y+size*.53,small,'#414347');
      line(context,x+size*.48,y+size*.53,x+size*.69,y+size*.62,small,'#414347');
    } else if(theme.id==='dark-stone'){
      for(let i=0;i<5;i++){
        const px=x+size*(.1+noise(c.x,c.y,i)*.8);
        const py=y+size*(.1+noise(c.x,c.y,i+9)*.8);
        dot(context,px,py,medium*(.35+noise(c.x,c.y,i+18)*.5),i%2?'#4c5054':'#2a2d30');
      }
      context.fillStyle='rgba(255,255,255,.025)';
      context.fillRect(x,y,size,size*.13);
    } else if(theme.id==='cracked-stone'){
      const cx=x+size*(.40+noise(c.x,c.y,1)*.18);
      const cy=y+size*(.38+noise(c.x,c.y,2)*.20);
      const crack=Math.max(1.4,size*.025);
      line(context,cx,cy,x+size*.12,y+size*.18,crack,'#323230');
      line(context,cx,cy,x+size*.82,y+size*.22,crack,'#323230');
      line(context,cx,cy,x+size*.72,y+size*.78,crack,'#323230');
      line(context,cx,cy,x+size*.25,y+size*.86,crack,'#323230');
      line(context,cx+size*.18,cy-size*.08,cx+size*.28,cy-size*.25,crack*.75,'#41413f');
    } else if(theme.id==='volcanic-rock'){
      for(let i=0;i<7;i++){
        const px=x+size*(.08+noise(c.x,c.y,i)*.84);
        const py=y+size*(.08+noise(c.x,c.y,i+11)*.84);
        const r=medium*(.45+noise(c.x,c.y,i+22)*.7);
        dot(context,px,py,r,i%3===0?'#5b3027':'#171414');
      }
      for(let i=0;i<2;i++) dot(context,x+noise(c.x,c.y,i+50)*size,y+noise(c.x,c.y,i+60)*size,small*.7,'#7c3728');
    } else if(theme.id==='lava-rock'){
      // Final terrain: dark rock with unmistakable glowing molten fissures.
      for(let i=0;i<4;i++) dot(context,x+noise(c.x,c.y,i)*size,y+noise(c.x,c.y,i+8)*size,medium*.7,'#241514');
      const ax=x+size*.05;
      const ay=y+size*(.28+noise(c.x,c.y,1)*.28);
      const bx=x+size*.36;
      const by=y+size*(.42+noise(c.x,c.y,2)*.20);
      const cx=x+size*.68;
      const cy=y+size*(.30+noise(c.x,c.y,3)*.36);
      const dx=x+size*.98;
      const dy=y+size*(.46+noise(c.x,c.y,4)*.18);
      const glow=Math.max(2.4,size*.055);
      line(context,ax,ay,bx,by,glow,'#9e351e');
      line(context,bx,by,cx,cy,glow,'#d64b20');
      line(context,cx,cy,dx,dy,glow,'#9e351e');
      line(context,ax,ay,bx,by,Math.max(1,size*.022),'#ffb126');
      line(context,bx,by,cx,cy,Math.max(1,size*.022),'#ffd04a');
      line(context,cx,cy,dx,dy,Math.max(1,size*.022),'#ff9a20');
    }

    context.restore();

    // Damage is visible without hiding the terrain underneath.
    if(c.hp < CONFIG.rockHp){
      const lost=Math.max(1,CONFIG.rockHp-c.hp);
      context.fillStyle=`rgba(24,16,12,${Math.min(.24,.08+lost*.07)})`;
      context.fillRect(x,y,size,size);
    }

    context.strokeStyle=theme.edge;
    context.lineWidth=Math.max(1,size*.018);
    context.strokeRect(x+.5,y+.5,Math.max(0,size-1),Math.max(0,size-1));
  }

  // This complete draw function preserves hidden ore, placement coverage,
  // animated miners, key reveal, survey, blast, and prospector rendering.
  draw = function(){
    if(!mine.length) return;
    const {cell,left,top}=canvasMetrics();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#080706';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    const coverage=new Map();
    if(!running && placements.length){
      for(const m of placements){
        for(const c of mine.flat()){
          if(c.mined || !inRadius(c,m)) continue;
          const key=`${c.x},${c.y}`;
          coverage.set(key,(coverage.get(key)||0)+1);
        }
      }
    }

    for(const row of mine) for(const c of row){
      const x=left+c.x*cell;
      const y=top+c.y*cell;
      const tileX=x+1;
      const tileY=y+1;
      const tileSize=Math.max(1,cell-2);

      if(c.mined){
        ctx.fillStyle='#11100e';
        ctx.fillRect(tileX,tileY,tileSize,tileSize);
        drawExposedOre(c,x,y,cell);
        if(c.hasKey){
          ctx.fillStyle='#f5cf55';
          ctx.font=`${Math.max(12,cell*.3)}px sans-serif`;
          ctx.textAlign='center';
          ctx.textBaseline='middle';
          ctx.fillText('◆',x+cell/2,y+cell/2);
        }
      }else{
        drawTerrainFace(ctx,c,tileX,tileY,tileSize,save.level);

        if(surveyTiles.includes(c)){
          ctx.strokeStyle='#e1b84b';
          ctx.lineWidth=Math.max(2,cell*.04);
          ctx.strokeRect(x+4,y+4,cell-8,cell-8);
          if(rank(27)===5){
            ctx.fillStyle='#ffe59a';
            ctx.font=`${Math.max(10,cell*.14)}px sans-serif`;
            ctx.fillText(c.oreTypes.length?c.oreTypes.map(t=>ORE_BY_ID[t].name[0]).join(''):'?',x+6,y+cell-7);
          }
        }
        if(blastCell===c){
          ctx.strokeStyle='#d85e50';
          ctx.lineWidth=4;
          ctx.strokeRect(x+3,y+3,cell-6,cell-6);
        }

        const coverCount=coverage.get(`${c.x},${c.y}`)||0;
        if(coverCount){
          const inset=Math.max(3,cell*.045);
          ctx.strokeStyle=coverCount>1?'rgba(225,184,75,.98)':'rgba(245,240,220,.88)';
          ctx.lineWidth=Math.max(2,cell*(coverCount>1?.045:.03));
          ctx.strokeRect(x+inset,y+inset,cell-inset*2,cell-inset*2);
        }
      }
    }

    for(const m of placements){
      const x=left+(m.x+.5)*cell;
      const y=top+(m.y+.5)*cell;
      const customMinerDrawn=typeof drawStandardMinerVisual==='function' && drawStandardMinerVisual(m,x,y,cell);
      if(!customMinerDrawn){
        ctx.fillStyle=m.index===eliteIndex?'#ffe59a':m.index===totemIndex?'#c9efc4':'#eee2ce';
        ctx.beginPath();
        ctx.arc(x,y,Math.max(5,cell*.16),0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle='#17130f';
        ctx.font=`bold ${Math.max(8,cell*.12)}px sans-serif`;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(MINER_TYPES[m.type].name[0],x,y);
      }

      const kr=rank(17);
      if(kr>0 && !keyFound && !keyCell.mined){
        const d=Math.hypot(keyCell.x-m.x,keyCell.y-m.y);
        if(d<=kr){
          ctx.strokeStyle='#f1cc55';
          ctx.lineWidth=3;
          ctx.beginPath();
          ctx.arc(x,y,Math.max(9,cell*.24),0,Math.PI*2);
          ctx.stroke();
          if(kr===5){
            ctx.fillStyle='#f1cc55';
            ctx.font=`${Math.max(10,cell*.18)}px sans-serif`;
            ctx.fillText(Math.abs(keyCell.x-m.x)>Math.abs(keyCell.y-m.y)?(keyCell.x>m.x?'→':'←'):(keyCell.y>m.y?'↓':'↑'),x,y-cell*.3);
          }
        }
      }
    }

    for(const p of prospectors){
      const x=left+(p.x+.5)*cell;
      const y=top+(p.y+.5)*cell;
      ctx.fillStyle='#d9b348';
      ctx.beginPath();
      ctx.moveTo(x,y-cell*.18);
      ctx.lineTo(x+cell*.14,y);
      ctx.lineTo(x,y+cell*.18);
      ctx.lineTo(x-cell*.14,y);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Repaint immediately in case the board was already visible when this patch loaded.
  if(typeof draw==='function') draw();
})();
