// ============================================================
// RADIUS RAID <-> 2BITARCADE BRIDGE
// Hooks the untouched engine via its global `$` object:
//   $.reset() fires on every new run  -> reset telemetry
//   $.setState('gameover')            -> submit the run
//   $.score polled at 10 Hz           -> one timestamp per 1,000 pts
// Zero edits to Jack Rugile's code.
// ============================================================
(function () {
  'use strict';

  var SUPABASE_URL = 'https://drawbbapvytjytvbedtl.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zzdZsO1BCunEfdGwur6M4g_nUjW5pa2';
  var BOARD_ID = 'radius_raid';
  var MILESTONE_POINTS = 1000;

  var sbHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  };

  var guestName = 'Guest_' + (Math.floor(Math.random() * 9000) + 1000);
  var walletAddress = '';

  function playerName() {
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
        : type === 'solflare' ? w.solflare
        : type === 'backpack' ? w.backpack : null;
      if (provider && provider.connect) {
        provider.connect({ onlyIfTrusted: true }).then(function (resp) {
          var pk = (resp && resp.publicKey && resp.publicKey.toString()) ||
                   (provider.publicKey && provider.publicKey.toString()) || '';
          if (pk) walletAddress = pk;
        }).catch(function () {});
      }
    } catch (e) {}
  }

  var sessionId = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now() + '-' + Math.random().toString(36).slice(2);

  function heartbeat() {
    if (document.visibilityState === 'hidden') return;
    fetch(SUPABASE_URL + '/rest/v1/rpc/pilot_heartbeat', {
      method: 'POST', headers: sbHeaders,
      body: JSON.stringify({ p_session_id: sessionId })
    }).catch(function () {});
  }

  var telemetry = [], runStart = 0, lastMilestone = 0, submitted = false;

  function resetRun() {
    telemetry = []; runStart = Date.now(); lastMilestone = 0; submitted = false;
  }

  function pollScore() {
    if (runStart === 0 || typeof window.$ === 'undefined') return;
    var score = window.$.score || 0;
    while (score >= lastMilestone + MILESTONE_POINTS) {
      lastMilestone += MILESTONE_POINTS;
      var t = Date.now() - runStart;
      var prev = telemetry.length ? telemetry[telemetry.length - 1] : -1;
      telemetry.push(t <= prev ? prev + 1 : t);
    }
  }

  function submitRun() {
    if (submitted || telemetry.length === 0) return;
    submitted = true;
    fetch(SUPABASE_URL + '/functions/v1/validate-score', {
      method: 'POST', headers: sbHeaders,
      body: JSON.stringify({ board_id: BOARD_ID, player_name: playerName(), telemetry: telemetry })
    }).catch(function () {});
  }

  function hook() {
    var g = window.$;
    if (!g || typeof g.setState !== 'function' || typeof g.reset !== 'function') {
      setTimeout(hook, 100); return;
    }
    var origReset = g.reset;
    g.reset = function () { resetRun(); return origReset.apply(this, arguments); };

    var origSetState = g.setState;
    g.setState = function (state) {
      // final score is captured before submission by one last poll
      if (state === 'gameover') { pollScore(); submitRun(); }
      return origSetState.apply(this, arguments);
    };

    setInterval(pollScore, 100);
    console.log('[RADIUS RAID] 2bitArcade bridge armed. Board: ' + BOARD_ID);
  }

  restoreWalletIdentity();
  heartbeat();
  setInterval(heartbeat, 45000);
  hook();
})();
