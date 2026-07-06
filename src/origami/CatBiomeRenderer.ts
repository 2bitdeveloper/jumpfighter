// @ts-nocheck
import type { BiomeRenderer } from './BiomeRenderer';
import type { JumperGame, Platform, BgTree } from './JumperGame';

export class CatBiomeRenderer implements BiomeRenderer {
    readonly skyColors = ["#070B19", "#1B0B3B", "#4A0E4E"];

    private readonly shadowColor = "rgba(0, 0, 0, 0.3)";
    
    private readonly facetColors = [
        "#0A0C0E", // 0: Far Left
        "#12161A", // 1: Mid Left
        "#1A1F24", // 2: Mid Right
        "#222930", // 3: Far Right
        "#181D23", // 4: Top Left
        "#283039"  // 5: Top Right
    ];

    private readonly buildingEdgeColor = "#2A313C";
    private readonly neonCyan = "#00E5FF";
    private readonly neonPink = "#FF007F";
    private readonly carSilhouette = "#07080A";
    private readonly platformColor = "#311B5E";

    private drawHoverCar(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, movesRight: boolean) {
        ctx.save();
        ctx.translate(x, y);

        if (movesRight) ctx.scale(-1, 1);
        ctx.scale(scale, scale);

        const carPath = () => {
            ctx.beginPath();
            ctx.moveTo(-45, 5);
            ctx.lineTo(-35, -5);
            ctx.lineTo(-15, -5);
            ctx.lineTo(0, -15);
            ctx.lineTo(25, -15);
            ctx.lineTo(40, -5);
            ctx.lineTo(45, 5);
            ctx.lineTo(40, 12);
            ctx.lineTo(-40, 12);
            ctx.closePath();
        };

        // Drop shadow
        ctx.save();
        ctx.translate(4, 8);
        ctx.fillStyle = this.shadowColor;
        carPath();
        ctx.fill();
        ctx.restore();

        // Car Body
        ctx.fillStyle = this.carSilhouette;
        carPath();
        ctx.fill();

        // Hover pads
        ctx.fillRect(-30, 12, 20, 6); // x, y, w, h
        ctx.fillRect(10, 12, 20, 6);

        ctx.restore();
    }

    private drawTriangle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: string) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    private drawCrystalBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isPinkNeon: boolean) {
        const p0x = x;          const p0y = y;
        const p1x = x - w / 2;  const p1y = y - h * 0.05;
        const p2x = x + w / 2;  const p2y = y - h * 0.05;
        const p3x = x;          const p3y = y - h * 0.6;
        const p4x = x - w * 0.45; const p4y = y - h * 0.5;
        const p5x = x + w * 0.45; const p5y = y - h * 0.5;
        const p6x = x;          const p6y = y - h * 0.8;
        const p7x = x;          const p7y = y - h;

        // Building Perimeter Shadow
        ctx.save();
        ctx.translate(4, 10);
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p4x, p4y);
        ctx.lineTo(p7x, p7y);
        ctx.lineTo(p5x, p5y);
        ctx.lineTo(p2x, p2y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Interior Facets
        this.drawTriangle(ctx, p0x, p0y, p1x, p1y, p4x, p4y, this.facetColors[0]);
        this.drawTriangle(ctx, p0x, p0y, p4x, p4y, p3x, p3y, this.facetColors[1]);
        this.drawTriangle(ctx, p0x, p0y, p3x, p3y, p5x, p5y, this.facetColors[2]);
        this.drawTriangle(ctx, p0x, p0y, p5x, p5y, p2x, p2y, this.facetColors[3]);
        this.drawTriangle(ctx, p4x, p4y, p6x, p6y, p3x, p3y, this.facetColors[1]);
        this.drawTriangle(ctx, p3x, p3y, p6x, p6y, p5x, p5y, this.facetColors[2]);
        this.drawTriangle(ctx, p4x, p4y, p7x, p7y, p6x, p6y, this.facetColors[4]);
        this.drawTriangle(ctx, p6x, p6y, p7x, p7y, p5x, p5y, this.facetColors[5]);

        // Neon Accents
        ctx.save();
        const neonColor = isPinkNeon ? this.neonPink : this.neonCyan;
        ctx.strokeStyle = neonColor;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.shadowBlur = 15;
        ctx.shadowColor = neonColor;
        
        ctx.beginPath();
        ctx.moveTo(p3x, p3y); ctx.lineTo(p6x, p6y);
        ctx.lineTo(p7x, p7y);
        ctx.stroke();
        ctx.restore();

        // Building Edges
        ctx.strokeStyle = this.buildingEdgeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p4x, p4y); ctx.lineTo(p6x, p6y);
        ctx.moveTo(p5x, p5y); ctx.lineTo(p6x, p6y);
        ctx.stroke();
    }

    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        const w = game.width;
        const h = game.height;

        const progress = Math.min(Math.max(game.score / 400, 0), 1);
        const easeTransition = 1 - (1 - progress) * (1 - progress);

        const sunY = (h * 0.5) - (h * 0.3 * easeTransition);

        // Synth Sun
        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = this.neonPink;
        ctx.fillStyle = this.neonPink;
        ctx.beginPath();
        ctx.arc(w / 2, sunY, w * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Hover Cars
        const carCount = 8;
        const totalWidth = w + 1200;

        for (let i = 0; i < carCount; i++) {
            const isPink = i % 2 === 0;
            const color = isPink ? this.neonPink : this.neonCyan;

            const yPos = h * 0.05 + ((i * 123) % (h * 0.35));
            const cycleTimeMs = 4000 + ((i * 1111) % 8000);
            const timeOffset = i * 2345;
            const travelProgress = ((time + timeOffset) % cycleTimeMs) / cycleTimeMs;

            const movesRight = (i % 2 === 0);
            const xPos = movesRight ? -600 + (totalWidth * travelProgress) : (w + 600) - (totalWidth * travelProgress);
            const scale = 0.8 + (i % 3) * 0.2;
            const trailLength = 80 + ((i * 33) % 100);

            const exhaustCoreX = movesRight ? xPos - (40 * scale) : xPos + (40 * scale);
            const leadingCoreX = movesRight ? xPos + (40 * scale) : xPos - (40 * scale);
            const streakEndX = movesRight ? exhaustCoreX - trailLength : exhaustCoreX + trailLength;

            // Trail Streak
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.moveTo(exhaustCoreX, yPos + (3 * scale));
            ctx.lineTo(streakEndX, yPos + (3 * scale));
            ctx.stroke();
            ctx.restore();

            this.drawHoverCar(ctx, xPos, yPos, scale, movesRight);

            // Leading and Exhaust dots
            ctx.fillStyle = "white";
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.arc(leadingCoreX, yPos + (3 * scale), 4 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(exhaustCoreX, yPos + (3 * scale), 5 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const buildingBaseY = h + (h * 0.2 * easeTransition);
        this.drawCrystalBuilding(ctx, -w * 0.1, buildingBaseY, w * 0.45, h * 0.6, true);
        this.drawCrystalBuilding(ctx, w * 0.15, buildingBaseY, w * 0.3, h * 0.45, false);
        this.drawCrystalBuilding(ctx, w * 0.35, buildingBaseY, w * 0.25, h * 0.55, true);
        this.drawCrystalBuilding(ctx, w * 0.55, buildingBaseY, w * 0.35, h * 0.5, false);
        this.drawCrystalBuilding(ctx, w * 0.75, buildingBaseY, w * 0.3, h * 0.4, true);
        this.drawCrystalBuilding(ctx, w * 0.95, buildingBaseY, w * 0.35, h * 0.55, false);
    }

    drawParallaxObject(ctx: CanvasRenderingContext2D, game: JumperGame, tree: BgTree): void {
        // No trees in the city!
    }

    drawPlatform(ctx: CanvasRenderingContext2D, game: JumperGame, platform: Platform): void {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 8;
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.fillStyle = this.platformColor;
        // @ts-ignore
        platform.draw(ctx);
        ctx.fill();
        ctx.restore();

        const isCyan = platform.id % 2 === 0;
        const glowColor = isCyan ? this.neonCyan : this.neonPink;

        ctx.save();
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;
        ctx.beginPath();
        ctx.moveTo(platform.x, platform.y + platform.height);
        ctx.lineTo(platform.x + platform.width, platform.y + platform.height);
        ctx.stroke();
        ctx.restore();
    }

    // FIX: Completely empty the foreground method to remove the rain streaks!
    drawForeground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        // No rain in the cyber city!
    }

    drawVillageBuilding(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
        const halfSize = size / 2;
        const ovalTop = cy + size * 0.3;
        const ovalBottom = cy + size * 0.45;
        const h = ovalBottom - ovalTop;

        // Hard Shadow
        ctx.save();
        ctx.translate(0, 8);
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.ellipse(cx, ovalTop + h/2, halfSize, h/2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Platform Base
        ctx.fillStyle = this.platformColor;
        ctx.beginPath();
        ctx.ellipse(cx, ovalTop + h/2, halfSize, h/2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neon Glow Rim
        ctx.save();
        ctx.strokeStyle = this.neonCyan;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.neonCyan;
        ctx.stroke();
        ctx.restore();
    }
}