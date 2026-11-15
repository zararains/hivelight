// The creatures and the small moving things: the bee, the wasps that hunt
// her, the nectar motes she drops when stung, and the sparkle particles that
// answer every action. Factories and motion only; the rules that spawn,
// sting and score live in game.js.

import { BEE, WASP, WORLD } from './config.js';

export function createBee(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: BEE.radius,
    facing: 1, // 1 flies right, -1 flies left; the body is drawn to match
    wingPhase: 0,
    dashLeft: 0, // seconds of dash remaining
    dashCooldown: 0,
    graceLeft: 0, // seconds of post-sting invulnerability
  };
}

export function createWasp(x, y, rng) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: WASP.radius,
    facing: 1,
    wingPhase: rng.range(0, 6),
    huntLeft: WASP.huntSeconds,
    leaving: false,
    wobble: rng.range(0, Math.PI * 2),
  };
}

// A blob of dropped nectar. It falls, settles on the grass, and waits to be
// gathered again until it soaks away.
export function createMote(x, y, rng) {
  return {
    x,
    y,
    vx: rng.range(-70, 70),
    vy: rng.range(-130, -30),
    settled: false,
    lifeLeft: 20,
  };
}

// One shared particle pool: sparkles, petal puffs and sting bursts are all
// the same small fading circles, reused so a busy frame allocates nothing.
const PARTICLE_MAX = 260;

export function createParticles() {
  return { list: [], spare: [] };
}

export function spawnParticle(pool, props) {
  let particle = pool.spare.pop();
  if (!particle) {
    if (pool.list.length >= PARTICLE_MAX) return;
    particle = {};
  }
  Object.assign(particle, {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0.5,
    lifeLeft: 0.5,
    size: 3,
    color: '#ffffff',
    gravity: 0,
  }, props);
  particle.lifeLeft = particle.life;
  pool.list.push(particle);
}

export function updateParticles(pool, dt) {
  const list = pool.list;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.lifeLeft -= dt;
    if (p.lifeLeft <= 0) {
      list.splice(i, 1);
      pool.spare.push(p);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

// Accelerate a flyer toward a wish direction, cap its speed, drag it when
// coasting, and keep it inside the meadow. Shared by bee and wasps; their
// tuning is what differs.
export function steer(flyer, wishX, wishY, thrust, topSpeed, drag, dt) {
  flyer.vx += wishX * thrust * dt;
  flyer.vy += wishY * thrust * dt;
  if (wishX === 0) flyer.vx -= flyer.vx * Math.min(1, drag * dt);
  if (wishY === 0) flyer.vy -= flyer.vy * Math.min(1, drag * dt);
  const speed = Math.hypot(flyer.vx, flyer.vy);
  if (speed > topSpeed) {
    flyer.vx = (flyer.vx / speed) * topSpeed;
    flyer.vy = (flyer.vy / speed) * topSpeed;
  }
  flyer.x += flyer.vx * dt;
  flyer.y += flyer.vy * dt;
  if (flyer.x < WORLD.minX) { flyer.x = WORLD.minX; flyer.vx = Math.abs(flyer.vx) * 0.4; }
  if (flyer.x > WORLD.maxX) { flyer.x = WORLD.maxX; flyer.vx = -Math.abs(flyer.vx) * 0.4; }
  if (flyer.y < WORLD.minY) { flyer.y = WORLD.minY; flyer.vy = Math.abs(flyer.vy) * 0.4; }
  if (flyer.y > WORLD.maxY) { flyer.y = WORLD.maxY; flyer.vy = -Math.abs(flyer.vy) * 0.4; }
  if (Math.abs(flyer.vx) > 12) flyer.facing = flyer.vx > 0 ? 1 : -1;
  flyer.wingPhase += dt * (14 + speed * 0.05);
}
