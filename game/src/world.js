// The meadow: one garden, grown from a seed. This module decides where the
// tree and hive stand, where every flower grows and what colour it blooms,
// and how nectar refills over the day. It holds no game rules; it is the
// place the rules happen in.

import { FLOWER, HIVE, WORLD } from './config.js';

const PETAL_COLORS = ['#ff5d8f', '#ffb340', '#b388ff', '#ff7a59', '#4fc3f7', '#f06292'];
const GOLDEN_PETAL = '#ffd83d';

function growFlower(rng, x, y, golden) {
  const maxUnits = golden ? FLOWER.goldenNectar : 1;
  return {
    x,
    y,
    golden,
    petal: golden ? GOLDEN_PETAL : rng.pick(PETAL_COLORS),
    // Nectar is counted in units: one for a common bloom, three for a
    // golden one. The day starts with most blooms at least half grown.
    maxUnits,
    units: maxUnits * rng.range(0.55, 1),
    swayPhase: rng.range(0, Math.PI * 2),
    swaySpeed: rng.range(0.7, 1.3),
    stemBend: rng.range(-9, 9),
    size: rng.range(0.85, 1.2),
  };
}

export function createWorld(rng) {
  const flowers = [];
  const goldenSlots = new Set();
  while (goldenSlots.size < FLOWER.goldenCount) {
    goldenSlots.add(rng.int(0, FLOWER.count - 1));
  }

  // Scatter the blooms over the meadow floor, kept apart and clear of the
  // hive tree so the bee always has room to land on one.
  let guard = 0;
  while (flowers.length < FLOWER.count && guard < 4000) {
    guard += 1;
    const x = rng.range(WORLD.minX + 26, WORLD.maxX - 26);
    const y = rng.range(300, WORLD.maxY - 14);
    const nearHive = Math.hypot(x - HIVE.x, y - HIVE.y) < 120;
    const crowded = flowers.some((f) => Math.hypot(f.x - x, f.y - y) < 78);
    if (nearHive || crowded) continue;
    flowers.push(growFlower(rng, x, y, goldenSlots.has(flowers.length)));
  }

  const tufts = [];
  for (let i = 0; i < 90; i += 1) {
    tufts.push({
      x: rng.range(WORLD.minX, WORLD.maxX),
      y: rng.range(330, WORLD.maxY),
      blades: rng.int(3, 5),
      lean: rng.range(-4, 4),
      shade: rng.range(0, 1),
    });
  }

  const clouds = [];
  for (let i = 0; i < 6; i += 1) {
    clouds.push({
      x: rng.range(0, 1280),
      y: rng.range(26, 130),
      scale: rng.range(0.6, 1.5),
      speed: rng.range(4, 11),
    });
  }

  const hills = [];
  for (let i = 0; i < 7; i += 1) {
    hills.push({ x: i * 210 - 60, r: rng.range(150, 260), lift: rng.range(0, 26) });
  }

  return {
    flowers,
    tufts,
    clouds,
    hills,
    hive: { x: HIVE.x, y: HIVE.y, radius: HIVE.radius },
    tree: { x: HIVE.x - 6, baseY: WORLD.groundLine + 58 },
  };
}

// Nectar refills one unit per regrow window; clouds drift. Called once per
// fixed step while a run is live, and by the title screen for its backdrop.
export function updateWorld(world, dt, time) {
  const refill = dt / FLOWER.regrowSeconds;
  for (const flower of world.flowers) {
    if (flower.units < flower.maxUnits) {
      flower.units = Math.min(flower.maxUnits, flower.units + refill);
    }
  }
  for (const cloud of world.clouds) {
    cloud.x += cloud.speed * dt;
    if (cloud.x - 90 * cloud.scale > 1280) cloud.x = -90 * cloud.scale;
  }
  return time;
}
