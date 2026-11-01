/* KHL Manager 9.38.0 — рейтинг игрока: постоянный (большая цифра) и текущий (разница под ним).
   Журнал постоянного рейтинга за 30 дней для «прокачки» (+N справа от постоянного). */
(function () {
  const proto = KHLManagerApp.prototype;
  const WINDOW = 30, KEEP = 60;

  proto.ratingView = function (p) {
    const perm = Math.round(this.permanentOVR(p)), now = Math.round(this.effectiveOVR(p));
    return { perm, now, diff: now - perm };
  };
  proto.ratingDiffHtml = function (diff, cls) {
    if (!diff) return '';
    return `<i class="rv-d ${diff > 0 ? 'up' : 'down'}${cls ? ' ' + cls : ''}">${diff > 0 ? '▲' : '▼'}${Math.abs(diff)}</i>`;
  };

  /* журнал изменений постоянного рейтинга: state.permLog[id] = [[день, рейтинг], ...] */
  proto.trackPerm = function () {
    if (!this.state || !this.db || !this.db.players) return;
    const log = this.state.permLog || (this.state.permLog = {}), day = this.state.dayIndex || 0;
    for (const p of this.db.players) {
      if (!this.playerDev(p)) continue;
      const v = this.permanentOVR(p), a = log[p.id];
      if (!a) { log[p.id] = [[day, v]]; continue; }
      if (a[a.length - 1][1] !== v) {
        a.push([day, v]);
        while (a.length > 2 && a[1][0] < day - KEEP) a.shift();
      }
    }
  };
  proto.permGrowth = function (p, days) {
    const a = this.state && this.state.permLog && this.state.permLog[p.id];
    if (!a || !a.length) return 0;
    const t = (this.state.dayIndex || 0) - (days || WINDOW);
    let v0 = a[0][1];
    for (const [d, v] of a) { if (d <= t) v0 = v; else break; }
    return Math.round(this.permanentOVR(p) - v0);
  };
  proto.growthHtml = function (g) {
    const cls = g > 0 ? 'up' : g < 0 ? 'down' : 'zero';
    return `<span class="rv-g ${cls}" title="Изменение постоянного рейтинга за ${WINDOW} дней">${g > 0 ? '+' + g : g < 0 ? '−' + Math.abs(g) : '0'}</span>`;
  };

  ['advanceDay', 'simulateMatch', 'completeLiveMatch'].forEach(name => {
    const base = proto[name];
    if (typeof base !== 'function') return;
    proto[name] = function () {
      const r = base.apply(this, arguments);
      try { this.trackPerm(); } catch (e) { console.warn('KHL Manager 9.38 permLog:', e); }
      return r;
    };
  });
})();
