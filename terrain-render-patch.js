// Final terrain-aware mine renderer. Loaded after ore-tuning-patch.js so its brown-tile draw override cannot win.
(function(){
  'use strict';

  const fallbackForLevel = (level) => {
    if (level <= 5) return '#71951f';
    if (level <= 10) return '#875a35';
    if (level <= 15) return '#765034';
    if (level <= 20) return '#554536';
    if (level <= 25) return '#626262';
    if (level <= 30) return '#4a4a4a';
    if (level <= 35) return '#343434';
    if (level <= 40) return '#555555';
    if (level <= 45) return '#24201f';
    return '#54271d';
  };

  draw = function(){
    if (!mine.length) return;
    const { cell, left, top } = canvasMetrics();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#080706';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const coverage = new Map();
    if (!running && placements.length) {
      for (const m of placements) {
        for (const c of mine.flat()) {
          if (c.mined || !inRadius(c, m)) continue;
          const key = `${c.x},${c.y}`;
          coverage.set(key, (coverage.get(key) || 0) + 1);
        }
      }
    }

    for (const row of mine) for (const c of row) {
      const x = left + c.x * cell;
      const y = top + c.y * cell;
      const tileX = x + 1;
      const tileY = y + 1;
      const tileSize = Math.max(1, cell - 2);

      if (c.mined) {
        ctx.fillStyle = '#11100e';
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
      } else {
        if (typeof drawTerrainTile === 'function') {
          drawTerrainTile(ctx, save.level, tileX, tileY, tileSize);
        } else {
          ctx.fillStyle = fallbackForLevel(save.level);
          ctx.fillRect(tileX, tileY, tileSize, tileSize);
        }

        if (c.hp < CONFIG.rockHp) {
          const damage = Math.min(.34, .12 + (CONFIG.rockHp - c.hp) * .09);
          ctx.fillStyle = `rgba(24,10,5,${damage})`;
          ctx.fillRect(tileX, tileY, tileSize, tileSize);
        }
      }

      ctx.strokeStyle = 'rgba(80,66,56,.82)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tileX, tileY, tileSize, tileSize);

      if (!c.mined) {
        if (surveyTiles.includes(c)) {
          ctx.strokeStyle = '#e1b84b';
          ctx.lineWidth = Math.max(2, cell * .04);
          ctx.strokeRect(x + 4, y + 4, cell - 8, cell - 8);
          if (rank(27) === 5) {
            ctx.fillStyle = '#ffe59a';
            ctx.font = `${Math.max(10, cell * .14)}px sans-serif`;
            ctx.fillText(c.oreTypes.length ? c.oreTypes.map(t => ORE_BY_ID[t].name[0]).join('') : '?', x + 6, y + cell - 7);
          }
        }

        if (blastCell === c) {
          ctx.strokeStyle = '#d85e50';
          ctx.lineWidth = 4;
          ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
        }

        const coverCount = coverage.get(`${c.x},${c.y}`) || 0;
        if (coverCount) {
          const inset = Math.max(3, cell * .045);
          ctx.strokeStyle = coverCount > 1 ? 'rgba(225,184,75,.98)' : 'rgba(238,226,206,.68)';
          ctx.lineWidth = Math.max(2, cell * (coverCount > 1 ? .045 : .03));
          ctx.strokeRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
        }
      } else {
        if (typeof drawExposedOre === 'function') drawExposedOre(c, x, y, cell);
        if (c.hasKey) {
          ctx.fillStyle = '#f5cf55';
          ctx.font = `${Math.max(12, cell * .3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('◆', x + cell / 2, y + cell / 2);
        }
      }
    }

    for (const m of placements) {
      const x = left + (m.x + .5) * cell;
      const y = top + (m.y + .5) * cell;
      const customMinerDrawn = typeof drawStandardMinerVisual === 'function' && drawStandardMinerVisual(m, x, y, cell);
      if (!customMinerDrawn) {
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

      const kr = rank(17);
      if (kr > 0 && !keyFound && !keyCell.mined) {
        const d = Math.hypot(keyCell.x - m.x, keyCell.y - m.y);
        if (d <= kr) {
          ctx.strokeStyle = '#f1cc55';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(9, cell * .24), 0, Math.PI * 2);
          ctx.stroke();
          if (kr === 5) {
            ctx.fillStyle = '#f1cc55';
            ctx.font = `${Math.max(10, cell * .18)}px sans-serif`;
            ctx.fillText(Math.abs(keyCell.x - m.x) > Math.abs(keyCell.y - m.y) ? (keyCell.x > m.x ? '→' : '←') : (keyCell.y > m.y ? '↓' : '↑'), x, y - cell * .3);
          }
        }
      }
    }

    for (const p of prospectors) {
      const x = left + (p.x + .5) * cell;
      const y = top + (p.y + .5) * cell;
      ctx.fillStyle = '#d9b348';
      ctx.beginPath();
      ctx.moveTo(x, y - cell * .18);
      ctx.lineTo(x + cell * .14, y);
      ctx.lineTo(x, y + cell * .18);
      ctx.lineTo(x - cell * .14, y);
      ctx.closePath();
      ctx.fill();
    }
  };

  draw();
})();
