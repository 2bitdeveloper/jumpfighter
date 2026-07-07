// ============================================================
// BULLETHELL <-> 2BITARCADE BRIDGE
// p5.js game with top-level globals (score, pl, resetGame).
// No game-over screen: death reverts to the last level checkpoint,
// so we submit the run's peak score on each death and on level-up.
// Engine untouched; this wraps the global functions.
// ============================================================
(function () {
  'use strict';
  var SUPABASE_URL = 'https://drawbbapvytjytvbedtl.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zzdZsO1BCunEfdGwur6M4g_nUjW5pa2';
  var BOARD_ID = 'bullethell';
  var MILESTONE_POINTS = 250;

  var sbHeaders = { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
  var guestName = 'Guest_' + (Math.floor(Math.random() * 9000) + 1000);
  var walletAddress = '';
  function playerName() { return walletAddress ? 'WL_' + walletAddress.substring(0, 6) : guestName; }

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

  // A "run" spans from a fresh game (resetGame) to the moment the player
  // stops improving. We track peak score and emit milestone timestamps,
  // submitting the accumulated telemetry whenever the player dies.
  var telemetry = [], runStart = 0, lastMilestone = 0, peak = 0;

  function resetRun() { telemetry = []; runStart = Date.now(); lastMilestone = 0; peak = 0; }

  function poll() {
    if (runStart === 0 || typeof window.score !== 'number') return;
    if (window.score > peak) peak = window.score;
    while (peak >= lastMilestone + MILESTONE_POINTS) {
      lastMilestone += MILESTONE_POINTS;
      var t = Date.now() - runStart;
      var prev = telemetry.length ? telemetry[telemetry.length - 1] : -1;
      telemetry.push(t <= prev ? prev + 1 : t);
    }
  }

  function submitRun() {
    poll();
    if (telemetry.length === 0) return;
    var payload = JSON.stringify({ board_id: BOARD_ID, player_name: playerName(), telemetry: telemetry });
    fetch(SUPABASE_URL + '/functions/v1/validate-score', { method: 'POST', headers: sbHeaders, body: payload }).catch(function () {});
  }

  function hook() {
    // resetGame is a top-level function in main.js
    if (typeof window.resetGame !== 'function' || typeof window.reloadLevel !== 'function') { setTimeout(hook, 120); return; }

    var origReset = window.resetGame;
    window.resetGame = function () { var r = origReset.apply(this, arguments); resetRun(); return r; };

    // Death reverts to checkpoint via reloadLevel(); submit the run's peak there.
    // (Called on every death AND on manual restart, which is the correct moment
    //  to bank a run's best score since there is no explicit game-over.)
    var origReload = window.reloadLevel;
    window.reloadLevel = function () { submitRun(); return origReload.apply(this, arguments); };

    resetRun();
    setInterval(poll, 150);
    // flush on tab close so a run isn't lost if they leave mid-game
    window.addEventListener('beforeunload', submitRun);
    console.log('[BULLETHELL] 2bitArcade bridge armed. Board: ' + BOARD_ID);
  }

  restoreWalletIdentity();
  heartbeat();
  setInterval(heartbeat, 45000);
  hook();
})();
