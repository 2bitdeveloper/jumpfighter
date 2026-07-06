import type { BiomeRenderer } from './BiomeRenderer';
import type { JumperGame, Platform, BgTree } from './JumperGame';

export class CraneBiomeRenderer implements BiomeRenderer {
    readonly skyColors = ["#2A2346", "#6B4D6B", "#B5706E", "#E69A68", "#FFD885"];

    private readonly shadowColor = "rgba(0, 0, 0, 0.3)"; // 0x4D000000
    private readonly cranePlatformColors = ["#E91E63", "#9C27B0", "#3F51B5", "#00BCD4", "#FFC107"];

    private drawTriangle(ctx: CanvasRenderingContext2D, color: string, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
        const triangle = () => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.closePath();
        };

        // 1. Hard Drop Shadow (Offset translate)
        ctx.save();
        ctx.translate(2, 6);
        ctx.fillStyle = this.shadowColor;
        triangle();
        ctx.fill();
        ctx.restore();

        // 2. Actual Triangle
        ctx.fillStyle = color;
        triangle();
        ctx.fill();
    }

    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, _time: number): void {
        const w = game.width;
        const h = game.height;
        const cliffY = Math.min(h * 0.5 + game.frontMountainY, h * 0.7);

        // --- LEFT CLIFF ---
        const lTopC_x = w * 0.12; const lTopC_y = cliffY + 40;
        const lFrtC_x = w * 0.25; const lFrtC_y = cliffY + (h - cliffY) * 0.5;
        const lSdeC_x = w * 0.08; const lSdeC_y = cliffY + (h - cliffY) * 0.6;

        this.drawTriangle(ctx, "#D1B7A0", 0, cliffY, w * 0.28, cliffY + 20, lTopC_x, lTopC_y);
        this.drawTriangle(ctx, "#C2A68D", w * 0.28, cliffY + 20, w * 0.2, cliffY + 80, lTopC_x, lTopC_y);
        this.drawTriangle(ctx, "#B89B80", w * 0.2, cliffY + 80, 0, cliffY + 60, lTopC_x, lTopC_y);
        this.drawTriangle(ctx, "#A88C72", 0, cliffY + 60, 0, cliffY, lTopC_x, lTopC_y);
        
        this.drawTriangle(ctx, "#96755A", w * 0.28, cliffY + 20, w * 0.45, h, lFrtC_x, lFrtC_y);
        this.drawTriangle(ctx, "#8A6B53", w * 0.45, h, w * 0.15, h, lFrtC_x, lFrtC_y);
        this.drawTriangle(ctx, "#7D604A", w * 0.15, h, w * 0.2, cliffY + 80, lFrtC_x, lFrtC_y);
        this.drawTriangle(ctx, "#80624C", w * 0.2, cliffY + 80, w * 0.28, cliffY + 20, lFrtC_x, lFrtC_y);
        
        this.drawTriangle(ctx, "#6B5143", w * 0.2, cliffY + 80, w * 0.15, h, lSdeC_x, lSdeC_y);
        this.drawTriangle(ctx, "#5C4538", w * 0.15, h, 0, h, lSdeC_x, lSdeC_y);
        this.drawTriangle(ctx, "#4D382D", 0, h, 0, cliffY + 60, lSdeC_x, lSdeC_y);

        // --- RIGHT CLIFF ---
        const rY = cliffY + 40;
        const rTopC_x = w * 0.88; const rTopC_y = rY + 50;
        const rFrtC_x = w * 0.75; const rFrtC_y = rY + (h - rY) * 0.5;
        const rSdeC_x = w * 0.92; const rSdeC_y = rY + (h - rY) * 0.6;

        this.drawTriangle(ctx, "#C4A891", w, rY, w * 0.72, rY + 30, rTopC_x, rTopC_y);
        this.drawTriangle(ctx, "#B39882", w * 0.72, rY + 30, w * 0.8, rY + 100, rTopC_x, rTopC_y);
        this.drawTriangle(ctx, "#A68B75", w * 0.8, rY + 100, w, rY + 70, rTopC_x, rTopC_y);
        this.drawTriangle(ctx, "#9E836D", w, rY + 70, w, rY, rTopC_x, rTopC_y);

        this.drawTriangle(ctx, "#85644E", w * 0.72, rY + 30, w * 0.55, h, rFrtC_x, rFrtC_y);
        this.drawTriangle(ctx, "#7A5C47", w * 0.55, h, w * 0.85, h, rFrtC_x, rFrtC_y);
        this.drawTriangle(ctx, "#6B503E", w * 0.85, h, w * 0.8, rY + 100, rFrtC_x, rFrtC_y);
        this.drawTriangle(ctx, "#735643", w * 0.8, rY + 100, w * 0.72, rY + 30, rFrtC_x, rFrtC_y);

        this.drawTriangle(ctx, "#5C4335", w * 0.8, rY + 100, w * 0.85, h, rSdeC_x, rSdeC_y);
        this.drawTriangle(ctx, "#4A362B", w * 0.85, h, w, h, rSdeC_x, rSdeC_y);
        this.drawTriangle(ctx, "#3D2A20", w, h, w, rY + 70, rSdeC_x, rSdeC_y);
    }

    drawForeground(_ctx: CanvasRenderingContext2D, _game: JumperGame, _time: number): void {}

    drawPlatform(ctx: CanvasRenderingContext2D, game: JumperGame, platform: Platform): void {
        const platformIndex = game.platforms.indexOf(platform);
        const color = this.cranePlatformColors[platformIndex % this.cranePlatformColors.length];
        
        ctx.save();
        // Android setShadowLayer(8f, 0f, 8f, 0x80000000)
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8;
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";

        ctx.fillStyle = color;
        // @ts-ignore
        platform.draw(ctx);
        ctx.fill();
        ctx.restore();

        // Edge highlights
        ctx.strokeStyle = "rgba(255, 255, 255, 0.86)"; // 0xDDFFFFFF
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(platform.x, platform.y + platform.height);
        ctx.lineTo(platform.x + platform.width, platform.y + platform.height);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.33)"; // 0x55FFFFFF
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(platform.x, platform.y + platform.height);
        ctx.lineTo(platform.x + platform.width * 0.2, platform.y + platform.height - 15);
        ctx.lineTo(platform.x + platform.width * 0.8, platform.y + platform.height - 15);
        ctx.lineTo(platform.x + platform.width, platform.y + platform.height);
        ctx.stroke();
    }

    drawParallaxObject(ctx: CanvasRenderingContext2D, game: JumperGame, tree: BgTree): void {
        if (Math.floor(tree.size * 1000) % 4 !== 0) return;

        const w = game.width;
        const h = game.height;
        const cliffY = Math.min(h * 0.5 + game.frontMountainY, h * 0.7);
        const rY = cliffY + 40;

        ctx.save();

        // --- CLIP TO MOUNTAIN BOUNDARIES ---
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, rY);
        ctx.lineTo(w * 0.72, rY + 30);
        ctx.lineTo(w * 0.55, h);
        ctx.lineTo(w * 0.45, h);
        ctx.lineTo(w * 0.28, cliffY + 20);
        ctx.lineTo(0, cliffY);
        ctx.closePath();
        ctx.clip();

        ctx.translate(tree.x, tree.y);
        const scale = tree.size / 20;
        ctx.scale(scale, scale);

        const drawCircles = (colors: string[], offset: number) => {
            ctx.save();
            ctx.translate(0, offset);
            ctx.fillStyle = offset > 0 ? this.shadowColor : colors[0];
            
            // Layer Circles
            ctx.beginPath(); ctx.arc(-25, 5, 28, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(35, 8, 24, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(5, -12, 38, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(15, 15, 20, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };

        // LAYER 1: BACK
        drawCircles([this.shadowColor], 6); // Shadow
        drawCircles(["#7D6B82"], 0); // Fill

        // LAYER 2: MID
        const drawMid = (offset: number, isShadow: boolean) => {
            ctx.save();
            ctx.translate(0, offset);
            ctx.fillStyle = isShadow ? this.shadowColor : "#A18DA6";
            ctx.beginPath(); ctx.arc(-15, 8, 22, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(22, 10, 20, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(2, -2, 28, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };
        drawMid(6, true);
        drawMid(0, false);

        // LAYER 3: FRONT
        const drawFront = (offset: number, isShadow: boolean) => {
            ctx.save();
            ctx.translate(0, offset);
            ctx.fillStyle = isShadow ? this.shadowColor : "#CBB8D1";
            ctx.beginPath(); ctx.arc(-8, 12, 14, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(12, 14, 12, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, 5, 18, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };
        drawFront(6, true);
        drawFront(0, false);

        ctx.restore();
    }

    drawVillageBuilding(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
        ctx.save();
        ctx.translate(cx, cy);

        // ROOF
        const roof = () => {
            ctx.beginPath();
            ctx.moveTo(-size * 0.4, size * 0.5);
            ctx.lineTo(size * 0.4, size * 0.5);
            ctx.lineTo(size * 0.3, -size * 0.2);
            ctx.lineTo(-size * 0.3, -size * 0.2);
            ctx.closePath();
        };
        ctx.save(); ctx.translate(0, 6); ctx.fillStyle = this.shadowColor; roof(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#D32F2F"; roof(); ctx.fill();
        ctx.strokeStyle = "black"; ctx.lineWidth = 3; roof(); ctx.stroke();

        // BASE
        const base = () => {
            ctx.beginPath();
            ctx.moveTo(-size * 0.6, -size * 0.2);
            ctx.lineTo(0, -size * 0.5);
            ctx.lineTo(size * 0.6, -size * 0.2);
            ctx.closePath();
        };
        ctx.save(); ctx.translate(0, 6); ctx.fillStyle = this.shadowColor; base(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#212121"; base(); ctx.fill();
        base(); ctx.stroke();

        ctx.restore();
    }
}