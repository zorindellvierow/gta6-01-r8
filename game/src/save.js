// Crescent Bay — localStorage save slots.
// Guards: every function is safe when localStorage does not exist (Node).

import { CONFIG } from './config.js';

const SAVE_KEY = CONFIG.SAVE_KEY;

// Fresh save: Rook starts in the Marina with $50 and full health.
export function defaultSave() {
  return {
    money: CONFIG.START_MONEY,
    health: CONFIG.START_HEALTH,
    mission: 0,
    wanted: 0,
    x: 420,
    y: 900,
    completedMissions: [],
    muted: false,
    version: 1,
  };
}

function isIntInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function validateSave(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (obj.version !== 1) return false;
  if (typeof obj.money !== 'number' || !Number.isFinite(obj.money) || obj.money < 0) return false;
  if (typeof obj.health !== 'number' || !Number.isFinite(obj.health) || obj.health < 0 || obj.health > 100) return false;
  if (!isIntInRange(obj.mission, 0, CONFIG.MISSION_REWARDS.length)) return false;
  if (!isIntInRange(obj.wanted, 0, CONFIG.WANTED_MAX)) return false;
  if (typeof obj.x !== 'number' || !Number.isFinite(obj.x) || obj.x < 0 || obj.x > CONFIG.WORLD_W) return false;
  if (typeof obj.y !== 'number' || !Number.isFinite(obj.y) || obj.y < 0 || obj.y > CONFIG.WORLD_H) return false;
  if (!Array.isArray(obj.completedMissions)) return false;
  for (const m of obj.completedMissions) {
    if (!isIntInRange(m, 0, CONFIG.MISSION_REWARDS.length - 1)) return false;
  }
  if (typeof obj.muted !== 'boolean') return false;
  return true;
}

function storage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (_err) {
    return null;
  }
  return null;
}

export function writeSave(save) {
  if (!validateSave(save)) return false;
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (_err) {
    return false;
  }
}

export function loadSave() {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(SAVE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return validateSave(parsed) ? parsed : null;
  } catch (_err) {
    return null;
  }
}

export function clearSave() {
  const store = storage();
  if (!store) return false;
  try {
    store.removeItem(SAVE_KEY);
    return true;
  } catch (_err) {
    return false;
  }
}
