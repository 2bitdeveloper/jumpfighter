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

const GAMES = [
    {
        id: 'origami',
        title: 'ORIGAMI ASCENT',
        desc: 'Embark on a breathtaking journey through the endless sky in Origami Ascent, a beautifully crafted 2D papercraft platformer where precision meets serenity.',
        img: './arcade/origami_arcade.png',
        url: './origami.html',
    },
    {
        id: 'jumpfighter',
        title: 'JUMPFIGHTER',
        desc: 'Pilot your Jump Fighter! Dodge deadly lasers, unlock epic ships, and survive.',
        img: './arcade/jumpfighter_arcade.png',
        url: './jumpfighter.html',
    },
    {
        id: 'soon',
        title: 'MORE GAMES COMING',
        desc: 'A new cabinet is being wired up. Hold $2BA, climb the boards, and watch this space.',
        img: null,
        url: null,
    },
];

const sbHeaders = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

// ============================================================
// LAZY SUSAN CAROUSEL
// ============================================================
let susanIndex = 0;      // which game is front-and-center
let susanAngle = 0;      // current ring rotation in degrees
let autoSpinTimer: any = null;
const STEP = 360 / GAMES.length; // 120deg per panel

function buildSusan() {
    const ring = document.getElementById('susan-ring')!;
    GAMES.forEach((g, i) => {
        const panel = document.createElement('div');
        panel.className = 'susan-panel';
        panel.dataset.index = i.toString();
        panel.style.transform = `rotateY(${i * STEP}deg) translateZ(var(--susan-radius))`;
        if (g.img) {
            const img = document.createElement('img');
            img.src = g.img; img.alt = g.title; img.draggable = false;
            panel.appendChild(img);
        } else {
            panel.classList.add('coming-soon');
            panel.innerHTML = `<div class="soon-card"><span>?</span><p>MORE GAMES<br>COMING SOON</p></div>`;
        }
        panel.addEventListener('click', () => {
            const target = parseInt(panel.dataset.index!);
            if (target === susanIndex && GAMES[target].url) { launchGame(GAMES[target].url!); return; }
            rotateTo(target);
        });
        ring.appendChild(panel);
    });
    document.getElementById('susan-left')!.addEventListener('click', () => rotateBy(-1));
    document.getElementById('susan-right')!.addEventListener('click', () => rotateBy(1));
    applyRotation();
    updateInfo();
    startAutoSpin();
}

function rotateBy(dir: number) {
    susanIndex = (susanIndex + dir + GAMES.length) % GAMES.length;
    susanAngle -= dir * STEP; // ring turns opposite to bring the panel forward
    applyRotation(); updateInfo(); startAutoSpin();
}

function rotateTo(target: number) {
    const diff = (target - susanIndex + GAMES.length) % GAMES.length;
    rotateBy(diff === 2 ? -1 : diff); // shortest path on a 3-ring
}

function applyRotation() {
    const ring = document.getElementById('susan-ring')!;
    ring.style.transform = `rotateY(${susanAngle}deg)`;
    document.querySelectorAll('.susan-panel').forEach((p) => {
        p.classList.toggle('active', parseInt((p as HTMLElement).dataset.index!) === susanIndex);
    });
}

function updateInfo() {
    const g = GAMES[susanIndex];
    document.getElementById('game-title')!.textContent = g.title;
    document.getElementById('game-desc')!.textContent = g.desc;
    const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    if (g.url) { playBtn.style.display = 'inline-block'; playBtn.textContent = 'INSERT COIN \u25B6 PLAY'; }
    else { playBtn.style.display = 'none'; }
}

function startAutoSpin() {
    if (autoSpinTimer) clearInterval(autoSpinTimer);
    autoSpinTimer = setInterval(() => rotateBy(1), 6000); // the lazy in lazy Susan
}

function launchGame(url: string) {
    window.location.href = url;
}
document.getElementById('play-btn')!.addEventListener('click', () => {
    const g = GAMES[susanIndex];
    if (g.url) launchGame(g.url);
});

// ============================================================
// LIVE STATS
// ============================================================
const presenceSessionId = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function fetchActivePilots() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_active_pilots`, { method: 'POST', headers: sbHeaders, body: '{}' });
        const count = await res.json();
        if (typeof count === 'number') document.getElementById('stat-pilots')!.innerHTML = `\u25CF ${count.toLocaleString()} Active Pilot${count === 1 ? '' : 's'}`;
    } catch (e) { document.getElementById('stat-pilots')!.innerHTML = '\u25CF -- Active Pilots'; }
}

function formatCompact(n: number): string {
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
    return Math.floor(n).toString();
}

async function fetchTokensBurned() {
    try {
        const res = await fetch(SOLANA_RPC_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply', params: [TARGET_TOKEN_MINT] })
        });
        const data = await res.json();
        const supply = data.result?.value?.uiAmount;
        if (typeof supply === 'number') {
            const burned = Math.max(0, INITIAL_TOKEN_SUPPLY - supply);
            document.getElementById('stat-burned')!.innerHTML = `\uD83D\uDD25 ${formatCompact(burned)} $2BA Burned`;
            return;
        }
        throw new Error();
    } catch (e) { document.getElementById('stat-burned')!.innerHTML = '\uD83D\uDD25 -- $2BA Burned'; }
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
    const btn = document.getElementById('wallet-btn')!;
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
            localStorage.setItem('walletType', type);   // games silently reconnect with this
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
        localStorage.setItem('watchAddress', addr);     // games read this too
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

document.getElementById('wallet-btn')!.addEventListener('click', showWalletModal);

// ============================================================
// CONTRACT ADDRESS CHIP
// ============================================================
function setupCA() {
    const chip = document.getElementById('ca-chip')!;
    const text = document.getElementById('ca-text')!;
    const shortCA = CONTRACT_ADDRESS.length > 20 ? `${CONTRACT_ADDRESS.substring(0, 10)}...${CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 6)}` : CONTRACT_ADDRESS;
    text.textContent = shortCA;
    chip.addEventListener('click', () => {
        try { navigator.clipboard.writeText(CONTRACT_ADDRESS); } catch (e) {}
        text.textContent = 'COPIED TO CLIPBOARD!';
        setTimeout(() => { text.textContent = shortCA; }, 1500);
    });
}

// ============================================================
// BOOT: intro video over the landing, then the arcade
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    buildSusan();
    setupCA();
    startPresence();
    restoreWallet().then(walletLabel);
    playIntroVideo({ src: './intro.mp4', showOncePerPlayer: false });
});
