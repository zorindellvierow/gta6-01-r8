// Crescent Bay — static tuning & world constants.
// Single source of truth for sizes, speeds, combat numbers, economy and palette.

export const CONFIG = {
  // World dimensions (pixels)
  WORLD_W: 2400,
  WORLD_H: 1800,

  // Districts tile the land east of the bay (x >= 240) without overlap.
  DISTRICTS: [
    { name: 'MARINA', x: 240, y: 0, w: 560, h: 1000 },
    { name: 'DOWNTOWN', x: 800, y: 0, w: 800, h: 1000 },
    { name: 'HILLS', x: 1600, y: 0, w: 800, h: 1000 },
    { name: 'BEACHFRONT', x: 240, y: 1000, w: 2160, h: 800 },
  ],

  // Base ground tint per district
  DISTRICT_COLORS: {
    MARINA: '#7fae8a',
    DOWNTOWN: '#8d8f96',
    HILLS: '#6f9e6a',
    BEACHFRONT: '#e3cd96',
  },

  // Terrain palette
  WATER_COLOR: '#2e7fc2',
  WATER_DEEP_COLOR: '#1d5f96',
  SAND_COLOR: '#ecd9a0',
  ROAD_COLOR: '#4a4a52',
  ROAD_LINE_COLOR: '#d8c95a',
  SIDEWALK_COLOR: '#9a9aa2',

  // Player movement (px per second)
  PLAYER_WALK: 150,
  PLAYER_RUN: 260,

  // Pistol tuning
  PISTOL: {
    damage: 34,
    range: 320,
    mag: 12,
    reloadMs: 1400,
    cooldownMs: 220,
  },

  // Starting state
  START_MONEY: 50,
  START_HEALTH: 100,

  // Wanted system
  WANTED_MAX: 5,
  WANTED_DECAY_MS: 25000,
  BUSTED_CUT: 0.2,

  // Story missions (contact: Selin, protagonist: Rook)
  MISSION_REWARDS: [250, 600, 1200, 2200],
  MISSION_TIME_LIMIT_MS: 240000,

  // Persistence
  SAVE_KEY: 'crescent-bay-save-v1',
};
