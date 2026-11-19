// Crescent Bay — DOM HUD: money, district, wanted stars, health, ammo,
// toasts, objective text, and menu / pause / busted / wasted / mission-complete screens.

export class HUD {
  constructor(callbacks) {
    this.cb = callbacks || {};
    const $ = (id) => document.getElementById(id);
    this.el = {
      money: $('hud-money'),
      district: $('hud-district'),
      wanted: $('hud-wanted'),
      healthFill: $('hud-health-fill'),
      healthText: $('hud-health-text'),
      ammo: $('hud-ammo'),
      toast: $('hud-toast'),
      objective: $('hud-objective'),
      missionTimer: $('hud-mission-timer'),
      menu: $('overlay-menu'),
      pause: $('overlay-pause'),
      busted: $('overlay-busted'),
      wasted: $('overlay-wasted'),
      missionComplete: $('overlay-mission-complete'),
      continueBtn: $('btn-continue'),
      missionReward: $('mission-complete-reward'),
      bustedText: $('busted-text'),
      wastedText: $('wasted-text'),
    };
    this._toastTimer = null;
    this._bindButtons();
  }

  _bindButtons() {
    const on = (id, fn) => {
      const b = document.getElementById(id);
      if (b && fn) b.addEventListener('click', fn);
    };
    on('btn-new', () => this.cb.onNewGame && this.cb.onNewGame());
    on('btn-continue', () => this.cb.onContinue && this.cb.onContinue());
    on('btn-resume', () => this.cb.onResume && this.cb.onResume());
    on('btn-busted-resume', () => this.cb.onBustedResume && this.cb.onBustedResume());
    on('btn-wasted-resume', () => this.cb.onWastedResume && this.cb.onWastedResume());
    on('btn-mission-next', () => this.cb.onMissionNext && this.cb.onMissionNext());
  }

  update(state) {
    if (this.el.money) this.el.money.textContent = '$' + Math.floor(state.money);
    if (this.el.district) this.el.district.textContent = state.district || 'Crescent Bay';
    if (this.el.wanted) {
      const n = Math.max(0, Math.min(5, state.wanted || 0));
      this.el.wanted.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
      this.el.wanted.classList.toggle('wanted-hot', n > 0);
    }
    if (this.el.healthFill) this.el.healthFill.style.width = Math.max(0, Math.min(100, state.health)) + '%';
    if (this.el.healthText) this.el.healthText.textContent = Math.ceil(state.health) + ' HP';
    if (this.el.ammo) this.el.ammo.textContent = 'Ammo ' + state.ammo + '/' + state.mag;
    if (this.el.objective) this.el.objective.textContent = state.objective || '';
    if (this.el.missionTimer) {
      this.el.missionTimer.textContent = state.timeLeftMs ? this._fmtTime(state.timeLeftMs) : '';
    }
  }

  _fmtTime(ms) {
    const s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  toast(msg, ms = 2600) {
    if (!this.el.toast) return;
    this.el.toast.textContent = msg;
    this.el.toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.el.toast.classList.remove('show'), ms);
  }

  _hideAll() {
    for (const key of ['menu', 'pause', 'busted', 'wasted', 'missionComplete']) {
      if (this.el[key]) this.el[key].classList.add('hidden');
    }
  }

  showMenu(hasSave) {
    this._hideAll();
    if (this.el.menu) this.el.menu.classList.remove('hidden');
    if (this.el.continueBtn) this.el.continueBtn.classList.toggle('hidden', !hasSave);
  }

  showPause() {
    this._hideAll();
    if (this.el.pause) this.el.pause.classList.remove('hidden');
  }

  hideOverlays() {
    this._hideAll();
  }

  showBusted(lost) {
    this._hideAll();
    if (this.el.bustedText) this.el.bustedText.textContent = 'Polisi menangkapmu. Uang dipotong $' + Math.floor(lost) + ' (20%).';
    if (this.el.busted) this.el.busted.classList.remove('hidden');
  }

  showWasted(lost) {
    this._hideAll();
    if (this.el.wastedText) this.el.wastedText.textContent = 'Kamu tewas. Uang dipotong $' + Math.floor(lost) + ' (20%).';
    if (this.el.wasted) this.el.wasted.classList.remove('hidden');
  }

  showMissionComplete(reward, totalMoney) {
    this._hideAll();
    if (this.el.missionReward) {
      this.el.missionReward.textContent = 'MISI SELESAI  +$' + reward + '   •   Uang: $' + Math.floor(totalMoney);
    }
    if (this.el.missionComplete) this.el.missionComplete.classList.remove('hidden');
  }
}
