// Crescent Bay — Canvas 2D drawing only. No game logic lives here:
// every function takes a ctx, data and the camera, and just paints.
// Safe to import in Node (no window/document access at module level).

import { CONFIG } from './config.js';

function toScreen(camera, x, y) {
  return { x: x - camera.x, y: y - camera.y };
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawWorld(ctx, city, camera) {
  // Sea (deep, then shallow band at the shore).
  ctx.fillStyle = CONFIG.WATER_DEEP_COLOR;
  ctx.fillRect(0 - camera.x, 0 - camera.y, city.water.w, city.water.h);
  ctx.fillStyle = CONFIG.WATER_COLOR;
  ctx.fillRect(0 - camera.x, 0 - camera.y, city.water.w - 40, city.water.h);

  // District ground tints.
  for (const d of CONFIG.DISTRICTS) {
    ctx.fillStyle = CONFIG.DISTRICT_COLORS[d.name] || '#888888';
    const p = toScreen(camera, d.x, d.y);
    ctx.fillRect(p.x, p.y, d.w, d.h);
  }

  // Sand strip.
  ctx.fillStyle = CONFIG.SAND_COLOR;
  const bp = toScreen(camera, city.beach.x, city.beach.y);
  ctx.fillRect(bp.x, bp.y, city.beach.w, city.beach.h);

  // Roads with a dashed centre line.
  for (const road of city.roads) {
    const p = toScreen(camera, road.x, road.y);
    ctx.fillStyle = CONFIG.ROAD_COLOR;
    ctx.fillRect(p.x, p.y, road.w, road.h);
    ctx.strokeStyle = CONFIG.ROAD_LINE_COLOR;
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    if (road.w < road.h) {
      ctx.moveTo(p.x + road.w / 2, p.y);
      ctx.lineTo(p.x + road.w / 2, p.y + road.h);
    } else {
      ctx.moveTo(p.x, p.y + road.h / 2);
      ctx.lineTo(p.x + road.w, p.y + road.h / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Piers: wooden planks.
  ctx.fillStyle = '#8a6b46';
  for (const pier of city.piers) {
    const p = toScreen(camera, pier.x, pier.y);
    ctx.fillRect(p.x, p.y, pier.w, pier.h);
    ctx.strokeStyle = '#6d5436';
    ctx.lineWidth = 2;
    for (let x = p.x + 14; x < p.x + pier.w; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, p.y);
      ctx.lineTo(x, p.y + pier.h);
      ctx.stroke();
    }
  }

  // Buildings: soft shadow, body, lighter roof, roof rim.
  for (const b of city.buildings) {
    const p = toScreen(camera, b.x, b.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(p.x + 5, p.y + 6, b.w, b.h);
    ctx.fillStyle = '#5d5f6b';
    ctx.fillRect(p.x, p.y, b.w, b.h);
    ctx.fillStyle = '#7d7f8c';
    ctx.fillRect(p.x + 4, p.y + 4, b.w - 8, b.h - 8);
    ctx.strokeStyle = '#3c3e48';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 4, p.y + 4, b.w - 8, b.h - 8);
  }

  // Palms: trunk + five fronds.
  for (const palm of city.palms) {
    const p = toScreen(camera, palm.x, palm.y);
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 8);
    ctx.lineTo(p.x, p.y - 4);
    ctx.stroke();
    ctx.fillStyle = '#2f9e4f';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(p.x + Math.cos(a) * 7, p.y - 4 + Math.sin(a) * 7, 9, 3.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Boats and pickups sit on top of the terrain.
  for (const boat of city.boats) drawBoat(ctx, boat, camera);
  for (const pickup of city.pickups) drawPickup(ctx, pickup, camera);
}

export function drawPlayer(ctx, player, camera) {
  const p = toScreen(camera, player.x, player.y);
  const angle = player.angle || 0;
  // Shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  circle(ctx, p.x + 2, p.y + 3, 11);
  // Body.
  ctx.fillStyle = player.color || '#e8b13c';
  circle(ctx, p.x, p.y, 10);
  // Facing tick.
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(angle) * 14, p.y + Math.sin(angle) * 14);
  ctx.stroke();
  // Head.
  ctx.fillStyle = '#f2c89b';
  circle(ctx, p.x, p.y, 5);
}

export function drawCar(ctx, car, camera) {
  const p = toScreen(camera, car.x, car.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(car.angle || 0);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(-19, -9, 40, 22);
  ctx.fillStyle = car.color || '#c23b3b';
  ctx.fillRect(-20, -11, 40, 22);
  ctx.fillStyle = '#bfe3f2';
  ctx.fillRect(-4, -9, 12, 18);
  ctx.fillStyle = '#f2e6a0';
  ctx.fillRect(18, -8, 2, 4);
  ctx.fillRect(18, 4, 2, 4);
  ctx.restore();
}

export function drawPolice(ctx, cop, camera) {
  const p = toScreen(camera, cop.x, cop.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  circle(ctx, p.x + 2, p.y + 3, 11);
  ctx.fillStyle = '#2b4fd8';
  circle(ctx, p.x, p.y, 10);
  // Flashing light bar.
  ctx.fillStyle = '#ff2e2e';
  ctx.fillRect(p.x - 7, p.y - 16, 6, 4);
  ctx.fillStyle = '#2e7bff';
  ctx.fillRect(p.x + 1, p.y - 16, 6, 4);
  ctx.fillStyle = '#f2c89b';
  circle(ctx, p.x, p.y, 5);
}

export function drawPickup(ctx, pickup, camera) {
  const p = toScreen(camera, pickup.x, pickup.y);
  const colors = { health: '#3ddc5f', money: '#ffd23c', ammo: '#ff8c2e' };
  const glyphs = { health: '+', money: '$', ammo: 'A' };
  // Sparkle halo.
  ctx.fillStyle = colors[pickup.kind] || '#ffffff';
  ctx.globalAlpha = 0.35;
  circle(ctx, p.x, p.y, 14);
  ctx.globalAlpha = 1;
  circle(ctx, p.x, p.y, 9);
  ctx.fillStyle = '#1c1c1c';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyphs[pickup.kind] || '?', p.x, p.y + 0.5);
}

export function drawBoat(ctx, boat, camera) {
  const p = toScreen(camera, boat.x, boat.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(boat.angle || 0);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.ellipse(0, 0, 21, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e7fc2';
  ctx.fillRect(-6, -5, 12, 10);
  ctx.restore();
}
