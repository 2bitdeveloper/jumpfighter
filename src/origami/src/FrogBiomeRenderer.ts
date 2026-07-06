import type { BiomeRenderer } from './BiomeRenderer';
import { JumperGame, Platform, BgTree } from './JumperGame';

export class FrogBiomeRenderer implements BiomeRenderer {
    // Exact requested cavern sky gradient
    readonly skyColors = ["#3B3A5A", "#4A6888", "#14A0A4"];

    private readonly shadowColor = "rgba(0, 0, 0, 0.3)";
    private readonly neonCyan = "#00FFFF";
    private readonly neonCyanGlow = "#00E5FF";

    private drawTriangle(ctx: CanvasRenderingContext2D, color: string, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
        const triangle = () => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(4, 6);
        ctx.fillStyle = this.shadowColor;
        triangle();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = color;
        triangle();
        ctx.fill();
    }

    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        const w = game.width;
        const h = game.height;

        const transitionProgress = Math.min(Math.max(game.totalCameraOffset / 500, 0), 1);
        const lFrontY = h * 0.5 + (transitionProgress * h * 0.25);
        const rFrontY = h * 0.6 + (transitionProgress * h * 0.25);

        // 1. Blue Glowing Stars (Seeded-style random)
        const safeTime = time % 100000;
        for (let i = 0; i <= 25; i++) {
            // Using a simple deterministic pseudo-random based on index
            const px = ((i * 137.5) % 1) * w;
            const py = ((i * 223.7) % 0.7) * h;
            const pulseSeed = 1000 + (i * 150) % 2000;
            const pulse = (Math.sin((safeTime + pulseSeed) / 300) + 1) / 2;
            const size = (1 + (i % 3)) * (1 + pulse * 0.5);

            ctx.save();
            ctx.globalAlpha = 0.2 + (0.8 * pulse);
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.neonCyanGlow;
            ctx.fillStyle = this.neonCyanGlow;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 2. Distant Cavern Walls
        const drawWall = (points: [number, number][], isLeft: boolean) => {
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
            ctx.closePath();

            ctx.save();
            ctx.translate(isLeft ? 4 : -4, 8);
            ctx.fillStyle = this.shadowColor;
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = "#16202B";
            ctx.fill();
        };

        drawWall([[0, 0], [w * 0.3, 0], [w * 0.2, h * 0.2], [w * 0.35, h * 0.4], [0, h * 0.6]], true);
        drawWall([[w, 0], [w * 0.6, 0], [w * 0.7, h * 0.25], [w * 0.55, h * 0.45], [w, h * 0.65]], false);

        // 3. Midground Rocky Plateaus
        const mLB = h * 0.35;
        this.drawTriangle(ctx, "#162433", 0, mLB, w * 0.35, mLB + 15, w * 0.15, mLB - 20);
        this.drawTriangle(ctx, "#101A25", 0, mLB, w * 0.35, mLB + 15, w * 0.1, h * 0.6);

        const mL = h * 0.4;
        this.drawTriangle(ctx, "#1C2C3D", 0, mL, w * 0.45, mL + 20, w * 0.2, mL - 15);
        this.drawTriangle(ctx, "#14202D", 0, mL, w * 0.45, mL + 20, w * 0.15, h * 0.6);

        const mRB = h * 0.42;
        this.drawTriangle(ctx, "#162433", w, mRB, w * 0.65, mRB + 15, w * 0.85, mRB - 15);
        this.drawTriangle(ctx, "#101A25", w, mRB, w * 0.65, mRB + 15, w * 0.9, h * 0.65);

        const mR = h * 0.48;
        this.drawTriangle(ctx, "#1C2C3D", w, mR, w * 0.55, mR + 25, w * 0.8, mR - 20);
        this.drawTriangle(ctx, "#14202D", w, mR, w * 0.55, mR + 25, w * 0.85, h * 0.65);

        // 4. Midground Waterfalls
        this.drawNeonWaterfall(ctx, w * 0.35, w * 0.4, mL + 15, h, time, true);
        this.drawNeonWaterfall(ctx, w * 0.6, w * 0.65, mR + 20, h, time, true);

        // 5. Papercraft Ruins
        this.drawDistantRuin(ctx, w * 0.15, mL - 10, 25);
        this.drawDistantRuin(ctx, w * 0.25, mL - 5, 35);
        this.drawDistantRuin(ctx, w * 0.75, mR - 15, 40);
        this.drawDistantRuin(ctx, w * 0.85, mR - 5, 20);

        // 6. FOREGROUND CLIFFS
        this.drawFrogCliffs(ctx, w, h, lFrontY, rFrontY);

        // 7. Isometric Ponds
        this.drawZAxisPond(ctx, 0, lFrontY - 80, w * 0.22, lFrontY - 55, w * 0.18, lFrontY - 10, 0, lFrontY - 30);
        this.drawZAxisPond(ctx, w, rFrontY - 80, w * 0.78, rFrontY - 55, w * 0.82, rFrontY - 10, w, rFrontY - 30);

        // 8. Foreground Waterfalls
        this.drawNeonWaterfall(ctx, w * 0.08, w * 0.18, lFrontY - 5, h, time, false);
        this.drawNeonWaterfall(ctx, w * 0.82, w * 0.92, rFrontY - 5, h, time, false);

        // 9. Circular Moss (added 100 and 200 as permanent seeds)
        this.drawCircularMoss(ctx, 0, lFrontY - 20, w * 0.2, lFrontY, 100);
        this.drawCircularMoss(ctx, w, rFrontY - 20, w * 0.8, rFrontY, 200);
    }

    drawForeground(): void {}

    drawPlatform(ctx: CanvasRenderingContext2D, _game: JumperGame, platform: Platform): void {
        const pX = platform.x, pY = platform.y, pW = platform.width, pH = platform.height;
        const cx = pX + pW / 2;
        const cy = pY + pH / 2;

        ctx.save();
        ctx.translate(4, 8);
        ctx.fillStyle = this.shadowColor;
        platform.draw(ctx);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 8;
        ctx.shadowColor = "rgba(0,0,0,0.53)";
        ctx.fillStyle = "#28323E";
        platform.draw(ctx);
        ctx.fill();
        ctx.restore();

        ctx.save();
        platform.draw(ctx);
        ctx.clip();
        ctx.strokeStyle = "#151B22";
        ctx.lineWidth = 4;
        const drawCrack = (x2: number, y2: number) => {
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.stroke();
        };
        drawCrack(cx - pW * 0.4, cy - pH * 0.3);
        drawCrack(cx + pW * 0.3, cy - pH * 0.4);
        drawCrack(cx + pW * 0.2, cy + pH * 0.4);
        drawCrack(cx - pW * 0.1, cy + pH * 0.5);
        ctx.restore();

        // Neon Cyan Pool
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.neonCyanGlow;
        ctx.fillStyle = this.neonCyanGlow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, pW / 2 - 15, pH / 2 - 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Drips (Using a simple time-based drip seed)
        const time = Date.now();
        for (let i = 0; i < 2; i++) {
            const dripX = pX + (pW * (i + 1) / 3);
            const startY = pY + pH + 10;
            const cycleSpeed = 800 + (i * 200);
            const progress = ((time + (i * 321)) % cycleSpeed) / cycleSpeed;
            const currentDripY = startY + (progress * 50 * progress);

            ctx.save();
            ctx.globalAlpha = 1.0 - progress;
            ctx.shadowBlur = 5;
            ctx.shadowColor = this.neonCyan;
            this.drawFacetedDrip(ctx, dripX, currentDripY, 6 * (1 - progress * 0.3));
            ctx.restore();
        }

        // Crystals
        const lx = pX + 25, ly = pY + 10, cSize = 18;
        const blink = Math.abs(Math.sin(time / 750));
        ctx.save();
        ctx.shadowBlur = 15 + (15 * blink);
        ctx.shadowColor = "red";

        const drawCryst = (color: string, path: [number, number][]) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(path[0][0], path[0][1]);
            for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
            ctx.closePath();
            ctx.fill();
        };

        drawCryst("#FF1744", [[lx, ly - cSize * 1.5], [lx - cSize * 0.4, ly], [lx, ly + cSize * 0.5], [lx + cSize * 0.4, ly]]);
        drawCryst("#D50000", [[lx - cSize * 0.6, ly - cSize], [lx - cSize, ly + cSize * 0.2], [lx - cSize * 0.2, ly + cSize * 0.6], [lx, ly]]);
        drawCryst("#8E0000", [[lx + cSize * 0.6, ly - cSize * 0.8], [lx + cSize * 0.2, ly], [lx + cSize * 0.8, ly + cSize * 0.5], [lx + cSize, ly + cSize * 0.1]]);
        ctx.restore();

        // Platform Moss (added platform.id as the permanent seed)
        this.drawCircularMoss(ctx, pX + pW * 0.7, ly, pX + pW - 15, ly + 8, platform.id);
    }

    private drawDistantRuin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        const ruinPath = () => {
            ctx.beginPath();
            ctx.rect(x - size * 0.4, y - size * 0.5, size * 0.8, size * 0.5);
            ctx.moveTo(x - size * 0.5, y - size * 0.5);
            ctx.lineTo(x, y - size);
            ctx.lineTo(x + size * 0.5, y - size * 0.5);
            ctx.closePath();
        };

        ctx.save(); ctx.translate(4, 6); ctx.fillStyle = this.shadowColor; ruinPath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#1E2B38"; ruinPath(); ctx.fill();

        ctx.fillStyle = "rgba(0, 229, 255, 0.66)";
        ctx.fillRect(x - size * 0.1, y - size * 0.3, size * 0.2, size * 0.2);
    }

    private drawFrogCliffs(ctx: CanvasRenderingContext2D, w: number, h: number, lY: number, rY: number) {
        const drawC = (baseY: number, isRight: boolean) => {
            const cliffY = baseY - 100;
            const topX = isRight ? w * 0.9 : w * 0.1;
            const topY = cliffY + 50;
            const frX = isRight ? w * 0.82 : w * 0.18;
            const frY = cliffY + (h - cliffY) * 0.4;
            const sdX = isRight ? w * 0.92 : w * 0.08;
            const sdY = cliffY + (h - cliffY) * 0.6;

            const tL = isRight ? w : 0;
            const tR = isRight ? w * 0.75 : w * 0.25;
            const mid = isRight ? w * 0.8 : w * 0.2;

            this.drawTriangle(ctx, "#2A4254", tL, cliffY, tR, cliffY + 30, topX, topY);
            this.drawTriangle(ctx, "#243A48", tR, cliffY + 30, mid, cliffY + 100, topX, topY);
            this.drawTriangle(ctx, "#1E303E", mid, cliffY + 100, tL, cliffY + 80, topX, topY);

            const low = isRight ? w * 0.7 : w * 0.3;
            const edge = isRight ? w * 0.85 : w * 0.15;
            this.drawTriangle(ctx, "#1B2A36", tR, cliffY + 30, low, h, frX, frY);
            this.drawTriangle(ctx, "#131D26", low, h, edge, h, frX, frY);
            this.drawTriangle(ctx, "#101921", edge, h, mid, cliffY + 100, frX, frY);
        };
        drawC(lY, false);
        drawC(rY, true);
    }

    private drawZAxisPond(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
        const pond = () => {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath();
        };
        ctx.save(); ctx.translate(4, 6); ctx.fillStyle = this.shadowColor; pond(); ctx.fill(); ctx.restore();
        ctx.fillStyle = this.neonCyanGlow;
        ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = this.neonCyanGlow; pond(); ctx.fill(); ctx.restore();
    }
// Added baseSeed parameter
    private drawCircularMoss(ctx: CanvasRenderingContext2D, sX: number, sY: number, eX: number, eY: number, baseSeed: number) {
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            
            // The seed is now permanently tied to an ID, completely ignoring screen coordinates!
            const seed = baseSeed + i; 
            
            const rand1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
            const rand2 = Math.abs(Math.sin(seed * 78.233) * 43758.5453) % 1;
            const rand3 = Math.abs(Math.sin(seed * 45.123) * 43758.5453) % 1;

            const mx = sX + (eX - sX) * progress + (rand1 * 10 - 5);
            const my = sY + (eY - sY) * progress + (rand2 * 6 - 3);
            const radius = 8 + (rand3 * 6);

            ctx.save(); ctx.translate(2, 4); ctx.fillStyle = this.shadowColor;
            ctx.beginPath(); ctx.arc(mx, my, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();

            ctx.fillStyle = (i % 2 === 0) ? "#00695C" : "#004D40";
            ctx.beginPath(); ctx.arc(mx, my, radius, 0, Math.PI * 2); ctx.fill();
        }
    }

    private drawNeonWaterfall(ctx: CanvasRenderingContext2D, x1: number, x2: number, topY: number, h: number, time: number, isMidground: boolean) {
        const width = x2 - x1;
        const cx = x1 + width / 2;
        const alpha = isMidground ? 0.6 : 1.0;
        const speed = isMidground ? 0.15 : 0.3;

        ctx.save();
        ctx.globalAlpha = 0.7 * alpha;
        ctx.fillStyle = this.neonCyanGlow;
        ctx.fillRect(x1, topY, width, h - topY);
        ctx.restore();

        const drawFlow = (colX1: number, colX2: number, dashH: number, gapH: number, offset: number) => {
            const patternH = dashH + gapH;
            const shift = ((time * speed) + offset) % patternH;
            ctx.fillStyle = this.neonCyan;
            ctx.globalAlpha = alpha;
            let curY = topY - patternH + shift;
            while (curY < h) {
                const drawT = Math.max(topY, curY);
                const drawB = Math.min(h, curY + dashH);
                if (drawB > drawT) ctx.fillRect(colX1, drawT, colX2 - colX1, drawB - drawT);
                curY += patternH;
            }
        };

        drawFlow(x1 + width * 0.1, x1 + width * 0.4, 120, 60, 0);
        drawFlow(x1 + width * 0.5, x1 + width * 0.8, 90, 80, 50);

        if (!isMidground) {
            ctx.strokeStyle = this.neonCyan;
            ctx.lineWidth = 3;
            const rTime = Date.now();
            [0, 500].forEach(off => {
                const prog = ((rTime + off) % 1000) / 1000;
                ctx.save();
                ctx.globalAlpha = 1.0 - prog;
                ctx.beginPath();
                ctx.ellipse(cx, h, width * 1.5 * prog, width * 0.4 * prog, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });
        }
    }

    private drawFacetedDrip(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.6, y - size * 0.2);
        ctx.lineTo(x + size * 0.3, y + size);
        ctx.lineTo(x - size * 0.3, y + size);
        ctx.lineTo(x - size * 0.6, y - size * 0.2);
        ctx.closePath();
        ctx.fill();
    }

    drawParallaxObject(): void {}
    drawVillageBuilding(): void {}
}