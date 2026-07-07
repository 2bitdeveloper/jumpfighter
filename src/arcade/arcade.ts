// ============================================================
// 2BITARCADE - LANDING PAGE
// Intro video -> lazy-Susan cabinet selector -> games.
// The wallet connected here is restored inside every game via the
// shared localStorage keys 'walletType' / 'watchAddress'.
// ============================================================
import { playIntroVideo } from '../IntroVideo';

// --- SHARED ARCADE CONFIG (keep in sync with the games) ---
const CONTRACT_ADDRESS = "YOUR_CA_HERE";
const TARGET_TOKEN_MINT = "YOUR_TOKEN_MINT_ADDRESS_HERE";
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
const SUPABASE_URL = "https://drawbbapvytjytvbedtl.supabase.co";
const SUPABASE_KEY = "sb_publishable_zzdZsO1BCunEfdGwur6M4g_nUjW5pa2";
const INITIAL_TOKEN_SUPPLY = 1_000_000_000;

// defaultFeatured: seeds the lazy Susan until enough ratings exist to rank it.
// category: drives the catalog filter chips.
interface Game { id: string; title: string; desc: string; img: string; url: string; category: string; defaultFeatured?: boolean; unranked?: boolean; }
const GAMES: Game[] = [
    {
        id: 'origami', defaultFeatured: true, category: 'Platformer',
        title: 'ORIGAMI ASCENT',
        desc: 'Embark on a breathtaking journey through the endless sky in Origami Ascent, a beautifully crafted 2D papercraft platformer where precision meets serenity.',
        img: './arcade/origami_arcade.png',
        url: './origami.html',
    },
    {
        id: 'jumpfighter', defaultFeatured: true, category: 'Arcade',
        title: 'JUMPFIGHTER',
        desc: 'Pilot your Jump Fighter! Dodge deadly lasers, unlock epic ships, and survive.',
        img: './arcade/jumpfighter_arcade.png',
        url: './jumpfighter.html',
    },
    {
        id: 'radiusraid', defaultFeatured: true, category: 'Shooter',
        title: 'RADIUS RAID',
        desc: 'A relentless space shoot-\u2019em-up: 13 enemy types, screen-shaking explosions and neon particle chaos. How long can you hold the center?',
        img: './arcade/radiusraid_arcade.png',
        url: './rraid.html',
    },
    {
        id: 'bullethell', category: 'Shooter',
        title: 'BULLET HELL',
        desc: 'Weave through storms of enemy fire in this frantic danmaku shooter. Bank your bombs, clear the screen, and push your score before the patterns swallow you.',
        img: './arcade/bullethell_arcade.png',
        url: './bullethell.html',
    },
    {
        id: 'spacepi', category: 'Shooter',
        title: 'SPACEPI',
        desc: 'Defend your home world across 13 escalating levels of orbital combat. Precise mouse-aim gunnery, chained accuracy bonuses, and a rising cumulative score on the champion boards.',
        img: './arcade/spacepi_arcade.png',
        url: './spacepi.html',
    },
    {
        id: 'luckyalien', category: 'Platformer',
        title: 'LUCKY ALIEN',
        desc: 'A retro jungle platformer in the classic console tradition. Dash and jump through Grassland and Forest, grab powerups, collect coins, and take down the boss. The more coins you bank in a run, the higher you climb the boards.',
        img: './arcade/luckyalien_arcade.png',
        url: './luckyalien.html',
    },
    {
        id: 'neonrunner', category: 'Runner',
        title: 'NEON RUNNER',
        desc: 'An original 2bitArcade cabinet. A pixel robot dashes through an endless neon cyber city \u2014 leap the barriers, duck the drones, and outrun a speed that never stops climbing. Distance is everything.',
        img: './arcade/neonrunner_arcade.png',
        url: './neonrunner.html',
    },
];

// --- ratings state ---
let ratings: Record<string, { avg: number; count: number; mine: number }> = {};
const PER_PAGE = 8;
let catalogPage = 0;
let activeCategory = 'All';

const sbHeaders = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

// ============================================================
// LAZY SUSAN CAROUSEL
// ============================================================
let susanIndex = 0;
let susanAngle = 0;
let autoSpinTimer: ReturnType<typeof setInterval> | null = null;
let lastSwipeAt = 0; // suppress the click that follows a swipe
let FEATURED: Game[] = GAMES.filter(g => g.defaultFeatured); // reseeded once ratings load
let STEP = 360 / Math.max(1, FEATURED.length);

// Top 3 by average rating; ties and unrated games fall back to default-featured order.
function computeFeatured() {
    const rated = [...GAMES].filter(g => ratings[g.id]?.count > 0);
    if (rated.length === 0) { FEATURED = GAMES.filter(g => g.defaultFeatured); }
    else {
        rated.sort((a, b) => (ratings[b.id].avg - ratings[a.id].avg) || (ratings[b.id].count - ratings[a.id].count));
        const top = rated.slice(0, 3);
        // pad to 3 with default-featured games not already included
        for (const g of GAMES) { if (top.length >= 3) break; if (!top.includes(g) && g.defaultFeatured) top.push(g); }
        FEATURED = top;
    }
    STEP = 360 / Math.max(1, FEATURED.length);
    susanIndex = Math.min(susanIndex, FEATURED.length - 1);
}

function buildSusan() {
    const ring = document.getElementById('susan-ring');
    if (!ring) return;
    ring.innerHTML = '';
    FEATURED.forEach((g, i) => {
        const panel = document.createElement('div');
        panel.className = 'susan-panel';
        panel.dataset.index = i.toString();
        panel.style.transform = `rotateY(${i * STEP}deg) translateZ(var(--susan-radius))`;
        if (g.img) {
            const img = document.createElement('img');
            img.src = g.img; img.alt = g.title; img.draggable = false;
            // Cabinet art not uploaded yet? Fall back to a styled title card
            img.onerror = () => {
                panel.innerHTML = `<div class="soon-card"><span>\u25B6</span><p>${g.title.replace(' ', '<br>')}</p></div>`;
            };
            panel.appendChild(img);
        } else {
            panel.classList.add('coming-soon');
            panel.innerHTML = `<div class="soon-card"><span>?</span><p>MORE GAMES<br>COMING SOON</p></div>`;
        }
        panel.addEventListener('click', () => {
            if (Date.now() - lastSwipeAt < 350) return; // that "click" was the end of a swipe
            const target = parseInt(panel.dataset.index!);
            if (target === susanIndex && FEATURED[target].url) { launchGame(FEATURED[target].url!); return; }
            rotateTo(target);
        });
        ring.appendChild(panel);
    });
    applyRotation();
    updateInfo();
    startAutoSpin();
}

function rotateBy(dir: number) {
    susanIndex = (susanIndex + dir + FEATURED.length) % FEATURED.length;
    susanAngle -= dir * STEP;
    applyRotation(); updateInfo(); startAutoSpin();
}

function rotateTo(target: number) {
    const diff = (target - susanIndex + FEATURED.length) % FEATURED.length;
    rotateBy(diff > FEATURED.length / 2 ? diff - FEATURED.length : diff);
}

function applyRotation() {
    const ring = document.getElementById('susan-ring');
    if (!ring) return;
    ring.style.transform = `rotateY(${susanAngle}deg)`;
    document.querySelectorAll('.susan-panel').forEach((p) => {
        p.classList.toggle('active', parseInt((p as HTMLElement).dataset.index!) === susanIndex);
    });
}

function updateInfo() {
    const g = FEATURED[susanIndex];
    const title = document.getElementById('game-title');
    const desc = document.getElementById('game-desc');
    const playBtn = document.getElementById('play-btn') as HTMLButtonElement | null;
    if (title) title.textContent = g.title;
    if (desc) desc.textContent = g.desc;
    if (playBtn) {
        if (g.url) { playBtn.style.display = 'inline-block'; playBtn.textContent = 'INSERT COIN \u25B6 PLAY'; }
        else { playBtn.style.display = 'none'; }
    }
}

function startAutoSpin() {
    if (autoSpinTimer) clearInterval(autoSpinTimer);
    autoSpinTimer = setInterval(() => rotateBy(1), 6000);
}

function launchGame(url: string) { window.location.href = url; }

// ---------- RATINGS ----------
async function fetchRatings() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_ratings`, {
            method: 'POST', headers: sbHeaders,
            body: JSON.stringify({ p_wallet: userPublicKey || '' })
        });
        const rows = await res.json();
        ratings = {};
        if (Array.isArray(rows)) {
            for (const r of rows) ratings[r.game_id] = { avg: Number(r.avg_stars) || 0, count: Number(r.vote_count) || 0, mine: r.my_stars || 0 };
        }
    } catch (e) { /* ratings RPC not deployed yet - stars show as unrated */ }
    computeFeatured();
    buildSusan();
    buildCatalog();
}

async function submitRating(gameId: string, stars: number) {
    if (!walletConnected || !userPublicKey) { alert('Connect your wallet to rate games.'); return; }
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rate_game`, {
            method: 'POST', headers: sbHeaders,
            body: JSON.stringify({ p_game: gameId, p_wallet: userPublicKey, p_stars: stars })
        });
        if (await res.json() === true) await fetchRatings();
    } catch (e) {}
}

function starRow(gameId: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cat-stars' + (walletConnected ? '' : ' readonly');
    const r = ratings[gameId];
    const filled = r ? Math.round(r.avg) : 0;
    const mine = r?.mine || 0;
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star' + (i <= (mine || filled) ? ' filled' : '');
        star.textContent = '\u2605';
        if (walletConnected) {
            star.title = `Rate ${i}/5`;
            star.addEventListener('click', (e) => { e.stopPropagation(); submitRating(gameId, i); });
        }
        wrap.appendChild(star);
    }
    return wrap;
}

// ---------- FULL CATALOG GRID (paginated, filterable) ----------
function categories(): string[] {
    return ['All', ...Array.from(new Set(GAMES.map(g => g.category)))];
}

function buildCategoryBar() {
    const bar = document.getElementById('catalog-categories');
    if (!bar) return;
    bar.innerHTML = '';
    categories().forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'cat-chip' + (cat === activeCategory ? ' active' : '');
        chip.textContent = cat.toUpperCase();
        chip.addEventListener('click', () => { activeCategory = cat; catalogPage = 0; buildCatalog(); });
        bar.appendChild(chip);
    });
}

function buildCatalog() {
    buildCategoryBar();
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = GAMES.filter(g => activeCategory === 'All' || g.category === activeCategory);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    catalogPage = Math.min(catalogPage, totalPages - 1);
    const pageGames = filtered.slice(catalogPage * PER_PAGE, catalogPage * PER_PAGE + PER_PAGE);

    pageGames.forEach((g) => {
        const tile = document.createElement('div');
        tile.className = 'cat-tile';
        const img = document.createElement('img');
        img.src = g.img; img.alt = g.title;
        img.onerror = () => { img.style.display = 'none'; };
        tile.appendChild(img);
        const h3 = document.createElement('h3'); h3.textContent = g.title; tile.appendChild(h3);
        tile.appendChild(starRow(g.id));
        const r = ratings[g.id];
        const meta = document.createElement('div');
        meta.className = 'cat-rating-meta';
        if (g.unranked) meta.innerHTML = '<span class="cat-unranked">UNRANKED</span>';
        else meta.textContent = r && r.count > 0 ? `${r.avg.toFixed(1)} \u2605 (${r.count})` : 'Not yet rated';
        tile.appendChild(meta);
        const p = document.createElement('p'); p.textContent = g.desc; tile.appendChild(p);
        const play = document.createElement('span'); play.className = 'cat-play'; play.textContent = '\u25B6 PLAY'; tile.appendChild(play);
        tile.addEventListener('click', () => { if (g.url) launchGame(g.url); });
        grid.appendChild(tile);
    });

    // "coming soon" tile only on the last page of the All view
    if (activeCategory === 'All' && catalogPage === totalPages - 1 && pageGames.length < PER_PAGE) {
        const soon = document.createElement('div');
        soon.className = 'cat-tile cat-soon';
        soon.innerHTML = `<h3>MORE GAMES COMING</h3><p>Building something? Hit CONTACT US and pitch your game.</p><span class="cat-play">\u2026</span>`;
        grid.appendChild(soon);
    }

    const label = document.getElementById('cat-page-label');
    if (label) label.textContent = `PAGE ${catalogPage + 1} / ${totalPages}`;
    const prev = document.getElementById('cat-prev') as HTMLButtonElement | null;
    const next = document.getElementById('cat-next') as HTMLButtonElement | null;
    const pager = document.getElementById('catalog-pager');
    if (pager) pager.style.display = totalPages > 1 ? 'flex' : 'none';
    if (prev) prev.disabled = catalogPage === 0;
    if (next) next.disabled = catalogPage >= totalPages - 1;
}

// ---------- ARROWS + KEYBOARD + SWIPE ----------
function wireInputs() {
    // The carousel arrow buttons (this wiring was missing - keyboard worked, clicks didn't)
    document.getElementById('susan-left')?.addEventListener('click', () => rotateBy(-1));
    document.getElementById('susan-right')?.addEventListener('click', () => rotateBy(1));

    // Arrow keys rotate, Enter launches the front cabinet
    window.addEventListener('keydown', (e) => {
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return; // typing a wallet address
        if (document.getElementById('intro-video-overlay')) return; // intro handles its own keys
        if (e.key === 'ArrowLeft') { e.preventDefault(); rotateBy(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); rotateBy(1); }
        else if (e.key === 'Enter') {
            const g = FEATURED[susanIndex];
            if (g.url) launchGame(g.url);
        }
    });

    // Horizontal swipe / drag on the carousel stage
    const stage = document.getElementById('susan-stage');
    if (stage) {
        let startX = 0, startY = 0, tracking = false;
        stage.addEventListener('pointerdown', (e) => { tracking = true; startX = e.clientX; startY = e.clientY; });
        stage.addEventListener('pointerup', (e) => {
            if (!tracking) return; tracking = false;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                lastSwipeAt = Date.now();
                rotateBy(dx < 0 ? 1 : -1); // swipe left -> next cabinet
            }
        });
        stage.addEventListener('pointercancel', () => { tracking = false; });
    }
}

// ============================================================
// LIVE STATS
// ============================================================
const presenceSessionId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function fetchActivePilots() {
    const el = document.getElementById('stat-pilots');
    if (!el) return;
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_active_pilots`, { method: 'POST', headers: sbHeaders, body: '{}' });
        const count = await res.json();
        if (typeof count === 'number') { el.innerHTML = `\u25CF ${count.toLocaleString()} Active Player${count === 1 ? '' : 's'}`; return; }
        throw new Error();
    } catch (e) { el.innerHTML = '\u25CF -- Active Players'; }
}

function formatCompact(n: number): string {
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
    return Math.floor(n).toString();
}

async function fetchTokensBurned() {
    const el = document.getElementById('stat-burned');
    if (!el) return;
    try {
        const res = await fetch(SOLANA_RPC_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply', params: [TARGET_TOKEN_MINT] })
        });
        const data = await res.json();
        const supply = data.result?.value?.uiAmount;
        if (typeof supply === 'number') {
            const burned = Math.max(0, INITIAL_TOKEN_SUPPLY - supply);
            el.innerHTML = `\uD83D\uDD25 ${formatCompact(burned)} $2BA Burned`;
            return;
        }
        throw new Error();
    } catch (e) { el.innerHTML = '\uD83D\uDD25 -- $2BA Burned'; }
}

function startPresence() {
    const beat = () => {
        if (document.visibilityState === 'hidden') return;
        fetch(`${SUPABASE_URL}/rest/v1/rpc/pilot_heartbeat`, { method: 'POST', headers: sbHeaders, body: JSON.stringify({ p_session_id: presenceSessionId }) }).catch(() => {});
    };
    beat(); setInterval(beat, 45000);
    fetchActivePilots(); fetchTokensBurned();
    setInterval(() => { fetchActivePilots(); fetchTokensBurned(); }, 60000);
}

// ============================================================
// WALLET (shared with the games via localStorage)
// ============================================================
let walletConnected = false, userPublicKey = '', tokenBalance = 0;

function walletLabel() {
    const btn = document.getElementById('wallet-btn');
    if (!btn) return;
    if (walletConnected) {
        const short = `${userPublicKey.substring(0, 4)}..${userPublicKey.substring(userPublicKey.length - 4)}`;
        const watch = localStorage.getItem('watchAddress') === userPublicKey ? '[WATCH] ' : '';
        btn.textContent = `${watch}${short} \u2502 ${Math.floor(tokenBalance).toLocaleString()} $2BA`;
    } else btn.textContent = 'CONNECT WALLET';
}

async function syncBalance() {
    if (!userPublicKey) return;
    try {
        const res = await fetch(SOLANA_RPC_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner', params: [userPublicKey, { mint: TARGET_TOKEN_MINT }, { encoding: 'jsonParsed' }] })
        });
        const data = await res.json();
        const accounts = data.result?.value || [];
        tokenBalance = accounts.length > 0 ? accounts[0].account.data.parsed.info.tokenAmount.uiAmount || 0 : 0;
    } catch (e) {}
    walletLabel();
}

async function restoreWallet() {
    const walletType = localStorage.getItem('walletType');
    if (walletType) {
        const w = window as any;
        const provider = walletType === 'phantom' ? (w.phantom?.solana || w.solana)
            : walletType === 'solflare' ? w.solflare : w.backpack;
        if (provider) {
            try {
                const resp = await provider.connect({ onlyIfTrusted: true });
                userPublicKey = resp?.publicKey?.toString() || provider.publicKey?.toString() || '';
                if (userPublicKey) { walletConnected = true; await syncBalance(); return; }
            } catch (e) {}
        }
    }
    const watchAddr = localStorage.getItem('watchAddress');
    if (watchAddr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(watchAddr)) {
        userPublicKey = watchAddr; walletConnected = true; await syncBalance();
    }
}

function showWalletModal() {
    if (document.getElementById('arcade-wallet-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'arcade-wallet-modal';
    overlay.innerHTML = `
      <div class="wm-dialog">
        <h2>SELECT WALLET</h2>
        <button class="wm-btn" data-type="phantom">1. PHANTOM</button>
        <button class="wm-btn" data-type="solflare">2. SOLFLARE</button>
        <button class="wm-btn" data-type="backpack">3. BACKPACK</button>
        <button class="wm-btn wm-watch" data-type="watch">4. PUMP.FUN / WALLET ADDRESS</button>
        <div id="wm-watch-entry" style="display:none;">
          <p class="wm-hint">Pump.fun players: open pump.fun, tap your profile picture, and copy your wallet
          address. Holding $2BA there unlocks everything across the arcade. Revives (burns) need a signing
          wallet &mdash; import your pump.fun key into Phantom for those.</p>
          <input id="wm-addr" type="text" placeholder="Solana wallet address..." spellcheck="false" autocomplete="off" />
          <div id="wm-err"></div>
          <button class="wm-btn wm-go">CONNECT (READ-ONLY)</button>
        </div>
        ${walletConnected ? '<button class="wm-disconnect">[ DISCONNECT ]</button>' : ''}
        <button class="wm-cancel">[ CLOSE ]</button>
      </div>`;
    document.body.appendChild(overlay);

    const providers: Record<string, () => any> = {
        phantom: () => (window as any).phantom?.solana || (window as any).solana,
        solflare: () => (window as any).solflare,
        backpack: () => (window as any).backpack,
    };
    const urls: Record<string, string> = { phantom: 'https://phantom.app/', solflare: 'https://solflare.com/', backpack: 'https://backpack.app/' };

    overlay.querySelectorAll('.wm-btn:not(.wm-go)').forEach(btn => btn.addEventListener('click', async () => {
        const type = (btn as HTMLElement).dataset.type!;
        if (type === 'watch') { (document.getElementById('wm-watch-entry')!).style.display = 'block'; return; }
        const provider = providers[type]();
        if (!provider) { window.open(urls[type], '_blank'); return; }
        try {
            const resp = await provider.connect();
            userPublicKey = resp.publicKey ? resp.publicKey.toString() : resp.toString();
            walletConnected = true;
            (window as any).activeSolanaProvider = provider;
            localStorage.setItem('walletType', type);
            localStorage.removeItem('watchAddress');
            await syncBalance();
            overlay.remove();
        } catch (e) { console.error('Wallet connect rejected', e); }
    }));

    overlay.querySelector('.wm-go')?.addEventListener('click', async () => {
        const addr = (document.getElementById('wm-addr') as HTMLInputElement).value.trim();
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) {
            document.getElementById('wm-err')!.textContent = 'INVALID ADDRESS. Check for typos.'; return;
        }
        userPublicKey = addr; walletConnected = true;
        localStorage.setItem('watchAddress', addr);
        localStorage.removeItem('walletType');
        await syncBalance();
        overlay.remove();
    });

    overlay.querySelector('.wm-disconnect')?.addEventListener('click', () => {
        walletConnected = false; userPublicKey = ''; tokenBalance = 0;
        localStorage.removeItem('walletType'); localStorage.removeItem('watchAddress');
        walletLabel(); overlay.remove();
    });
    overlay.querySelector('.wm-cancel')?.addEventListener('click', () => overlay.remove());
}

// ============================================================
// CONTACT US (logged to Supabase via the submit_feedback RPC)
// ============================================================
function showContactModal() {
    if (document.getElementById('arcade-contact-modal')) return;
    const overlay = document.createElement('div');
    overlay.id = 'arcade-contact-modal';
    overlay.innerHTML = `
      <div class="wm-dialog">
        <h2>WRITE TO US</h2>
        <p class="wm-hint">Question, bug report, or a game you want hosted in the arcade &mdash;
        drop it here and we'll get back to you.</p>
        <select id="ct-category" class="ct-select">
          <option value="feedback">Feedback</option>
          <option value="complaint">Complaint</option>
          <option value="pitch">Pitch your game</option>
        </select>
        <input id="ct-name" class="ct-field" type="text" placeholder="Username / handle" maxlength="40" autocomplete="off" />
        <input id="ct-email" class="ct-field" type="email" placeholder="Email address" maxlength="254" autocomplete="off" />
        <textarea id="ct-msg" class="ct-field" placeholder="Your message..." maxlength="2000" rows="5"></textarea>
        <div id="ct-err"></div>
        <button class="wm-btn wm-go" id="ct-send">SEND TRANSMISSION</button>
        <button class="wm-cancel">[ CLOSE ]</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.wm-cancel')?.addEventListener('click', () => overlay.remove());

    // Auto-populate the username from the connected wallet (still editable)
    if (walletConnected && userPublicKey) {
        (document.getElementById('ct-name') as HTMLInputElement).value =
            `WL_${userPublicKey.substring(0, 6)}`;
    }

    overlay.querySelector('#ct-send')?.addEventListener('click', async () => {
        const name = (document.getElementById('ct-name') as HTMLInputElement).value.trim();
        const email = (document.getElementById('ct-email') as HTMLInputElement).value.trim();
        const msg = (document.getElementById('ct-msg') as HTMLTextAreaElement).value.trim();
        const err = document.getElementById('ct-err')!;
        if (name.length < 2) { err.textContent = 'ENTER A USERNAME (2+ CHARACTERS).'; return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'ENTER A VALID EMAIL ADDRESS.'; return; }
        if (msg.length < 5) { err.textContent = 'YOUR MESSAGE IS TOO SHORT.'; return; }
        err.textContent = '';
        const btn = document.getElementById('ct-send') as HTMLButtonElement;
        btn.textContent = 'TRANSMITTING...'; btn.disabled = true;
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_feedback`, {
                method: 'POST', headers: sbHeaders,
                body: JSON.stringify({ p_email: email, p_username: name, p_message: msg, p_category: (document.getElementById('ct-category') as HTMLSelectElement).value })
            });
            const ok = await res.json();
            if (ok === true) {
                (overlay.querySelector('.wm-dialog') as HTMLElement).innerHTML =
                    '<h2>\u2705 TRANSMISSION RECEIVED</h2><p class="wm-hint" style="text-align:center;">Thanks! We read everything and reply by email.</p>';
                setTimeout(() => overlay.remove(), 2500);
            } else { throw new Error('rejected'); }
        } catch (e) {
            err.textContent = 'TRANSMISSION FAILED. PLEASE TRY AGAIN.';
            btn.textContent = 'SEND TRANSMISSION'; btn.disabled = false;
        }
    });
}

// ============================================================
// CONTRACT ADDRESS CHIP
// ============================================================
function setupCA() {
    const chip = document.getElementById('ca-chip');
    const text = document.getElementById('ca-text');
    if (!chip || !text) return;
    const shortCA = CONTRACT_ADDRESS.length > 20 ? `${CONTRACT_ADDRESS.substring(0, 10)}...${CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 6)}` : CONTRACT_ADDRESS;
    text.textContent = shortCA;
    chip.addEventListener('click', () => {
        try { navigator.clipboard.writeText(CONTRACT_ADDRESS); } catch (e) {}
        text.textContent = 'COPIED TO CLIPBOARD!';
        setTimeout(() => { text.textContent = shortCA; }, 1500);
    });
}

// ============================================================
// BOOT - runs whether or not DOMContentLoaded already fired,
// and never lets one failing subsystem kill the others.
// ============================================================
function boot() {
    const safe = (label: string, fn: () => void) => {
        try { fn(); } catch (e) { console.error(`[ARCADE] ${label} failed:`, e); }
    };
    safe('carousel', buildSusan);
    safe('catalog', buildCatalog);
    safe('pager', () => {
        document.getElementById('cat-prev')?.addEventListener('click', () => { if (catalogPage > 0) { catalogPage--; buildCatalog(); } });
        document.getElementById('cat-next')?.addEventListener('click', () => { catalogPage++; buildCatalog(); });
    });
    safe('ratings', fetchRatings);
    safe('inputs', wireInputs);
    safe('ca', setupCA);
    safe('stats', startPresence);
    safe('wallet', () => { restoreWallet().then(walletLabel); });
    safe('buttons', () => {
        document.getElementById('play-btn')?.addEventListener('click', () => {
            const g = FEATURED[susanIndex];
            if (g.url) launchGame(g.url);
        });
        document.getElementById('wallet-btn')?.addEventListener('click', showWalletModal);
        document.getElementById('contact-btn')?.addEventListener('click', showContactModal);
    });
    safe('intro', () => {
        if (sessionStorage.getItem('introPlayed')) return; // once per visit, not per navigation
        sessionStorage.setItem('introPlayed', '1');
        playIntroVideo({ src: './intro.mp4', showOncePerPlayer: false });
    });
    // Belt-and-braces: if the intro overlay somehow sticks, kill it
    setTimeout(() => document.getElementById('intro-video-overlay')?.remove(), 25000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot(); // DOM was already parsed by the time this module ran
}
