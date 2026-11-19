// Crescent Bay — game loop + wiring: input, world, vehicles, police,
// missions, HUD, audio, save. Exposes window.__game for playtests.
import { CONFIG } from './config.js';
import { Input, KEYS } from './input.js';
import { generateCity, districtAtPoint, isBlocked, isInWater } from './world.js';
import { drawWorld, drawPlayer, drawCar, drawPolice, drawPickup, drawBoat } from './render.js';
import { SoundBank } from './audio.js';
import { defaultSave, validateSave, writeSave, loadSave, clearSave } from './save.js';
import { VehicleManager } from './vehicles.js';
import { PoliceManager } from './police.js';
import { MissionManager } from './missions.js';
import { HUD } from './hud.js';
import { applyShotMode } from './shots.js';

const VIEW_W = 1280;
const VIEW_H = 720;
const SAFE_SPAWN = { x: 420, y: 900 };
const PICKUP_DIST = 30;
const AUTOSAVE_MS = 10000;

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.city = generateCity('crescent-bay-1');
    this.input = new Input();
    this.sounds = new SoundBank();
    this.vehicles = new VehicleManager(this.city, 'crescent-bay-1');
    this.police = new PoliceManager(this.city);
    this.missions = new MissionManager((ev, data) => this._onMissionEvent(ev, data));
    this.hud = new HUD({
      onNewGame: () => this.startNewGame(),
      onContinue: () => this.continueGame(),
      onResume: () => this.resume(),
      onBustedResume: () => this.resume(),
      onWastedResume: () => this.resume(),
      onMissionNext: () => this._onMissionNext(),
    });
    this.state = 'menu';
    this.paused = true;
    this.player = this._freshPlayer();
    this.camera = { x: 0, y: 0 };
    this._lastT = 0;
    this._lastShotAt = 0;
    this._reloadUntil = 0;
    this._lastAutosave = 0;
    this._shotFired = false;
    this._raf = 0;
    this._saveExists = !!loadSave();
    this.hud.showMenu(this._saveExists);
    this.hud.update(this._hudState());
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
    const params = new URLSearchParams(window.location.search);
    if (params.has('shot')) applyShotMode(this, params);
  }

  _freshPlayer() {
    const d = defaultSave();
    return {
      x: d.x, y: d.y, angle: 0,
      hp: d.health, money: d.money, ammo: CONFIG.PISTOL.mag,
      wanted: 0, onFoot: true, car: null, mag: CONFIG.PISTOL.mag,
    };
  }

  get money() { return this.player.money; }
  get health() { return this.player.hp; }
  get wanted() { return this.player.wanted; }
  get missionIndex() { return this.missions.missionIndex; }
  get inMenu() { return this.state === 'menu'; }

  _hudState() {
    const now = performance.now();
    return {
      money: this.player.money,
      district: districtAtPoint(this.player.x, this.player.y) || 'Crescent Bay',
      wanted: this.player.wanted,
      health: this.player.hp,
      ammo: this.player.ammo,
      mag: this.player.mag,
      objective: this._objectiveText(),
      timeLeftMs: this.missions.active ? this.missions.timeLeftMs(now) : 0,
    };
  }

  _objectiveText() {
    if (this.missions.taxi) return 'Taksi: antar penumpang ke ' + this.missions.taxi.dest.label + ' ($25). T = batal.';
    if (this.missions.active) return this.missions.active.objective + '  Hadiah $' + this.missions.active.reward;
    if (this.missions.missionIndex >= 4) return 'Semua misi selesai. Jelajahi Crescent Bay!';
    return 'Tekan F dekat mobil untuk mengemudi. T = taksi.';
  }

  startNewGame() {
    clearSave();
    this.player = this._freshPlayer();
    this.police.clear();
    this.missions.completedMissions = [];
    this.missions.taxi = null;
    this.state = 'playing';
    this.paused = false;
    this.hud.hideOverlays();
    this.missions.startMission(0, performance.now());
    this.hud.toast('Misi 1: Pesan dari Selin — temui Selin di Marina.');
    this.sounds.click();
    this._save();
  }

  continueGame() {
    const save = loadSave();
    if (!save || !validateSave(save)) return;
    this.player = this._freshPlayer();
    this.player.money = save.money;
    this.player.hp = save.health;
    this.player.x = save.x;
    this.player.y = save.y;
    this.player.wanted = save.wanted || 0;
    this.missions.completedMissions = Array.isArray(save.completedMissions) ? [...save.completedMissions] : [];
    this.police.clear();
    this.police.setWanted(this.player.wanted, performance.now());
    this.state = 'playing';
    this.paused = false;
    this.hud.hideOverlays();
    this.missions.startMission(save.mission || 0, performance.now());
    this.sounds.click();
    this.hud.toast('Lanjutkan permainan — selamat datang kembali, Rook.');
  }

  resume() {
    if (this.state === 'paused' || this.state === 'busted' || this.state === 'wasted') {
      this.state = 'playing';
      this.paused = false;
      this.hud.hideOverlays();
      this.sounds.click();
    }
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.paused = true;
      this.hud.showPause();
      this._save();
    } else if (this.state === 'paused') {
      this.resume();
    }
  }

  _onMissionNext() {
    this.state = 'playing';
    this.paused = false;
    this.hud.hideOverlays();
    const next = this.missions.startNext(performance.now());
    if (next) this.hud.toast(next.title + ' — ' + next.objective);
    else this.hud.toast('Semua misi selesai! Crescent Bay milikmu, Rook.');
  }

  _onMissionEvent(ev, data) {
    if (ev === 'mission-complete') {
      this.player.money += data.reward;
      this.sounds.missionComplete();
      this.state = 'mission-complete';
      this.paused = true;
      this.hud.showMissionComplete(data.reward, this.player.money);
      this._save();
    } else if (ev === 'mission-failed') {
      this.hud.toast('Misi gagal — waktu habis. Coba lagi!');
      this.sounds.busted();
      this.missions.startMission(this.missions.missionIndex, performance.now());
    } else if (ev === 'taxi-done') {
      this.player.money += data.fare;
      this.sounds.pickup();
      this.hud.toast('Penumpang sampai. +$' + data.fare);
      this._save();
    } else if (ev === 'taxi-start') {
      this.hud.toast('Taksi: antar penumpang ke ' + data.dest.label + ' (+$25).');
    } else if (ev === 'taxi-cancel') {
      this.hud.toast('Taksi dibatalkan.');
    }
  }

  _applyCut() {
    const lost = Math.floor(this.player.money * CONFIG.BUSTED_CUT);
    this.player.money -= lost;
    return lost;
  }

  _busted() {
    const lost = this._applyCut();
    this.player.hp = CONFIG.START_HEALTH;
    this.player.wanted = 0;
    this.police.clear();
    if (this.player.car) this.vehicles.exitCar(this.player);
    this.player.x = SAFE_SPAWN.x;
    this.player.y = SAFE_SPAWN.y;
    this.state = 'busted';
    this.paused = true;
    this.sounds.busted();
    this.hud.showBusted(lost);
    this._save();
  }

  _wasted() {
    const lost = this._applyCut();
    this.player.hp = CONFIG.START_HEALTH;
    this.player.wanted = 0;
    this.police.clear();
    if (this.player.car) this.vehicles.exitCar(this.player);
    this.player.x = SAFE_SPAWN.x;
    this.player.y = SAFE_SPAWN.y;
    this.state = 'wasted';
    this.paused = true;
    this.sounds.wasted();
    this.hud.showWasted(lost);
    this._save();
  }

  damage(amount) {
    if (this.state !== 'playing') return;
    this.player.hp -= amount;
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this._wasted();
    }
  }

  _save() {
    writeSave({
      money: Math.floor(this.player.money),
      health: Math.ceil(this.player.hp),
      mission: this.missions.missionIndex,
      wanted: this.player.wanted,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      completedMissions: [...this.missions.completedMissions],
      muted: this.sounds.muted,
      version: 1,
    });
    this._saveExists = true;
  }

  _mouseWorld() {
    const rect = this.canvas.getBoundingClientRect();
    const sx = VIEW_W / rect.width;
    const sy = VIEW_H / rect.height;
    return {
      x: this.camera.x + (this.input.mouse.x - rect.left) * sx,
      y: this.camera.y + (this.input.mouse.y - rect.top) * sy,
    };
  }

  _tryShoot(now) {
    if (!this.player.onFoot) return;
    if (now < this._reloadUntil) return;
    if (now - this._lastShotAt < CONFIG.PISTOL.cooldownMs) return;
    if (this.player.ammo <= 0) {
      this._reloadUntil = now + CONFIG.PISTOL.reloadMs;
      this.player.ammo = CONFIG.PISTOL.mag;
      this.hud.toast('Reloading...');
      return;
    }
    this._lastShotAt = now;
    this.player.ammo -= 1;
    this._shotFired = true;
    this.sounds.shoot();
    const m = this._mouseWorld();
    this.player.angle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
    let best = null;
    let bestD = CONFIG.PISTOL.range;
    for (const cop of this.police.cops) {
      const d = Math.hypot(cop.x - this.player.x, cop.y - this.player.y);
      if (d > bestD) continue;
      const a = Math.atan2(cop.y - this.player.y, cop.x - this.player.x);
      let diff = Math.abs(a - this.player.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.35) {
        bestD = d;
        best = cop;
      }
    }
    if (best) {
      this.police.cops.splice(this.police.cops.indexOf(best), 1);
      this.player.wanted = Math.min(CONFIG.WANTED_MAX, this.player.wanted + 1);
      this.police.setWanted(this.player.wanted, now);
      this.hud.toast('Polisi dilumpuhkan! Wanted naik.');
    }
  }

  _update(dt, now) {
    if (this.state !== 'playing') return;
    const input = this.input;

    if (KEYS.TAXI.some((c) => input.pressed(c))) {
      if (this.missions.taxi) this.missions.cancelTaxi();
      else if (this.player.onFoot) this.missions.startTaxi(this.player);
    }

    if (KEYS.ENTER_CAR.some((c) => input.pressed(c))) {
      if (this.player.onFoot) {
        const car = this.vehicles.nearestCar(this.player.x, this.player.y);
        if (car) {
          this.vehicles.enterCar(car, this.player);
          this.player.wanted = Math.min(CONFIG.WANTED_MAX, this.player.wanted + 1);
          this.police.setWanted(this.player.wanted, now);
          this.sounds.engineStart();
          this.hud.toast('Mobil dicuri! Wanted naik.');
        }
      } else {
        this.vehicles.exitCar(this.player);
        this.sounds.click();
      }
    }

    if (KEYS.RELOAD.some((c) => input.pressed(c)) && this.player.ammo < this.player.mag) {
      this._reloadUntil = now + CONFIG.PISTOL.reloadMs;
      this.player.ammo = this.player.mag;
      this.hud.toast('Reloading...');
    }

    if (this.player.onFoot) {
      const axis = input.axis();
      const len = Math.hypot(axis.x, axis.y) || 1;
      const speed = input.isRunning() ? CONFIG.PLAYER_RUN : CONFIG.PLAYER_WALK;
      const nx = this.player.x + (axis.x / len) * speed * dt * (axis.x || axis.y ? 1 : 0);
      const ny = this.player.y + (axis.y / len) * speed * dt * (axis.x || axis.y ? 1 : 0);
      if (axis.x || axis.y) {
        this.player.angle = Math.atan2(axis.y, axis.x);
        if (!isBlocked(nx, this.player.y, this.city)) this.player.x = nx;
        if (!isBlocked(this.player.x, ny, this.city)) this.player.y = ny;
        this.player.x = Math.max(16, Math.min(CONFIG.WORLD_W - 16, this.player.x));
        this.player.y = Math.max(16, Math.min(CONFIG.WORLD_H - 16, this.player.y));
      }
      if (input.mouseDown) this._tryShoot(now);
    } else {
      this.vehicles.update(dt, input, this.city);
      if (this.player.car) {
        this.player.x = this.player.car.x;
        this.player.y = this.player.car.y;
        this.player.angle = this.player.car.angle;
      }
    }

    // Pickups.
    const city = this.city;
    for (let i = city.pickups.length - 1; i >= 0; i--) {
      const p = city.pickups[i];
      if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < PICKUP_DIST) {
        const kind = String(p.kind || '').toLowerCase();
        if (kind.includes('health') || kind.includes('med') || kind.includes('kit')) {
          this.player.hp = Math.min(CONFIG.START_HEALTH, this.player.hp + 25);
          this.hud.toast('Health +25');
        } else {
          this.player.money += 25;
          this.hud.toast('Uang +$25');
        }
        this.sounds.pickup();
        city.pickups.splice(i, 1);
      }
    }

    // Police + wanted.
    const policeEvent = this.police.update(dt, now, this.player, {
      x: this.camera.x, y: this.camera.y, w: VIEW_W, h: VIEW_H,
    });
    if (policeEvent === 'busted') {
      this._busted();
      return;
    }
    if (policeEvent === 'decayed') this.hud.toast('Wanted hilang — polisi pergi.');
    // Contact damage from cops.
    for (const cop of this.police.cops) {
      if (this.player.onFoot && Math.hypot(cop.x - this.player.x, cop.y - this.player.y) < 30) {
        this.damage(30 * dt);
        if (this.state !== 'playing') return;
      }
    }
    this.player.wanted = this.police.wanted;

    // Missions + taxi.
    this.missions.update(now, this.player);

    // Autosave.
    if (now - this._lastAutosave > AUTOSAVE_MS) {
      this._lastAutosave = now;
      this._save();
    }
    this.hud.update(this._hudState());
  }

  _render() {
    const p = this.player;
    this.camera.x = Math.max(0, Math.min(CONFIG.WORLD_W - VIEW_W, p.x - VIEW_W / 2));
    this.camera.y = Math.max(0, Math.min(CONFIG.WORLD_H - VIEW_H, p.y - VIEW_H / 2));
    const ctx = this.ctx;
    const cam = this.camera;
    drawWorld(ctx, this.city, cam);
    for (const boat of this.city.boats || []) drawBoat(ctx, boat, cam);
    for (const pk of this.city.pickups || []) drawPickup(ctx, pk, cam);
    for (const car of this.vehicles.cars) drawCar(ctx, car, cam);
    for (const cop of this.police.cops) drawPolice(ctx, cop, cam);
    if (this.state !== 'menu') drawPlayer(ctx, p, cam);
    if (isInWater(p.x, p.y)) {
      ctx.fillStyle = 'rgba(20,60,120,0.25)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  _loop(t) {
    const now = t || performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this._lastT) / 1000 || 0.016));
    this._lastT = now;
    // Pause key must work while paused too, so handle it outside _update.
    if (KEYS.PAUSE.some((c) => this.input.pressed(c))) this.togglePause();
    this._update(dt, now);
    this._render();
    this.input.endFrame();
    this._raf = requestAnimationFrame(this._loop);
  }
}

const game = new Game();
window.__game = game;
export default game;
