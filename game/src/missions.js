// Crescent Bay — story missions (Selin / Rook) + taxi side job.
import { CONFIG } from './config.js';

export const MISSIONS = [
  {
    id: 0,
    title: 'Misi 1: Pesan dari Selin',
    giver: 'Selin',
    reward: CONFIG.MISSION_REWARDS[0],
    objective: 'Temui Selin di dermaga Marina.',
    target: { x: 420, y: 1120 },
    radius: 70,
    timeLimitMs: CONFIG.MISSION_TIME_LIMIT_MS,
  },
  {
    id: 1,
    title: 'Misi 2: Paket Downtown',
    giver: 'Selin',
    reward: CONFIG.MISSION_REWARDS[1],
    objective: 'Ambil paket di Downtown dan antar ke Hills.',
    target: { x: 1850, y: 350 },
    radius: 70,
    timeLimitMs: CONFIG.MISSION_TIME_LIMIT_MS,
  },
  {
    id: 2,
    title: 'Misi 3: Kabur dari Beachfront',
    giver: 'Selin',
    reward: CONFIG.MISSION_REWARDS[2],
    objective: 'Sampai ke ujung Beachfront sebelum waktu habis.',
    target: { x: 2100, y: 1650 },
    radius: 70,
    timeLimitMs: CONFIG.MISSION_TIME_LIMIT_MS,
  },
  {
    id: 3,
    title: 'Misi 4: Perampokan Terakhir',
    giver: 'Selin',
    reward: CONFIG.MISSION_REWARDS[3],
    objective: 'Capai titik penjemputan di Marina.',
    target: { x: 700, y: 1400 },
    radius: 70,
    timeLimitMs: CONFIG.MISSION_TIME_LIMIT_MS,
  },
];

const TAXI_FARE = 25;
const TAXI_DESTS = [
  { x: 1100, y: 500, label: 'Downtown' },
  { x: 1900, y: 1400, label: 'Beachfront' },
  { x: 500, y: 1600, label: 'Beachfront Selatan' },
  { x: 900, y: 250, label: 'Downtown Utara' },
];

export class MissionManager {
  constructor(onEvent) {
    this.onEvent = onEvent || (() => {});
    this.missionIndex = 0;
    this.active = null;
    this.startedAt = 0;
    this.completedMissions = [];
    this.taxi = null;
    this._taxiIdx = 0;
  }

  currentDef() {
    return MISSIONS[this.missionIndex] || null;
  }

  startMission(i, now) {
    const def = MISSIONS[i];
    if (!def) return null;
    this.missionIndex = i;
    this.active = { ...def, target: { ...def.target } };
    this.startedAt = now;
    this.onEvent('mission-start', this.active);
    return this.active;
  }

  startNext(now) {
    if (this.missionIndex + 1 < MISSIONS.length) return this.startMission(this.missionIndex + 1, now);
    this.active = null;
    return null;
  }

  // Returns 'completed' | 'failed' | null.
  update(now, player) {
    if (this.taxi) {
      const d = Math.hypot(player.x - this.taxi.dest.x, player.y - this.taxi.dest.y);
      if (d < 70) {
        const fare = TAXI_FARE;
        this.taxi = null;
        this.onEvent('taxi-done', { fare });
        return 'taxi-done';
      }
    }
    if (!this.active) return null;
    const elapsed = now - this.startedAt;
    if (elapsed > this.active.timeLimitMs) {
      this.onEvent('mission-failed', this.active);
      this.active = null;
      return 'failed';
    }
    const d = Math.hypot(player.x - this.active.target.x, player.y - this.active.target.y);
    if (d < this.active.radius) {
      const done = this.active;
      this.completedMissions.push(done.id);
      this.active = null;
      this.onEvent('mission-complete', done);
      return 'completed';
    }
    return null;
  }

  timeLeftMs(now) {
    if (!this.active) return 0;
    return Math.max(0, this.active.timeLimitMs - (now - this.startedAt));
  }

  startTaxi(player) {
    if (this.taxi) return null;
    const dest = TAXI_DESTS[this._taxiIdx % TAXI_DESTS.length];
    this._taxiIdx += 1;
    this.taxi = { dest: { ...dest }, fare: TAXI_FARE, passenger: true };
    this.onEvent('taxi-start', this.taxi);
    return this.taxi;
  }

  cancelTaxi() {
    if (!this.taxi) return false;
    this.taxi = null;
    this.onEvent('taxi-cancel', null);
    return true;
  }
}
