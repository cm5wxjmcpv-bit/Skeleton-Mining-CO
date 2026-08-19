// Replaceable cartoon miner animation layer.
// Default rendering is a canvas-drawn character set styled to match the approved miner sheets.
(function(){
  'use strict';

  const IMPACT_HOLD_MS = 150;

  const art = window.SkeletonMinerArt = window.SkeletonMinerArt || {
    activeSkin: 'sheet-matched-rigs-v2',
    skins: {},
    typeSkins: {},
    registerSkin(name, definition){ this.skins[name] = definition; },
    setActiveSkin(name){ if(this.skins[name]) this.activeSkin = name; },
    setTypeSkin(type, name){ if(this.skins[name]) this.typeSkins[type] = name; }
  };

  const TYPE_STYLE = {
    basic: {
      label: 'Basic Miner',
      helmet: '#f2b018', helmetShade: '#c98710', lampRing: '#6d4c19', lampGlow: '#fff1b8',
      cloth: '#375892', clothShade: '#273d6a', trim: '#d5a331', belt: '#6f4120', leather: '#6f4120',
      boot: '#80502a', bootShade: '#5d3519', toolMetal: '#a7afb8', toolDark: '#3d4248',
      spark: '#ffd768', scarf: null, gem: null, moneyBag: false,
      handleScale: 1.0, headSize: 1.0, bodyScale: 1.0, stride: 1.0, lift: 1.0, reach: 1.0, lean: 0
    },
    fast: {
      label: 'Fast Miner',
      helmet: '#8ac61c', helmetShade: '#669413', lampRing: '#5e4e1a', lampGlow: '#f5ffbd',
      cloth: '#6cab24', clothShade: '#4d7f1a', trim: '#d4c968', belt: '#6f4120', leather: '#6f4120',
      boot: '#7c5529', bootShade: '#5b391a', toolMetal: '#aeb5bc', toolDark: '#3d4349',
      spark: '#f3ff6e', scarf: '#628f1f', gem: null, moneyBag: false,
      handleScale: 0.96, headSize: 0.98, bodyScale: 0.98, stride: 1.35, lift: 1.35, reach: 1.05, lean: -0.12
    },
    wide: {
      label: 'Wide-Reach Miner',
      helmet: '#eb8f16', helmetShade: '#c56a0d', lampRing: '#684818', lampGlow: '#ffe9b0',
      cloth: '#dc7a15', clothShade: '#b55e0d', trim: '#d4a049', belt: '#5d3a1f', leather: '#5d3a1f',
      boot: '#774925', bootShade: '#562f17', toolMetal: '#aab1b9', toolDark: '#3c4248',
      spark: '#ffd061', scarf: null, gem: null, moneyBag: false, kneePads: '#757a82',
      handleScale: 1.34, headSize: 0.98, bodyScale: 1.04, stride: 0.92, lift: 0.9, reach: 1.28, lean: 0.02
    },
    value: {
      label: 'High-Value Miner',
      helmet: '#8444bf', helmetShade: '#662e99', lampRing: '#c9a33a', lampGlow: '#ffecaa',
      cloth: '#7135a8', clothShade: '#52277d', trim: '#e1b23b', belt: '#6a4021', leather: '#6a4021',
      boot: '#7b5029', bootShade: '#57351a', toolMetal: '#aeb3bc', toolDark: '#3f4349',
      spark: '#ffd96a', scarf: null, gem: '#8f5fe0', moneyBag: true,
      handleScale: 1.02, headSize: 1.0, bodyScale: 1.02, stride: 0.96, lift: 0.95, reach: 1.0, lean: -0.02
    }
  };

  function styleForMiner(m){
    return TYPE_STYLE[m?.type] || TYPE_STYLE.basic;
  }

  function roundedRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,r);
  }

  function boneLine(x1,y1,x2,y2,width=.055){
    ctx.lineCap='round';
    ctx.strokeStyle='#241a13'; ctx.lineWidth=width+.025; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.strokeStyle='#f3ead7'; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }

  function glove(x,y,style,r=.075){
    ctx.fillStyle=style.leather; ctx.strokeStyle='#2c1a11'; ctx.lineWidth=.025;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }

  function boot(x,y,style,flip=1){
    ctx.save(); ctx.translate(x,y); ctx.scale(flip,1);
    ctx.fillStyle=style.boot; ctx.strokeStyle='#251710'; ctx.lineWidth=.028;
    roundedRect(-.095,-.06,.205,.12,.055); ctx.fill(); ctx.stroke();
    ctx.fillStyle=style.bootShade; roundedRect(-.075,-.045,.16,.055,.025); ctx.fill();
    ctx.restore();
  }

  function drawSkull(style){
    const hs = style.headSize || 1;
    ctx.save();
    ctx.scale(hs, hs);
    ctx.fillStyle='#f5ecd9'; ctx.strokeStyle='#241a13'; ctx.lineWidth=.032;
    ctx.beginPath(); ctx.ellipse(0,-.41,.215,.19,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    roundedRect(-.14,-.31,.28,.12,.045); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#11100e';
    ctx.beginPath(); ctx.ellipse(-.075,-.43,.055,.073,-.12,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(.075,-.43,.055,.073,.12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-.057,-.455,.014,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(.093,-.455,.014,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#241a13';
    ctx.beginPath(); ctx.moveTo(0,-.39); ctx.lineTo(-.022,-.355); ctx.lineTo(.022,-.355); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#3b2a1d'; ctx.lineWidth=.014;
    for(let x=-.09;x<=.09;x+=.045){ctx.beginPath();ctx.moveTo(x,-.30);ctx.lineTo(x,-.245);ctx.stroke();}
    ctx.beginPath(); ctx.moveTo(-.11,-.275); ctx.lineTo(.11,-.275); ctx.stroke();
    ctx.restore();
  }

  function drawHelmet(style){
    const hs = style.headSize || 1;
    ctx.save();
    ctx.scale(hs, hs);
    ctx.fillStyle=style.helmet; ctx.strokeStyle='#4b2c12'; ctx.lineWidth=.032;
    ctx.beginPath(); ctx.arc(0,-.51,.205,Math.PI,Math.PI*2); ctx.lineTo(.205,-.49); ctx.lineTo(-.205,-.49); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=style.helmetShade;
    ctx.beginPath();ctx.arc(-.045,-.525,.12,Math.PI,Math.PI*1.95);ctx.strokeStyle='transparent';ctx.fill();
    ctx.fillStyle='#70461b';ctx.fillRect(-.22,-.505,.44,.035);
    ctx.fillStyle=style.lampGlow; ctx.strokeStyle=style.lampRing; ctx.lineWidth=.026;
    ctx.beginPath(); ctx.arc(.09,-.57,.062,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath();ctx.arc(.075,-.588,.019,0,Math.PI*2);ctx.fill();
    if(style.gem){
      ctx.fillStyle=style.gem; ctx.strokeStyle='#593082'; ctx.lineWidth=.018;
      ctx.beginPath(); ctx.moveTo(-.065,-.545); ctx.lineTo(-.03,-.57); ctx.lineTo(.005,-.545); ctx.lineTo(-.005,-.505); ctx.lineTo(-.055,-.505); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawScarf(style, flutter=0){
    if(!style.scarf) return;
    ctx.fillStyle = style.scarf; ctx.strokeStyle = '#2a3314'; ctx.lineWidth = .02;
    roundedRect(-.075,-.13,.15,.045,.02); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(.04,-.11); ctx.quadraticCurveTo(.20+flutter*.05,-.18,.16+flutter*.1,-.02); ctx.quadraticCurveTo(.11+flutter*.05,-.04,.04,-.07); ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  function drawTorso(style){
    const bs = style.bodyScale || 1;
    ctx.save(); ctx.scale(bs, bs);
    boneLine(0,-.24,0,.08,.045);
    for(let i=0;i<3;i++){
      const yy=-.19+i*.072;
      ctx.strokeStyle='#241a13';ctx.lineWidth=.045;ctx.beginPath();ctx.ellipse(0,yy,.155-i*.012,.055,0,0,Math.PI);ctx.stroke();
      ctx.strokeStyle='#f3ead7';ctx.lineWidth=.026;ctx.beginPath();ctx.ellipse(0,yy,.155-i*.012,.055,0,0,Math.PI);ctx.stroke();
    }
    ctx.fillStyle='#f1e6d2';ctx.strokeStyle='#241a13';ctx.lineWidth=.028;
    ctx.beginPath();ctx.ellipse(0,.08,.13,.065,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=style.cloth; roundedRect(-.17,-.03,.34,.29,.04); ctx.fill();
    ctx.fillStyle=style.clothShade; roundedRect(-.06,.04,.12,.12,.02); ctx.fill();
    ctx.strokeStyle='#2d2016'; ctx.lineWidth=.026; ctx.strokeRect(-.17,-.03,.34,.29); ctx.strokeRect(-.06,.04,.12,.12);
    ctx.fillStyle=style.trim; roundedRect(-.13,-.09,.06,.14,.022); ctx.fill(); roundedRect(.07,-.09,.06,.14,.022); ctx.fill();
    ctx.strokeStyle='#553615'; ctx.lineWidth=.018; ctx.strokeRect(-.13,-.09,.06,.14); ctx.strokeRect(.07,-.09,.06,.14);
    ctx.fillStyle='#d8c68a'; ctx.fillRect(-.115,-.02,.03,.026); ctx.fillRect(.085,-.02,.03,.026);
    ctx.fillStyle=style.belt; roundedRect(-.19,.18,.38,.06,.02); ctx.fill();
    ctx.fillStyle=style.trim; roundedRect(-.035,.165,.07,.085,.018); ctx.fill();
    ctx.strokeStyle='#39210f'; ctx.lineWidth=.018; ctx.strokeRect(-.035,.165,.07,.085);
    ctx.restore();
  }

  function drawMoneyBag(style){
    if(!style.moneyBag) return;
    ctx.fillStyle='#6b4322'; ctx.strokeStyle='#2e1b10'; ctx.lineWidth=.02;
    ctx.beginPath(); ctx.moveTo(-.22,.08); ctx.quadraticCurveTo(-.31,.06,-.28,.20); ctx.lineTo(-.27,.28); ctx.quadraticCurveTo(-.18,.32,-.11,.25); ctx.lineTo(-.11,.11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#f1c24c';
    for(const [x,y,r] of [[-.23,.09,.02],[-.19,.11,.018],[-.25,.14,.018],[-.205,.16,.016]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    if(style.gem){ ctx.fillStyle=style.gem; ctx.beginPath(); ctx.arc(-.18,.20,.018,0,Math.PI*2); ctx.fill(); }
  }

  function drawKneePads(style){
    if(!style.kneePads) return;
    ctx.fillStyle=style.kneePads; ctx.strokeStyle='#40444a'; ctx.lineWidth=.016;
    roundedRect(-.19,.28,.08,.06,.02); ctx.fill(); ctx.stroke(); roundedRect(.11,.28,.08,.06,.02); ctx.fill(); ctx.stroke();
  }

  function drawPickaxe(angle, style){
    const hs = style.handleScale || 1, reach = style.reach || 1;
    ctx.save(); ctx.translate(.025,-.08); ctx.rotate(angle); ctx.scale(hs,1);
    ctx.strokeStyle='#2b190f';ctx.lineWidth=.065;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,.34);ctx.lineTo(0,-.42*reach);ctx.stroke();
    ctx.strokeStyle='#9b6333';ctx.lineWidth=.042;ctx.beginPath();ctx.moveTo(0,.34);ctx.lineTo(0,-.42*reach);ctx.stroke();
    ctx.strokeStyle=style.toolDark;ctx.lineWidth=.09;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-.23*reach,-.43*reach);ctx.quadraticCurveTo(0,-.51*reach,.25*reach,-.41*reach);ctx.stroke();
    ctx.strokeStyle=style.toolMetal;ctx.lineWidth=.048;ctx.beginPath();ctx.moveTo(-.23*reach,-.43*reach);ctx.quadraticCurveTo(0,-.49*reach,.25*reach,-.41*reach);ctx.stroke();
    ctx.restore();
  }

  function drawArms(angle, style, mining){
    if(!mining){
      boneLine(-.11,-.16,-.20,-.02); boneLine(-.20,-.02,-.18,.11); glove(-.18,.11,style,.065);
      boneLine(.11,-.16,.19,-.07); boneLine(.19,-.07,.12,.02); glove(.12,.02,style,.065); return;
    }
    const handleScale = style.handleScale || 1, c=Math.cos(angle), s=Math.sin(angle);
    const hand1={x:.025 + (-.02*c - .03*s)*handleScale, y:-.08 + (-.02*s + .03*c)};
    const hand2={x:.025 + (-.02*c + .15*s)*handleScale, y:-.08 + (-.02*s - .15*c)};
    boneLine(-.11,-.16,hand1.x,hand1.y); glove(hand1.x,hand1.y,style,.06); boneLine(.11,-.16,hand2.x,hand2.y); glove(hand2.x,hand2.y,style,.06);
  }

  function drawLegs(style, step=0){
    const stride = style.stride || 1, lift = style.lift || 1;
    const a=.02+step*.055*lift, b=.02-step*.055*lift;
    boneLine(-.07,.11,-.13*stride,.27+a); boneLine(-.13*stride,.27+a,-.13*stride,.37+a);
    boneLine(.07,.11,.13*stride,.27+b); boneLine(.13*stride,.27+b,.13*stride,.37+b);
    boot(-.15*stride,.42+a,style,-1); boot(.15*stride,.42+b,style,1); drawKneePads(style);
  }

  function minerPose(m, now){
    const interval=Math.max(.05,MINER_TYPES[m.type]?.interval||.75);
    const remaining=Math.max(0,Math.min(interval,Number(m.cooldown)||0));
    const progress=1-remaining/interval;
    const impactAge=now-(m.animImpactAt||0);
    const impact=impactAge>=0&&impactAge<IMPACT_HOLD_MS;
    const mining=!!(running&&m.target)||impact;
    const swingStyle=Number.isFinite(m.animImpactSwing)&&impact?m.animImpactSwing:(Number.isFinite(m.animSwing)?m.animSwing:m.index)%3;
    let angle=-.35;
    if(mining){
      if(impact) angle=[.78,.96,.62][swingStyle%3];
      else if(progress<.42) angle=-.30;
      else {
        const t=Math.min(1,(progress-.42)/.58);
        const start=[-1.02,-.78,-1.20][swingStyle%3], end=[.70,.92,.55][swingStyle%3];
        angle=start+(end-start)*(t*t*(3-2*t));
      }
    }
    return {interval,progress,impact,mining,angle,swingStyle};
  }

  function drawCelebration(style, m, now){
    if(m.animCelebrateUntil&&now<m.animCelebrateUntil){
      ctx.strokeStyle=style.spark;ctx.lineWidth=.03;
      for(const a of [-2.4,-1.9,-1.25,-.75]){ctx.beginPath();ctx.moveTo(Math.cos(a)*.28,-.44+Math.sin(a)*.16);ctx.lineTo(Math.cos(a)*.38,-.44+Math.sin(a)*.24);ctx.stroke();}
      if(style.moneyBag){ctx.fillStyle='#f1c24c';for(const [x,y] of [[-.22,-.34],[-.28,-.29],[-.16,-.28]]){ctx.beginPath();ctx.arc(x,y,.02,0,Math.PI*2);ctx.fill();}}
    }
  }

  function drawImpact(style, m, now, cell){
    if(!(Number.isFinite(m.animTargetX)&&Number.isFinite(m.animTargetY))) return;
    const metrics=canvasMetrics();
    const tx=metrics.left+(m.animTargetX+.5)*metrics.cell, ty=metrics.top+(m.animTargetY+.5)*metrics.cell;
    const p=1-(now-m.animImpactAt)/IMPACT_HOLD_MS;
    ctx.save();
    ctx.strokeStyle=`rgba(255,210,90,${.45+p*.5})`;ctx.lineWidth=Math.max(2,cell*.04);ctx.beginPath();ctx.arc(tx,ty,cell*(.08+(1-p)*.13),0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=`rgba(181,126,74,${.35+p*.45})`;
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5+m.index*.31,d=cell*(.12+(1-p)*.12);ctx.beginPath();ctx.arc(tx+Math.cos(a)*d,ty+Math.sin(a)*d,Math.max(1.5,cell*.025),0,Math.PI*2);ctx.fill();}
    if(m.type==='fast'){
      ctx.strokeStyle=`rgba(255,255,190,${.25+p*.45})`; ctx.lineWidth=Math.max(1.5,cell*.03);
      ctx.beginPath(); ctx.moveTo(tx-cell*.1,ty-cell*.12); ctx.lineTo(tx+cell*.12,ty+cell*.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx-cell*.03,ty-cell*.16); ctx.lineTo(tx+cell*.16,ty+cell*.03); ctx.stroke();
    } else if(m.type==='value'){
      ctx.fillStyle=`rgba(255,217,106,${.35+p*.5})`;ctx.beginPath();ctx.arc(tx+cell*.14,ty-cell*.08,Math.max(1.5,cell*.03),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function drawTypeRig(m,x,y,cell){
    const style = styleForMiner(m), now=performance.now(), pose=minerPose(m,now);
    const targetX=m.target?.x??m.animTargetX;
    const facingLeft=Number.isFinite(targetX)?targetX<m.x:false;
    const phaseBoost = m.type==='fast' ? 1.35 : 1;
    const idleBob=Math.sin((now+m.index*173)/(170/phaseBoost))*cell*.018;
    const placeAge=now-(m.animPlacedAt||0);
    const placementBounce=placeAge>=0&&placeAge<520?Math.sin(placeAge/520*Math.PI*3)*cell*.055:0;
    const recoil=pose.impact?Math.sin((now-m.animImpactAt)/IMPACT_HOLD_MS*Math.PI)*-.07*(m.type==='wide'?1.18:1):0;
    const step=!running&&placeAge>=0&&placeAge<520?Math.sin(placeAge/70*phaseBoost):0;
    const extraLean = style.lean || 0;

    ctx.save();
    ctx.translate(x,y+cell*.18+idleBob+placementBounce);
    ctx.scale((facingLeft?-1:1)*cell,cell);
    ctx.rotate(recoil + extraLean + (m.type==='fast' ? Math.sin((now+m.index*90)/260)*0.015 : 0));
    drawLegs(style, step*.28);
    drawTorso(style);
    drawScarf(style, Math.sin((now+m.index*70)/150));
    drawMoneyBag(style);
    drawPickaxe(pose.mining?pose.angle:-.78, style);
    drawArms(pose.mining?pose.angle:-.78, style, pose.mining);
    drawSkull(style);
    drawHelmet(style);
    drawCelebration(style, m, now);
    ctx.restore();
    if(pose.impact) drawImpact(style, m, now, cell);
    return true;
  }

  art.registerSkin('sheet-matched-rigs-v2',{id:'sheet-matched-rigs-v2',draw:drawTypeRig});
  art.setTypeSkin('basic','sheet-matched-rigs-v2');
  art.setTypeSkin('fast','sheet-matched-rigs-v2');
  art.setTypeSkin('wide','sheet-matched-rigs-v2');
  art.setTypeSkin('value','sheet-matched-rigs-v2');

  window.drawStandardMinerVisual=function(m,x,y,cell){
    const name=art.typeSkins[m.type]||art.activeSkin;
    const skin=art.skins[name]||art.skins['sheet-matched-rigs-v2'];
    if(typeof skin?.draw!=='function') return false;
    return skin.draw(m,x,y,cell)!==false;
  };

  const mineCellBeforeMinerAnimation=mineCell;
  mineCell=function(c,power,source,chainDepth=0){
    if(power>0&&source?.kind==='miner'&&source.miner){
      const m=source.miner;
      const currentSwing=Number.isFinite(m.animSwing)?m.animSwing:m.index%3;
      m.animImpactAt=performance.now();
      m.animImpactSwing=currentSwing;
      m.animSwing=(currentSwing+1)%3;
      m.animTargetX=c?.x;
      m.animTargetY=c?.y;
    }
    return mineCellBeforeMinerAnimation(c,power,source,chainDepth);
  };

  const placeSkeletonBeforeMinerAnimation=placeSkeleton;
  placeSkeleton=function(cell){
    const before=placements.length;
    placeSkeletonBeforeMinerAnimation(cell);
    if(placements.length>before){
      const m=placements[placements.length-1];
      m.animPlacedAt=performance.now();
      m.animSwing=m.index%3;
      m.animImpactSwing=null;
    }
  };

  if(typeof onKeyFound==='function'){
    const onKeyFoundBeforeMinerAnimation=onKeyFound;
    onKeyFound=function(){
      const until=performance.now()+900;
      for(const m of placements)m.animCelebrateUntil=until;
      return onKeyFoundBeforeMinerAnimation.apply(this,arguments);
    };
  }
})();
