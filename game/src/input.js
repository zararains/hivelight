// Keyboard and mouse, gathered in one place. The game reads held directions,
// edge-triggered presses (a key that went down this frame) and the pointer;
// this module owns the listeners and the per-frame bookkeeping.

const PREVENTED_CODES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, down: false, clicked: false };

  function onKeyDown(event) {
    if (PREVENTED_CODES.has(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    pointer.x = (event.clientX - rect.left) * scaleX;
    pointer.y = (event.clientY - rect.top) * scaleY;
  }

  function onPointerMove(event) {
    pointerPosition(event);
  }

  function onPointerDown(event) {
    pointerPosition(event);
    pointer.down = true;
    pointer.clicked = true;
  }

  function onPointerUp() {
    pointer.down = false;
  }

  function onBlur() {
    held.clear();
    pointer.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  return {
    pointer,

    // -1, 0 or 1 from the arrow keys or WASD.
    axisX() {
      const left = held.has('ArrowLeft') || held.has('KeyA');
      const right = held.has('ArrowRight') || held.has('KeyD');
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    axisY() {
      const up = held.has('ArrowUp') || held.has('KeyW');
      const down = held.has('ArrowDown') || held.has('KeyS');
      return (down ? 1 : 0) - (up ? 1 : 0);
    },

    // True only on the frame the key went down.
    wasPressed(code) {
      return pressed.has(code);
    },

    dashHeld() {
      return held.has('Space') || held.has('ShiftLeft') || held.has('ShiftRight');
    },

    // A pointer press the caller may claim once.
    takeClick() {
      const clicked = pointer.clicked;
      pointer.clicked = false;
      return clicked;
    },

    // Called once per frame after the game has read everything.
    endFrame() {
      pressed.clear();
      pointer.clicked = false;
    },
  };
}
