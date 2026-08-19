// Example only: register future miner artwork without changing mining mechanics.
// Copy this object into a late-loaded skin file and change the art/frame mapping.
//
// SkeletonMinerArt.registerSkin('new-skin-id', {
//   id: 'new-skin-id',
//   src: 'assets/new-miner-atlas.webp',
//   frameWidth: 192,
//   frameHeight: 192,
//   columns: 6,
//   scale: 1.46,
//   timing: {
//     idleMs: 150,
//     placementFrameMs: 130,
//     impactHoldMs: 115,
//     celebrationFrameMs: 105,
//     celebrationDurationMs: 650
//   },
//   animations: {
//     idle: [0, 1, 2, 3, 2, 1],
//     walk: [4, 5, 6, 7],
//     swings: [
//       { windup: 8, impact: 9, recovery: 10 },
//       { windup: 11, impact: 12, recovery: 13 },
//       { windup: 14, impact: 15, recovery: 16 }
//     ],
//     recoil: [17, 18],
//     celebrate: [19, 20, 21],
//     rest: [22, 23]
//   }
// });
// SkeletonMinerArt.setTypeSkin('basic', 'new-skin-id');
