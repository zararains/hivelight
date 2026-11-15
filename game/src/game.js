// Hivelight's rules and state machine. A day runs from dawn to dusk: gather
// nectar from the blooms, bank it in the hive, and reach the quota before
// dark or before the wasps sting the bee out of the sky. This module owns
// the run's state; world.js owns the place, entities.js the creatures, and
// render.js only ever reads what is here.

import { BEE, FLOWER, HIVE, RUN, WASP } from './config.js';
import {
  createBee,
  createMote,
  createParticles,
  createWasp,
  spawnParticle,
  steer,
  updateParticles,
} from './entities.js';
import { createWorld, updateWorld } from './world.js';

const BEST_KEY = 'hivelight-best-score';

function loadBest() {
  try {
    const value = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch (error) {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch (error) {
    // A private window may refuse storage; the day still counts.
  }
}

export class Game {
  constructor(rng) {
    this.rng = rng;
    this.best = loadBest();
    this.soundOn = true;
    this.resetRun();
    this.state = 'title'; // 'title' | 'playing' | 'won' | 'lost'
  }

  // A fresh garden and a fresh day. Called for the title backdrop, at every
  // start, and at every restart, so no run inherits another's wasps.
  resetRun() {
    this.world = createWorld(this.rng);
    this.bee = createBee(this.world.hive.x + 64, this.world.hive.y + 36);
    this.wasps = [];
    this.motes = [];
    this.particles = createParticles();
    this.time = 0;
    this.elapsed = 0;
    this.timeLeft = RUN.daySeconds;
    this.honey = 0;
    this.score = 0;
    this.carry = 0;
    this.hearts = RUN.hearts;
    this.spawnIn = WASP.firstSpawnSeconds;
    this.shake = 0;
    this.notice = null;
    this.noticeLeft = 0;
    this.fullBuzzIn = 0;
    this.lostReason = null;
    this.finalBonus = 0;
    this.paused = false;
    this.stats = { trips: 0, stings: 0, gathered: 0 };
  }

  startRun() {
    this.resetRun();
    this.state = 'playing';
    this.say('Fill the hive before dusk!', 2.6);
  }

  togglePause() {
    if (this.state === 'playing') this.paused = !this.paused;
    return this.paused;
  }

  say(text, seconds) {
    this.notice = text;
    this.noticeLeft = seconds;
  }

  dayProgress() {
    return 1 - Math.max(0, this.timeLeft) / RUN.daySeconds;
  }

  update(dt, input, sound) {
    this.time += dt;
    updateWorld(this.world, dt, this.time);
    updateParticles(this.particles, dt);
    if (this.noticeLeft > 0) this.noticeLeft -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.4);
    if (this.fullBuzzIn > 0) this.fullBuzzIn -= dt;

    if (this.state === 'title') {
      // The bee idles by the hive, waiting for the day to be started.
      const bee = this.bee;
      bee.x = this.world.hive.x + 62 + Math.sin(this.time * 0.9) * 12;
      bee.y = this.world.hive.y + 40 + Math.sin(this.time * 1.7) * 7;
      bee.wingPhase += dt * 15;
      return;
    }
    if (this.state !== 'playing' || this.paused) return;

    this.elapsed += dt;
    this.timeLeft -= dt;
    this.updateBee(dt, input, sound);
    this.updateGathering(dt, sound);
    this.updateMotes(dt, sound);
    this.updateDeposit(sound);
    this.updateWasps(dt, sound);

    if (this.state === 'playing' && this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.lose('dusk', sound);
    }
  }

  updateBee(dt, input, sound) {
    const bee = this.bee;
    let wishX = input ? input.axisX() : 0;
    let wishY = input ? input.axisY() : 0;

    // With no key held, a pressed pointer steers: the bee flies to the hand.
    if (wishX === 0 && wishY === 0 && input && input.pointer.down) {
      const dx = input.pointer.x - bee.x;
      const dy = input.pointer.y - bee.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 10) {
        wishX = dx / distance;
        wishY = dy / distance;
      }
    }

    const dashPressed = input
      && (input.wasPressed('Space')
        || input.wasPressed('ShiftLeft')
        || input.wasPressed('ShiftRight')
        || input.takeClick());
    if (dashPressed && bee.dashCooldown <= 0 && bee.dashLeft <= 0) {
      bee.dashLeft = BEE.dashSeconds;
      bee.dashCooldown = BEE.dashCooldownSeconds;
      if (sound) sound.dash();
      this.burst(bee.x, bee.y, 6, '#ffffff', 60, 0.3);
    }

    const dashing = bee.dashLeft > 0;
    const topSpeed = BEE.cruiseSpeed * (dashing ? BEE.dashSpeedMultiplier : 1);
    steer(bee, wishX, wishY, BEE.thrust, topSpeed, BEE.dragPerSecond, dt);
    if (bee.dashLeft > 0) bee.dashLeft -= dt;
    if (bee.dashCooldown > 0) bee.dashCooldown -= dt;
    if (bee.graceLeft > 0) bee.graceLeft -= dt;
  }

  updateGathering(dt, sound) {
    const bee = this.bee;
    for (const flower of this.world.flowers) {
      const headX = flower.x + flower.stemBend * 0.4;
      const headY = flower.y - 46 * flower.size;
      const distance = Math.hypot(bee.x - headX, bee.y - headY);
      if (distance > FLOWER.gatherRadius) continue;
      const ready = Math.floor(flower.units + 1e-6);
      if (ready <= 0) continue;
      if (this.carry >= BEE.carryCapacity) {
        if (this.fullBuzzIn <= 0 && sound) {
          sound.full();
          this.fullBuzzIn = 1.2;
          this.say('Baskets full — bank it in the hive!', 1.4);
        }
        continue;
      }
      const taken = Math.min(ready, BEE.carryCapacity - this.carry);
      flower.units -= taken;
      this.carry += taken;
      this.stats.gathered += taken;
      if (sound) sound.pickup(flower.golden);
      this.burst(headX, headY, flower.golden ? 12 : 7, flower.petal, 80, 0.45);
      if (this.carry >= BEE.carryCapacity) {
        this.say('Baskets full — bank it in the hive!', 1.6);
      }
    }
  }

  updateMotes(dt, sound) {
    const bee = this.bee;
    for (let i = this.motes.length - 1; i >= 0; i -= 1) {
      const mote = this.motes[i];
      if (!mote.settled) {
        mote.vy += 520 * dt;
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        if (mote.y >= mote.floorY) {
          mote.y = mote.floorY;
          mote.settled = true;
        }
      } else {
        mote.lifeLeft -= dt;
        if (mote.lifeLeft <= 0) {
          this.motes.splice(i, 1);
          continue;
        }
      }
      const distance = Math.hypot(bee.x - mote.x, bee.y - mote.y);
      if (distance < 30 && this.carry < BEE.carryCapacity) {
        this.motes.splice(i, 1);
        this.carry += 1;
        this.stats.gathered += 1;
        if (sound) sound.pickup(false);
        this.burst(mote.x, mote.y, 5, '#ffd83d', 60, 0.3);
      }
    }
  }

  updateDeposit(sound) {
    if (this.carry <= 0) return;
    const hive = this.world.hive;
    const distance = Math.hypot(this.bee.x - hive.x, this.bee.y - hive.y);
    if (distance > HIVE.depositRadius) return;
    const banked = this.carry;
    this.carry = 0;
    this.honey += banked;
    this.score += banked * RUN.scorePerHoney;
    this.stats.trips += 1;
    if (sound) sound.deposit(banked);
    this.burst(hive.x, hive.y, 10 + banked * 2, '#ffd83d', 90, 0.5);
    if (this.honey >= RUN.honeyQuota) {
      this.win(sound);
    } else if (this.honey >= RUN.honeyQuota - 20 && this.stats.trips > 1) {
      this.say('Nearly there — the hive is almost full!', 1.8);
    }
  }

  updateWasps(dt, sound) {
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnWasp();
      const gap = Math.max(
        WASP.spawnGapFloor,
        WASP.spawnGapStart - this.elapsed * WASP.spawnGapShrinkPerSecond,
      );
      this.spawnIn = gap * this.rng.range(0.85, 1.2);
    }

    const bee = this.bee;
    for (let i = this.wasps.length - 1; i >= 0; i -= 1) {
      const wasp = this.wasps[i];
      if (wasp.leaving) {
        wasp.x += wasp.vx * dt;
        wasp.y += (wasp.vy - 40) * dt;
        wasp.wingPhase += dt * 18;
        if (wasp.x < -70 || wasp.x > 1350 || wasp.y < -70) {
          this.wasps.splice(i, 1);
        }
        continue;
      }
      wasp.huntLeft -= dt;
      if (wasp.huntLeft <= 0) {
        this.sendWaspAway(wasp);
        continue;
      }
      const angle = Math.atan2(bee.y - wasp.y, bee.x - wasp.x)
        + Math.sin(this.time * 3.1 + wasp.wobble) * 0.32;
      steer(wasp, Math.cos(angle), Math.sin(angle), WASP.thrust, WASP.chaseSpeed, WASP.dragPerSecond, dt);

      const distance = Math.hypot(bee.x - wasp.x, bee.y - wasp.y);
      if (distance < bee.radius + wasp.radius - 3 && bee.graceLeft <= 0) {
        this.sting(wasp, sound);
        if (this.state !== 'playing') return;
      }
    }
  }

  spawnWasp() {
    const side = this.rng.chance(0.5) ? -30 : 1310;
    const y = this.rng.range(140, 560);
    const wasp = createWasp(side, y, this.rng);
    wasp.vx = side < 0 ? 120 : -120;
    this.wasps.push(wasp);
    if (this.wasps.length === 1) this.say('A wasp has found the meadow!', 2);
  }

  sendWaspAway(wasp) {
    wasp.leaving = true;
    wasp.vx = wasp.x < 640 ? -190 : 190;
    wasp.vy = -30;
  }

  sting(wasp, sound) {
    const bee = this.bee;
    this.hearts -= 1;
    this.stats.stings += 1;
    this.sendWaspAway(wasp);
    bee.graceLeft = BEE.stingGraceSeconds;
    const away = Math.atan2(bee.y - wasp.y, bee.x - wasp.x);
    bee.vx = Math.cos(away) * 430;
    bee.vy = Math.sin(away) * 430;
    for (let i = 0; i < this.carry; i += 1) {
      const mote = createMote(bee.x, bee.y, this.rng);
      mote.floorY = this.rng.range(600, 678);
      this.motes.push(mote);
    }
    this.carry = 0;
    this.shake = 0.45;
    if (sound) sound.sting();
    this.burst(bee.x, bee.y, 16, '#e5484d', 130, 0.5);
    if (this.hearts <= 0) {
      this.lose('stung', sound);
    } else {
      this.say('Stung! Your nectar scattered.', 2);
    }
  }

  win(sound) {
    this.state = 'won';
    this.finalBonus = Math.ceil(this.timeLeft) * RUN.duskBonusPerSecond;
    this.score += this.finalBonus;
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
    }
    if (sound) sound.win();
  }

  lose(reason, sound) {
    this.state = 'lost';
    this.lostReason = reason;
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
    }
    if (sound) sound.lose();
  }

  burst(x, y, count, color, speed, life) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng.range(0, Math.PI * 2);
      const velocity = this.rng.range(speed * 0.3, speed);
      spawnParticle(this.particles, {
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 30,
        life: life * this.rng.range(0.6, 1.15),
        size: this.rng.range(2, 4.6),
        color,
        gravity: 130,
      });
    }
  }
}
