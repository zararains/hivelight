// Hivelight's entry point: builds the meadow, the bee and the sound, runs
// the fixed-step loop, and turns the player's gestures into the day's
// beginnings, pauses and restarts. With ?shot=<scene>&seed=<n> in the
// address it instead renders one deterministic scene and reports itself
// ready, which is how the entry's screenshots are taken.

import { SoundBank } from './audio.js';
import { Game } from './game.js';
import { createInput } from './input.js';
import { createRng, DEFAULT_SEED } from './random.js';
import { Renderer } from './render.js';
import { setupShot } from './shots.js';

const STEP = 1 / 60; // the simulation's fixed step, in seconds

function boot() {
  const canvas = document.getElementById('game');
  const context = canvas.getContext('2d');
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed')) || DEFAULT_SEED;
  const shotName = params.get('shot');

  const game = new Game(createRng(seed));
  const renderer = new Renderer(context);
  const sound = new SoundBank();
  const input = createInput(canvas);

  // A handle for the maker's own play-tests: the live game, nothing more.
  window.__hivelight = game;

  if (shotName && setupShot(game, shotName)) {
    renderer.draw(game);
    window.__shotReady = true;
    return;
  }

  let musicStarted = false;
  function beginDay() {
    sound.unlock();
    if (!musicStarted) {
      sound.startMusic();
      musicStarted = true;
    }
    game.startRun();
  }

  function handleGestures() {
    if (game.state === 'title') {
      if (input.wasPressed('Enter') || input.takeClick()) beginDay();
      return;
    }
    if (game.state === 'won' || game.state === 'lost') {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter')) beginDay();
      return;
    }
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      if (game.togglePause()) sound.click();
    }
    if (input.wasPressed('KeyM')) {
      sound.unlock();
      sound.setMuted(!sound.muted);
      game.say(sound.muted ? 'Sound off' : 'Sound on', 1.1);
    }
  }

  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const delta = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += delta;
    handleGestures();
    while (accumulator >= STEP) {
      game.update(STEP, input, sound);
      accumulator -= STEP;
    }
    input.endFrame();
    renderer.draw(game);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
