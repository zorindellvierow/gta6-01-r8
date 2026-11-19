// Crescent Bay — police AI: spawn, chase, bust, wanted decay.
import { CONFIG } from './config.js';
import { mulberry32, randInt } from './random.js';

const COP_FOOT_SPEED = 195;
const COP_CAR_SPEED = 330;
const BUST_DIST = 26;
const SPAWN_MIN_DIST = 480;
const SPAWN_MAX_DIST = 720;

export class PoliceManager {
  constructor(city) {
    this.city = city;
    this.cops = [];
    this.wanted = 0;
    this.lastCrimeAt = 0;
    this._rng = mulberry32(987654321);
  }

  noteCrime(now) {
    this.lastCrimeAt = now;
  }

  setWanted(n, now) {
    this.wanted = Math.max(0, Math.min(CONFIG.WANTED_MAX, n));
    if (this.wanted > 0) this.lastCrimeAt = now;
  }

  desiredCount() {
    return Math.max(0, Math.min(CONFIG.WANTED_MAX, this.wanted));
  }

  spawnCopNear(player, viewport) {
    const rng = this._rng;
    const roads = this.city.roads || [];
    for (let tries = 0; tries < 12; tries++) {
      const angle = rng() * Math.PI * 2;
      const dist = randInt(rng, SPAWN_MIN_DIST, SPAWN_MAX_DIST);
      let x = player.x + Math.cos(angle) * dist;
      let y = player.y + Math.sin(angle) * dist;
      if (roads.length && rng() < 0.6) {
        const road = roads[randInt(rng, 0, roads.length - 1)];
        const cx = road.x + road.w / 2;
        const cy = road.y + road.h / 2;
        const cd = Math.hypot(cx - player.x, cy - player.y);
        // Road centre only counts when it is still a fair chase distance away.
        if (cd >= SPAWN_MIN_DIST && cd <= SPAWN_MAX_DIST) {
          x = cx;
          y = cy;
        }
      }
      x = Math.max(30, Math.min(CONFIG.WORLD_W - 30, x));
      y = Math.max(30, Math.min(CONFIG.WORLD_H - 30, y));
      if (Math.hypot(x - player.x, y - player.y) < SPAWN_MIN_DIST) continue;
      const sx = x - viewport.x;
      const sy = y - viewport.y;
      if (sx > -40 && sx < viewport.w + 40 && sy > -40 && sy < viewport.h + 40) continue;
      return { x, y, angle: 0, speed: 0 };
    }
    return { x: player.x + SPAWN_MIN_DIST, y: player.y, angle: 0, speed: 0 };
  }

  // Returns 'busted' when a cop catches the on-foot player, else null.
  update(dt, now, player, viewport) {
    if (this.wanted > 0 && now - this.lastCrimeAt >= CONFIG.WANTED_DECAY_MS) {
      this.wanted = 0;
      this.cops = [];
      return 'decayed';
    }
    const want = this.desiredCount();
    while (this.cops.length < want) {
      this.cops.push(this.spawnCopNear(player, viewport));
    }
    if (this.cops.length > want) this.cops.length = want;
    for (const cop of this.cops) {
      const dx = player.x - cop.x;
      const dy = player.y - cop.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = player.onFoot ? COP_FOOT_SPEED : COP_CAR_SPEED;
      cop.angle = Math.atan2(dy, dx);
      cop.x += (dx / dist) * speed * dt;
      cop.y += (dy / dist) * speed * dt;
      if (dist < BUST_DIST && player.onFoot && this.wanted > 0) return 'busted';
    }
    return null;
  }

  clear() {
    this.cops = [];
    this.wanted = 0;
  }
}
