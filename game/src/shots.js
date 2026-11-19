// Crescent Bay — screenshot modes (?shot=start|play|end, ?seed=1).
import { CONFIG } from './config.js';

function roadCenter(game) {
  const roads = game.city.roads || [];
  if (!roads.length) return { x: 1000, y: 500 };
  const r = roads[Math.floor(roads.length / 2)];
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function applyShotMode(game, params) {
  const shot = params.get('shot');
  if (shot === 'start') {
    game.state = 'menu';
    game.paused = true;
    game.hud.showMenu(false);
    game.hud.update(game._hudState());
  } else if (shot === 'play') {
    game.startNewGame();
    const spot = roadCenter(game);
    game.player.x = spot.x;
    game.player.y = spot.y;
    game.player.money = CONFIG.START_MONEY;
    game.player.wanted = 1;
    game.police.setWanted(1, performance.now());
    game.missions.startMission(0, performance.now());
    game.hud.toast('Misi 1: Pesan dari Selin — temui Selin di Marina.');
    game.hud.update(game._hudState());
  } else if (shot === 'end') {
    game.startNewGame();
    game.player.money = CONFIG.START_MONEY + CONFIG.MISSION_REWARDS[0];
    game.missions.completedMissions = [0];
    game.missions.active = null;
    game.state = 'mission-complete';
    game.paused = true;
    game.hud.showMissionComplete(CONFIG.MISSION_REWARDS[0], game.player.money);
    game.hud.update(game._hudState());
  }
}
