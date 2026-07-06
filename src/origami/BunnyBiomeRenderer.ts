// @ts-nocheck
import type { BiomeRenderer } from './BiomeRenderer';
import { JumperGame, Platform, BgTree } from './JumperGame';

export class BunnyBiomeRenderer implements BiomeRenderer {
    readonly skyColors = ["#0B1021", "#1B1F4C", "#6A1A41"];
    private readonly shadowColor = "rgba(0, 0, 0, 0.3)";

    private drawTriangle(ctx: CanvasRenderingContext2D, color: string, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
        const path = () => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(2, 6);
        ctx.fillStyle = this.shadowColor;
        path();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = color;
        path();
        ctx.fill();
    }

    private drawWavySkyLayer(ctx: CanvasRenderingContext2D, w: number, h: number, baseY: number, amplitude: number, frequency: number, color: string, timeOffset: number, phaseOffset: number = 0) {
        const path = () => {
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(0, baseY);

            const segments = 30;
            const step = w / segments;
            for (let i = 0; i <= segments; i++) {
                const x = i * step;
                const y = baseY + Math.sin((x / frequency) + timeOffset + phaseOffset) * amplitude;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(0, 8);
        ctx.fillStyle = this.shadowColor;
        path();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = color;
        path();
        ctx.fill();
    }

    private drawBlueCliffs(ctx: CanvasRenderingContext2D, w: number, h: number, cliffY: number) {
        // --- LEFT CLIFF ---
        const lTopC_x = w * 0.15;  const lTopC_y = cliffY + 50;
        const lFrtC_x = w * 0.28;  const lFrtC_y = cliffY + (h - cliffY) * 0.4;
        const lSdeC_x = w * 0.1;   const lSdeC_y = cliffY + (h - cliffY) * 0.6;

        this.drawTriangle(ctx, "#1E88E5", 0, cliffY, w * 0.35, cliffY + 30, lTopC_x, lTopC_y);
        this.drawTriangle(ctx, "#1976D2", w * 0.35, cliffY + 30, w * 0.25, cliffY + 100, lTopC_x, lTopC_y);
        this.drawTriangle(ctx, "#1565C0", w * 0.25, cliffY + 100, 0, cliffY + 80, lTopC_x, lTopC_y);

        this.drawTriangle(ctx, "#0D47A1", w * 0.35, cliffY + 30, w * 0.45, h, lFrtC_x, lFrtC_y);
        this.drawTriangle(ctx, "#0B3D91", w * 0.45, h, w * 0.15, h, lFrtC_x, lFrtC_y);
        this.drawTriangle(ctx, "#08337A", w * 0.15, h, w * 0.25, cliffY + 100, lFrtC_x, lFrtC_y);
        this.drawTriangle(ctx, "#062A66", w * 0.25, cliffY + 100, w * 0.35, cliffY + 30, lFrtC_x, lFrtC_y);

        this.drawTriangle(ctx, "#041F4D", w * 0.25, cliffY + 100, w * 0.15, h, lSdeC_x, lSdeC_y);
        this.drawTriangle(ctx, "#031638", w * 0.15, h, 0, h, lSdeC_x, lSdeC_y);
        this.drawTriangle(ctx, "#020E26", 0, h, 0, cliffY + 80, lSdeC_x, lSdeC_y);
        this.drawTriangle(ctx, "#010A1A", 0, cliffY + 80, w * 0.25, cliffY + 100, lSdeC_x, lSdeC_y);

        // --- RIGHT CLIFF ---
        const rY = cliffY + 20;
        const rTopC_x = w * 0.85;  const rTopC_y = rY + 40;
        const rFrtC_x = w * 0.72;  const rFrtC_y = rY + (h - rY) * 0.4;
        const rSdeC_x = w * 0.9;   const rSdeC_y = rY + (h - rY) * 0.6;

        this.drawTriangle(ctx, "#1E88E5", w, rY, w * 0.65, rY + 40, rTopC_x, rTopC_y);
        this.drawTriangle(ctx, "#1976D2", w * 0.65, rY + 40, w * 0.75, rY + 120, rTopC_x, rTopC_y);
        this.drawTriangle(ctx, "#1565C0", w * 0.75, rY + 120, w, rY + 90, rTopC_x, rTopC_y);

        this.drawTriangle(ctx, "#0D47A1", w * 0.65, rY + 40, w * 0.55, h, rFrtC_x, rFrtC_y);
        this.drawTriangle(ctx, "#0B3D91", w * 0.55, h, w * 0.85, h, rFrtC_x, rFrtC_y);
        this.drawTriangle(ctx, "#08337A", w * 0.85, h, w * 0.75, rY + 120, rFrtC_x, rFrtC_y);
        this.drawTriangle(ctx, "#062A66", w * 0.75, rY + 120, w * 0.65, rY + 40, rFrtC_x, rFrtC_y);

        this.drawTriangle(ctx, "#041F4D", w * 0.75, rY + 120, w * 0.85, h, rSdeC_x, rSdeC_y);
        this.drawTriangle(ctx, "#031638", w * 0.85, h, w, h, rSdeC_x, rSdeC_y);
        this.drawTriangle(ctx, "#020E26", w, h, w, rY + 90, rSdeC_x, rSdeC_y);
        this.drawTriangle(ctx, "#010A1A", w, rY + 90, w * 0.75, rY + 120, rSdeC_x, rSdeC_y);
    }

    private drawSakuraTree(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, flip: boolean) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(flip ? -scale : scale, scale);

        const branchPath = () => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(15, -80);
            ctx.lineTo(50, -120);
            ctx.lineTo(40, -130);
            ctx.lineTo(5, -90);
            ctx.lineTo(-10, 0);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(4, 6);
        ctx.fillStyle = this.shadowColor;
        branchPath();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#5D4037";
        branchPath();
        ctx.fill();

        ctx.save();
        ctx.translate(4, 6);
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath(); ctx.arc(45, -125, 40, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -90, 35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(60, -90, 30, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#F8BBD0";
        ctx.beginPath(); ctx.arc(45, -125, 40, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -90, 35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(60, -90, 30, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.translate(2, 4);
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath(); ctx.arc(35, -115, 25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-5, -85, 20, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#F48FB1";
        ctx.beginPath(); ctx.arc(35, -115, 25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-5, -85, 20, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#AD1457";
        ctx.beginPath(); ctx.arc(45, -125, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(15, -95, 5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        const w = game.width;
        const h = game.height;
        const tOffset = time / 3000;

        ctx.fillStyle = "#0B1021";
        ctx.fillRect(0, 0, w, h);

        this.drawWavySkyLayer(ctx, w, h, h * 0.15 + (game.backMountainY * 0.02), 40, 150, "#1B1F4C", tOffset);
        this.drawWavySkyLayer(ctx, w, h, h * 0.30 + (game.backMountainY * 0.04), 55, 200, "#38164A", tOffset * 1.2, 2);
        this.drawWavySkyLayer(ctx, w, h, h * 0.45 + (game.backMountainY * 0.06), 35, 120, "#6A1A41", tOffset * 0.8, 4);

        const cliffY = Math.min(h * 0.5 + game.frontMountainY, h * 0.7);
        this.drawBlueCliffs(ctx, w, h, cliffY);

        this.drawSakuraTree(ctx, w * 0.3, cliffY + 20, 0.6, true);
        this.drawSakuraTree(ctx, w * 0.7, cliffY + 40, 0.8, false);

        ctx.fillStyle = "rgba(255, 64, 129, 0.66)"; // 0xAAFF4081
        for (let i = 0; i < 12; i++) {
            const seed = i * 1234;
            const xDrift = ((time + seed) / 25) % (w + 100) - 50;
            const yDrift = ((time + seed) / 15) % (h + 100) - 50;
            const pRot = (time / 10 + seed) % 360;

            ctx.save();
            ctx.translate(xDrift, yDrift);
            ctx.rotate(pRot * Math.PI / 180);

            const petal = () => {
                ctx.beginPath();
                ctx.moveTo(0, -12);
                ctx.lineTo(8, 0);
                ctx.lineTo(0, 12);
                ctx.lineTo(-8, 0);
                ctx.closePath();
            };

            ctx.save();
            ctx.translate(2, 4);
            ctx.fillStyle = this.shadowColor;
            petal();
            ctx.fill();
            ctx.restore();

            petal();
            ctx.fill();
            ctx.restore();
        }
    }

    drawForeground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        const w = game.width;
        const h = game.height;
        const fgY = Math.min(h * 0.65 + (game.frontMountainY * 1.2), h * 0.95);

        this.drawSakuraTree(ctx, w * 0.15, fgY, 1.5, false);
        this.drawSakuraTree(ctx, w * 0.85, fgY + 40, 1.3, true);
    }

    drawPlatform(ctx: CanvasRenderingContext2D, game: JumperGame, platform: Platform): void {
        ctx.save();
        ctx.fillStyle = "#1E2235";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(255, 64, 129, 0.6)"; // 0x99FF4081
        ctx.shadowOffsetY = 6;
        platform.draw(ctx);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = "#FF4081";
        ctx.lineWidth = 3;
        platform.draw(ctx);
        ctx.stroke();
    }

    drawParallaxObject(ctx: CanvasRenderingContext2D, game: JumperGame, tree: BgTree): void {
        const path1 = () => {
            ctx.beginPath();
            ctx.moveTo(tree.x - tree.size * 0.1, tree.y);
            ctx.lineTo(tree.x + tree.size * 0.1, tree.y);
            ctx.lineTo(tree.x + tree.size * 0.05, tree.y - tree.size * 0.8);
            ctx.lineTo(tree.x - tree.size * 0.05, tree.y - tree.size * 0.8);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(2, 6);
        ctx.fillStyle = this.shadowColor;
        path1();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#1A1A24";
        path1();
        ctx.fill();

        const path2 = () => {
            ctx.beginPath();
            ctx.moveTo(tree.x, tree.y - tree.size * 1.2);
            ctx.lineTo(tree.x + tree.size * 0.6, tree.y - tree.size * 0.6);
            ctx.lineTo(tree.x, tree.y - tree.size * 0.3);
            ctx.lineTo(tree.x - tree.size * 0.6, tree.y - tree.size * 0.6);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(2, 6);
        ctx.fillStyle = this.shadowColor;
        path2();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#F06292";
        path2();
        ctx.fill();

        const path3 = () => {
            ctx.beginPath();
            ctx.moveTo(tree.x, tree.y - tree.size * 1.1);
            ctx.lineTo(tree.x + tree.size * 0.3, tree.y - tree.size * 0.6);
            ctx.lineTo(tree.x, tree.y - tree.size * 0.4);
            ctx.lineTo(tree.x - tree.size * 0.3, tree.y - tree.size * 0.6);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(2, 6);
        ctx.fillStyle = this.shadowColor;
        path3();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#F8BBD0";
        path3();
        ctx.fill();
    }

    drawVillageBuilding(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
        ctx.save();
        ctx.translate(cx, cy);

        const path1 = () => {
            ctx.beginPath();
            ctx.moveTo(-size * 0.5, size * 0.5);
            ctx.lineTo(size * 0.5, size * 0.5);
            ctx.lineTo(size * 0.4, 0);
            ctx.lineTo(-size * 0.4, 0);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(4, 8);
        ctx.fillStyle = this.shadowColor;
        path1();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#1E2235";
        path1();
        ctx.fill();

        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        path1();
        ctx.stroke();

        const path2 = () => {
            ctx.beginPath();
            ctx.moveTo(-size * 0.6, 0);
            ctx.lineTo(0, -size * 0.4);
            ctx.lineTo(size * 0.6, 0);
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(4, 8);
        ctx.fillStyle = this.shadowColor;
        path2();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#F06292";
        path2();
        ctx.fill();

        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        path2();
        ctx.stroke();

        ctx.save();
        ctx.translate(2, 4);
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.arc(0, -size * 0.1, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#F8BBD0";
        ctx.beginPath();
        ctx.arc(0, -size * 0.1, size * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0A0B1E";
        ctx.fillRect(-size * 0.15, size * 0.1, size * 0.3, size * 0.4);

        ctx.restore();
    }
}