// ============================================================
// SPACEPI <-> 2BITARCADE BRIDGE
// The instance is exposed as window.sp (one documented edit to the
// game's boot line). Cumulative score = sum of per-level bests in
// sp.user.levels[]. We submit whenever that total increases and the
// player is back at the level menu (i.e. a level just resolved).
// ============================================================
(function () {
  'use strict';
  var CFG = window.ARCADE_CONFIG || {};
  var SUPABASE_URL = CFG.SUPABASE_URL;
  var SUPABASE_KEY = CFG.SUPABASE_KEY;
  var BOARD_ID = 'spacepi';
  var MILESTONE_POINTS = 1000;

  var sbHeaders = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
  var guestName = 'Guest_' + (Math.floor(Math.random() * 9000) + 1000);
  var walletAddress = '';
  function playerName() {
    var custom = '';
    try { custom = localStorage.getItem('arcadeUsername') || ''; } catch (e) {}
    if (custom) return custom;
    return walletAddress ? 'WL_' + walletAddress.substring(0, 6) : guestName;
  }

  function restoreWalletIdentity() {
    try {
      var watch = localStorage.getItem('watchAddress');
      if (watch && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(watch)) { walletAddress = watch; return; }
      var type = localStorage.getItem('walletType');
      if (!type) return;
      var w = window;
      var provider = type === 'phantom' ? (w.phantom && w.phantom.solana) || w.solana
        : type === 'solflare' ? w.solflare : type === 'backpack' ? w.backpack : null;
      if (provider && provider.connect) {
        provider.connect({ onlyIfTrusted: true }).then(function (resp) {
          var pk = (resp && resp.publicKey && resp.publicKey.toString()) || (provider.publicKey && provider.publicKey.toString()) || '';
          if (pk) walletAddress = pk;
        }).catch(function () {});
      }
    } catch (e) {}
  }

  var sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  function heartbeat() {
    if (document.visibilityState === 'hidden') return;
    fetch(SUPABASE_URL + '/rest/v1/rpc/pilot_heartbeat', { method: 'POST', headers: sbHeaders, body: JSON.stringify({ p_session_id: sessionId }) }).catch(function () {});
  }

  // Cumulative best score across all 13 levels
  function totalScore() {
    try {
      var levels = window.sp && window.sp.user && window.sp.user.levels;
      if (!levels) return 0;
      var sum = 0;
      for (var i = 0; i < levels.length; i++) sum += (levels[i].score || 0);
      return Math.round(sum);
    } catch (e) { return 0; }
  }

  // Telemetry is milestone-based on the cumulative total. Because SpacePi
  // is a progress game (not a single timed run), the "run" is the whole
  // session; we emit a timestamp each time the total crosses a milestone
  // and submit the accumulated set after each increase.
  var telemetry = [], sessionStart = Date.now(), lastMilestone = 0, lastTotal = 0, submitTimer = null;

  function poll() {
    var total = totalScore();
    if (total <= lastTotal) return;
    lastTotal = total;
    while (total >= lastMilestone + MILESTONE_POINTS) {
      lastMilestone += MILESTONE_POINTS;
      var t = Date.now() - sessionStart;
      var prev = telemetry.length ? telemetry[telemetry.length - 1] : -1;
      telemetry.push(t <= prev ? prev + 1 : t);
    }
    // debounce submission so rapid level-end score ticks send once
    if (submitTimer) clearTimeout(submitTimer);
    submitTimer = setTimeout(submitRun, 1500);
  }

  function submitRun() {
    if (telemetry.length === 0) return;
    fetch(SUPABASE_URL + '/functions/v1/validate-score', {
      method: 'POST', headers: sbHeaders,
      body: JSON.stringify({ board_id: BOARD_ID, player_name: playerName(), telemetry: telemetry, wallet_address: walletAddress || null })
    }).catch(function () {});
  }

  function boot() {
    restoreWalletIdentity();
    heartbeat();
    setInterval(heartbeat, 45000);
    setInterval(poll, 500);
    window.addEventListener('beforeunload', submitRun);
    console.log('[SPACEPI] 2bitArcade bridge armed. Board: ' + BOARD_ID);
  }
  boot();
})();
