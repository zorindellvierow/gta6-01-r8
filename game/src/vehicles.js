// Crescent Bay — vehicles: spawn, steal, drive, park.
import { CONFIG } from './config.js';
import { mulberry32, randInt, pick } from './random.js';
import { isBlocked } from './world.js';

const CAR_COLORS = ['#c23b2e', '#2e6fc2', '#e8b73a', '#3aa655', '#7a4fd0', '#d8d8d8', '#222831', '#e07b39'];
const CAR_COUNT = 9;
const ENTER_DIST = 64;
const MAX_SPEED = 560;
const ACCEL = 420;
const BRAKE = 700;
const TURN_RATE = 2.6;

export class VehicleManager {
  constructor(city, seedString) {
    this.city = city;
    this.cars = [];
    const rng = mulberry32(seedString ? seedString.length * 7919 + 13 : 12345);
    this.spawnCars(city, rng);
  }

  spawnCars(city, rng) {
    const roads = city.roads || [];
    if (!roads.length) return;
    for (let i = 0; i < CAR_COUNT; i++) {
      const road = roads[randInt(rng, 0, roads.length - 1)];
      const horizontal = road.w >= road.h;
      const x = horizontal
        ? randInt(rng, road.x + 30, road.x + road.w - 30)
        : road.x + road.w / 2 + (rng() < 0.5 ? -14 : 14);
      const y = horizontal
        ? road.y + road.h / 2 + (rng() < 0.5 ? -14 : 14)
        : randInt(rng, road.y + 30, road.y + road.h - 30);
      this.cars.push({
        x,
        y,
        angle: horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
        speed: 0,
        color: pick(rng, CAR_COLORS),
        occupied: false,
      });
    }
  }

  nearestCar(x, y, maxDist = ENTER_DIST) {
    let best = null;
    let bestD = maxDist;
    for (const car of this.cars) {
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  // Drive the occupied car. Returns true when a building/water stop happened.
  update(dt, input, city) {
    let hit = false;
    for (const car of this.cars) {
      if (!car.occupied) continue;
      const axis = input.axis();
      const running = input.isRunning();
      if (axis.y < 0) car.speed += ACCEL * (running ? 1.25 : 1) * dt;
      else if (axis.y > 0) car.speed -= BRAKE * dt;
      else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 260 * dt);
      if (car.speed > MAX_SPEED) car.speed = MAX_SPEED;
      if (car.speed < -180) car.speed = -180;
      const steer = axis.x * TURN_RATE * dt * Math.min(1, Math.abs(car.speed) / 120 + 0.15);
      car.angle += steer * Math.sign(car.speed || 1);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (isBlocked(nx, ny, city) || isBlocked(nx + Math.cos(car.angle) * 14, ny + Math.sin(car.angle) * 14, city)) {
        car.speed = 0;
        hit = true;
      } else {
        car.x = nx;
        car.y = ny;
      }
      car.x = Math.max(20, Math.min(CONFIG.WORLD_W - 20, car.x));
      car.y = Math.max(20, Math.min(CONFIG.WORLD_H - 20, car.y));
    }
    return hit;
  }

  enterCar(car, player) {
    car.occupied = true;
    player.onFoot = false;
    player.car = car;
    player.x = car.x;
    player.y = car.y;
    return car;
  }

  exitCar(player) {
    const car = player.car;
    if (!car) return null;
    car.occupied = false;
    car.speed = 0;
    player.onFoot = true;
    player.car = null;
    const side = Math.PI / 2;
    const px = car.x + Math.cos(car.angle + side) * 34;
    const py = car.y + Math.sin(car.angle + side) * 34;
    player.x = isBlocked(px, py, this.city) ? car.x - Math.cos(car.angle + side) * 34 : px;
    player.y = isBlocked(px, py, this.city) ? car.y - Math.sin(car.angle + side) * 34 : py;
    return car;
  }
}
