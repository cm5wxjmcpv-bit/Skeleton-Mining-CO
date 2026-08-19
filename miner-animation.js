// Cartoon miner animation layer. Art and timing live here so they can be swapped
// without changing mining rules, radius logic, crew logic, or save data.
(function(){
  'use strict';

  const FRAME_WIDTH = 180;
  const FRAME_HEIGHT = 116;
  const FRAME_COLUMNS = 6;
  const IMPACT_HOLD_MS = 115;

  const defaultSkin = {
    id: 'basic-cartoon-v1',
    src: 'assets/basic-miner-atlas.webp',
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    columns: FRAME_COLUMNS,
    scale: 1.34,
    animations: {
      idle: [0, 1, 2, 3, 2, 1],
      walk: [4, 5, 6, 7],
      swings: [
        { windup: 8, impact: 9, recovery: 10 },
        { windup: 11, impact: 12, recovery: 13 },
        { windup: 14, impact: 15, recovery: 16 }
      ],
      recoil: [17, 18],
      celebrate: [19, 20, 21],
      rest: [22, 23]
    }
  };

  // Public registry: future art can be registered and assigned by miner type
  // without touching the mining simulation or existing save files.
  const art = window.SkeletonMinerArt = window.SkeletonMinerArt || {
    activeSkin: 'basic-cartoon-v1',
    skins: {},
    typeSkins: {},
    registerSkin(name, definition){ this.skins[name] = definition; },
    setActiveSkin(name){ if(this.skins[name]) this.activeSkin = name; },
    setTypeSkin(type, name){ if(this.skins[name]) this.typeSkins[type] = name; }
  };
  art.registerSkin(defaultSkin.id, defaultSkin);

  const imageCache = new Map();
  function imageFor(skin){
    let image = imageCache.get(skin.src);
    if(!image){
      image = new Image();
      image.decoding = 'async';
      image.src = skin.src;
      imageCache.set(skin.src, image);
    }
    return image;
  }

  function skinForMiner(m){
    const name = art.typeSkins[m.type] || art.activeSkin;
    return art.skins[name] || defaultSkin;
  }

  function frameRect(skin, index){
    return {
      sx: (index % skin.columns) * skin.frameWidth,
      sy: Math.floor(index / skin.columns) * skin.frameHeight,
      sw: skin.frameWidth,
      sh: skin.frameHeight
    };
  }

  function idleFrame(skin, now, m){
    const frames = skin.animations.idle;
    return frames[Math.floor((now + m.index * 137) / 150) % frames.length];
  }

  function swingAt(skin, index){
    const swings = skin.animations.swings;
    return swings[((Number(index) || 0) % swings.length + swings.length) % swings.length];
  }

  function currentFrame(skin, m, now){
    if(m.animPlacedAt && now - m.animPlacedAt < 520){
      const walk = skin.animations.walk;
      return walk[Math.min(walk.length - 1, Math.floor((now - m.animPlacedAt) / 130))];
    }

    if(m.animCelebrateUntil && now < m.animCelebrateUntil){
      const frames = skin.animations.celebrate;
      return frames[Math.floor(now / 100) % frames.length];
    }

    if(running && m.target){
      const sinceImpact = now - (m.animImpactAt || 0);
      const lastSwing = swingAt(skin, m.animImpactSwing);
      if(sinceImpact >= 0 && sinceImpact < IMPACT_HOLD_MS) return lastSwing.impact;

      const interval = Math.max(.05, MINER_TYPES[m.type]?.interval || .75);
      const remaining = Math.max(0, Math.min(interval, Number(m.cooldown) || 0));
      const progress = 1 - remaining / interval;
      if(progress < .30 && Number.isFinite(m.animImpactSwing)) return lastSwing.recovery;
      if(progress < .62) return idleFrame(skin, now, m);
      return swingAt(skin, m.animSwing).windup;
    }

    if(!running && resultShown){
      const rest = skin.animations.rest;
      return rest[Math.floor(now / 500) % rest.length];
    }

    return idleFrame(skin, now, m);
  }

  function fallbackMiner(m, x, y, cell){
    ctx.fillStyle = m.index === eliteIndex ? '#ffe59a' : m.index === totemIndex ? '#c9efc4' : '#eee2ce';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(5, cell * .16), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#17130f';
    ctx.font = `bold ${Math.max(8, cell * .12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(MINER_TYPES[m.type].name[0], x, y);
  }

  function drawImpactAtTarget(m, now, cell){
    const age = now - (m.animImpactAt || 0);
    if(age < 0 || age >= IMPACT_HOLD_MS || !Number.isFinite(m.animTargetX) || !Number.isFinite(m.animTargetY)) return;

    const metrics = canvasMetrics();
    const tx = metrics.left + (m.animTargetX + .5) * metrics.cell;
    const ty = metrics.top + (m.animTargetY + .5) * metrics.cell;
    const pulse = 1 - age / IMPACT_HOLD_MS;

    ctx.save();
    ctx.strokeStyle = `rgba(255,221,139,${.42 + pulse * .5})`;
    ctx.lineWidth = Math.max(2, cell * .035);
    ctx.beginPath();
    ctx.arc(tx, ty, Math.max(5, cell * (.08 + .12 * (1 - pulse))), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(219,177,111,${.30 + pulse * .45})`;
    for(let i = 0; i < 4; i++){
      const a = i * Math.PI / 2 + m.index * .37;
      const d = cell * (.11 + (1 - pulse) * .10);
      ctx.beginPath();
      ctx.arc(tx + Math.cos(a) * d, ty + Math.sin(a) * d, Math.max(1.5, cell * .025), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  window.drawStandardMinerVisual = function(m, x, y, cell){
    const skin = skinForMiner(m);
    const image = imageFor(skin);
    const now = performance.now();

    if(!image.complete || !image.naturalWidth){
      fallbackMiner(m, x, y, cell);
      return true;
    }

    const frame = frameRect(skin, currentFrame(skin, m, now));
    const h = cell * (skin.scale || 1.34);
    const w = h * (skin.frameWidth / skin.frameHeight);
    const baseY = y + cell * .54;
    const facingLeft = running && m.target ? m.target.x < m.x : false;

    ctx.save();
    ctx.translate(x, 0);
    if(facingLeft) ctx.scale(-1, 1);
    ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, -w / 2, baseY - h, w, h);
    ctx.restore();

    drawImpactAtTarget(m, now, cell);

    // Keep special-miner state readable without baking it into the art.
    if(m.index === eliteIndex || m.index === totemIndex){
      ctx.strokeStyle = m.index === eliteIndex ? '#f2d166' : '#a9e5a0';
      ctx.lineWidth = Math.max(2, cell * .025);
      ctx.beginPath();
      ctx.arc(x, y + cell * .12, Math.max(9, cell * .23), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Until each alternate miner gets its own art, show a small type badge.
    if(m.type !== 'basic'){
      ctx.fillStyle = 'rgba(20,16,12,.88)';
      ctx.beginPath();
      ctx.arc(x + cell * .27, y + cell * .28, Math.max(7, cell * .11), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4e8d1';
      ctx.font = `700 ${Math.max(8, cell * .105)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(MINER_TYPES[m.type].name[0], x + cell * .27, y + cell * .28);
    }
    return true;
  };

  // Record the exact real mining hit. Damage stays controlled by the original
  // mineCell implementation; this only timestamps the matching impact frame.
  const mineCellBeforeMinerAnimation = mineCell;
  mineCell = function(c, power, source, chainDepth = 0){
    if(power > 0 && source?.kind === 'miner' && source.miner){
      const m = source.miner;
      const swingCount = skinForMiner(m).animations.swings.length;
      const currentSwing = Number.isFinite(m.animSwing) ? m.animSwing : m.index % swingCount;
      m.animImpactAt = performance.now();
      m.animImpactSwing = currentSwing;
      m.animSwing = (currentSwing + 1) % swingCount;
      m.animTargetX = c?.x;
      m.animTargetY = c?.y;
    }
    return mineCellBeforeMinerAnimation(c, power, source, chainDepth);
  };

  const placeSkeletonBeforeMinerAnimation = placeSkeleton;
  placeSkeleton = function(cell){
    const before = placements.length;
    placeSkeletonBeforeMinerAnimation(cell);
    if(placements.length > before){
      const m = placements[placements.length - 1];
      const swingCount = skinForMiner(m).animations.swings.length;
      m.animPlacedAt = performance.now();
      m.animSwing = m.index % swingCount;
      m.animImpactSwing = null;
    }
  };
})();
