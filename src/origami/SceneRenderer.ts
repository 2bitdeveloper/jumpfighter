// @ts-nocheck
import { JumperGame, GameStates } from './JumperGame';
import type { GameState } from './JumperGame';
import { CharacterRenderer } from './CharacterRenderer';
import { Web3Service } from './Web3Service';
import { WeatherManager } from './WeatherManager';
import { Platform } from './Platform';
import { Player } from './Player';
import { Particle, ParticleTypes } from './Particle';
import { Coin, Enemy, BgTree } from './GameEntities';
import { CraneBiomeRenderer } from './CraneBiomeRenderer';
import { FrogBiomeRenderer } from './FrogBiomeRenderer';
import { BunnyBiomeRenderer } from './BunnyBiomeRenderer';
import { FishBiomeRenderer } from './FishBiomeRenderer';
import { FoxBiomeRenderer } from './FoxBiomeRenderer';
import { KangarooBiomeRenderer } from './KangarooBiomeRenderer';
import { PandaBiomeRenderer } from './PandaBiomeRenderer';
import { CatBiomeRenderer } from './CatBiomeRenderer';
import type { BiomeRenderer } from './BiomeRenderer';

interface Rect {
    left: number; top: number; right: number; bottom: number;
    centerX(): number; centerY(): number;
    set(l: number, t: number, r: number, b: number): void;
    contains(x: number, y: number): boolean;
}

function createRect(): Rect {
    return {
        left: 0, top: 0, right: 0, bottom: 0,
        centerX() { return this.left + (this.right - this.left) / 2; },
        centerY() { return this.top + (this.bottom - this.top) / 2; },
        set(l, t, r, b) { this.left = l; this.top = t; this.right = r; this.bottom = b; },
        contains(x, y) { return x >= this.left && x <= this.right && y >= this.top && y <= this.bottom; }
    };
}

export class SceneRenderer {
    private game: JumperGame;

    // --- RESPONSIVE SCALERS ---
    private uiScale: number;
    private tabletScale: number;
    private standaloneTextScale: number;

    private cachedSkyColors: string[] = [];
    private lastSkyChar: string = "";
    private lastThemeTop: number = 0;
    private lastThemeBottom: number = 0;
    
    private cachedScore: number = -1;
    private cachedScoreStr: string = "0";
    private cachedCoins: number = -1;
    private cachedCoinsStr: string = "0";
    private cachedVillageIndex: number = -1;
    private cachedCharName: string = "";
    private cachedCostStr: string = "";

    private biomes: Record<string, BiomeRenderer>;
    private biomeNames: Record<string, string>;

    // UI Buttons
    public villageLeftBtn: Rect = createRect();
    public villageRightBtn: Rect = createRect();
    public villageActionBtn: Rect = createRect();
    public villageBackBtn: Rect = createRect();
    public pauseButtonRect: Rect = createRect();
    public settingsMenuButtonRect: Rect = createRect();
    public villageButtonRect: Rect = createRect();
    public playButtonRect: Rect = createRect();
    public menuButtonRect: Rect = createRect();
    public restartButtonRect: Rect = createRect();
    public pauseResumeButtonRect: Rect = createRect();
    public reviveButtonRect: Rect = createRect();
    
    // NEW LEADERBOARD BUTTONS
    public leaderboardBtnRect: Rect = createRect();
    public goLeaderboardBtnRect: Rect = createRect();

    private loadingBg: HTMLImageElement | null = null;
    private bgDestRect: Rect = createRect();

    // --- PRE-BAKED GEOMETRY ---
    private baseCoinPath: Path2D;
    private baseCoinFoldPath: Path2D;
    private baseBoostPath: Path2D;
    private baseEnemyBodyPath: Path2D;
    private baseEnemyWingPath: Path2D;
    private baseSakuraPath: Path2D;

    // --- TEXT MEASUREMENT CACHE ---
    private scorePrefixWidth: number = 0;
    private coinsPrefixWidth: number = 0;

    constructor(game: JumperGame) {
        this.game = game;

        this.uiScale = game.isLargeScreen ? 1.0 : 1.35;
        this.tabletScale = game.isLargeScreen ? 0.45 : 1.0;
        this.standaloneTextScale = game.isLargeScreen ? 0.85 : 1.0;

        this.biomes = {
            "crane": new CraneBiomeRenderer(),
            "frog": new FrogBiomeRenderer(),
            "bunny": new BunnyBiomeRenderer(),
            "fish": new FishBiomeRenderer(),
            "fox": new FoxBiomeRenderer(),
            "kangaroo": new KangarooBiomeRenderer(),
            "panda": new PandaBiomeRenderer(),
            "cat": new CatBiomeRenderer()
        };

        this.biomeNames = {
            "crane": "Ascension Alps",
            "frog": "Emerald Cascades",
            "bunny": "Sakura Temple",
            "fish": "Teal Trench",
            "fox": "Glacial Timberland",
            "kangaroo": "Sunset Gorge",
            "panda": "Jade River Valley",
            "cat": "Neon City"
        };

        // --- BAKE PATHS ---
        this.baseCoinPath = new Path2D();
        const cs = 20;
        this.baseCoinPath.moveTo(0, -cs * 1.5); this.baseCoinPath.lineTo(cs, 0); 
        this.baseCoinPath.lineTo(0, cs * 1.5); this.baseCoinPath.lineTo(-cs, 0); this.baseCoinPath.closePath();

        this.baseCoinFoldPath = new Path2D();
        this.baseCoinFoldPath.moveTo(0, -cs * 1.5); this.baseCoinFoldPath.lineTo(0, cs * 1.5);

        this.baseBoostPath = new Path2D();
        this.baseBoostPath.moveTo(0, -1); this.baseBoostPath.lineTo(1, 0.6); 
        this.baseBoostPath.lineTo(0, 0.2); this.baseBoostPath.lineTo(-1, 0.6); this.baseBoostPath.closePath();

        this.baseEnemyBodyPath = new Path2D();
        this.baseEnemyBodyPath.moveTo(0, -0.4); this.baseEnemyBodyPath.lineTo(0.2, 0); 
        this.baseEnemyBodyPath.lineTo(0, 0.6); this.baseEnemyBodyPath.lineTo(-0.2, 0); this.baseEnemyBodyPath.closePath();

        this.baseEnemyWingPath = new Path2D();
        this.baseEnemyWingPath.moveTo(0, 0); this.baseEnemyWingPath.lineTo(0.8, -0.2); 
        this.baseEnemyWingPath.lineTo(0.3, 0.3); this.baseEnemyWingPath.closePath();

        this.baseSakuraPath = new Path2D();
        this.baseSakuraPath.moveTo(0, -1); this.baseSakuraPath.lineTo(1, 0); 
        this.baseSakuraPath.lineTo(0, 1); this.baseSakuraPath.lineTo(-1, 0); this.baseSakuraPath.closePath();

        // Try load loading background
        const img = new Image();
        img.src = './origami/bg_loading.png';
        img.onload = () => { this.loadingBg = img; };
    }

    private setDropShadow(ctx: CanvasRenderingContext2D, active: boolean, color: string = "rgba(0,0,0,0.5)", blur: number = 5, ox: number = 5, oy: number = 5) {
        if (active) {
            ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = ox; ctx.shadowOffsetY = oy;
        } else {
            ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        const g = this.game;
        const time = Date.now();

        const displayChar = (g.currentGameState === GameStates.VILLAGE && g.villageViewIndex >= 0 && g.villageViewIndex < g.characterRoster.length)
            ? g.characterRoster[g.villageViewIndex]
            : g.currentCharacter;

        const currentBiome = this.biomes[displayChar] || this.biomes["crane"];

        if (g.score !== this.cachedScore) {
            this.cachedScore = g.score; this.cachedScoreStr = g.score.toString();
        }
        if (g.coinsCollectedThisRun !== this.cachedCoins) {
            this.cachedCoins = g.coinsCollectedThisRun; this.cachedCoinsStr = g.coinsCollectedThisRun.toString();
        }

        if (this.lastSkyChar !== displayChar || this.lastThemeTop === 0) {
            this.cachedSkyColors = currentBiome.skyColors;
            this.lastSkyChar = displayChar;
            this.lastThemeTop = 1; this.lastThemeBottom = 1; 
        }

        const skyGrad = ctx.createLinearGradient(0, 0, 0, g.height);
        this.cachedSkyColors.forEach((c, i) => skyGrad.addColorStop(i / (this.cachedSkyColors.length - 1), c));
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, g.width, g.height);

        currentBiome.drawBackground(ctx, g, time);

        if (g.currentGameState === GameStates.LOADING) {
            if (this.loadingBg) {
                const scale = Math.max(g.width / this.loadingBg.width, g.height / this.loadingBg.height);
                const sw = this.loadingBg.width * scale;
                const sh = this.loadingBg.height * scale;
                const left = (g.width - sw) / 2;
                const top = (g.height - sh) / 2;
                ctx.drawImage(this.loadingBg, left, top, sw, sh);
            } else {
                ctx.fillStyle = "rgba(0,0,0,0.9)";
                ctx.fillRect(0, 0, g.width, g.height);
            }
            return;
        }

        if (g.currentGameState === GameStates.MAIN_MENU) {
            this.drawMainMenu(ctx);
            return;
        }
        if (g.currentGameState === GameStates.VILLAGE) {
            this.drawVillage(ctx, currentBiome);
            return;
        }

        for (let i = 0; i < g.bgTrees.length; i++) {
            currentBiome.drawParallaxObject(ctx, g, g.bgTrees[i]);
        }

        // --- DRAW PLATFORMS ---
        for (let i = 0; i < g.platforms.length; i++) {
            const p = g.platforms[i];
            const pid = p.id;
            if (p.scale <= 0.01) continue;

            const isBroken = (p.type === 4 && g.brokenPlatforms.has(pid));

            ctx.save();
            let currentScaleX = 1.0;
            if (p.type === 2) {
                const cycle = (time + pid) % 7000;
                if (cycle >= 0 && cycle <= 2500) currentScaleX = 1.0;
                else if (cycle > 2500 && cycle <= 3000) currentScaleX = (3000 - cycle) / 500;
                else if (cycle > 3000 && cycle <= 6500) currentScaleX = 0.05;
                else if (cycle > 6500 && cycle <= 7000) currentScaleX = (cycle - 6500) / 500;
            }

            ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
            if (isBroken) {
                const spin = (time + pid) % 360;
                ctx.rotate(spin * Math.PI / 180);
            }
            ctx.scale(currentScaleX * p.scale, p.scale);
            ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));

            if (!isBroken && currentScaleX > 0.5 && p.type !== 0 && p.type !== 4) {
                ctx.save();
                ctx.translate(0, 8);
                ctx.fillStyle = "rgba(0,0,0,0.4)";
                p.draw(ctx);
                ctx.fill();
                ctx.restore();
            }

            switch (p.type) {
                case 0: currentBiome.drawPlatform(ctx, g, p); break;
                case 1: ctx.fillStyle = "#4FC3F7"; p.draw(ctx); ctx.fill(); break;
                case 2: ctx.fillStyle = "#FFFF9800"; p.draw(ctx); ctx.fill(); break;
                case 3: ctx.fillStyle = "#81C784"; p.draw(ctx); ctx.fill(); break;
                case 4: ctx.fillStyle = "rgba(238, 238, 238, 0.73)"; p.draw(ctx); ctx.fill(); break;
            }
            ctx.restore();

            if (currentScaleX > 0.5 && !isBroken && p.hazard) {
                p.hazard.draw(ctx);
            }
        }

        // --- DRAW BOOSTS ---
        for (let i = 0; i < g.boosts.length; i++) {
            const b = g.boosts[i];
            if (!b.isCollected) {
                ctx.save();
                ctx.translate(b.x, b.y + (Math.sin((time + b.x) / 200.0) * 10));
                
                const pulse = 1.0 + Math.sin(time / 150.0) * 0.3;
                ctx.fillStyle = "rgba(255, 0, 127, 0.53)";
                ctx.beginPath(); ctx.arc(0, 0, b.size * 1.5 * pulse, 0, Math.PI * 2); ctx.fill();

                ctx.scale(b.size, b.size);
                
                ctx.save(); ctx.translate(0, 0.15); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill(this.baseBoostPath); ctx.restore();
                ctx.fillStyle = "#FF007F"; ctx.fill(this.baseBoostPath);
                ctx.restore();
            }
        }

        // --- DRAW COINS ---
        for (let i = 0; i < g.coins.length; i++) {
            const c = g.coins[i];
            if (!c.isCollected) {
                ctx.save();
                ctx.translate(c.x, c.y);

                ctx.save(); ctx.translate(0, 6); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill(this.baseCoinPath); ctx.restore();

                ctx.fillStyle = "#FFD700"; ctx.fill(this.baseCoinPath);
                ctx.strokeStyle = "#FBC02D"; ctx.lineWidth = 3; ctx.stroke(this.baseCoinFoldPath);
                ctx.restore();
            }
        }

        // --- DRAW ENEMIES ---
        for (let i = 0; i < g.enemies.length; i++) {
            const e = g.enemies[i];
            const es = e.size;
            const ecx = e.x + es / 2;
            const ecy = e.y + es / 2;

            ctx.save();
            ctx.translate(ecx, ecy);
            ctx.scale(es, es);

            ctx.save(); ctx.translate(0, 0.1); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill(this.baseEnemyBodyPath); ctx.restore();
            ctx.fillStyle = "#1C1C1C"; ctx.fill(this.baseEnemyBodyPath);

            const flapRaw = Math.sin(time / 80.0);
            const flapScale = flapRaw > 0 ? flapRaw : flapRaw * 0.5;

            ctx.translate(0, -0.1);
            ctx.scale(1.0, flapScale);
            
            ctx.fillStyle = "#B71C1C";
            ctx.fill(this.baseEnemyWingPath);
            ctx.scale(-1, 1);
            ctx.fill(this.baseEnemyWingPath);
            ctx.restore();
        }

        // --- DRAW PARTICLES ---
        for (let i = 0; i < g.particlePool.length; i++) {
            const p = g.particlePool[i];
            if (p.life <= 0) continue;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / 255);
            ctx.fillStyle = p.color;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);

            if (p.type === ParticleTypes.WATER) {
                ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === ParticleTypes.SAND) {
                ctx.beginPath(); ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === ParticleTypes.SAKURA) {
                ctx.scale(p.size, p.size); ctx.fill(this.baseSakuraPath);
            } else {
                ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            }
            ctx.restore();
        }

        // Visual-only offset to push the sprite down into the platform without altering physics
        const visualYOffset = 15 * g.scaleRatio; 

        CharacterRenderer.drawCharacter(
            ctx, g.currentCharacter, g.player.x, g.player.y + visualYOffset, g.player.size, g.player.velocityY, g.player.facingRight, time
        );

        currentBiome.drawForeground(ctx, g, time);
        WeatherManager.draw(ctx, g.currentCharacter);

        const minDim = Math.min(g.width, g.height) * this.uiScale * this.tabletScale;

        // --- HUD TEXTS ---
        if (g.currentGameState === GameStates.PLAYING || g.currentGameState === GameStates.PAUSED || g.currentGameState === GameStates.GAME_OVER) {
            ctx.textAlign = "left";
            
            // REDUCED TEXT SIZES FOR BETTER MOBILE FIT
            const hudSize = minDim * 0.035; 
            const numSize = minDim * 0.040;
            const padX = minDim * 0.03;
            const padY1 = minDim * 0.05;
            const padY2 = minDim * 0.09;
            
            ctx.font = `${hudSize}px 'origraph', system-ui, sans-serif`;
            this.scorePrefixWidth = ctx.measureText("Score: ").width;
            this.coinsPrefixWidth = ctx.measureText("Coins: ").width;
            
            this.setDropShadow(ctx, true);
            
            ctx.fillStyle = "white"; ctx.fillText("Score: ", padX, padY1);
            ctx.fillStyle = "#FFD700"; ctx.font = `bold ${numSize}px system-ui, sans-serif`; 
            ctx.fillText(this.cachedScoreStr + " ft", padX + this.scorePrefixWidth, padY1);

            ctx.fillStyle = "white"; ctx.font = `${hudSize}px origraph, sans-serif`; 
            ctx.fillText("Coins: ", padX, padY2);
            ctx.fillStyle = "#FFD700"; ctx.font = `bold ${numSize}px system-ui, sans-serif`; 
            ctx.fillText(this.cachedCoinsStr, padX + this.coinsPrefixWidth, padY2);
            
            this.setDropShadow(ctx, false);
        }

        if (g.currentGameState === GameStates.PLAYING) {
            // SHRUNK AND REPOSITIONED PAUSE BUTTON
            const marginBtn = minDim * 0.02; 
            const wBtn = minDim * 0.08; 
            this.pauseButtonRect.set(g.width - marginBtn - wBtn, marginBtn, g.width - marginBtn, marginBtn + wBtn);
            
            ctx.fillStyle = "rgba(255,255,255,0.78)";
            const pW = wBtn * 0.12;
            const pH = wBtn * 0.4;
            ctx.fillRect(this.pauseButtonRect.centerX() - pW * 1.5, this.pauseButtonRect.centerY() - pH / 2, pW, pH);
            ctx.fillRect(this.pauseButtonRect.centerX() + pW * 0.5, this.pauseButtonRect.centerY() - pH / 2, pW, pH);
        }

        // --- GAME STATES OVERLAYS ---
        switch (g.currentGameState) {
            case GameStates.TUTORIAL: {
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(0, 0, g.width, g.height);

                let charsLeftToDraw = g.typeIndex;
                const textSize = 28 * this.uiScale * this.tabletScale;
                const numSize = 32 * this.uiScale * this.tabletScale;
                const lineHeight = textSize + 25;
                let textY = (g.height / 2) - ((g.fullTutorialLines.length * lineHeight) / 2) + (lineHeight / 2);

                for (let i = 0; i < g.fullTutorialLines.length; i++) {
                    if (charsLeftToDraw <= 0) break;
                    const lineObj = g.fullTutorialLines[i];
                    const charsInThisLine = lineObj.text.length;
                    const drawCount = charsLeftToDraw >= charsInThisLine ? charsInThisLine : charsLeftToDraw;
                    const currentLineSegment = lineObj.text.substring(0, drawCount);

                    if (lineObj.hasDigit && charsLeftToDraw >= charsInThisLine) {
                        ctx.textAlign = "left";
                        let totalWidth = 0;
                        lineObj.words.forEach(word => {
                            const isDig = /\d/.test(word);
                            ctx.font = `${isDig ? numSize : textSize}px ${isDig ? 'system-ui, sans-serif' : 'origraph, sans-serif'}`;
                            ctx.font = isDig ? `bold ${ctx.font}` : ctx.font;
                            totalWidth += ctx.measureText(word + " ").width;
                        });

                        let startX = (g.width / 2) - (totalWidth / 2);
                        lineObj.words.forEach(word => {
                            const isDig = /\d/.test(word);
                            ctx.font = `${isDig ? numSize : textSize}px ${isDig ? 'system-ui, sans-serif' : 'origraph, sans-serif'}`;
                            ctx.font = isDig ? `bold ${ctx.font}` : ctx.font;
                            ctx.fillStyle = isDig ? "#FFD700" : "white";
                            ctx.fillText(word, startX, textY);
                            startX += ctx.measureText(word + " ").width;
                        });
                        ctx.textAlign = "center";
                    } else {
                        ctx.textAlign = "center";
                        ctx.fillStyle = "white";
                        ctx.font = `${textSize}px origraph, sans-serif`;
                        ctx.fillText(currentLineSegment, g.width / 2, textY);
                    }

                    textY += lineHeight;
                    charsLeftToDraw -= (charsInThisLine + 1);
                }

                if (g.typeIndex >= g.fullTutorialText.length && [1, 2, 3, 11].includes(g.tutorialPhase)) {
                    if (time % 1000 > 500) {
                        ctx.fillStyle = "rgba(255,255,255,0.6)";
                        ctx.font = `${textSize}px origraph, sans-serif`;
                        ctx.fillText("(Press Select to continue)", g.width / 2, g.height - 200);
                    }
                }
                break;
            }

            case GameStates.PAUSED: {
                ctx.fillStyle = "rgba(0,0,0,0.9)";
                ctx.fillRect(0, 0, g.width, g.height);

                const titleY = g.height * (g.isLargeScreen ? 0.25 : 0.35);
                const resumeY = g.height * (g.isLargeScreen ? 0.50 : 0.45);
                const settingsY = g.height * (g.isLargeScreen ? 0.70 : 0.58);

                ctx.textAlign = "center";
                ctx.fillStyle = "white";
                ctx.font = `${minDim * 0.05}px origraph, sans-serif`;
                ctx.fillText("PAUSED", g.width / 2, titleY);

                const btnWidth = minDim * 0.4;
                const btnHeight = minDim * 0.09;
                const btnTextSize = minDim * 0.03;

                this.pauseResumeButtonRect.set(g.width / 2 - btnWidth / 2, resumeY, g.width / 2 + btnWidth / 2, resumeY + btnHeight);
                ctx.fillStyle = "#FF7B54";
                ctx.beginPath(); ctx.roundRect(this.pauseResumeButtonRect.left, this.pauseResumeButtonRect.top, btnWidth, btnHeight, 25); ctx.fill();
                ctx.fillStyle = "white"; ctx.font = `${btnTextSize}px origraph, sans-serif`;
                ctx.fillText("RESUME", g.width / 2, this.pauseResumeButtonRect.centerY() + (btnTextSize / 3));

                this.settingsMenuButtonRect.set(g.width / 2 - btnWidth / 2, settingsY, g.width / 2 + btnWidth / 2, settingsY + btnHeight);
                ctx.fillStyle = "#FF7B54";
                ctx.beginPath(); ctx.roundRect(this.settingsMenuButtonRect.left, this.settingsMenuButtonRect.top, btnWidth, btnHeight, 25); ctx.fill();
                ctx.fillStyle = "white"; ctx.font = `${btnTextSize}px origraph, sans-serif`;
                ctx.fillText("SETTINGS", g.width / 2, this.settingsMenuButtonRect.centerY() + (btnTextSize / 3));
                break;
            }

            case GameStates.GAME_OVER: {
                ctx.fillStyle = "rgba(0,0,0,0.9)";
                ctx.fillRect(0, 0, g.width, g.height);

                const titleY = g.height * (g.isLargeScreen ? 0.18 : 0.25);
                const vaultY = g.height * (g.isLargeScreen ? 0.28 : 0.33);

                ctx.textAlign = "center";
                ctx.fillStyle = "white";
                ctx.font = `${minDim * 0.05}px origraph, sans-serif`;
                ctx.fillText("PAPERFOLDED", g.width / 2, titleY);

                // --- DRAW VAULT COINS ---
                const vPrefix = "VAULT: ";
                const vValue = g.totalCoins.toString();
                const vSuffix = " COINS";

                ctx.textAlign = "left";
                ctx.font = `${minDim * 0.03}px origraph, sans-serif`;
                const w1 = ctx.measureText(vPrefix).width;
                const w3 = ctx.measureText(vSuffix).width;

                ctx.font = `bold ${minDim * 0.03}px system-ui, sans-serif`;
                const w2 = ctx.measureText(vValue).width;

                let startX = (g.width - (w1 + w2 + w3)) / 2;
                
                ctx.fillStyle = "white"; ctx.font = `${minDim * 0.03}px origraph, sans-serif`;
                ctx.fillText(vPrefix, startX, vaultY);
                startX += w1;
                
                ctx.fillStyle = "#FFD700"; ctx.font = `bold ${minDim * 0.03}px system-ui, sans-serif`;
                ctx.fillText(vValue, startX, vaultY);
                startX += w2;

                ctx.fillStyle = "white"; ctx.font = `${minDim * 0.03}px origraph, sans-serif`;
                ctx.fillText(vSuffix, startX, vaultY);

                ctx.textAlign = "center";

                const reviveCost = Web3Service.REVIVE_COST;
                const canRevive = Web3Service.canSign() && Web3Service.tokenBalance >= reviveCost && !g.reviveInFlight;
                let yOffset = g.isLargeScreen ? -(g.height * 0.05) : -(minDim * 0.02);
                const btnSpacing = g.isLargeScreen ? (g.height * 0.12) : (minDim * 0.10);

                const btnWidth = minDim * 0.4;
                const btnHeight = minDim * 0.085;
                const btnTextSize = minDim * 0.025;

                // --- REVIVE BUTTON ---
                this.reviveButtonRect.set(g.width / 2 - btnWidth / 2, g.height / 2 + yOffset, g.width / 2 + btnWidth / 2, g.height / 2 + yOffset + btnHeight);

                ctx.fillStyle = canRevive ? "#4CAF50" : "#555555";
                ctx.beginPath(); ctx.roundRect(this.reviveButtonRect.left, this.reviveButtonRect.top, btnWidth, btnHeight, 25); ctx.fill();

                const reviveText = g.reviveInFlight ? "BURNING... " : "REVIVE ";
                const costText = `(BURN ${reviveCost.toLocaleString()} $2BA)`;

                ctx.font = `${btnTextSize}px origraph, sans-serif`;
                const wRevive = ctx.measureText(reviveText).width;
                ctx.font = `bold ${btnTextSize}px system-ui, sans-serif`;
                const wCost = ctx.measureText(costText).width;

                let btnStartX = (g.width - (wRevive + wCost)) / 2;
                ctx.textAlign = "left";
                
                ctx.fillStyle = canRevive ? "white" : "rgba(255,255,255,0.5)";
                
                ctx.font = `${btnTextSize}px origraph, sans-serif`;
                ctx.fillText(reviveText, btnStartX, this.reviveButtonRect.centerY() + (btnTextSize / 3));
                btnStartX += wRevive;
                
                ctx.font = `bold ${btnTextSize}px system-ui, sans-serif`;
                ctx.fillText(costText, btnStartX, this.reviveButtonRect.centerY() + (btnTextSize / 3));

                ctx.textAlign = "center";
                yOffset += btnSpacing;

                // --- RESTART BUTTON ---
                this.restartButtonRect.set(g.width / 2 - btnWidth / 2, g.height / 2 + yOffset, g.width / 2 + btnWidth / 2, g.height / 2 + yOffset + btnHeight);
                ctx.fillStyle = "#FF7B54";
                ctx.beginPath(); ctx.roundRect(this.restartButtonRect.left, this.restartButtonRect.top, btnWidth, btnHeight, 25); ctx.fill();
                ctx.fillStyle = "white"; ctx.font = `${btnTextSize}px origraph, sans-serif`;
                ctx.fillText("RESTART", g.width / 2, this.restartButtonRect.centerY() + (btnTextSize / 3));

                yOffset += btnSpacing;

                // --- MAIN MENU BUTTON ---
                this.menuButtonRect.set(g.width / 2 - btnWidth / 2, g.height / 2 + yOffset, g.width / 2 + btnWidth / 2, g.height / 2 + yOffset + btnHeight);
                ctx.fillStyle = "#2C363F";
                ctx.beginPath(); ctx.roundRect(this.menuButtonRect.left, this.menuButtonRect.top, btnWidth, btnHeight, 25); ctx.fill();
                ctx.fillStyle = "white"; ctx.font = `${btnTextSize}px origraph, sans-serif`;
                ctx.fillText("MAIN MENU", g.width / 2, this.menuButtonRect.centerY() + (btnTextSize / 3));
                
                yOffset += btnSpacing;

                // --- LEADERBOARD BUTTON (GAME OVER) ---
                this.goLeaderboardBtnRect.set(g.width / 2 - btnWidth / 2, g.height / 2 + yOffset, g.width / 2 + btnWidth / 2, g.height / 2 + yOffset + btnHeight);
                ctx.fillStyle = "#FFCA28"; // Golden Color
                ctx.beginPath(); ctx.roundRect(this.goLeaderboardBtnRect.left, this.goLeaderboardBtnRect.top, btnWidth, btnHeight, 25); ctx.fill();
                ctx.fillStyle = "#2C363F"; ctx.font = `${btnTextSize}px origraph, sans-serif`;
                ctx.fillText("LEADERBOARD", g.width / 2, this.goLeaderboardBtnRect.centerY() + (btnTextSize / 3));

                break;
            }
        }
    }

    private drawMainMenu(ctx: CanvasRenderingContext2D) {
        const g = this.game;
        const scaleMod = g.isLargeScreen ? 0.85 : 1.0;
        const minDim = Math.min(g.width, g.height) * this.uiScale * this.tabletScale * scaleMod;

        const birdY = g.height * (g.isLargeScreen ? 0.18 : 0.22);
        const titleY = g.height * (g.isLargeScreen ? 0.38 : 0.38);
        const hsY = g.height * (g.isLargeScreen ? 0.60 : 0.57);
        const playY = g.height * (g.isLargeScreen ? 0.78 : 0.70);

        const margin = minDim * 0.04;
        const topBtnSize = minDim * 0.08;

        // --- VILLAGE BUTTON ---
        this.villageButtonRect.set(margin, margin, margin + topBtnSize, margin + topBtnSize);
        ctx.fillStyle = "#FF7B54"; ctx.beginPath(); ctx.roundRect(this.villageButtonRect.left, this.villageButtonRect.top, topBtnSize, topBtnSize, 20); ctx.fill();
        
        ctx.save();
        ctx.translate(this.villageButtonRect.centerX(), this.villageButtonRect.centerY() + 5);
        const hSize = topBtnSize * 0.25;
        
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 5; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        ctx.beginPath(); ctx.moveTo(0, -hSize * 1.2); ctx.lineTo(-hSize, -hSize * 0.2);
        ctx.lineTo(-hSize, hSize); ctx.lineTo(hSize, hSize); ctx.lineTo(hSize, -hSize * 0.2); ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = "black"; ctx.shadowColor = "transparent";
        ctx.beginPath(); ctx.moveTo(-hSize * 0.3, hSize); ctx.lineTo(-hSize * 0.3, hSize * 0.2);
        ctx.lineTo(hSize * 0.3, hSize * 0.2); ctx.lineTo(hSize * 0.3, hSize); ctx.fill();
        ctx.restore();

        // --- LEADERBOARD BUTTON (MAIN MENU) ---
        this.leaderboardBtnRect.set(margin * 2 + topBtnSize, margin, margin * 2 + topBtnSize * 2, margin + topBtnSize);
        ctx.fillStyle = "#FFCA28"; ctx.beginPath(); ctx.roundRect(this.leaderboardBtnRect.left, this.leaderboardBtnRect.top, topBtnSize, topBtnSize, 20); ctx.fill();
        
        ctx.save();
        ctx.translate(this.leaderboardBtnRect.centerX(), this.leaderboardBtnRect.centerY());
        ctx.fillStyle = "#2C363F";
        const lBW = topBtnSize * 0.15;
        ctx.fillRect(-lBW/2, -topBtnSize*0.15, lBW, topBtnSize*0.35); // Center (1st)
        ctx.fillRect(-lBW/2 - lBW - 2, 0, lBW, topBtnSize*0.2);       // Left (2nd)
        ctx.fillRect(-lBW/2 + lBW + 2, -topBtnSize*0.05, lBW, topBtnSize*0.25); // Right (3rd)
        ctx.restore();

        // --- SETTINGS BUTTON ---
        this.settingsMenuButtonRect.set(g.width - margin - topBtnSize, margin, g.width - margin, margin + topBtnSize);
        ctx.fillStyle = "#FF7B54"; ctx.beginPath(); ctx.roundRect(this.settingsMenuButtonRect.left, this.settingsMenuButtonRect.top, topBtnSize, topBtnSize, 20); ctx.fill();
        
        ctx.save();
        ctx.translate(this.settingsMenuButtonRect.centerX(), this.settingsMenuButtonRect.centerY());
        const gSize = topBtnSize * 0.22;
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * 45.0) * Math.PI / 180;
            const nextAngle = ((i + 1) * 45.0 - 15.0) * Math.PI / 180;
            const outerX1 = Math.cos(angle) * gSize * 1.4; const outerY1 = Math.sin(angle) * gSize * 1.4;
            const outerX2 = Math.cos(nextAngle) * gSize * 1.4; const outerY2 = Math.sin(nextAngle) * gSize * 1.4;
            const innerAngle = (i * 45.0 - 10.0) * Math.PI / 180;
            const innerX = Math.cos(innerAngle) * gSize; const innerY = Math.sin(innerAngle) * gSize;
            if (i === 0) ctx.moveTo(innerX, innerY); else ctx.lineTo(innerX, innerY);
            ctx.lineTo(outerX1, outerY1); ctx.lineTo(outerX2, outerY2);
        }
        ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = "#FF7B54"; ctx.shadowColor = "transparent";
        ctx.beginPath(); ctx.arc(0, 0, gSize * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // --- LARGE PAPER BIRD ---
        ctx.save();
        ctx.translate(g.width / 2, birdY);
        const lSize = minDim * 0.1;
        ctx.fillStyle = "#FFCA28"; ctx.beginPath(); ctx.arc(0, 0, lSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#2C1E3A"; ctx.beginPath(); ctx.arc(0, 0, lSize * 0.92, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = "#BF360C";
        ctx.beginPath(); ctx.moveTo(0, -lSize * 0.8); ctx.lineTo(lSize * 0.7, -lSize * 0.4); ctx.lineTo(lSize * 0.8, lSize * 0.4); ctx.lineTo(lSize * 0.4, lSize * 0.8); ctx.lineTo(0, lSize * 0.9); ctx.lineTo(-lSize * 0.4, lSize * 0.8); ctx.lineTo(-lSize * 0.8, lSize * 0.4); ctx.lineTo(-lSize * 0.7, -lSize * 0.4); ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = "#FFCA28";
        ctx.beginPath(); ctx.moveTo(0, -lSize * 0.4); ctx.lineTo(lSize * 0.5, -lSize * 0.2); ctx.lineTo(lSize * 0.4, lSize * 0.3); ctx.lineTo(0, lSize * 0.6); ctx.lineTo(-lSize * 0.4, lSize * 0.3); ctx.lineTo(-lSize * 0.5, -lSize * 0.2); ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = "#FFE082";
        ctx.beginPath(); ctx.moveTo(0, -lSize * 0.1); ctx.lineTo(lSize * 0.18, lSize * 0.35); ctx.lineTo(0, lSize * 0.45); ctx.lineTo(-lSize * 0.18, lSize * 0.35); ctx.closePath(); ctx.fill();
        
        ctx.fillStyle = "#3E2723";
        ctx.beginPath(); ctx.moveTo(-lSize * 0.15, lSize * 0.35); ctx.lineTo(lSize * 0.15, lSize * 0.35); ctx.lineTo(0, lSize * 0.45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(lSize * 0.15, 0); ctx.lineTo(lSize * 0.35, 0); ctx.lineTo(lSize * 0.25, lSize * 0.08); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-lSize * 0.15, 0); ctx.lineTo(-lSize * 0.35, 0); ctx.lineTo(-lSize * 0.25, lSize * 0.08); ctx.closePath(); ctx.fill();
        ctx.restore();

        // --- TITLE TEXT (REDUCED SIZE) ---
        const ts = minDim * 0.06 * this.standaloneTextScale; 
        ctx.textAlign = "center";
        ctx.font = `${ts}px origraph, sans-serif`;
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 5; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 8;
        ctx.fillText("ORIGAMI", g.width / 2, titleY);
        ctx.fillText("ASCENT", g.width / 2, titleY + (minDim * 0.07));

        // --- HIGH SCORE VIA SAFE STORAGE WRAPPER ---
        const hs = Number(g.getPrefs("high_score", 0));
        const prefixTxt = "HIGH SCORE: ";
        const valueTxt = `${hs} ft`;

        const hsSize = minDim * 0.022 * this.standaloneTextScale;
        ctx.font = `${hsSize}px origraph, sans-serif`;
        const wPre = ctx.measureText(prefixTxt).width;
        ctx.font = `${hsSize}px system-ui, sans-serif`;
        const wVal = ctx.measureText(valueTxt).width;

        let sX = (g.width - (wPre + wVal)) / 2;
        ctx.textAlign = "left";
        
        ctx.fillStyle = "#FFD700";
        ctx.font = `${hsSize}px origraph, sans-serif`;
        ctx.fillText(prefixTxt, sX, hsY);
        
        sX += wPre;
        ctx.font = `${hsSize}px system-ui, sans-serif`;
        ctx.fillText(valueTxt, sX, hsY);

        // --- PLAY BUTTON ---
        const pBW = minDim * 0.4;
        const pBH = minDim * 0.085;
        this.playButtonRect.set(g.width / 2 - pBW / 2, playY, g.width / 2 + pBW / 2, playY + pBH);
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 6; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 8;
        ctx.beginPath(); ctx.roundRect(this.playButtonRect.left, this.playButtonRect.top, pBW, pBH, 50); ctx.fill();

        ctx.textAlign = "center";
        ctx.shadowColor = "transparent";
        ctx.fillStyle = "black";
        ctx.font = `${minDim * 0.03}px origraph, sans-serif`;
        ctx.fillText("TAP TO ASCEND", g.width / 2, this.playButtonRect.centerY() + (minDim * 0.01));
    }

    private drawVillage(ctx: CanvasRenderingContext2D, currentBiome: BiomeRenderer) {
        const g = this.game;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, g.width, g.height);

        const minDim = Math.min(g.width, g.height) * this.uiScale * this.tabletScale;

        // --- NEW VAULT DISPLAY (TOP RIGHT) ---
        const vPrefix = "VAULT: ";
        const vValue = g.totalCoins.toString();
        const vSuffix = " COINS";
        
        const vaultFs = minDim * 0.03 * this.standaloneTextScale;
        const rightPad = g.width - (minDim * 0.04);
        const topPad = minDim * 0.08;

        this.setDropShadow(ctx, true);
        ctx.textAlign = "right";

        // 1. Draw Suffix (" COINS")
        ctx.font = `${vaultFs}px origraph, sans-serif`;
        ctx.fillStyle = "white";
        ctx.fillText(vSuffix, rightPad, topPad);
        const wSuffix = ctx.measureText(vSuffix).width;

        // 2. Draw Value (Gold Number)
        ctx.font = `bold ${vaultFs}px system-ui, sans-serif`;
        ctx.fillStyle = "#FFD700";
        ctx.fillText(vValue, rightPad - wSuffix, topPad);
        const wValue = ctx.measureText(vValue).width;

        // 3. Draw Prefix ("VAULT: ")
        ctx.font = `${vaultFs}px origraph, sans-serif`;
        ctx.fillStyle = "white";
        ctx.fillText(vPrefix, rightPad - wSuffix - wValue, topPad);
        
        this.setDropShadow(ctx, false);
        // --------------------------------------

        const titleY = g.height * (g.isLargeScreen ? 0.10 : 0.15);
        const charY = g.height * 0.42;
        const nameY = g.height * (g.isLargeScreen ? 0.68 : 0.68);
        // Action button (LOCKED/SELECT) sits ABOVE the character so the
        // HOLD-$2BA line and wallet hint below the name render unobstructed.
        const actionY = g.height * (g.isLargeScreen ? 0.19 : 0.21);
        const backY = g.height * (g.isLargeScreen ? 0.88 : 0.92);

        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 5; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5;
        ctx.font = `${minDim * 0.05 * this.standaloneTextScale}px origraph, sans-serif`;
        ctx.fillText("GUARDIANS", g.width / 2, titleY);

        if (this.cachedVillageIndex !== g.villageViewIndex) {
            this.cachedVillageIndex = g.villageViewIndex;
            const vc = g.characterRoster[g.villageViewIndex];
            this.cachedCharName = this.biomeNames[vc] || vc.toUpperCase();
            this.cachedCostStr = Web3Service.thresholdFor(vc).toLocaleString();
        }

        const currentViewChar = g.characterRoster[g.villageViewIndex];
        const isUnlocked = g.isCharacterUnlocked(currentViewChar);
        const cost = g.characterCosts[currentViewChar] || 0;
        const charSize = minDim * 0.22;

        CharacterRenderer.drawVillageSpin(
            ctx, currentViewChar, g.width / 2, charY, charSize, Date.now(), isUnlocked
        );

        ctx.textAlign = "center";
        ctx.fillStyle = "white";
        ctx.font = `${minDim * 0.035 * this.standaloneTextScale}px origraph, sans-serif`;
        ctx.fillText(isUnlocked ? this.cachedCharName : "???", g.width / 2, nameY);

        if (!isUnlocked) {
            const costPrefix = "HOLD ";
            const costSuffix = " $2BA IN WALLET";
            const fs = minDim * 0.024 * this.standaloneTextScale;
            ctx.font = `${fs}px origraph, sans-serif`;
            const cW0 = ctx.measureText(costPrefix).width;
            const cW2 = ctx.measureText(costSuffix).width;
            ctx.font = `bold ${fs}px system-ui, sans-serif`;
            const cW1 = ctx.measureText(this.cachedCostStr).width;
            
            const cStartX = (g.width - (cW0 + cW1 + cW2)) / 2;
            const costColor = Web3Service.walletConnected ? "red" : "#FFC107";
            
            const fallbackStatusY = nameY + (minDim * 0.05);
            ctx.textAlign = "left";
            ctx.fillStyle = costColor;
            
            ctx.font = `${fs}px origraph, sans-serif`;
            ctx.fillText(costPrefix, cStartX, fallbackStatusY);
            
            ctx.font = `bold ${fs}px system-ui, sans-serif`;
            ctx.fillText(this.cachedCostStr, cStartX + cW0, fallbackStatusY);
            
            ctx.font = `${fs}px origraph, sans-serif`;
            ctx.fillText(costSuffix, cStartX + cW0 + cW1, fallbackStatusY);

            if (!Web3Service.walletConnected) {
                ctx.textAlign = "center";
                ctx.fillStyle = "#FFC107";
                ctx.font = `${fs * 0.9}px origraph, sans-serif`;
                ctx.fillText("Connect your wallet on the Arcade home page", g.width / 2, fallbackStatusY + fs * 1.6);
            }
        }

        // --- ARROW BUTTONS ---
        const arrowBtnWidth = minDim * 0.08;
        const arrowBtnHeight = arrowBtnWidth * 0.8;
        const edgeMargin = g.isLargeScreen ? g.width * 0.10 : minDim * 0.05;

        this.villageLeftBtn.set(edgeMargin, charY - arrowBtnHeight / 2, edgeMargin + arrowBtnWidth, charY + arrowBtnHeight / 2);
        ctx.fillStyle = "#FF7B54";
        ctx.beginPath(); ctx.roundRect(this.villageLeftBtn.left, this.villageLeftBtn.top, arrowBtnWidth, arrowBtnHeight, 20); ctx.fill();
        ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.font = `${arrowBtnHeight * 0.6}px origraph, sans-serif`;
        ctx.fillText("<", this.villageLeftBtn.centerX(), this.villageLeftBtn.centerY() + (arrowBtnHeight * 0.2));

        this.villageRightBtn.set(g.width - edgeMargin - arrowBtnWidth, charY - arrowBtnHeight / 2, g.width - edgeMargin, charY + arrowBtnHeight / 2);
        ctx.fillStyle = "#FF7B54";
        ctx.beginPath(); ctx.roundRect(this.villageRightBtn.left, this.villageRightBtn.top, arrowBtnWidth, arrowBtnHeight, 20); ctx.fill();
        ctx.fillStyle = "white";
        ctx.fillText(">", this.villageRightBtn.centerX(), this.villageRightBtn.centerY() + (arrowBtnHeight * 0.2));

        // --- ACTION BUTTON ---
        const actW = minDim * 0.3;
        const actH = minDim * 0.07;
        this.villageActionBtn.set(g.width / 2 - actW / 2, actionY, g.width / 2 + actW / 2, actionY + actH);
        
        if (isUnlocked && currentViewChar === g.currentCharacter) ctx.fillStyle = "#4CAF50";
        else if (isUnlocked) ctx.fillStyle = "#2196F3";
        else ctx.fillStyle = "#F44336";

        ctx.beginPath(); ctx.roundRect(this.villageActionBtn.left, this.villageActionBtn.top, actW, actH, 25); ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.font = `${actH * 0.45}px origraph, sans-serif`;
        const actText = isUnlocked ? (currentViewChar === g.currentCharacter ? "SELECTED" : "SELECT") : "LOCKED";
        ctx.fillText(actText, this.villageActionBtn.centerX(), this.villageActionBtn.centerY() + (actH * 0.15));

        // --- BACK BUTTON ---
        const bW = minDim * 0.15;
        const bH = minDim * 0.055;
        this.villageBackBtn.set(g.width / 2 - bW / 2, backY, g.width / 2 + bW / 2, backY + bH);
        ctx.fillStyle = "#FF7B54";
        ctx.beginPath(); ctx.roundRect(this.villageBackBtn.left, this.villageBackBtn.top, bW, bH, 20); ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = `${bH * 0.45}px origraph, sans-serif`;
        ctx.fillText("BACK", this.villageBackBtn.centerX(), this.villageBackBtn.centerY() + (bH * 0.15));
    }
}