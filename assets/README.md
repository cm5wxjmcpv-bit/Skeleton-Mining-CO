# Miner art assets

`basic-miner-atlas.webp` is the current Basic Miner animation atlas.

The animation renderer and frame mapping live in `miner-animation.js`. Mining rules do not depend on this asset. A future skin can be registered through `window.SkeletonMinerArt.registerSkin(...)` and assigned globally or by miner type without changing save data, radius logic, target selection, mining power, or reward logic.

Current atlas layout: 6 columns × 4 rows, 192 × 192 pixels per frame, 24 frames total.
