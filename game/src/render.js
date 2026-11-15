// Everything Hivelight looks like: the sky from dawn to dusk, the meadow,
// the tree and hive, the blooms, the bee and the wasps, the HUD, and the
// title, pause, victory and defeat screens. Pure canvas 2D, all drawn in
// code. This module reads the game; it never changes it.

import { BEE, HIVE, RUN, VIEW } from './config.js';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

// Sky and meadow colours at dawn, mid-afternoon and dusk, blended by the
// day's progress so the light itself tells the player the time.
const SKY_STOPS = [
  { at: 0, top: [110, 176, 235], horizon: [205, 236, 250], meadow: [116, 196, 96], hill: [88, 168, 92] },
  { at: 0.55, top: [84, 148, 219], horizon: [250, 226, 170], meadow: [102, 178, 84], hill: [74, 148, 80] },
  { at: 1, top: [46, 44, 92], horizon: [255, 138, 92], meadow: [52, 102, 66], hill: [38, 82, 60] },
];

function blendChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function skyAt(progress) {
  let from = SKY_STOPS[0];
  let to = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i += 1) {
    if (progress >= SKY_STOPS[i].at && progress <= SKY_STOPS[i + 1].at) {
      from = SKY_STOPS[i];
      to = SKY_STOPS[i + 1];
      break;
    }
  }
  const span = to.at - from.at || 1;
  const t = Math.min(1, Math.max(0, (progress - from.at) / span));
  const mix = (key) => from[key].map((v, i) => blendChannel(v, to[key][i], t));
  return {
    top: `rgb(${mix('top').join(',')})`,
    horizon: `rgb(${mix('horizon').join(',')})`,
    meadow: `rgb(${mix('meadow').join(',')})`,
    hill: `rgb(${mix('hill').join(',')})`,
  };
}

export class Renderer {
  constructor(context) {
    this.ctx = context;
  }

  draw(game) {
    const { ctx } = this;
    ctx.save();
    if (game.shake > 0) {
      const kick = game.shake * 11;
      ctx.translate(Math.sin(game.time * 91) * kick, Math.cos(game.time * 83) * kick * 0.7);
    }
    this.drawScene(game);
    ctx.restore();

    if (game.state !== 'title') this.drawHud(game);
    if (game.state === 'title') this.drawTitle(game);
    if (game.paused && game.state === 'playing') this.drawPause(game);
    if (game.state === 'won') this.drawEnd(game, true);
    if (game.state === 'lost') this.drawEnd(game, false);
  }

  // ---- the world -------------------------------------------------------

  drawScene(game) {
    const { ctx } = this;
    const world = game.world;
    const progress = game.dayProgress();
    const sky = skyAt(progress);

    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    gradient.addColorStop(0, sky.top);
    gradient.addColorStop(0.45, sky.horizon);
    gradient.addColorStop(0.46, sky.meadow);
    gradient.addColorStop(1, sky.meadow);
    ctx.fillStyle = gradient;
    ctx.fillRect(-20, -20, VIEW.width + 40, VIEW.height + 40);

    this.drawSun(game, progress);
    this.drawClouds(game);
    this.drawHills(game, sky);

    for (const tuft of world.tufts) this.drawTuft(game, tuft);
    for (const flower of world.flowers) this.drawFlower(game, flower);
    this.drawTreeAndHive(game);
    for (const mote of game.motes) this.drawMote(game, mote);
    for (const wasp of game.wasps) this.drawWasp(game, wasp);
    this.drawBee(game);
    this.drawParticles(game);
  }

  drawSun(game, progress) {
    const { ctx } = this;
    const x = 150 + progress * (VIEW.width - 300);
    const y = 168 - Math.sin(Math.PI * Math.min(1, progress * 1.08)) * 96 + progress * 128;
    const glow = ctx.createRadialGradient(x, y, 6, x, y, 120);
    glow.addColorStop(0, 'rgba(255, 236, 170, 0.85)');
    glow.addColorStop(0.35, 'rgba(255, 205, 110, 0.35)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 120, y - 120, 240, 240);
    ctx.fillStyle = progress > 0.75 ? '#ffab52' : '#ffd94d';
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  drawClouds(game) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    for (const cloud of game.world.clouds) {
      const { x, y, scale } = cloud;
      ctx.beginPath();
      ctx.ellipse(x, y, 52 * scale, 17 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 30 * scale, y + 5 * scale, 32 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 32 * scale, y + 5 * scale, 34 * scale, 13 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHills(game, sky) {
    const { ctx } = this;
    ctx.fillStyle = sky.hill;
    for (const hill of game.world.hills) {
      ctx.beginPath();
      ctx.arc(hill.x, 356 - hill.lift, hill.r, Math.PI, 0);
      ctx.fill();
    }
  }

  drawTuft(game, tuft) {
    const { ctx } = this;
    ctx.strokeStyle = tuft.shade > 0.5 ? 'rgba(30, 92, 40, 0.55)' : 'rgba(140, 220, 120, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < tuft.blades; i += 1) {
      const lean = tuft.lean + (i - tuft.blades / 2) * 3;
      ctx.moveTo(tuft.x + i * 3 - 4, tuft.y);
      ctx.quadraticCurveTo(tuft.x + lean, tuft.y - 8, tuft.x + lean * 1.7, tuft.y - 13);
    }
    ctx.stroke();
  }

  drawFlower(game, flower) {
    const { ctx } = this;
    const sway = Math.sin(game.time * flower.swaySpeed + flower.swayPhase) * 3;
    const headX = flower.x + (flower.stemBend + sway) * 0.4;
    const headY = flower.y - 46 * flower.size;
    const ready = Math.floor(flower.units + 1e-6) > 0;

    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 3.4 * flower.size;
    ctx.beginPath();
    ctx.moveTo(flower.x, flower.y);
    ctx.quadraticCurveTo(flower.x + flower.stemBend * 0.2, flower.y - 24 * flower.size, headX, headY);
    ctx.stroke();
    // One leaf halfway up the stem.
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(flower.x + 5, flower.y - 18 * flower.size, 8 * flower.size, 3.6 * flower.size, -0.6, 0, Math.PI * 2);
    ctx.fill();

    if (ready) {
      const pulse = 15 + Math.sin(game.time * 3 + flower.swayPhase) * 2.5;
      const glow = ctx.createRadialGradient(headX, headY, 2, headX, headY, pulse + 12);
      glow.addColorStop(0, flower.golden ? 'rgba(255, 216, 61, 0.55)' : 'rgba(255, 255, 255, 0.4)');
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(headX - pulse - 12, headY - pulse - 12, (pulse + 12) * 2, (pulse + 12) * 2);
    }

    const petalCount = flower.golden ? 8 : 6;
    const petalReach = (flower.golden ? 13 : 11) * flower.size;
    ctx.fillStyle = flower.petal;
    for (let i = 0; i < petalCount; i += 1) {
      const angle = (i / petalCount) * Math.PI * 2 + flower.swayPhase;
      ctx.beginPath();
      ctx.ellipse(
        headX + Math.cos(angle) * petalReach * 0.72,
        headY + Math.sin(angle) * petalReach * 0.72,
        petalReach * 0.62,
        petalReach * 0.4,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = flower.golden ? '#fff3b0' : '#ffe082';
    ctx.beginPath();
    ctx.arc(headX, headY, 6.4 * flower.size, 0, Math.PI * 2);
    ctx.fill();

    // The nectar ring: how much of this bloom is ready to gather.
    const fill = flower.units / flower.maxUnits;
    if (fill > 0.02) {
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.95)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(headX, headY, petalReach + 5, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
      ctx.stroke();
    }
  }

  drawTreeAndHive(game) {
    const { ctx } = this;
    const world = game.world;
    const hive = world.hive;
    const tree = world.tree;

    // Trunk and the branch the hive hangs from.
    ctx.strokeStyle = '#6d4c41';
    ctx.lineCap = 'round';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(tree.x, tree.baseY);
    ctx.quadraticCurveTo(tree.x - 12, 430, tree.x + 2, 250);
    ctx.stroke();
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(tree.x + 2, 262);
    ctx.quadraticCurveTo(tree.x + 30, 190, hive.x + 6, 128);
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(tree.x, 330);
    ctx.quadraticCurveTo(tree.x - 52, 290, tree.x - 78, 238);
    ctx.stroke();

    // Leafy crown.
    const leafSpots = [
      [tree.x - 66, 218, 44], [tree.x - 16, 196, 52], [tree.x + 40, 210, 42],
      [tree.x - 40, 258, 40], [tree.x + 16, 252, 44], [tree.x - 92, 262, 30],
    ];
    for (const [x, y, r] of leafSpots) {
      ctx.fillStyle = 'rgba(46, 125, 50, 0.92)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // The hive's glow grows with the honey inside it.
    const fullness = game.honey / RUN.honeyQuota;
    if (fullness > 0.03) {
      const glow = ctx.createRadialGradient(hive.x, hive.y, 8, hive.x, hive.y, 96);
      glow.addColorStop(0, `rgba(255, 200, 60, ${0.5 * fullness})`);
      glow.addColorStop(1, 'rgba(255, 200, 60, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(hive.x - 96, hive.y - 96, 192, 192);
    }

    // Rope and skep: stacked bands of woven gold.
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hive.x + 4, 124);
    ctx.lineTo(hive.x, hive.y - 34);
    ctx.stroke();
    const bands = [
      [26, -30], [36, -18], [41, -4], [41, 10], [36, 23], [26, 33],
    ];
    bands.forEach(([halfWidth, dy], i) => {
      ctx.fillStyle = i % 2 === 0 ? '#e8a93d' : '#d9932c';
      ctx.beginPath();
      ctx.ellipse(hive.x, hive.y + dy, halfWidth, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.ellipse(hive.x, hive.y + 16, 8, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // A soft ring shows where a laden bee must fly to bank her nectar.
    if (game.state === 'playing' && game.carry > 0) {
      ctx.strokeStyle = `rgba(255, 235, 160, ${0.35 + Math.sin(game.time * 4) * 0.15})`;
      ctx.lineWidth = 2.4;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.arc(hive.x, hive.y, HIVE.depositRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawMote(game, mote) {
    const { ctx } = this;
    let alpha = 1;
    if (mote.settled && mote.lifeLeft < 3) alpha = Math.max(0, mote.lifeLeft / 3);
    ctx.fillStyle = `rgba(255, 200, 40, ${alpha})`;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 246, 200, ${alpha})`;
    ctx.beginPath();
    ctx.arc(mote.x - 2, mote.y - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParticles(game) {
    const { ctx } = this;
    for (const p of game.particles.list) {
      const alpha = Math.max(0, p.lifeLeft / p.life);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawBee(game) {
    const { ctx } = this;
    const bee = game.bee;
    // A stung bee blinks while her grace lasts.
    if (bee.graceLeft > 0 && game.state === 'playing' && Math.sin(game.time * 26) > 0.2) {
      ctx.globalAlpha = 0.35;
    }
    ctx.save();
    ctx.translate(bee.x, bee.y + Math.sin(game.time * 6.2) * 1.6);
    ctx.scale(bee.facing, 1);

    // Wing, behind the body, flapping on its phase.
    const flap = Math.sin(bee.wingPhase) * 0.55;
    ctx.save();
    ctx.translate(-2, -11);
    ctx.rotate(-0.7 + flap);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.ellipse(7, 0, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body with its stripes.
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 12.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2e20';
    ctx.fillRect(-6.5, -11.4, 5.4, 22.8);
    ctx.fillRect(3.4, -12.2, 5.4, 24.4);
    // Head and eye.
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.arc(15, -2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#26221c';
    ctx.beginPath();
    ctx.arc(17.6, -3.6, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Stinger.
    ctx.fillStyle = '#3a2e20';
    ctx.beginPath();
    ctx.moveTo(-17, -1.6);
    ctx.lineTo(-23.5, 0.6);
    ctx.lineTo(-17, 2.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Carried nectar rides above her as gold beads.
    for (let i = 0; i < game.carry; i += 1) {
      const bx = bee.x + (i - (game.carry - 1) / 2) * 11;
      const by = bee.y - 27 + Math.sin(game.time * 5 + i) * 1.6;
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(bx, by, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(bx - 1.4, by - 1.4, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawWasp(game, wasp) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(wasp.x, wasp.y + Math.sin(game.time * 7.7 + wasp.wobble) * 1.8);
    ctx.scale(wasp.facing, 1);

    const flap = Math.sin(wasp.wingPhase) * 0.6;
    ctx.save();
    ctx.translate(-2, -12);
    ctx.rotate(-0.8 + flap);
    ctx.fillStyle = 'rgba(230, 240, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(8, 0, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#8d6e00';
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(-8, -10.8, 5.6, 21.6);
    ctx.fillRect(2.6, -11.8, 5.6, 23.6);
    ctx.fillStyle = '#6d4c00';
    ctx.beginPath();
    ctx.arc(16, -2, 8.6, 0, Math.PI * 2);
    ctx.fill();
    // Red eyes and an angry brow: this one is not here for the flowers.
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(18.6, -4.4, 2.6, 0, Math.PI * 2);
    ctx.arc(13.4, -4.8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b2118';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(11, -9.6);
    ctx.lineTo(20, -7.4);
    ctx.stroke();
    // A longer, crueller stinger.
    ctx.fillStyle = '#2b2118';
    ctx.beginPath();
    ctx.moveTo(-19, -1.8);
    ctx.lineTo(-28, 0.8);
    ctx.lineTo(-19, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ---- the HUD ---------------------------------------------------------

  drawHud(game) {
    const { ctx } = this;
    // Honey progress, top left.
    this.panel(18, 16, 300, 62, 0.42);
    ctx.fillStyle = '#fff8e1';
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`HONEY  ${game.honey} / ${RUN.honeyQuota}`, 34, 40);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    this.roundRect(34, 50, 268, 13, 6.5);
    ctx.fill();
    ctx.fillStyle = '#ffb300';
    const honeyFill = Math.min(1, game.honey / RUN.honeyQuota);
    if (honeyFill > 0) {
      this.roundRect(34, 50, 268 * honeyFill, 13, 6.5);
      ctx.fill();
    }

    // The sun's road across the top centre: daylight left, made visible.
    this.panel(490, 16, 300, 62, 0.42);
    ctx.fillStyle = '#fff8e1';
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'center';
    const secondsLeft = Math.max(0, Math.ceil(game.timeLeft));
    const label = game.state === 'playing'
      ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')} TO DUSK`
      : 'DAY DONE';
    ctx.fillText(label, 640, 40);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(514, 57);
    ctx.lineTo(766, 57);
    ctx.stroke();
    const sunX = 514 + game.dayProgress() * 252;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(sunX, 57, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hearts and score, top right.
    this.panel(962, 16, 300, 62, 0.42);
    for (let i = 0; i < RUN.hearts; i += 1) {
      this.drawHeart(986 + i * 30, 38, 10, i < game.hearts);
    }
    ctx.fillStyle = '#fff8e1';
    ctx.font = `700 17px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE ${game.score}`, 1246, 44);
    ctx.font = `600 12.5px ${FONT}`;
    ctx.fillStyle = 'rgba(255, 248, 225, 0.75)';
    ctx.fillText(`BEST ${game.best}`, 1246, 66);

    // Carried nectar, under the honey bar.
    ctx.font = `600 12.5px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(38, 34, 28, 0.72)';
    ctx.fillText('CARRYING', 34, 100);
    for (let i = 0; i < BEE.carryCapacity; i += 1) {
      ctx.beginPath();
      ctx.arc(112 + i * 19, 96, 6.4, 0, Math.PI * 2);
      if (i < game.carry) {
        ctx.fillStyle = '#ffb300';
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(38, 34, 28, 0.5)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
    // The dash cooldown, named so a player learns its rhythm at a glance.
    const dashReady = game.bee.dashCooldown <= 0;
    ctx.fillStyle = 'rgba(38, 34, 28, 0.72)';
    ctx.fillText(dashReady ? 'DASH READY' : 'DASH …', 34, 122);

    if (game.notice && game.noticeLeft > 0 && game.state === 'playing') {
      const alpha = Math.min(1, game.noticeLeft / 0.5);
      ctx.globalAlpha = alpha;
      ctx.font = `700 19px ${FONT}`;
      const width = ctx.measureText(game.notice).width + 44;
      this.panel(640 - width / 2, 96, width, 40, 0.55);
      ctx.fillStyle = '#fff8e1';
      ctx.textAlign = 'center';
      ctx.fillText(game.notice, 640, 123);
      ctx.globalAlpha = 1;
    }
  }

  drawHeart(x, y, size, filled) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.9);
    ctx.bezierCurveTo(x - size * 1.25, y - size * 0.15, x - size * 0.55, y - size * 1.15, x, y - size * 0.35);
    ctx.bezierCurveTo(x + size * 0.55, y - size * 1.15, x + size * 1.25, y - size * 0.15, x, y + size * 0.9);
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = '#ef5350';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  // ---- screens ---------------------------------------------------------

  drawTitle(game) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(24, 32, 20, 0.24)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(38, 30, 10, 0.35)';
    ctx.font = `800 118px ${FONT}`;
    ctx.fillText('HIVELIGHT', 644, 208);
    ctx.fillStyle = '#fff3b0';
    ctx.fillText('HIVELIGHT', 640, 202);
    ctx.font = `600 25px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('One bee. One meadow. One day to fill the hive.', 640, 252);

    this.panel(340, 292, 600, 218, 0.62);
    ctx.fillStyle = '#fff8e1';
    ctx.font = `600 20px ${FONT}`;
    const lines = [
      'Gather nectar from the glowing blooms,',
      'bank it in the hive, and reach 100 honey before dusk.',
      'Wasps hunt you: three stings end the day.',
      '',
      'WASD / arrows or hold the mouse — fly',
      'Space or click — dash      P — pause      M — sound',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 640, 338 + i * 30));

    const pulse = 0.72 + Math.sin(game.time * 3.4) * 0.28;
    ctx.globalAlpha = pulse;
    ctx.font = `800 27px ${FONT}`;
    ctx.fillStyle = '#ffd94d';
    ctx.fillText('PRESS ENTER OR CLICK TO START THE DAY', 640, 572);
    ctx.globalAlpha = 1;

    if (game.best > 0) {
      ctx.font = `700 18px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`BEST SCORE  ${game.best}`, 640, 622);
    }
  }

  drawPause(game) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(16, 20, 14, 0.5)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff8e1';
    ctx.font = `800 54px ${FONT}`;
    ctx.fillText('PAUSED', 640, 340);
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText('P to fly again · M for sound', 640, 384);
  }

  drawEnd(game, won) {
    const { ctx } = this;
    ctx.fillStyle = won ? 'rgba(30, 26, 8, 0.42)' : 'rgba(14, 12, 24, 0.52)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    ctx.textAlign = 'center';
    ctx.font = `800 56px ${FONT}`;
    ctx.fillStyle = won ? '#ffd94d' : '#ef9a9a';
    const title = won
      ? 'THE HIVE GLOWS TONIGHT'
      : game.lostReason === 'stung'
        ? 'STUNG OUT OF THE SKY'
        : 'DUSK FELL ON A HUNGRY HIVE';
    ctx.fillText(title, 640, 218);

    ctx.font = `600 21px ${FONT}`;
    ctx.fillStyle = '#fff8e1';
    const story = won
      ? `The quota is met with ${Math.max(0, Math.ceil(game.timeLeft))} seconds of daylight to spare.`
      : game.lostReason === 'stung'
        ? 'Three stings are all a small bee can take.'
        : `The hive needed ${RUN.honeyQuota - game.honey} more honey when the light went.`;
    ctx.fillText(story, 640, 264);

    ctx.font = `600 20px ${FONT}`;
    const rows = [
      ['Honey banked', `${game.honey} / ${RUN.honeyQuota}`],
      ['Blooms gathered', `${game.stats.gathered}`],
      ['Trips home', `${game.stats.trips}`],
      ['Stings taken', `${game.stats.stings}`],
    ];
    if (won) rows.push(['Daylight bonus', `+${game.finalBonus}`]);
    rows.push(['SCORE', `${game.score}`]);
    const newBest = game.score >= game.best && game.score > 0;
    // The panel grows with its rows, and with the new-best line when the
    // day earned one, so no text ever sits on another.
    const panelHeight = rows.length * 31 + (newBest ? 76 : 44);
    this.panel(430, 292, 420, panelHeight, 0.6);
    rows.forEach(([label, value], i) => {
      const y = 332 + i * 31;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 248, 225, 0.85)';
      ctx.fillText(label, 462, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(value, 818, y);
    });
    ctx.textAlign = 'center';

    if (newBest) {
      ctx.font = `800 20px ${FONT}`;
      ctx.fillStyle = '#ffd94d';
      ctx.fillText('A NEW BEST DAY', 640, 292 + rows.length * 31 + 52);
    }

    const pulse = 0.72 + Math.sin(game.time * 3.4) * 0.28;
    ctx.globalAlpha = pulse;
    ctx.font = `800 26px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESS R TO PLAY ANOTHER DAY', 640, 592);
    ctx.globalAlpha = 1;
  }

  // ---- small helpers ---------------------------------------------------

  panel(x, y, width, height, alpha) {
    const { ctx } = this;
    ctx.fillStyle = `rgba(24, 26, 18, ${alpha})`;
    this.roundRect(x, y, width, height, 14);
    ctx.fill();
  }

  roundRect(x, y, width, height, radius) {
    const { ctx } = this;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
