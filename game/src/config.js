// Hivelight tuning: every number that shapes a run lives here so the rest of
// the code reads as rules, not constants.

export const VIEW = {
  width: 1280,
  height: 720,
};

export const RUN = {
  // Seconds from dawn to dusk. The run ends when the sun does.
  daySeconds: 150,
  // Honey that fills the hive and wins the day.
  honeyQuota: 100,
  // Stings the bee can take before the day is lost.
  hearts: 3,
  // Score paid per unit of honey banked in the hive.
  scorePerHoney: 10,
  // Score paid per second of daylight left when the quota is met.
  duskBonusPerSecond: 5,
};

export const BEE = {
  radius: 15,
  // Horizontal and vertical acceleration in px/s^2 while a direction is held.
  thrust: 1500,
  // Top speed in px/s under its own power.
  cruiseSpeed: 265,
  // Fraction of velocity kept per second when no direction is held.
  dragPerSecond: 2.4,
  // Nectar units the bee can carry before it must fly home.
  carryCapacity: 5,
  // Dash: a short burst, then a cooldown before the next.
  dashSeconds: 0.24,
  dashSpeedMultiplier: 2.15,
  dashCooldownSeconds: 1.5,
  // Grace period after a sting during which no second sting can land.
  stingGraceSeconds: 2,
};

export const WASP = {
  radius: 16,
  // Wasps are a touch slower than a cruising bee but turn tighter.
  chaseSpeed: 238,
  thrust: 1150,
  dragPerSecond: 1.6,
  // Seconds a wasp hunts before it gives up and leaves the meadow.
  huntSeconds: 16,
  // First wasp arrives this late; the gap then shrinks toward the floor.
  firstSpawnSeconds: 6,
  spawnGapStart: 6.5,
  spawnGapFloor: 2.3,
  spawnGapShrinkPerSecond: 0.03,
};

export const FLOWER = {
  count: 26,
  // Seconds for a picked flower to refill one unit of nectar.
  regrowSeconds: 9,
  // Golden flowers hold triple nectar and glow; a few grow each day.
  goldenCount: 4,
  goldenNectar: 3,
  // The bee gathers by passing this close to a bloom's head.
  gatherRadius: 34,
};

export const HIVE = {
  x: 128,
  y: 168,
  radius: 44,
  // Flying this close with a full load banks the nectar.
  depositRadius: 52,
};

export const WORLD = {
  // The meadow the bee may roam: below the sky band, inside the hedges.
  minX: 34,
  maxX: 1246,
  minY: 96,
  maxY: 686,
  groundLine: 640,
};
