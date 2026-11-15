// Deterministic screenshot scenes. The house takes an entry's pictures from
// the game itself; these scenes place a real run at a chosen moment — a
// fresh title, a laden bee mid-meadow, a dusk chase, a finished harvest —
// with the clock stopped, so the same seed renders the same picture on any
// machine. Nothing here is drawn that the game does not draw in play.

import { RUN } from './config.js';
import { createWasp } from './entities.js';

function placeBee(game, x, y, facing, carry) {
  game.bee.x = x;
  game.bee.y = y;
  game.bee.facing = facing;
  game.bee.wingPhase = 2.2;
  game.carry = carry;
}

function placeWasp(game, x, y, facing) {
  const wasp = createWasp(x, y, game.rng);
  wasp.facing = facing;
  wasp.wingPhase = 3.1;
  game.wasps.push(wasp);
}

// Fills some blooms and empties others so the meadow reads as mid-harvest.
function ripen(game) {
  game.world.flowers.forEach((flower, i) => {
    if (i % 3 === 0) flower.units = flower.maxUnits;
    else if (i % 3 === 1) flower.units = flower.maxUnits * 0.5;
    else flower.units = 0;
  });
}

const SCENES = {
  // The cover: a laden bee crossing the meadow at mid-morning, one wasp
  // closing in, the HUD already telling the day's story.
  meadow(game) {
    game.state = 'playing';
    game.time = 26.4;
    game.elapsed = 26;
    game.timeLeft = RUN.daySeconds - 26;
    game.honey = 34;
    game.score = 340;
    game.best = 520;
    game.hearts = 3;
    game.stats.gathered = 41;
    game.stats.trips = 7;
    ripen(game);
    placeBee(game, 660, 356, 1, 3);
    placeWasp(game, 950, 268, -1);
    game.say('Bank it in the hive before the wasps close in!', 30);
  },

  // The title over its own garden, the bee waiting by the hive.
  title(game) {
    game.state = 'title';
    game.time = 4.2;
    game.best = 520;
    ripen(game);
  },

  // Dusk, one heart left, baskets full, three wasps between the bee and
  // home: the moment the whole game is about.
  dusk(game) {
    game.state = 'playing';
    game.time = 133.7;
    game.elapsed = 134;
    game.timeLeft = RUN.daySeconds - 134;
    game.honey = 88;
    game.score = 880;
    game.best = 940;
    game.hearts = 1;
    game.stats.gathered = 96;
    game.stats.trips = 18;
    game.stats.stings = 2;
    ripen(game);
    placeBee(game, 470, 300, -1, 5);
    placeWasp(game, 640, 238, -1);
    placeWasp(game, 700, 392, -1);
    placeWasp(game, 356, 428, 1);
    game.say('Nearly there — the hive is almost full!', 30);
  },

  // The finished harvest: quota met, daylight to spare, the results of the
  // day and the way back in.
  harvest(game) {
    game.state = 'won';
    game.time = 121.3;
    game.elapsed = 127;
    game.timeLeft = RUN.daySeconds - 127;
    game.honey = 104;
    game.finalBonus = 115;
    game.score = 1155;
    game.best = 1155;
    game.hearts = 2;
    game.stats.gathered = 112;
    game.stats.trips = 21;
    game.stats.stings = 1;
    ripen(game);
    placeBee(game, 268, 336, 1, 0);
  },
};

export function setupShot(game, name) {
  const scene = SCENES[name];
  if (!scene) return false;
  scene(game);
  return true;
}

export const SHOT_NAMES = Object.keys(SCENES);
