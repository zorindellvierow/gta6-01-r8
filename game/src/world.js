// Crescent Bay — deterministic city generation + spatial queries.
// Same seed string -> byte-identical city (verified by the smoke test).

import { hashStringSeed, mulberry32, randRange, randInt, pick } from './random.js';
import { CONFIG } from './config.js';

const WATER = { x: 0, y: 0, w: 240, h: 1800 };
const BEACH = { x: 240, y: 1480, w: 2160, h: 320 };
const ROAD_W = 70;
const BUILDING_MARGIN = 4;

// Road centrelines: verticals run the full land height, horizontals the
// full land width. One extra waterfront road hugs the bay edge.
const VERTICAL_ROADS = [275, 450, 750, 1050, 1350, 1650, 1950, 2250];
const HORIZONTAL_ROADS = [200, 450, 700, 950, 1200];

export function districtAtPoint(x, y) {
  for (const d of CONFIG.DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return null;
}

export function isInWater(x, y) {
  return x >= WATER.x && x < WATER.x + WATER.w && y >= WATER.y && y < WATER.y + WATER.h;
}

export function isBlocked(x, y, city) {
  if (isInWater(x, y)) return true;
  for (const b of city.buildings) {
    if (
      x >= b.x - BUILDING_MARGIN &&
      x < b.x + b.w + BUILDING_MARGIN &&
      y >= b.y - BUILDING_MARGIN &&
      y < b.y + b.h + BUILDING_MARGIN
    ) {
      return true;
    }
  }
  return false;
}

export function generateCity(seedString) {
  const seed = hashStringSeed(seedString);
  const rng = mulberry32(seed);

  const roads = [];
  for (const cx of VERTICAL_ROADS) {
    roads.push({ x: cx - ROAD_W / 2, y: 0, w: ROAD_W, h: BEACH.y });
  }
  for (const cy of HORIZONTAL_ROADS) {
    roads.push({ x: WATER.w, y: cy - ROAD_W / 2, w: CONFIG.WORLD_W - WATER.w, h: ROAD_W });
  }

  // Building blocks are the gaps BETWEEN neighbouring roads — never on a
  // road itself. Columns: [310..415], [485..715], ... Rows likewise.
  const colGaps = [];
  let prevRight = WATER.w;
  for (const cx of VERTICAL_ROADS) {
    const left = cx - ROAD_W / 2;
    if (left > prevRight) colGaps.push([prevRight, left]);
    prevRight = cx + ROAD_W / 2;
  }
  if (prevRight < CONFIG.WORLD_W) colGaps.push([prevRight, CONFIG.WORLD_W]);
  const rowGaps = [];
  let prevBottom = 0;
  for (const cy of HORIZONTAL_ROADS) {
    const top = cy - ROAD_W / 2;
    if (top > prevBottom) rowGaps.push([prevBottom, top]);
    prevBottom = cy + ROAD_W / 2;
  }
  if (prevBottom < BEACH.y) rowGaps.push([prevBottom, BEACH.y]);

  const buildings = [];
  for (const [cellX, cellRight] of colGaps) {
    for (const [cellY, cellBottom] of rowGaps) {
      const cellW = cellRight - cellX;
      const cellH = cellBottom - cellY;
      if (cellW < 70 || cellH < 70) continue;
      if (rng() < 0.12) continue; // empty lot / plaza
      const count = rng() < 0.3 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const bw = randRange(rng, 46, Math.max(48, cellW / count - 24));
        const bh = randRange(rng, 46, Math.max(48, cellH - 24));
        const bx = cellX + 12 + (count === 2 ? k * (cellW / 2) : (cellW - bw) / 2) + randRange(rng, 0, 6);
        const by = cellY + 12 + (cellH - bh) / 2 + randRange(rng, -4, 4);
        const cx = bx + bw / 2;
        const cy = by + bh / 2;
        if (isInWater(cx, cy)) continue;
        buildings.push({
          x: Math.round(bx),
          y: Math.round(by),
          w: Math.round(Math.min(bw, cellX + cellW - 12 - bx)),
          h: Math.round(Math.min(bh, cellY + cellH - 12 - by)),
          district: districtAtPoint(cx, cy) || 'DOWNTOWN',
        });
      }
    }
  }

  // Palms: beachfront row, marina waterfront, a few in the hills.
  const palms = [];
  for (let i = 0; i < 24; i++) {
    palms.push({ x: Math.round(randRange(rng, 300, 2350)), y: Math.round(randRange(rng, 1510, 1750)) });
  }
  for (let i = 0; i < 10; i++) {
    palms.push({ x: Math.round(randRange(rng, 255, 300)), y: Math.round(randRange(rng, 80, 1420)) });
  }
  for (let i = 0; i < 6; i++) {
    palms.push({ x: Math.round(randRange(rng, 1700, 2350)), y: Math.round(randRange(rng, 80, 900)) });
  }

  // Pickups: health / cash / ammo, mostly on roads, some on the sand.
  const kinds = ['health', 'money', 'ammo'];
  const pickups = [];
  for (let i = 0; i < 14; i++) {
    let px;
    let py;
    if (rng() < 0.7) {
      const road = pick(rng, roads);
      px = randRange(rng, road.x + 8, road.x + road.w - 8);
      py = randRange(rng, road.y + 8, road.y + road.h - 8);
    } else {
      px = randRange(rng, 320, 2350);
      py = randRange(rng, 1520, 1740);
    }
    pickups.push({ x: Math.round(px), y: Math.round(py), kind: pick(rng, kinds) });
  }

  // Wooden piers jutting west into the bay, with boats moored alongside.
  const piers = [
    { x: 40, y: 300, w: 200, h: 36 },
    { x: 40, y: 800, w: 200, h: 36 },
    { x: 40, y: 1300, w: 200, h: 36 },
  ];
  const boats = [];
  for (const pier of piers) {
    boats.push({
      x: Math.round(randRange(rng, 70, 190)),
      y: Math.round(pier.y + pier.h + randRange(rng, 14, 60)),
      angle: randRange(rng, -0.4, 0.4),
    });
  }
  for (let i = 0; i < 2; i++) {
    boats.push({
      x: Math.round(randRange(rng, 60, 200)),
      y: Math.round(randRange(rng, 100, 1700)),
      angle: randRange(rng, 0, Math.PI * 2),
    });
  }

  return {
    seed,
    buildings,
    roads,
    palms,
    pickups,
    piers,
    boats,
    water: { ...WATER },
    beach: { ...BEACH },
  };
}
