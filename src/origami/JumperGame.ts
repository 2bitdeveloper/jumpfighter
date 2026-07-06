import { AudioEngine } from './AudioEngine';
import { SceneRenderer } from './SceneRenderer';
import { WeatherManager } from './WeatherManager';
import { CharacterRenderer } from './CharacterRenderer';
import { Player } from './Player';
import { Platform } from './Platform';
import { Coin, Enemy, BgTree } from './GameEntities';
import { Particle, ParticleTypes } from './Particle';
import type { ParticleType } from './Particle';
import { Snapdragon } from './Snapdragon';
import { Web3Service } from './Web3Service';
import { LeaderboardDialog } from './LeaderboardDialog';

export { Platform, BgTree, Coin, Enemy, Snapdragon, WeatherManager, CharacterRenderer };

declare global {
    interface Window {
        CrazyGames?: any;
    }
}

export interface Boost {
    x: number;
    y: number;
    size: number;
    isCollected: boolean;
}

export type GameState = 'LOADING' | 'MAIN_MENU' | 'TUTORIAL' | 'WAITING_TO_START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VILLAGE';
export const GameStates = {
    LOADING: 'LOADING' as GameState,
    MAIN_MENU: 'MAIN_MENU' as GameState,
    TUTORIAL: 'TUTORIAL' as GameState,
    WAITING_TO_START: 'WAITING_TO_START' as GameState,
    PLAYING: 'PLAYING' as GameState,
    PAUSED: 'PAUSED' as GameState,
    GAME_OVER: 'GAME_OVER' as GameState,
    VILLAGE: 'VILLAGE' as GameState
};

interface TutorialLine {
    text: string;
    words: string[];
    hasDigit: boolean;
}

interface RectF {
    left: number; top: number; right: number; bottom: number;
    centerX(): number; centerY(): number;
    contains(x: number, y: number): boolean;
}

export class JumperGame {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    
    public internalRenderer: SceneRenderer;
    public audio: AudioEngine;
    public leaderboardDialog: LeaderboardDialog;

    public triggerHaptic: () => void = () => {};
    public onExitToMenu: () => void = () => {};
    public onGameOver: (score: number, coins: number) => void = () => {};
    public onOpenSettings: (() => void) | null = null;
    public onGameStateChanged: ((isPlaying: boolean) => void) | null = null;
    public onLoadingComplete: (() => void) | null = null;

    public revivesUsedThisRun: number = 0;
    public reviveInFlight: boolean = false; // burn transaction pending wallet approval
    public tutorialPhase: number = 1;
    public currentCharacter: string = "crane";

    public isTutorialActive: boolean;

    // --- INPUT STATE TRACKERS ---
    public keyLeft: boolean = false;
    public keyRight: boolean = false;
    public pointerLeft: boolean = false;
    public pointerRight: boolean = false;
    private gamepadDebounceTime: number = 0;

    // --- CRAZYGAMES SDK SAFE STORAGE ---
    public getPrefs(key: string, def: any): any {
        let v: string | null = null;
        try {
            if (window.CrazyGames?.SDK?.data) {
                v = window.CrazyGames.SDK.data.getItem(key);
            }
            if (v === null) {
                v = localStorage.getItem(key);
            }
        } catch (e) {}

        if (v === null) return def;
        if (v === "true") return true;
        if (v === "false") return false;
        const parsed = parseInt(v);
        if (!isNaN(parsed)) return parsed;
        return v;
    }

    public setPrefs(key: string, value: any) {
        const strVal = value.toString();
        try {
            if (window.CrazyGames?.SDK?.data) {
                window.CrazyGames.SDK.data.setItem(key, strVal);
            }
            localStorage.setItem(key, strVal);
        } catch (e) {}
    }

    get seenMove(): boolean { return this.getPrefs("seenMove", false); }
    set seenMove(value: boolean) { this.setPrefs("seenMove", value); }
    get seenWarp(): boolean { return this.getPrefs("seenWarp", false); }
    set seenWarp(value: boolean) { this.setPrefs("seenWarp", value); }
    get seenMovingPlatform(): boolean { return this.getPrefs("seenMovingPlatform", false); }
    set seenMovingPlatform(value: boolean) { this.setPrefs("seenMovingPlatform", value); }
    get seenFoldingPlatform(): boolean { return this.getPrefs("seenFoldingPlatform", false); }
    set seenFoldingPlatform(value: boolean) { this.setPrefs("seenFoldingPlatform", value); }
    get seenTissuePlatform(): boolean { return this.getPrefs("seenTissuePlatform", false); }
    set seenTissuePlatform(value: boolean) { this.setPrefs("seenTissuePlatform", value); }
    get seenEnemy(): boolean { return this.getPrefs("seenEnemy", false); }
    set seenEnemy(value: boolean) { this.setPrefs("seenEnemy", value); }
    get seenBoost(): boolean { return this.getPrefs("seenBoost", false); }
    set seenBoost(value: boolean) { this.setPrefs("seenBoost", value); }
    get seenSnapdragon(): boolean { return this.getPrefs("seenSnapdragon", false); }
    set seenSnapdragon(value: boolean) { this.setPrefs("seenSnapdragon", value); }

    public isTVDevice: boolean;
    public isLargeScreen: boolean;

    public currentGameState: GameState = GameStates.LOADING;
    public selectedFocusIndex: number = 0;

    public scaleRatio: number = 1.0;

    public platforms: Platform[] = [];
    public coins: Coin[] = [];
    public enemies: Enemy[] = [];
    public boosts: Boost[] = [];
    public particlePool: Particle[] = Array.from({ length: 100 }, () => new Particle());
    public bgTrees: BgTree[] = [];
    public player: Player = new Player(0, 0);

    public brokenPlatforms: Set<number> = new Set();

    public score: number = 0;
    // --- SUPABASE TELEMETRY (one timestamp per 100 ft milestone climbed) ---
    private telemetryLog: number[] = [];
    private runStartTime: number = 0;
    private lastMilestone: number = 0;
    public exactScore: number = 0;
    public totalCameraOffset: number = 0;

    public coinsCollectedThisRun: number = 0;
    public coinsSavedThisRun: number = 0;
    public enemiesStompedThisRun: number = 0;
    public initialized: boolean = false;
    public isSdkInitialized: boolean = false;

    public loadingStartTime: number = 0;
    public lastSpawnedWasHard: boolean = false;
    private lastUpdateNano: number = 0;

    public backMountainY: number = 0;
    public frontMountainY: number = 0;
    public splashColors: string[] = ["#00E5FF", "#29B6F6", "#E0F7FA", "#FFFFFF"];
    public paperParticleColors: string[] = ["#FFFFFF", "#E0E0E0", "#BDBDBD"];
    public sandParticleColors: string[] = ["#FFE082", "#FFCA28", "#FFB300", "#FFF8E1"];

    public fullTutorialText: string = "";
    public displayedTutorialText: string = "";
    public fullTutorialLines: TutorialLine[] = [];
    public typeIndex: number = 0;
    public lastTypeTime: number = 0;
    public typeDelay: number = 15;

    public totalCoins: number;
    public characterRoster: string[] = ["crane", "frog", "fish", "bunny", "fox", "kangaroo", "panda", "cat"];
    public characterCosts: Record<string, number> = { "crane": 0, "frog": 100, "fish": 250, "bunny": 500, "fox": 750, "kangaroo": 1000, "panda": 1500, "cat": 2000 };
    public villageViewIndex: number = 0;

    private velocityFactor: number = 0.8;
    private moveSpeed: number = 10.5;
    private gravity: number = 0.3;
    private jumpStrength: number = -14;

    public width: number = 0;
    public height: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Canvas 2D context not found");
        this.ctx = context;

        this.internalRenderer = new SceneRenderer(this);
        this.audio = new AudioEngine();
        
        this.leaderboardDialog = new LeaderboardDialog();
        Web3Service.init();

        this.isTutorialActive = !this.getPrefs("tutorial_completed", false);
        this.totalCoins = this.getPrefs("total_coins", 0);

        this.isTVDevice = false; 
        this.isLargeScreen = window.innerWidth >= 600 || this.isTVDevice;

        this.bindEvents();
    }

    private bindEvents() {
        window.addEventListener('resize', () => this.onSizeChanged(window.innerWidth, window.innerHeight));
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        this.canvas.addEventListener('pointerdown', (e) => this.handlePointerEvent(e, true));
        this.canvas.addEventListener('pointerup', (e) => this.handlePointerEvent(e, false));
        this.canvas.addEventListener('pointercancel', (e) => this.handlePointerEvent(e, false));
        this.canvas.addEventListener('pointerleave', (e) => this.handlePointerEvent(e, false));
        
        this.canvas.addEventListener('pointermove', (e) => {
            if (this.currentGameState === GameStates.PLAYING && (this.pointerLeft || this.pointerRight)) {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const ex = (e.clientX - rect.left) * scaleX;
                
                if (ex < this.width / 2) {
                    this.pointerLeft = true;
                    this.pointerRight = false;
                } else {
                    this.pointerLeft = false;
                    this.pointerRight = true;
                }
            }
        });
    }

    public pause() { }
    public resume() { }
    
    public revivePlayer() {
        this.player.velocityY = -35;
        this.enemies = this.enemies.filter(it => Math.abs(it.y - this.player.y) >= this.height / 2);
        this.currentGameState = GameStates.PLAYING;
    }

    public onSizeChanged(w: number, h: number) {
        const dpr = window.devicePixelRatio || 1;
        this.width = w * dpr;
        this.height = h * dpr;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;

        // FIXED: Re-evaluate screen type on resize so the corridor centers properly
        this.isLargeScreen = w >= 600 || this.isTVDevice;

        if (this.width > 0 && this.height > 0) {
            WeatherManager.init(this.width, this.height);
            
            const playAreaWidth = this.isLargeScreen ? this.height * 0.56 : this.width;
            this.scaleRatio = playAreaWidth / 1080;
            
            this.applyPhysicsScale();
        }
    }

    private applyPhysicsScale() {
        if (this.isTVDevice) {
            this.moveSpeed = 8.5 * this.scaleRatio;
            this.jumpStrength = -11 * this.scaleRatio;
            this.gravity = 0.22 * this.scaleRatio;
        } else {
            this.moveSpeed = 10.5 * this.scaleRatio; 
            this.jumpStrength = -14 * this.scaleRatio;
            this.gravity = 0.3 * this.scaleRatio;
        }
    }

    private setGameState(newState: GameState) {
        if (this.currentGameState === newState) return;
        
        const oldState = this.currentGameState;
        this.currentGameState = newState;
        this.selectedFocusIndex = 0;

        // --- LOUD CRAZYGAMES DEBUGGING ---
        try {
            if (window.CrazyGames && window.CrazyGames.SDK) {
                if (newState === GameStates.PLAYING && oldState !== GameStates.PLAYING) {
                    console.log("🚀 [CRAZYGAMES] Attempting gameplayStart...");
                    window.CrazyGames.SDK.game.gameplayStart();
                    console.log("✅ [CRAZYGAMES] gameplayStart SUCCESS!");
                }
                else if (oldState === GameStates.PLAYING && newState !== GameStates.PLAYING) {
                    console.log("🛑 [CRAZYGAMES] Attempting gameplayStop...");
                    window.CrazyGames.SDK.game.gameplayStop();
                    console.log("✅ [CRAZYGAMES] gameplayStop SUCCESS!");
                }
            } else {
                 if (newState === GameStates.PLAYING && oldState !== GameStates.PLAYING) {
                     console.warn("⚠️ [CRAZYGAMES] Tried to start gameplay, but SDK is missing or not initialized!");
                 }
            }
        } catch (e) {
            console.error("❌ [CRAZYGAMES] SDK Crash:", e);
        }
        // -----------------------------------------

        if (this.onGameStateChanged) this.onGameStateChanged(newState === GameStates.PLAYING);
    }

    public setCharacter(character: string) { this.currentCharacter = character; }

    public isCharacterUnlocked(char: string): boolean {
        // Crane is free; every other guardian requires holding $2BA
        // (or an active daily/weekly champion reward).
        return char === "crane" || Web3Service.isCharacterUnlocked(char);
    }

    private getCurrentParticleType(): ParticleType {
        switch (this.currentCharacter) {
            case "fish":
            case "frog": return ParticleTypes.WATER;
            case "bunny": return ParticleTypes.SAKURA;
            case "kangaroo": return ParticleTypes.SAND;
            default: return ParticleTypes.PAPER;
        }
    }

    private spawnPlatformParticles(p: Platform) {
        const pType = this.getCurrentParticleType();
        let spawned = 0;
        for (let i = 0; i < this.particlePool.length; i++) {
            const pParticle = this.particlePool[i];
            if (pParticle.life <= 0) {
                let color = "";
                if (pType === ParticleTypes.SAKURA) color = "#FFC1E3";
                else if (pType === ParticleTypes.SAND) color = this.sandParticleColors[Math.floor(Math.random() * this.sandParticleColors.length)];
                else color = this.paperParticleColors[Math.floor(Math.random() * this.paperParticleColors.length)];
                
                pParticle.spawn(p.x + Math.random() * p.width, p.y + p.height / 2, color, pType);
                spawned++;
                if (spawned >= (pType === ParticleTypes.SAND ? 14 : 7)) break;
            }
        }
    }

    public initGame() {
        this.score = 0; this.exactScore = 0; this.totalCameraOffset = 0;
        this.telemetryLog = []; this.runStartTime = Date.now(); this.lastMilestone = 0; 
        this.coinsCollectedThisRun = 0; this.enemiesStompedThisRun = 0; this.coinsSavedThisRun = 0;
        
        this.platforms = []; this.coins = []; this.enemies = []; this.boosts = []; this.brokenPlatforms.clear();
        for (let i = 0; i < this.particlePool.length; i++) { this.particlePool[i].life = 0; }
        this.bgTrees = []; this.backMountainY = 0; this.frontMountainY = 0;
        this.lastSpawnedWasHard = false;

        this.player.velocityX = 0; this.player.velocityY = 0;
        this.keyLeft = false; this.keyRight = false;
        this.pointerLeft = false; this.pointerRight = false;

        const playAreaWidth = this.isLargeScreen ? this.height * 0.56 : this.width;
        const playAreaStartX = (this.width - playAreaWidth) / 2;
        const laneWidth = playAreaWidth / 3;

        // FIXED: Center player perfectly based on the visual asymmetric bounding box
        this.player.x = playAreaStartX + (1 * laneWidth) + (laneWidth / 2) - (this.player.size / 4);
        this.player.y = (this.height / 2) + (150 * this.scaleRatio) - this.player.size;

        const platformGap = 340 * this.scaleRatio;
        let currY = (this.height / 2) + (150 * this.scaleRatio);

        const startP = new Platform(playAreaStartX + (1 * laneWidth) + (laneWidth * 0.15), currY, laneWidth * 0.70);
        startP.scale = 1.0; 
        this.platforms.push(startP);

        currY -= platformGap;
        let lastLane = 1;

        while (currY > -this.height * 1.5) {
            let lane = Math.floor(Math.random() * 3);
            if (lane === lastLane && Math.random() > 0.5) { lane = (lane + 1) % 3; }
            lastLane = lane;

            const p = new Platform(playAreaStartX + (lane * laneWidth) + (laneWidth * 0.15), currY, laneWidth * 0.70);
            p.scale = 1.0; p.hasBloomed = true;
            this.platforms.push(p);
            currY -= platformGap;
        }

        for (let i = 0; i <= 10; i++) {
            this.bgTrees.push(new BgTree(Math.random() * this.width, Math.random() * this.height, Math.random() * 40 + 20));
        }
        this.initialized = true;
    }

    public async surfaceCreated() {
        CharacterRenderer.initializeSprites();
        this.audio.preloadBGM();

        this.loadingStartTime = Date.now();
        this.lastUpdateNano = performance.now();

        try {
            if (window.CrazyGames && window.CrazyGames.SDK) {
                await window.CrazyGames.SDK.init();
                this.isTutorialActive = !this.getPrefs("tutorial_completed", false);
                this.totalCoins = this.getPrefs("total_coins", 0);
            }
        } catch (e) {
            console.warn("CrazyGames SDK initialization skipped or failed", e);
        } finally {
            this.isSdkInitialized = true;
        }

        this.onSizeChanged(window.innerWidth, window.innerHeight);
        if (!this.initialized && this.width > 0) this.initGame();
    }

    private triggerContextualTutorial(text: string) {
        this.fullTutorialText = text;
        this.typeIndex = 0;
        this.displayedTutorialText = "";
        this.fullTutorialLines = this.fullTutorialText.split("\n").map(line => {
            return { text: line.trim(), words: line.trim().split(" "), hasDigit: /\d/.test(line) };
        });
        this.setGameState(GameStates.TUTORIAL);
    }

    public updateTutorialTypewriter() {
        const now = Date.now();
        if (now - this.lastTypeTime > this.typeDelay && this.typeIndex < this.fullTutorialText.length) {
            this.typeIndex++; 
            this.lastTypeTime = now;
        }
    }

    private handleGameOver() {
        if (this.currentGameState !== GameStates.GAME_OVER) {
            this.triggerHaptic();
            const currentHighScore = this.getPrefs("high_score", 0);
            if (this.score > currentHighScore) { this.setPrefs("high_score", this.score); }

            if (this.telemetryLog.length > 0) {
                Web3Service.submitScore(this.telemetryLog);
            }

            const coinsToSave = this.coinsCollectedThisRun - this.coinsSavedThisRun;
            this.totalCoins += coinsToSave;
            this.coinsSavedThisRun = this.coinsCollectedThisRun;

            this.setPrefs("total_coins", this.totalCoins);
            if (this.onGameOver) this.onGameOver(this.score, this.coinsCollectedThisRun);

            this.setGameState(GameStates.GAME_OVER);
            this.audio.pauseBGM();
        }
    }

    public update(dtScale: number = 1.0) {       
        if (this.width === 0) return;

        const now = Date.now();
        const time = now; // FIXED: Alias for downward platform logic

        // --- GAMEPAD POLLING (Menus & Gameplay) ---
        let gpAxisX = 0;
        let gpDpadLeft = false;
        let gpDpadRight = false;

        try {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = gamepads.find(g => g !== null); 

            if (gp) {
                if (this.currentGameState !== GameStates.PLAYING && this.currentGameState !== GameStates.TUTORIAL) {
                    if (now - this.gamepadDebounceTime > 200) {
                        const focusables = this.getFocusablesForState();
                        if ((gp.buttons[15]?.pressed || gp.axes[0] > 0.5) && focusables.length > 0) {
                            this.selectedFocusIndex = (this.selectedFocusIndex + 1) % focusables.length;
                            this.gamepadDebounceTime = now;
                        } else if ((gp.buttons[14]?.pressed || gp.axes[0] < -0.5) && focusables.length > 0) {
                            this.selectedFocusIndex = (this.selectedFocusIndex - 1 + focusables.length) % focusables.length;
                            this.gamepadDebounceTime = now;
                        } else if (gp.buttons[0]?.pressed && focusables.length > 0) {
                            const target = focusables[this.selectedFocusIndex];
                            this.simulateTouch(target.centerX(), target.centerY());
                            this.gamepadDebounceTime = now;
                        } else if (gp.buttons[9]?.pressed && this.currentGameState === GameStates.PAUSED) {
                            this.setGameState(GameStates.PLAYING);
                            this.gamepadDebounceTime = now;
                        }
                    }
                } else if (this.currentGameState === GameStates.TUTORIAL) {
                    if (gp.buttons[0]?.pressed && now - this.gamepadDebounceTime > 200) {
                        this.simulateTouch(this.width / 2, this.height / 2);
                        this.gamepadDebounceTime = now;
                    }
                } else if (this.currentGameState === GameStates.PLAYING || this.currentGameState === GameStates.WAITING_TO_START) {
                    gpAxisX = gp.axes[0] || 0;
                    gpDpadLeft = gp.buttons[14]?.pressed || false;
                    gpDpadRight = gp.buttons[15]?.pressed || false;

                    if (gp.buttons[9]?.pressed && now - this.gamepadDebounceTime > 250) { 
                        this.setGameState(GameStates.PAUSED);
                        this.gamepadDebounceTime = now;
                    }
                }
            }
        } catch (e) {}
        // -----------------------------------------

        if (this.currentGameState === GameStates.LOADING) {
            if (this.isSdkInitialized && now - this.loadingStartTime > 2000) {
                this.setGameState(GameStates.MAIN_MENU);
                this.audio.startBGM();
                if (this.onLoadingComplete) this.onLoadingComplete();
            }
            return;
        }

        if (this.currentGameState === GameStates.TUTORIAL) {
            this.updateTutorialTypewriter();
            return;
        }

        // --- FIXED: Start game from waiting state via Controller ---
        if (this.currentGameState === GameStates.WAITING_TO_START) {
            if (gpDpadLeft || gpDpadRight || Math.abs(gpAxisX) > 0.2) {
                this.setGameState(GameStates.PLAYING);
            } else {
                return; // Wait for input
            }
        }

        if (this.currentGameState !== GameStates.PLAYING) return;

        if (this.isTutorialActive) {
            if (!this.seenMove && this.player.y < this.height / 2 + 100) {
                this.seenMove = true;
                this.triggerContextualTutorial(this.isTVDevice ? "Hold D-PAD LEFT/RIGHT\nto glide between lanes." : "Tap LEFT or RIGHT\nfor quick hops. Hold\ndown to glide further.");
                return;
            }
            else if (!this.isLargeScreen && !this.seenWarp && (this.player.x < this.width * 0.15 || this.player.x > this.width * 0.85)) {
                this.seenWarp = true;
                this.triggerContextualTutorial("Go off one edge of the \nscreen to appear on the other!");
                return;
            } else {
                for (const p of this.platforms) {
                    if (p.y > 0 && p.y < this.height) { 
                        if (p.hazard !== null && !this.seenSnapdragon) {
                            this.seenSnapdragon = true;
                            this.triggerContextualTutorial("Beware the Snapdragon!\nJump on it only when\nits mouth is closed.");
                            return;
                        }
                        if (p.type === 1 && !this.seenMovingPlatform) {
                            this.seenMovingPlatform = true;
                            this.triggerContextualTutorial("Blue platforms\nslide side to side.");
                            return;
                        } else if (p.type === 2 && !this.seenFoldingPlatform) {
                            this.seenFoldingPlatform = true;
                            this.triggerContextualTutorial("Watch out for folding\nplatforms! Time your\njumps carefully.");
                            return;
                        } else if (p.type === 4 && !this.seenTissuePlatform) {
                            this.seenTissuePlatform = true;
                            this.triggerContextualTutorial("Tissue paper gives a\nsuper bounce but\ninstantly shatters.");
                            return;
                        }
                    }
                }
                for (const e of this.enemies) {
                    if (e.y > 0 && e.y < this.height && !this.seenEnemy) {
                        this.seenEnemy = true;
                        this.triggerContextualTutorial("Stomp the black wasps\nfrom above to earn\n5 extra coins!");
                        return;
                    }
                }
                for (const b of this.boosts) {
                    if (b.y > 0 && b.y < this.height && !this.seenBoost) {
                        this.seenBoost = true;
                        this.triggerContextualTutorial("Catch glowing paper\nplanes for a\nmassive super jump!");
                        return;
                    }
                }
            }
        }

        WeatherManager.update(this.currentCharacter);

        const currentNano = performance.now();
        if (this.lastUpdateNano === 0) this.lastUpdateNano = currentNano;
        const elapsedMs = currentNano - this.lastUpdateNano;
        this.lastUpdateNano = currentNano;

        dtScale = elapsedMs / 16.6667;
        if (dtScale < 0.2) dtScale = 0.2;
        if (dtScale > 3.0) dtScale = 3.0;

        const difficulty = Math.min(Math.max(this.score / 5000, 0), 1);

        this.coins = this.coins.filter(c => !c.isCollected && c.y <= this.height + 100);
        this.enemies = this.enemies.filter(e => e.y <= this.height + 100);
        this.boosts = this.boosts.filter(b => !b.isCollected && b.y <= this.height + 100);

        const movingLeft = this.keyLeft || this.pointerLeft || gpDpadLeft || gpAxisX < -0.2;
        const movingRight = this.keyRight || this.pointerRight || gpDpadRight || gpAxisX > 0.2;

        if (movingLeft && !movingRight) {
            const speedMult = Math.abs(gpAxisX) > 0.2 ? Math.abs(gpAxisX) : 1.0; 
            this.player.velocityX = -this.moveSpeed * Math.max(0.5, speedMult); 
        } else if (movingRight && !movingLeft) {
            const speedMult = Math.abs(gpAxisX) > 0.2 ? Math.abs(gpAxisX) : 1.0; 
            this.player.velocityX = this.moveSpeed * Math.max(0.5, speedMult);
        } else {
            this.player.velocityX = 0; 
        }

        this.player.velocityY += (this.gravity * this.velocityFactor) * dtScale;
        this.player.velocityY = Math.min(this.player.velocityY, 15 * this.velocityFactor * this.scaleRatio);
        this.player.y += this.player.velocityY * dtScale;
        this.player.x += (this.player.velocityX * this.velocityFactor) * dtScale;
        this.player.updateFacing();

        const playAreaWidth = this.isLargeScreen ? this.height * 0.56 : this.width;
        const playAreaStartX = (this.width - playAreaWidth) / 2;
        const playAreaEndX = playAreaStartX + playAreaWidth;

        if (this.isLargeScreen) {
            const laneWidth = playAreaWidth / 3;
            const platformMargin = laneWidth * 0.15; 
            
            const trueLeftBound = playAreaStartX + platformMargin;
            const trueRightBound = playAreaEndX - platformMargin;

            // FIXED: Combine the perfect left clamp with the perfect right clamp
            if (this.player.x > trueRightBound - (this.player.size / 2)) {
                this.player.x = trueRightBound - (this.player.size / 2);
            } else if (this.player.x < trueLeftBound) {
                this.player.x = trueLeftBound;
            }
        } else {
            if (this.player.x > this.width) {
                this.player.x = -this.player.size;
            } else if (this.player.x + this.player.size < 0) {
                this.player.x = this.width;
            }
        }

        if (this.player.y > this.height) this.handleGameOver();

        for (let i = 0; i < this.platforms.length; i++) {
            const p = this.platforms[i];
            const pid = p.id;

            if (!p.hasBloomed && p.y > -this.height * 0.2 && p.y < this.height) {
                p.hasBloomed = true; p.isAnimating = true;
                this.spawnPlatformParticles(p);
            }
            if (p.isAnimating) {
                p.scale += 0.12 * dtScale;
                if (p.scale >= 1.0) { p.scale = 1.0; p.isAnimating = false; }
            }

            if (p.type === 1) {
                const speed = (2.5 + difficulty * 2.5) * p.moveDir * this.velocityFactor * this.scaleRatio;
                p.moveSide(speed * dtScale);

                if (p.x < playAreaStartX && p.moveDir < 0) {
                    p.moveDir = 1;
                } else if (p.x + p.width > playAreaEndX && p.moveDir > 0) {
                    p.moveDir = -1;
                }
            } else if (p.type === 3) {
                const verticalSpeed = Math.cos((time + pid) / 300.0) * 2.5 * this.scaleRatio;
                p.moveDown(verticalSpeed * this.velocityFactor * dtScale);
            }
        }

       if (this.player.velocityY > 0) {
            const pCenter = this.player.x + (this.player.size / 4);
            
            // Changed to 0 so the physical hitbox is 1:1 exact with the visual width
            const hitboxMargin = 0; 

            for (const p of this.platforms) {
                const pid = p.id;

                const cycle = ((time + pid) % 7000);
                const isFolded = p.type === 2 && cycle > 2500;
                const isBroken = p.type === 4 && this.brokenPlatforms.has(pid);

                const platformLeftEdge = p.x + hitboxMargin;
                const platformRightEdge = p.x + p.width - hitboxMargin;

                if (!isFolded && !isBroken &&
                    this.player.y + this.player.size >= p.y && this.player.y + this.player.size <= p.y + 40 &&
                    pCenter >= platformLeftEdge && pCenter <= platformRightEdge) {

                    if (p.type === 4) {
                        this.brokenPlatforms.add(pid);
                        this.player.velocityY = this.jumpStrength * 1.35;
                        for(let k = 0; k <= 4; k++) this.spawnPlatformParticles(p);
                        p.y = this.height + 500;
                        this.audio.playJump();
                        this.triggerHaptic();
                        continue;
                    }

                    if (p.hazard !== null) {
                        if (p.hazard.state === 0) {
                            p.hazard.state = 1;
                            this.player.velocityY = this.jumpStrength;
                            this.spawnPlatformParticles(p); this.audio.playJump(); this.triggerHaptic();
                        } else if (p.hazard.state === 1) {
                            p.hazard.state = 2;
                            this.player.velocityY = 0;
                            this.handleGameOver();
                        }
                    } else {
                        this.player.velocityY = this.jumpStrength;
                        this.spawnPlatformParticles(p); this.audio.playJump(); this.triggerHaptic();
                    }
                }
            }
        }

        for (let i = this.boosts.length - 1; i >= 0; i--) {
            const b = this.boosts[i];
            if (!b.isCollected && Math.hypot(this.player.x + this.player.size / 2 - b.x, this.player.y + this.player.size / 2 - b.y) < (this.player.size / 2 + b.size)) {
                b.isCollected = true;
                this.player.velocityY = this.jumpStrength * 2.5;
                this.audio.playJump(); this.triggerHaptic();
            }
        }

        for (let i = this.coins.length - 1; i >= 0; i--) {
            const c = this.coins[i];
            if (!c.isCollected && Math.hypot(this.player.x + this.player.size / 2 - c.x, this.player.y + this.player.size / 2 - c.y) < (this.player.size / 2 + 20)) {
                c.isCollected = true; this.coinsCollectedThisRun++;
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const sweepSpeed = (3 + difficulty * 4) * this.velocityFactor * this.scaleRatio;
            e.x += Math.cos(time / 400.0) * sweepSpeed * dtScale;

            if (this.player.x + this.player.size * 0.4 > e.x && this.player.x - this.player.size * 0.4 < e.x + e.size &&
                this.player.y + this.player.size * 0.8 > e.y && this.player.y < e.y + e.size) {

                if (this.player.velocityY > 0 && this.player.y + this.player.size * 0.8 < e.y + e.size * 0.5) {
                    this.enemies.splice(i, 1);
                    this.player.velocityY = -13 * this.velocityFactor * this.scaleRatio;
                    this.coinsCollectedThisRun += 5; this.enemiesStompedThisRun++;
                    this.audio.playStomp(); this.triggerHaptic();
                } else {
                    this.handleGameOver();
                }
            }
        }

        const midScreen = this.height / 2.2;
        if (this.player.y < midScreen) {
            const offset = midScreen - this.player.y;
            this.player.y = midScreen;

            for (let i = 0; i < this.platforms.length; i++) this.platforms[i].moveDown(offset);
            for (let i = 0; i < this.coins.length; i++) this.coins[i].y += offset;
            for (let i = 0; i < this.enemies.length; i++) this.enemies[i].y += offset;
            for (let i = 0; i < this.boosts.length; i++) this.boosts[i].y += offset;

            for (let i = 0; i < this.bgTrees.length; i++) {
                const t = this.bgTrees[i];
                t.y += offset * 0.5;
                if (t.y > this.height + 200) { t.y = -200; t.x = Math.random() * this.width; }
            }

            this.backMountainY += offset * 0.15; this.frontMountainY += offset * 0.35;
            this.totalCameraOffset += offset;

            for (let i = 0; i < this.particlePool.length; i++) { if (this.particlePool[i].life > 0) this.particlePool[i].y += offset; }
        }

        const startY = this.height / 2;
        const currentAscent = (startY - this.player.y) + this.totalCameraOffset;
        const currentScoreInFeet = currentAscent / 10;

        if (currentScoreInFeet > this.exactScore) {
            this.exactScore = currentScoreInFeet;
            this.score = Math.floor(this.exactScore);
            // Log one timestamp per 100 ft milestone - the server derives the
            // validated score from these, so client score is never trusted.
            while (this.score >= this.lastMilestone + 100) {
                this.lastMilestone += 100;
                this.telemetryLog.push(Date.now() - this.runStartTime);
            }
        }

        for (let i = 0; i < this.particlePool.length; i++) this.particlePool[i].update();

        for (let i = 0; i < this.platforms.length; i++) {
            const p = this.platforms[i];
            if (p.y > this.height) {
                this.brokenPlatforms.delete(p.id);

                let highestY = Math.min(...this.platforms.map(it => it.y));
                if (highestY > 0) highestY = 0;

                const dynamicGap = (280 + (difficulty * 180)) * this.scaleRatio;
                const shrinkage = Math.min((this.score / 1000) * 0.10, 0.60);

                const laneWidth = playAreaWidth / 3;
                const baseWidth = laneWidth * 0.70;
                const lane = Math.floor(Math.random() * 3);

                p.width = baseWidth * (1 - shrinkage);
                // FIXED: Center respawning platforms relative to the play corridor
                p.x = playAreaStartX + (lane * laneWidth) + ((laneWidth - p.width) / 2);
                p.y = (highestY - dynamicGap);

                p.generatePapercraftPath();
                p.scale = 0; p.hasBloomed = false; p.isAnimating = false;
                p.moveDir = Math.random() > 0.5 ? 1 : -1;

                const isEarlyGame = this.score < 2000;

                if (isEarlyGame && this.lastSpawnedWasHard) {
                    const safeRand = Math.random();
                    p.type = safeRand < 0.5 ? 0 : (safeRand < 0.75 ? 1 : 3);
                    p.hazard = null;
                    this.lastSpawnedWasHard = false;
                } else {
                    const specialProb = 0.10 + (difficulty * 0.15);
                    const rand = Math.random();
                    if (rand < specialProb) p.type = 4;
                    else if (rand < specialProb * 2) p.type = 3;
                    else if (rand < specialProb * 3) p.type = 2;
                    else if (rand < specialProb * 4) p.type = 1;
                    else p.type = 0;

                    p.hazard = ((p.type === 0 || p.type === 1) && Math.random() < 0.1 + (difficulty * 0.15)) ? new Snapdragon(p.x + p.width / 2, p.y) : null;
                    this.lastSpawnedWasHard = (p.type === 4 || p.type === 2 || p.hazard !== null);
                }

                if (p.hazard === null && p.type !== 4 && Math.random() < 0.05) {
                    this.boosts.push({ x: p.x + p.width / 2, y: p.y - 60 * this.scaleRatio, size: 30, isCollected: false });
                } else if (p.hazard === null && Math.random() < 0.3) {
                    this.coins.push(new Coin(p.x + p.width / 2, p.y - 50 * this.scaleRatio));
                }

                if (p.hazard === null && Math.random() < 0.05 + (difficulty * 0.1)) {
                    this.enemies.push(new Enemy(p.x + p.width / 2, p.y - 80 * this.scaleRatio));
                }
            }
        }

        for (let i = 0; i < this.platforms.length; i++) { if (this.platforms[i].hazard) this.platforms[i].hazard.update(); }

        if (this.player.velocityY === 0) {
            this.player.velocityX *= Math.pow(0.85, dtScale);
        }
    }

    public draw() {
        if (!this.initialized) { this.initGame(); return; }
        this.internalRenderer.render(this.ctx);
    }

    private onKeyDown(event: KeyboardEvent) {
        if (event.repeat) return;

        // FIXED: Instantly start game from waiting state via Keyboard
        if (this.currentGameState === GameStates.WAITING_TO_START) {
            this.setGameState(GameStates.PLAYING);
            return;
        }

        if (this.currentGameState === GameStates.PLAYING) {
            switch (event.code) {
                case "ArrowLeft": 
                case "KeyA":
                    this.keyLeft = true; break;
                case "ArrowRight": 
                case "KeyD":
                    this.keyRight = true; break;
                case "Escape": 
                case "Enter":
                case "Space":
                    this.setGameState(GameStates.PAUSED); 
                    break;
            }
        } else {
            const focusables = this.getFocusablesForState();

            switch (event.code) {
                case "ArrowDown": 
                case "ArrowRight":
                case "KeyS":
                case "KeyD":
                    if (focusables.length > 0) {
                        this.selectedFocusIndex = (this.selectedFocusIndex + 1) % focusables.length;
                    }
                    break;
                case "ArrowUp": 
                case "ArrowLeft":
                case "KeyW":
                case "KeyA":
                    if (focusables.length > 0) {
                        this.selectedFocusIndex = (this.selectedFocusIndex - 1 + focusables.length) % focusables.length;
                    }
                    break;
                case "Enter":
                case "Space":
                    if (this.currentGameState === GameStates.TUTORIAL) {
                        this.simulateTouch(this.width / 2, this.height / 2);
                    } else if (focusables.length > 0 && this.selectedFocusIndex < focusables.length) {
                        const target = focusables[this.selectedFocusIndex];
                        this.simulateTouch(target.centerX(), target.centerY());
                    }
                    break;
            }
        }
    }

    private onKeyUp(event: KeyboardEvent) {
        if (event.code === "ArrowLeft" || event.code === "KeyA") this.keyLeft = false;
        if (event.code === "ArrowRight" || event.code === "KeyD") this.keyRight = false;
    }

    private simulateTouch(x: number, y: number) {
        const rect = this.canvas.getBoundingClientRect();
        
        const scaleX = rect.width / this.canvas.width;
        const scaleY = rect.height / this.canvas.height;
        const screenX = (x * scaleX) + rect.left;
        const screenY = (y * scaleY) + rect.top;

        const downEvent = new PointerEvent('pointerdown', { clientX: screenX, clientY: screenY });
        const upEvent = new PointerEvent('pointerup', { clientX: screenX, clientY: screenY });
        this.handlePointerEvent(downEvent, true);
        setTimeout(() => this.handlePointerEvent(upEvent, false), 50);
    }

    public getFocusablesForState(): RectF[] {
        switch (this.currentGameState) {
            case GameStates.MAIN_MENU: return [this.internalRenderer.playButtonRect, this.internalRenderer.villageButtonRect, this.internalRenderer.settingsMenuButtonRect];
            case GameStates.PAUSED: return [this.internalRenderer.pauseResumeButtonRect, this.internalRenderer.settingsMenuButtonRect];
            case GameStates.GAME_OVER: return [this.internalRenderer.reviveButtonRect, this.internalRenderer.restartButtonRect, this.internalRenderer.menuButtonRect];
            case GameStates.VILLAGE: return [this.internalRenderer.villageLeftBtn, this.internalRenderer.villageActionBtn, this.internalRenderer.villageRightBtn, this.internalRenderer.villageBackBtn];
            default: return [];
        }
    }

    private handlePointerEvent(event: PointerEvent, isDown: boolean) {
        const rect = this.canvas.getBoundingClientRect();
        
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const ex = (event.clientX - rect.left) * scaleX;
        const ey = (event.clientY - rect.top) * scaleY;

        if (isDown) {
            // FIXED: Start game from waiting state via Mouse/Touch
            if (this.currentGameState === GameStates.WAITING_TO_START) {
                this.setGameState(GameStates.PLAYING);
                
                if (ex < this.width / 2) {
                    this.pointerLeft = true;
                    this.pointerRight = false;
                } else {
                    this.pointerLeft = false;
                    this.pointerRight = true;
                }
                return;
            }

            if (this.currentGameState === GameStates.MAIN_MENU) {
                const hiddenLogoRect = { left: this.width / 2 - 100, top: this.height * 0.22 - 100, right: this.width / 2 + 100, bottom: this.height * 0.22 + 100 };
                
                if (ex >= hiddenLogoRect.left && ex <= hiddenLogoRect.right && ey >= hiddenLogoRect.top && ey <= hiddenLogoRect.bottom) {
                    this.totalCoins += 15000; this.setPrefs("total_coins", this.totalCoins);
                    this.triggerHaptic(); this.villageViewIndex = Math.max(0, this.characterRoster.indexOf(this.currentCharacter));
                    this.audio.startBGM();
                    this.setGameState(GameStates.VILLAGE);
                    return;
                }
                else if (this.internalRenderer.playButtonRect.contains(ex, ey)) {
                    this.audio.startBGM(); 
                    this.initGame();
                    // FIXED: Route to WAITING_TO_START
                    this.setGameState(GameStates.WAITING_TO_START);
                }
                else if (this.internalRenderer.settingsMenuButtonRect.contains(ex, ey)) {
                    if (this.onOpenSettings) this.onOpenSettings();
                }
                else if (this.internalRenderer.villageButtonRect.contains(ex, ey)) {
                    this.audio.startBGM(); 
                    this.setGameState(GameStates.VILLAGE);
                    this.villageViewIndex = Math.max(0, this.characterRoster.indexOf(this.currentCharacter));
                }
                else if (this.internalRenderer.leaderboardBtnRect && this.internalRenderer.leaderboardBtnRect.contains(ex, ey)) {
                    this.leaderboardDialog.show();
                }
            }
            else if (this.currentGameState === GameStates.TUTORIAL) {
                if (this.typeIndex >= this.fullTutorialText.length) {
                    this.setGameState(GameStates.PLAYING);

                    const seenAllRequired = this.seenMove && this.seenMovingPlatform && this.seenFoldingPlatform &&
                            this.seenTissuePlatform && this.seenEnemy && this.seenBoost && this.seenSnapdragon &&
                            (this.isLargeScreen || this.seenWarp);

                    if (seenAllRequired) {
                        this.isTutorialActive = false;
                        this.setPrefs("tutorial_completed", true);
                    }
                } else {
                    this.typeIndex = this.fullTutorialText.length;
                }
            }
            else if (this.currentGameState === GameStates.PAUSED) {
                if (this.internalRenderer.settingsMenuButtonRect.contains(ex, ey)) {
                    if (this.onOpenSettings) this.onOpenSettings();
                } else if (this.internalRenderer.pauseResumeButtonRect.contains(ex, ey)) {
                    this.setGameState(GameStates.PLAYING);
                }
            }
            else if (this.currentGameState === GameStates.GAME_OVER) {
                if (this.internalRenderer.reviveButtonRect.contains(ex, ey)) {
                    // Revive burns $2BA on-chain (SPL burn - supply shrinks), same as Jump Fighter.
                    // The revive only fires AFTER the transaction confirms.
                    if (!this.reviveInFlight && Web3Service.canSign() && Web3Service.tokenBalance >= Web3Service.REVIVE_COST) {
                        this.reviveInFlight = true;
                        Web3Service.executeBurnTransaction(Web3Service.REVIVE_COST).then((ok) => {
                            this.reviveInFlight = false;
                            if (ok && this.currentGameState === GameStates.GAME_OVER) {
                                this.revivesUsedThisRun++;
                                this.revivePlayer();
                                this.audio.startBGM();
                            } else if (!ok) {
                                this.triggerHaptic();
                            }
                        });
                    } else {
                        this.triggerHaptic();
                    }
                    return;
                }
                else if (this.internalRenderer.restartButtonRect.contains(ex, ey)) {
                    this.initGame(); 
                    // FIXED: Route to WAITING_TO_START
                    this.setGameState(GameStates.WAITING_TO_START); 
                    this.audio.startBGM();
                }
                else if (this.internalRenderer.menuButtonRect.contains(ex, ey)) {
                    this.setGameState(GameStates.MAIN_MENU);
                    this.audio.startBGM();
                }
                else if (this.internalRenderer.goLeaderboardBtnRect && this.internalRenderer.goLeaderboardBtnRect.contains(ex, ey)) {
                    this.leaderboardDialog.show();
                }
            }
            else if (this.currentGameState === GameStates.VILLAGE) {
                if (this.internalRenderer.villageBackBtn.contains(ex, ey)) {
                    this.setGameState(GameStates.MAIN_MENU);
                }
                else if (this.internalRenderer.villageLeftBtn.contains(ex, ey)) {
                    this.villageViewIndex = (this.villageViewIndex - 1 + this.characterRoster.length) % this.characterRoster.length;
                    this.triggerHaptic();
                }
                else if (this.internalRenderer.villageRightBtn.contains(ex, ey)) {
                    this.villageViewIndex = (this.villageViewIndex + 1) % this.characterRoster.length;
                    this.triggerHaptic();
                }
                else if (this.internalRenderer.villageActionBtn.contains(ex, ey)) {
                    const vC = this.characterRoster[this.villageViewIndex];
                    if (this.isCharacterUnlocked(vC)) {
                        this.currentCharacter = vC; this.setPrefs("selected_character", this.currentCharacter);
                    }
                    else this.triggerHaptic(); // locked: hold $2BA to unlock, no coin purchase
                }
            }
            else if (this.currentGameState === GameStates.PLAYING) {
                if (this.internalRenderer.pauseButtonRect.contains(ex, ey)) {
                    this.setGameState(GameStates.PAUSED);
                } else if (ex < this.width / 2) {
                    this.pointerLeft = true;
                    this.pointerRight = false;
                } else {
                    this.pointerLeft = false;
                    this.pointerRight = true;
                }
            }
        } else {
            this.pointerLeft = false;
            this.pointerRight = false;
        }
    }
}