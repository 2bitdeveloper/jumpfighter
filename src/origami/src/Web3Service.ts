// ============================================================
// ORIGAMI ASCENT: WEB3 + SUPABASE SERVICE
// Mirrors Jump Fighter's integration. The wallet is connected on
// the Arcade home page; this service silently restores it here via
// the shared localStorage keys ('watchAddress' / 'walletType').
// ============================================================

export class Web3Service {
    // --- SHARED ARCADE CONFIG (keep in sync with the landing page & JF) ---
    public static readonly TARGET_TOKEN_MINT = "YOUR_TOKEN_MINT_ADDRESS_HERE";
    public static readonly SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
    private static readonly SUPABASE_URL = "https://drawbbapvytjytvbedtl.supabase.co";
    private static readonly SUPABASE_KEY = "sb_publishable_zzdZsO1BCunEfdGwur6M4g_nUjW5pa2";
    private static readonly BOARD_ID = "origami_ascent";

    // Guardian unlock ladder: crane is free, the rest gate on $2BA holdings.
    public static readonly CHARACTER_THRESHOLDS: Record<string, number> = {
        crane: 0, frog: 50000, fish: 100000, bunny: 250000,
        fox: 500000, kangaroo: 1000000, panda: 2500000, cat: 10000000,
    };

    public static walletConnected = false;
    public static userPublicKey = "";
    public static tokenBalance = 0;
    public static rewardUnlockUntil = 0; // epoch ms (daily/weekly champion reward)

    private static sessionPlayerName = `Guest_${Math.floor(Math.random() * 9000) + 1000}`;
    private static presenceSessionId =
        (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
            ? (crypto as any).randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    private static get playerName(): string {
        return this.walletConnected && this.userPublicKey
            ? `WL_${this.userPublicKey.substring(0, 6)}`
            : this.sessionPlayerName;
    }

    private static sbHeaders() {
        return { 'apikey': this.SUPABASE_KEY, 'Authorization': `Bearer ${this.SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    }

    // ---------- BOOT ----------
    public static async init() {
        await this.restoreWallet();
        this.startPresenceHeartbeat();
        this.fetchActiveReward();
        // Keep the reward status fresh during long sessions
        setInterval(() => this.fetchActiveReward(), 120000);
    }

    // Restores the wallet connected on the Arcade landing page:
    //  1. extension wallet via silent reconnect (no popup)
    //  2. watch-only pasted address (pump.fun users)
    private static async restoreWallet() {
        try {
            const walletType = localStorage.getItem('walletType');
            if (walletType) {
                const w = window as any;
                const provider = walletType === 'phantom' ? (w.phantom?.solana || w.solana)
                    : walletType === 'solflare' ? w.solflare
                    : walletType === 'backpack' ? w.backpack : null;
                if (provider) {
                    try {
                        const resp = await provider.connect({ onlyIfTrusted: true });
                        this.userPublicKey = resp?.publicKey?.toString() || provider.publicKey?.toString() || "";
                        if (this.userPublicKey) {
                            this.walletConnected = true;
                            (window as any).activeSolanaProvider = provider;
                            await this.syncBalance();
                            console.log(`[WEB3] Extension wallet restored: ${this.userPublicKey.substring(0, 8)}...`);
                            return;
                        }
                    } catch (e) { /* not trusted yet - fall through to watch mode */ }
                }
            }
            const watchAddr = localStorage.getItem('watchAddress');
            if (watchAddr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(watchAddr)) {
                this.userPublicKey = watchAddr;
                this.walletConnected = true;
                await this.syncBalance();
                console.log(`[WEB3] Watch-mode wallet restored: ${watchAddr.substring(0, 8)}...`);
            }
        } catch (e) { console.error("[WEB3] Wallet restore failed", e); }
    }

    public static async syncBalance() {
        if (!this.userPublicKey) return;
        try {
            const res = await fetch(this.SOLANA_RPC_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
                    params: [this.userPublicKey, { mint: this.TARGET_TOKEN_MINT }, { encoding: 'jsonParsed' }] })
            });
            const data = await res.json();
            const accounts = data.result?.value || [];
            this.tokenBalance = accounts.length > 0 ? accounts[0].account.data.parsed.info.tokenAmount.uiAmount || 0 : 0;
        } catch (e) { console.error("[WEB3] Balance sync failed", e); }
    }

    // ---------- UNLOCKS ----------
    public static hasRewardUnlock(): boolean { return Date.now() < this.rewardUnlockUntil; }

    public static isCharacterUnlocked(char: string): boolean {
        if (char === "crane") return true;
        if (this.hasRewardUnlock()) return true; // daily/weekly champion: everything open
        const threshold = this.CHARACTER_THRESHOLDS[char];
        if (threshold === undefined) return false;
        return this.walletConnected && this.tokenBalance >= threshold;
    }

    public static thresholdFor(char: string): number {
        return this.CHARACTER_THRESHOLDS[char] ?? 0;
    }

    public static async fetchActiveReward() {
        try {
            const res = await fetch(`${this.SUPABASE_URL}/rest/v1/rpc/get_active_reward`, {
                method: 'POST', headers: this.sbHeaders(),
                body: JSON.stringify({ p_player: this.playerName })
            });
            const expires = await res.json();
            this.rewardUnlockUntil = (typeof expires === 'string') ? new Date(expires).getTime() : 0;
        } catch (e) { /* rewards RPC unreachable - fall back to balance gating */ }
    }

    // ---------- LEADERBOARD ----------
    // Telemetry = one relative-ms timestamp per 100 ft milestone.
    // The edge function derives the validated score (milestones x 100).
    public static async submitScore(telemetry: number[]) {
        try {
            await fetch(`${this.SUPABASE_URL}/functions/v1/validate-score`, {
                method: 'POST', headers: this.sbHeaders(),
                body: JSON.stringify({ board_id: this.BOARD_ID, player_name: this.playerName, telemetry })
            });
        } catch (e) { console.error("[WEB3] Score submission failed", e); }
    }

    // Shape matches what LeaderboardDialog renders: {rank, player:{name}, score}
    public static async getTopScores(): Promise<any[]> {
        try {
            const res = await fetch(
                `${this.SUPABASE_URL}/rest/v1/leaderboards?board_id=eq.${this.BOARD_ID}&select=player_name,score&order=score.desc&limit=50`,
                { headers: this.sbHeaders() }
            );
            const rows = await res.json();
            if (!Array.isArray(rows)) return [];
            return rows.map((r: any, i: number) => ({ rank: i + 1, player: { name: r.player_name }, score: r.score }));
        } catch (e) { return []; }
    }

    // ---------- PRESENCE (feeds the arcade-wide Active Pilots counter) ----------
    private static startPresenceHeartbeat() {
        const beat = () => {
            if (document.visibilityState === 'hidden') return;
            fetch(`${this.SUPABASE_URL}/rest/v1/rpc/pilot_heartbeat`, {
                method: 'POST', headers: this.sbHeaders(),
                body: JSON.stringify({ p_session_id: this.presenceSessionId })
            }).catch(() => {});
        };
        beat();
        setInterval(beat, 45000);
    }
}
