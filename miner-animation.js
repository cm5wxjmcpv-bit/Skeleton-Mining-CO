// Replaceable cartoon miner animation layer.
// The default skin is drawn directly on the canvas so it cannot fail because of a missing image asset.
(function(){
  'use strict';

  const IMPACT_HOLD_MS = 150;

  const art = window.SkeletonMinerArt = window.SkeletonMinerArt || {
    activeSkin: 'basic-cartoon-rig-v1',
    skins: {},
    typeSkins: {},
    registerSkin(name, definition){ this.skins[name] = definition; },
    setActiveSkin(name){ if(this.skins[name]) this.activeSkin = name; },
    setTypeSkin(type, name){ if(this.skins[name]) this.typeSkins[type] = name; }
  };

  function boneLine(x1,y1,x2,y2,width=.055){
    ctx.lineCap='round';
    ctx.strokeStyle='#241a13'; ctx.lineWidth=width+.025; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.strokeStyle='#f3ead7'; ctx.lineWidth=width; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }

  function glove(x,y,r=.075){
    ctx.fillStyle='#6f3f22'; ctx.strokeStyle='#2c1a11'; ctx.lineWidth=.025;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }

  function boot(x,y,flip=1){
    ctx.save(); ctx.translate(x,y); ctx.scale(flip,1);
    ctx.fillStyle='#64391f'; ctx.strokeStyle='#251710'; ctx.lineWidth=.028;
    ctx.beginPath(); ctx.roundRect(-.095,-.06,.205,.12,.055); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#8a512b'; ctx.beginPath(); ctx.roundRect(-.075,-.045,.16,.055,.025); ctx.fill();
    ctx.restore();
  }

  function drawSkull(){
    ctx.fillStyle='#f5ecd9'; ctx.strokeStyle='#241a13'; ctx.lineWidth=.032;
    ctx.beginPath(); ctx.ellipse(0,-.41,.215,.19,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-.14,-.31,.28,.12,.045); ctx.fill(); ctx.stroke();

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
    ctx.beginPath();ctx.moveTo(-.11,-.275);ctx.lineTo(.11,-.275);ctx.stroke();
  }

  function drawHelmet(){
    ctx.fillStyle='#f3ad16'; ctx.strokeStyle='#4b2c12'; ctx.lineWidth=.032;
    ctx.beginPath(); ctx.arc(0,-.51,.205,Math.PI,Math.PI*2); ctx.lineTo(.205,-.49); ctx.lineTo(-.205,-.49); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffca38';
    ctx.beginPath();ctx.arc(-.045,-.525,.12,Math.PI,Math.PI*1.95);ctx.strokeStyle='transparent';ctx.fill();
    ctx.fillStyle='#8f5c18';ctx.fillRect(-.22,-.505,.44,.035);
    ctx.fillStyle='#fff4bc'; ctx.strokeStyle='#50320f'; ctx.lineWidth=.026;
    ctx.beginPath(); ctx.arc(.09,-.57,.062,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath();ctx.arc(.075,-.588,.019,0,Math.PI*2);ctx.fill();
  }

  function drawTorso(){
    boneLine(0,-.24,0,.08,.045);
    for(let i=0;i<3;i++){
      const yy=-.19+i*.072;
      ctx.strokeStyle='#241a13';ctx.lineWidth=.045;ctx.beginPath();ctx.ellipse(0,yy,.155-i*.012,.055,0,0,Math.PI);ctx.stroke();
      ctx.strokeStyle='#f3ead7';ctx.lineWidth=.026;ctx.beginPath();ctx.ellipse(0,yy,.155-i*.012,.055,0,0,Math.PI);ctx.stroke();
    }
    ctx.fillStyle='#f1e6d2';ctx.strokeStyle='#241a13';ctx.lineWidth=.028;
    ctx.beginPath();ctx.ellipse(0,.08,.13,.065,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#6d4123';ctx.fillRect(-.16,.055,.32,.07);
    ctx.fillStyle='#d69a27';ctx.fillRect(-.035,.055,.07,.07);ctx.strokeStyle='#39210f';ctx.lineWidth=.018;ctx.strokeRect(-.035,.055,.07,.07);
  }

  function drawPickaxe(angle){
    ctx.save();
    ctx.translate(.025,-.08);
    ctx.rotate(angle);
    ctx.strokeStyle='#2b190f';ctx.lineWidth=.065;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,.34);ctx.lineTo(0,-.42);ctx.stroke();
    ctx.strokeStyle='#9b6333';ctx.lineWidth=.042;ctx.beginPath();ctx.moveTo(0,.34);ctx.lineTo(0,-.42);ctx.stroke();
    ctx.strokeStyle='#202124';ctx.lineWidth=.09;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-.23,-.43);ctx.quadraticCurveTo(0,-.51,.25,-.41);ctx.stroke();
    ctx.strokeStyle='#aeb4ba';ctx.lineWidth=.048;ctx.beginPath();ctx.moveTo(-.23,-.43);ctx.quadraticCurveTo(0,-.49,.25,-.41);ctx.stroke();
    ctx.restore();
  }

  function drawArms(angle, mining){
    if(!mining){
      boneLine(-.11,-.16,-.20,-.02); boneLine(-.20,-.02,-.18,.11); glove(-.18,.11,.065);
      boneLine(.11,-.16,.19,-.07); boneLine(.19,-.07,.12,.02); glove(.12,.02,.065);
      return;
    }
    // Hands follow the pickaxe handle closely enough to read as a two-handed swing.
    const c=Math.cos(angle), s=Math.sin(angle);
    const hand1={x:.025 + (-.02*c - .03*s), y:-.08 + (-.02*s + .03*c)};
    const hand2={x:.025 + (-.02*c + .15*s), y:-.08 + (-.02*s - .15*c)};
    boneLine(-.11,-.16,hand1.x,hand1.y); glove(hand1.x,hand1.y,.06);
    boneLine(.11,-.16,hand2.x,hand2.y); glove(hand2.x,hand2.y,.06);
  }

  function drawLegs(step=0){
    const a=.02+step*.055, b=.02-step*.055;
    boneLine(-.07,.11,-.13,.27+a); boneLine(-.13,.27+a,-.13,.37+a);
    boneLine(.07,.11,.13,.27+b); boneLine(.13,.27+b,.13,.37+b);
    boot(-.15,.42+a,-1); boot(.15,.42+b,1);
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
        const start=[-1.02,-.78,-1.20][swingStyle%3];
        const end=[.70,.92,.55][swingStyle%3];
        angle=start+(end-start)*(t*t*(3-2*t));
      }
    }
    return {interval,progress,impact,mining,angle,swingStyle};
  }

  function drawBasicCartoonRig(m,x,y,cell){
    const now=performance.now();
    const pose=minerPose(m,now);
    const targetX=m.target?.x??m.animTargetX;
    const facingLeft=Number.isFinite(targetX)?targetX<m.x:false;
    const idleBob=Math.sin((now+m.index*173)/170)*cell*.018;
    const placeAge=now-(m.animPlacedAt||0);
    const placementBounce=placeAge>=0&&placeAge<520?Math.sin(placeAge/520*Math.PI*3)*cell*.055:0;
    const recoil=pose.impact?Math.sin((now-m.animImpactAt)/IMPACT_HOLD_MS*Math.PI)*-.07:0;
    const step=!running&&placeAge>=0&&placeAge<520?Math.sin(placeAge/70):0;

    ctx.save();
    ctx.translate(x,y+cell*.18+idleBob+placementBounce);
    ctx.scale((facingLeft?-1:1)*cell,cell);
    ctx.rotate(recoil);

    drawLegs(step*.28);
    drawTorso();
    drawPickaxe(pose.mining?pose.angle:-.78);
    drawArms(pose.mining?pose.angle:-.78,pose.mining);
    drawSkull();
    drawHelmet();

    if(m.animCelebrateUntil&&now<m.animCelebrateUntil){
      ctx.strokeStyle='#ffd85a';ctx.lineWidth=.03;
      for(const a of [-2.4,-1.9,-1.25,-.75]){
        ctx.beginPath();ctx.moveTo(Math.cos(a)*.28,-.44+Math.sin(a)*.16);ctx.lineTo(Math.cos(a)*.38,-.44+Math.sin(a)*.24);ctx.stroke();
      }
    }
    ctx.restore();

    if(pose.impact&&Number.isFinite(m.animTargetX)&&Number.isFinite(m.animTargetY)){
      const metrics=canvasMetrics();
      const tx=metrics.left+(m.animTargetX+.5)*metrics.cell;
      const ty=metrics.top+(m.animTargetY+.5)*metrics.cell;
      const p=1-(now-m.animImpactAt)/IMPACT_HOLD_MS;
      ctx.save();
      ctx.strokeStyle=`rgba(255,210,90,${.45+p*.5})`;ctx.lineWidth=Math.max(2,cell*.04);
      ctx.beginPath();ctx.arc(tx,ty,cell*(.08+(1-p)*.13),0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=`rgba(181,126,74,${.35+p*.45})`;
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5+m.index*.31,d=cell*(.12+(1-p)*.12);ctx.beginPath();ctx.arc(tx+Math.cos(a)*d,ty+Math.sin(a)*d,Math.max(1.5,cell*.025),0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    return true;
  }

  art.registerSkin('basic-cartoon-rig-v1',{id:'basic-cartoon-rig-v1',draw:drawBasicCartoonRig});

  window.drawStandardMinerVisual=function(m,x,y,cell){
    const name=art.typeSkins[m.type]||art.activeSkin;
    const skin=art.skins[name]||art.skins['basic-cartoon-rig-v1'];
    if(typeof skin?.draw!=='function') return false;
    const drawn=skin.draw(m,x,y,cell)!==false;

    // Alternate miner types share the basic cartoon body for now, with a small badge.
    if(drawn&&m.type!=='basic'){
      ctx.fillStyle='rgba(20,16,12,.9)';ctx.beginPath();ctx.arc(x+cell*.28,y+cell*.27,Math.max(7,cell*.11),0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f4e8d1';ctx.font=`700 ${Math.max(8,cell*.105)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(MINER_TYPES[m.type].name[0],x+cell*.28,y+cell*.27);
    }
    return drawn;
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
