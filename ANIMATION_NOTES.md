# Cartoon miner animation integration

The standard miner animation is intentionally separated from the mining simulation.

- `miner-animation.js` owns visual state, frame timing, sprite selection, mirroring, and the skin registry.
- `assets/basic-miner-atlas.webp` is the current 24-frame Basic Miner artwork.
- `ore-tuning-patch.js` asks the animation layer to draw a miner and keeps the existing marker as a fallback if art is unavailable.
- The animation layer observes real `mineCell` calls so the impact pose lines up with actual block damage.
- Golden Key discovery triggers the celebration animation without changing key/reward logic.
- `viewport-fit.js` late-loads the animation module, keeping the page bootstrap and mobile layout independent.

Future artwork can be swapped through `SkeletonMinerArt` without changing mining radius, target selection, mining speed/power, crew limits, ore rewards, save data, or level generation.
