# Skeleton Mining CO.

Early gameplay prototype for a timed incremental mining strategy game.

## Prototype goal

Test whether the core loop is fun before investing in animation, art, or a large progression system.

## Current loop

1. Place standard skeleton miners on the mine.
2. Each skeleton automatically mines only inside its visible circular radius.
3. Start the timed shift and watch the mine get uncovered.
4. Find the randomized Golden Key to unlock the next level.
5. Keep all gold found, even when the timer expires.
6. Spend gold on permanent radius, mining speed, crew size, and timer upgrades.
7. Reach Level 3 to unlock the Gold Digger, which roams the entire mine looking for gold ore.

The Golden Key is randomized on every new attempt so level layouts remain replayable.

## Running locally

Open `index.html` in a modern browser. No build tools or dependencies are required.
