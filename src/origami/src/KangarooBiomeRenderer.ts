import type { BiomeRenderer } from './BiomeRenderer';
import { JumperGame, Platform, BgTree } from './JumperGame';

interface Bird {
    x: number;
    y: number;
    speed: number;
    scale: number;
    flapOffset: number;
}

export class KangarooBiomeRenderer implements BiomeRenderer {
    readonly skyColors = ["#2C1A3D", "#882D38", "#D84315"];

    private readonly shadowColor = "rgba(0, 0, 0, 0.3)";
    private readonly sunColors = ["rgba(255, 213, 79, 0.07)", "rgba(255, 213, 79, 0.2)", "rgba(255, 213, 79, 0.53)", "#FFD54F"];
    
    private readonly canyonColors = [
        "#FFB74D", "#FF9800", "#F57C00",
        "#EF6C00", "#E65100", "#BF360C"
    ];

    // WeakMaps handle the platform crack tracking without memory leaks
    private platformCrackLevels = new WeakMap<Platform, number>();
    private platformCrackTimes = new WeakMap<Platform, number>();

    private birds: Bird[] = Array.from({ length: 8 }, () => ({
        x: Math.random() * 2000,
        y: Math.random() * 300 + 50,
        speed: Math.random() * 2 + 1,
        scale: Math.random() * 0.4 + 0.4,
        flapOffset: Math.random() * 10
    }));

    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        const w = game.width;
        const h = game.height;

        // 1. MASSIVE SETTING SUN
        const sunX = w * 0.5;
        const sunY = h * 0.45;

        for (let i = 0; i <= 3; i++) {
            ctx.fillStyle = this.sunColors[i];
            ctx.beginPath();
            ctx.arc(sunX, sunY, 450 - (i * 100), 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. FLYING SILHOUETTE BIRDS
        ctx.fillStyle = "#111111";
        for (const bird of this.birds) {
            bird.x -= bird.speed;
            if (bird.x < -100) {
                bird.x = w + 100;
                bird.y = Math.random() * (h * 0.35) + 50;
            }
            const flapState = Math.sin((time / 150) + bird.flapOffset);
            const flapY = flapState > 0 ? flapState * 20 : flapState * 10;
            
            ctx.save();
            ctx.translate(bird.x, bird.y);
            ctx.scale(bird.scale, bird.scale);

            const birdPath = () => {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(25, flapY);
                ctx.lineTo(10, 5);
                ctx.lineTo(0, 12);
                ctx.lineTo(-10, 5);
                ctx.lineTo(-25, flapY);
                ctx.closePath();
            };

            // Shadow
            ctx.save(); ctx.translate(4, 8); ctx.fillStyle = this.shadowColor; birdPath(); ctx.fill(); ctx.restore();
            birdPath(); ctx.fill();
            ctx.restore();
        }

        // 3. HORIZON CLAMPING
        const horizonY = h * 0.6 + Math.min(game.backMountainY * 0.15, h * 0.2);

        // 4. FLAT ORANGE RIVER BED
        ctx.fillStyle = "#D84315";
        ctx.fillRect(0, horizonY, w, h - horizonY);

        // 5. STATIC WINDING SINE-WAVE RIVER
        const riverSegments = 20;
        const riverPath = () => {
            ctx.beginPath();
            for (let i = 0; i <= riverSegments; i++) {
                const t = i / riverSegments;
                const tp = t * t;
                const y = horizonY + tp * (h - horizonY);
                const widthAtY = w * 0.05 + tp * (w * 0.2);
                const waveX = Math.sin(t * Math.PI * 3.0) * (w * 0.15 * tp);
                const centerX = w * 0.5 + waveX;
                if (i === 0) ctx.moveTo(centerX - widthAtY, y);
                else ctx.lineTo(centerX - widthAtY, y);
            }
            for (let i = riverSegments; i >= 0; i--) {
                const t = i / riverSegments;
                const tp = t * t;
                const y = horizonY + tp * (h - horizonY);
                const widthAtY = w * 0.05 + tp * (w * 0.2);
                const waveX = Math.sin(t * Math.PI * 3.0) * (w * 0.15 * tp);
                const centerX = w * 0.5 + waveX;
                ctx.lineTo(centerX + widthAtY, y);
            }
            ctx.closePath();
        };

        ctx.save(); ctx.translate(0, 6); ctx.fillStyle = this.shadowColor; riverPath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#FF8A65";
        riverPath();
        ctx.fill();

        // 6. DYNAMIC BROKEN WATER FLOW LINES
        const phase = (time % 10000) / 3;
        ctx.save();
        ctx.setLineDash([80, 30, 20, 50, 120, 40]);
        ctx.lineDashOffset = phase;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 3.5;

        for (let line = -1; line <= 1; line++) {
            ctx.beginPath();
            for (let i = 0; i <= riverSegments; i++) {
                const t = i / riverSegments;
                const tp = t * t;
                const y = horizonY + tp * (h - horizonY);
                const waveX = Math.sin(t * Math.PI * 3.0) * (w * 0.15 * tp);
                const centerX = w * 0.5 + waveX + (line * w * 0.08 * tp);
                if (i === 0) ctx.moveTo(centerX, y);
                else ctx.lineTo(centerX, y);
            }
            ctx.stroke();
        }
        ctx.restore();

        // 7. RIVER ROCKS & FOAM
        this.drawRiverRock(ctx, w, h, horizonY, time, 0.45);
        this.drawRiverRock(ctx, w, h, horizonY, time, 0.75);

        // 8. VIBRANT CANYONS
        this.drawHighlyFacetedCanyon(ctx, w, h, horizonY, true);
        this.drawHighlyFacetedCanyon(ctx, w, h, horizonY, false);
    }

    private drawRiverRock(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, time: number, t: number) {
        const tp = t * t;
        const y = horizonY + tp * (h - horizonY);
        const waveX = Math.sin(t * Math.PI * 3.0) * (w * 0.15 * tp);
        const cx = w * 0.5 + waveX + (Math.sin(t * 10.0) * w * 0.05 * tp);
        const scale = 0.6 + tp;

        ctx.save();
        ctx.translate(cx, y);
        ctx.scale(scale, scale);

        // FOAM DISPERSION
        for (let i = 0; i <= 2; i++) {
            const cycle = ((time + i * 400) % 1200) / 1200;
            const expand = cycle * 40;
            ctx.save();
            ctx.globalAlpha = 1.0 - cycle;
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.moveTo(-25 - expand, -10 - expand * 0.3);
            ctx.lineTo(-10 - expand * 0.5, -25 - expand);
            ctx.lineTo(0, -15 - expand * 0.8);
            ctx.lineTo(15 + expand * 0.5, -28 - expand);
            ctx.lineTo(30 + expand, -5 - expand * 0.3);
            ctx.lineTo(15 + expand * 0.5, 5 + expand * 0.5);
            ctx.lineTo(-15 - expand * 0.5, 5 + expand * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Faceted Origami Rock
        const pPeak = [0, -22], pFront = [4, 16], pLeft = [-24, 2], pRight = [26, -4], pMidL = [-8, -4], pMidR = [12, -8];

        ctx.save(); ctx.translate(4, 8); ctx.fillStyle = this.shadowColor;
        ctx.beginPath(); ctx.moveTo(pLeft[0], pLeft[1]); ctx.lineTo(pPeak[0], pPeak[1]);
        ctx.lineTo(pRight[0], pRight[1]); ctx.lineTo(pFront[0], pFront[1]); ctx.closePath(); ctx.fill(); ctx.restore();

        this.drawTriangle(ctx, this.canyonColors[4], pLeft, pPeak, pMidL);
        this.drawTriangle(ctx, this.canyonColors[1], pMidL, pPeak, pMidR);
        this.drawTriangle(ctx, this.canyonColors[5], pMidR, pPeak, pRight);
        this.drawTriangle(ctx, this.canyonColors[2], pLeft, pMidL, pFront);
        this.drawTriangle(ctx, this.canyonColors[0], pMidL, pMidR, pFront);
        this.drawTriangle(ctx, this.canyonColors[3], pMidR, pRight, pFront);

        ctx.restore();
    }

    private drawHighlyFacetedCanyon(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, isLeft: boolean) {
        const steps = 4;
        const hBankX = isLeft ? w * 0.38 : w * 0.62;
        const bBankX = isLeft ? -w * 0.1 : w * 1.1;
        const hTopInX = isLeft ? w * 0.35 : w * 0.65;
        const bTopInX = isLeft ? -w * 0.3 : w * 1.3;
        const hTopOutX = isLeft ? w * 0.1 : w * 0.9;
        const bTopOutX = isLeft ? -w * 0.6 : w * 1.6;

        let pBankX = hBankX, pBankY = horizonY;
        let pTopInX = hTopInX, pTopInY = horizonY - 15;
        let pTopOutX = hTopOutX, pTopOutY = horizonY - 20;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const tp = t * t;

            const cBankX = hBankX + (bBankX - hBankX) * tp;
            const cBankY = horizonY + (h + 100 - horizonY) * tp;
            const hBump = (15 + i * 45);
            const cTopInX = hTopInX + (bTopInX - hTopInX) * tp;
            const cTopInY = horizonY - 15 + (h - 200 - (horizonY - 15)) * tp - hBump;
            const cTopOutX = hTopOutX + (bTopOutX - hTopOutX) * tp;
            const cTopOutY = horizonY - 20 + (h - 300 - (horizonY - 20)) * tp - hBump;

            this.drawTriangle(ctx, this.canyonColors[i % 2 === 0 ? 2 : 3], [pBankX, pBankY], [pTopInX, pTopInY], [cTopInX, cTopInY]);
            this.drawTriangle(ctx, this.canyonColors[i % 2 === 0 ? 3 : 4], [pBankX, pBankY], [cTopInX, cTopInY], [cBankX, cBankY]);

            this.drawTriangle(ctx, this.canyonColors[i % 2 === 0 ? 0 : 1], [pTopInX, pTopInY], [pTopOutX, pTopOutY], [cTopOutX, cTopOutY]);
            this.drawTriangle(ctx, this.canyonColors[i % 2 === 0 ? 1 : 2], [pTopInX, pTopInY], [cTopOutX, cTopOutY], [cTopInX, cTopInY]);

            const dX = isLeft ? 0 : w;
            this.drawTriangle(ctx, this.canyonColors[4], [pTopOutX, pTopOutY], [dX, pTopOutY], [dX, cTopOutY]);
            this.drawTriangle(ctx, this.canyonColors[5], [pTopOutX, pTopOutY], [dX, cTopOutY], [cTopOutX, cTopOutY]);

            pBankX = cBankX; pBankY = cBankY; pTopInX = cTopInX; pTopInY = cTopInY; pTopOutX = cTopOutX; pTopOutY = cTopOutY;
        }
    }

    private drawTriangle(ctx: CanvasRenderingContext2D, color: string, p1: number[], p2: number[], p3: number[]) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]);
        ctx.closePath();
        ctx.fill();
    }

    drawForeground(): void {}

    drawPlatform(ctx: CanvasRenderingContext2D, game: JumperGame, platform: Platform): void {
        const p = platform;
        const now = Date.now();
        const cracks = this.platformCrackLevels.get(p) || 0;
        const lastCracked = this.platformCrackTimes.get(p) || 0;

        if (p.y < 0) {
            this.platformCrackLevels.set(p, 0);
            this.platformCrackTimes.set(p, 0);
        } else {
            const pBottom = game.player.y + game.player.size;
            const pCenter = game.player.x + (game.player.size / 2);
            if (game.player.velocityY < -8 && pBottom >= p.y - 40 && pBottom <= p.y + 80 && pCenter > p.x && pCenter < p.x + p.width) {
                if (now - lastCracked > 400 && cracks < 3) {
                    this.platformCrackLevels.set(p, cracks + 1);
                    this.platformCrackTimes.set(p, now);
                }
            }
        }

        ctx.save(); ctx.translate(6, 10); ctx.fillStyle = this.shadowColor; p.draw(ctx); ctx.fill(); ctx.restore();

        ctx.save();
        ctx.shadowBlur = 8; ctx.shadowOffsetY = 8; ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.fillStyle = "#FFE082";
        p.draw(ctx);
        ctx.fill();
        ctx.restore();

        ctx.save();
        p.draw(ctx); ctx.clip();
        ctx.fillStyle = "#FFF8E1";
        ctx.fillRect(p.x, p.y, p.width, p.height * 0.2);

        ctx.fillStyle = "#FFCA28";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + p.height * 0.4); ctx.lineTo(p.x + p.width * 0.3, p.y + p.height * 0.6);
        ctx.lineTo(p.x + p.width * 0.7, p.y + p.height * 0.5); ctx.lineTo(p.x + p.width, p.y + p.height * 0.7);
        ctx.lineTo(p.x + p.width, p.y + p.height); ctx.lineTo(p.x, p.y + p.height);
        ctx.closePath(); ctx.fill();

        if (cracks > 0) {
            ctx.strokeStyle = "#8D6E63"; ctx.lineWidth = 4; ctx.lineJoin = "miter";
            ctx.save(); ctx.translate(p.x + p.width / 2, p.y);
            const drawCr = (offX: number, path: number[][]) => {
                ctx.beginPath(); ctx.moveTo(offX, 0);
                path.forEach(pt => ctx.lineTo(offX + pt[0], pt[1])); ctx.stroke();
            };
            if (cracks >= 1) drawCr(0, [[-10, p.height * 0.3], [8, p.height * 0.6], [-12, p.height]]);
            if (cracks >= 2) drawCr(-p.width * 0.3, [[12, p.height * 0.4], [-15, p.height * 0.7], [5, p.height]]);
            if (cracks >= 3) drawCr(p.width * 0.3, [[-15, p.height * 0.3], [12, p.height * 0.5], [-5, p.height]]);
            ctx.restore();
        }
        ctx.restore();

        this.drawDesertBrush(ctx, p.x + 20, p.y + 5);
        this.drawDesertBrush(ctx, p.x + p.width - 20, p.y + 5);
    }

    private drawDesertBrush(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
        const brush = () => {
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 15, cy - 25); ctx.lineTo(cx - 5, cy - 10);
            ctx.lineTo(cx, cy - 35); ctx.lineTo(cx + 5, cy - 10); ctx.lineTo(cx + 15, cy - 20); ctx.closePath();
        };
        ctx.save(); ctx.translate(2, 4); ctx.fillStyle = this.shadowColor; brush(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#558B2F"; brush(); ctx.fill();
    }

    drawParallaxObject(ctx: CanvasRenderingContext2D, _game: JumperGame, tree: BgTree): void {
        const hY = ctx.canvas.height * 0.6;
        if (tree.y < hY + 50) return;

        const t = (tree.y - hY) / (ctx.canvas.height - hY);
        const tp = t * t;
        const w = ctx.canvas.width;
        const rivCX = w * 0.5 + Math.sin(t * Math.PI * 3.0) * (w * 0.15 * tp);
        const rivWH = (w * 0.05 + tp * (w * 0.2)) + 30;

        let sX = tree.x;
        if (Math.abs(sX - rivCX) < rivWH) sX = tree.x < rivCX ? rivCX - rivWH : rivCX + rivWH;

        ctx.save();
        ctx.translate(sX, tree.y);
        ctx.scale((tree.size / 40) * 0.45, (tree.size / 40) * 0.45);

        ctx.fillStyle = "#66BB6A"; ctx.fillRect(-8, -45, 8, 45);
        ctx.fillStyle = "#388E3C"; ctx.fillRect(0, -45, 8, 45);
        ctx.fillStyle = "#66BB6A"; ctx.fillRect(-22, -28, 14, 8); ctx.fillRect(-22, -40, 8, 12);
        ctx.fillStyle = "#388E3C"; ctx.fillRect(8, -20, 14, 8); ctx.fillRect(14, -32, 8, 12);
        ctx.restore();
    }

    drawVillageBuilding(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
        const hB = size * 0.8, h = size * 1.2;
        const build = () => {
            ctx.beginPath(); ctx.moveTo(cx - hB, cy); ctx.lineTo(cx + hB, cy);
            ctx.lineTo(cx + hB - 20, cy - h); ctx.lineTo(cx - hB + 20, cy - h); ctx.closePath();
        };
        ctx.save(); ctx.translate(4, 8); ctx.fillStyle = this.shadowColor; build(); ctx.fill(); ctx.restore();
        ctx.fillStyle = this.canyonColors[4]; build(); ctx.fill();

        const roof = () => {
            ctx.beginPath(); ctx.moveTo(cx - hB - 20, cy - h); ctx.lineTo(cx + hB + 20, cy - h);
            ctx.lineTo(cx + hB - 10, cy - h - 30); ctx.lineTo(cx - hB + 10, cy - h - 30); ctx.closePath();
        };
        ctx.save(); ctx.translate(4, 8); ctx.fillStyle = this.shadowColor; roof(); ctx.fill(); ctx.restore();
        ctx.fillStyle = this.canyonColors[5]; roof(); ctx.fill();
    }
}