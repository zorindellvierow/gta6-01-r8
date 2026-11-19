// Crescent Bay — keyboard + mouse input.
// Safe to import in Node: listeners are only attached when `window` exists.

// Canonical key codes used by the game.
export const KEYS = {
  UP: ['KeyW', 'ArrowUp'],
  DOWN: ['KeyS', 'ArrowDown'],
  LEFT: ['KeyA', 'ArrowLeft'],
  RIGHT: ['KeyD', 'ArrowRight'],
  RUN: ['ShiftLeft', 'ShiftRight'],
  ENTER_CAR: ['KeyF'],
  TAXI: ['KeyT'],
  RELOAD: ['KeyR'],
  PAUSE: ['KeyP', 'Escape'],
};

export class Input {
  constructor() {
    this._down = new Set();
    this._pressed = new Set();
    this.mouse = { x: 0, y: 0 };
    this.mouseDown = false;

    // No window (Node smoke test, SSR): stay inert, methods still work.
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (event) => {
      if (!event.repeat) this._pressed.add(event.code);
      this._down.add(event.code);
      if (KEYS.PAUSE.includes(event.code) || event.code.startsWith('Arrow')) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this._down.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this._down.clear();
    });
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    });
    window.addEventListener('mousedown', (event) => {
      if (event.button === 0) this.mouseDown = true;
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
  }

  // True while the key is held down.
  isDown(code) {
    return this._down.has(code);
  }

  // True only once per physical press; consumed after the game reads it.
  // Call once per frame per action key (F, T, P/Esc, R).
  pressed(code) {
    if (this._pressed.has(code)) {
      this._pressed.delete(code);
      return true;
    }
    return false;
  }

  // Flush one-shot presses at the end of a frame (optional; pressed() also
  // consumes individually, so this is just a safety net).
  endFrame() {
    this._pressed.clear();
  }

  // Normalised movement vector from WASD / arrow keys.
  axis() {
    let x = 0;
    let y = 0;
    if (KEYS.LEFT.some((c) => this.isDown(c))) x -= 1;
    if (KEYS.RIGHT.some((c) => this.isDown(c))) x += 1;
    if (KEYS.UP.some((c) => this.isDown(c))) y -= 1;
    if (KEYS.DOWN.some((c) => this.isDown(c))) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  // Sprint while either Shift is held.
  isRunning() {
    return KEYS.RUN.some((c) => this.isDown(c));
  }
}
