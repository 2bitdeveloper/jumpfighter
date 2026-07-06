import type { BiomeRenderer } from './BiomeRenderer';
import { JumperGame, Platform, BgTree, WeatherManager } from './JumperGame';

export class FoxBiomeRenderer implements BiomeRenderer {
    // A bright daytime sky with soft blue tones
    readonly skyColors = ["#81D4FA", "#B3E5FC"];

    private readonly shadowColor = "rgba(0, 0, 0, 0.3)"; // 0x4D000000

    private readonly mtnColors = ["#CFD8DC", "#B0BEC5", "#90A4AE", "#78909C", "#607D8B", "#455A64"];
    private readonly hillColors = ["#2E7D32", "#43A047", "#66BB6A"];
    private readonly stoneColors = ["#E0E0E0", "#9E9E9E", "#616161"];
    private readonly snowColors = ["#FFFFFF", "#E0F7FA", "#B2EBF2", "#80DEEA"];

    // Helper to blend hex colors (Replaces Kotlin Color.red/green/blue blending)
    private lerpColor(a: string, b: string, amount: number): string {
        const ah = parseInt(a.replace(/#/g, ''), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16),
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + amount * (br - ar),
            rg = ag + amount * (bg - ag),
            rb = ab + amount * (bb - ab);
        return `rgb(${rr}, ${rg}, ${rb})`;
    }

    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        const w = game.width;
        const h = game.height;
        // @ts-ignore - Assuming alphaMult is added to WeatherManager
        const snowAlpha = WeatherManager.alphaMult || 0;

        // 1. Sun & Storm Clouds
        this.drawPaperSun(ctx, w * 0.8, h * 0.15);
        this.drawPaperClouds(ctx, w, h, time);
        if (snowAlpha > 0) this.drawStormClouds(ctx, w * 0.8, h * 0.15, snowAlpha);

        // 2. Faceted Mountains
        const mtnBaseY = Math.min(h * 0.5 + game.backMountainY * 0.8, h * 0.75);
        this.drawFacetedMountainWithDepth(ctx, w * 0.1, mtnBaseY - 160, w * 0.45, mtnBaseY, snowAlpha);
        this.drawFacetedMountainWithDepth(ctx, w * 0.9, mtnBaseY - 180, w * 0.50, mtnBaseY, snowAlpha);
        this.drawFacetedMountainWithDepth(ctx, w * 0.3, mtnBaseY - 280, w * 0.45, mtnBaseY, snowAlpha);
        this.drawFacetedMountainWithDepth(ctx, w * 0.7, mtnBaseY - 320, w * 0.50, mtnBaseY, snowAlpha);
        this.drawFacetedMountainWithDepth(ctx, w * 0.5, mtnBaseY - 150, w * 0.35, mtnBaseY, snowAlpha);

        // 3. Layered Hills
        const hillBaseY = Math.min(h * 0.55 + game.backMountainY, h * 0.8);
        for (let i = 0; i < 2; i++) {
            const offset = i * 40;
            const hillPath = () => {
                ctx.beginPath();
                ctx.moveTo(0, h);
                ctx.lineTo(0, hillBaseY + offset);
                ctx.quadraticCurveTo(w * 0.25, hillBaseY + offset - 80, w * 0.5, hillBaseY + offset);
                ctx.quadraticCurveTo(w * 0.75, hillBaseY + offset + 80, w, hillBaseY + offset - 30);
                ctx.lineTo(w, h);
                ctx.closePath();
            };

            ctx.save();
            ctx.translate(0, 10);
            ctx.fillStyle = this.shadowColor;
            hillPath();
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = this.hillColors[i];
            hillPath();
            ctx.fill();

            const treeCount = 2 + i;
            for (let j = 0; j < treeCount; j++) {
                const tx = (w / treeCount) * j + (i * 80);
                const ty = hillBaseY + offset + 10;
                this.drawFacetedPineWithDepth(ctx, tx, ty, 50 + (i * 10), snowAlpha);
            }
        }

        // 4. Dynamic Lake
        const lakeTopY = hillBaseY + 60;
        ctx.fillStyle = this.lerpColor("#0288D1", "#E0F7FA", snowAlpha);
        ctx.fillRect(0, lakeTopY, w, h);

        // Lake lines
        ctx.strokeStyle = this.lerpColor("rgba(255,255,255,0.2)", "rgba(255,255,255,0.6)", snowAlpha);
        ctx.lineWidth = 1.5;
        const drawLine = (x1: number, x2: number, y: number) => {
            ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        };
        drawLine(w * 0.1, w * 0.9, lakeTopY + 20);
        drawLine(w * 0.3, w * 0.7, lakeTopY + 50);
        drawLine(w * 0.2, w * 0.8, lakeTopY + 90);

        // 5. Foreground Behind Platforms
        const fgY = Math.min(h * 0.75 + game.frontMountainY * 1.2, h * 0.95);
        this.drawFacetedPineWithDepth(ctx, w * 0.15, fgY, 200, snowAlpha);
        this.drawFacetedPineWithDepth(ctx, w * 0.85, fgY + 40, 240, snowAlpha);

        if (snowAlpha < 1.0) {
            ctx.globalAlpha = 1.0 - snowAlpha;
            ctx.fillStyle = "#E91E63";
            for (let i = 0; i <= 5; i++) {
                const x = (w / 6) * i + 30;
                ctx.save(); ctx.translate(2, 4); ctx.fillStyle = this.shadowColor;
                ctx.beginPath(); ctx.arc(x, h - 20, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                ctx.beginPath(); ctx.arc(x, h - 20, 10, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        }
    }

    drawForeground(): void {}

    drawPlatform(ctx: CanvasRenderingContext2D, _game: JumperGame, platform: Platform): void {
        // @ts-ignore
        const snowAlpha = WeatherManager.alphaMult || 0;
        const pX = platform.x, pY = platform.y, pW = platform.width, pH = platform.height;

        ctx.save();
        ctx.translate(8, 12);
        ctx.fillStyle = this.shadowColor;
        platform.draw(ctx);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#BDBDBD";
        platform.draw(ctx);
        ctx.fill();

        ctx.save();
        // Clamping drawing inside the platform shape (Replaces clipPath)
        platform.draw(ctx);
        ctx.clip();

        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1.5;
        const drawL = (x1: number, y1: number, x2: number, y2: number) => {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        };
        drawL(pX, pY + pH * 0.4, pX + pW * 0.4, pY + pH * 0.8);
        drawL(pX + pW * 0.6, pY + pH * 0.2, pX + pW, pY + pH * 0.6);
        drawL(pX + pW * 0.3, pY, pX + pW * 0.5, pY + pH);

        for (let i = 0; i <= 3; i++) {
            const sx = pX + (pW / 4 * i) + 15;
            const sy = pY + (pH / 2);
            this.draw3DStone(ctx, sx, sy, 22);
        }

        if (snowAlpha > 0) {
            this.drawComplexSnowPile(ctx, pX, pY, pW, pH * 0.6, snowAlpha);
        }
        ctx.restore();
    }

    drawParallaxObject(): void {}

    private drawFacetedMountainWithDepth(ctx: CanvasRenderingContext2D, peakX: number, peakY: number, width: number, baseY: number, snowAlpha: number) {
        const halfW = width / 2;
        const vPeak = [peakX, peakY], vLB = [peakX - halfW, baseY], vRB = [peakX + halfW, baseY];
        const vML1 = [peakX - halfW * 0.6, peakY + (baseY - peakY) * 0.4];
        const vML2 = [peakX - halfW * 0.3, peakY + (baseY - peakY) * 0.7];
        const vMR1 = [peakX + halfW * 0.4, peakY + (baseY - peakY) * 0.5];
        const vMR2 = [peakX + halfW * 0.7, peakY + (baseY - peakY) * 0.8];
        const vCF = [peakX - halfW * 0.1, peakY + (baseY - peakY) * 0.6];
        const vCB = [peakX + halfW * 0.1, baseY];

        ctx.save();
        ctx.translate(15, 20);
        ctx.fillStyle = this.shadowColor;
        ctx.beginPath();
        ctx.moveTo(vLB[0], vLB[1]); ctx.lineTo(vML2[0], vML2[1]); ctx.lineTo(vML1[0], vML1[1]);
        ctx.lineTo(vPeak[0], vPeak[1]); ctx.lineTo(vMR1[0], vMR1[1]); ctx.lineTo(vMR2[0], vMR2[1]);
        ctx.lineTo(vRB[0], vRB[1]); ctx.closePath(); ctx.fill();
        ctx.restore();

        this.drawTriangle(ctx, this.mtnColors[0], vPeak, vML1, vCF);
        this.drawTriangle(ctx, this.mtnColors[1], vML1, vLB, vML2);
        this.drawTriangle(ctx, this.mtnColors[2], vML1, vML2, vCF);
        this.drawTriangle(ctx, this.mtnColors[3], vML2, vLB, vCB);
        this.drawTriangle(ctx, this.mtnColors[1], vML2, vCF, vCB);
        this.drawTriangle(ctx, this.mtnColors[3], vPeak, vCF, vMR1);
        this.drawTriangle(ctx, this.mtnColors[4], vCF, vMR1, vCB);
        this.drawTriangle(ctx, this.mtnColors[5], vMR1, vMR2, vCB);
        this.drawTriangle(ctx, this.mtnColors[4], vMR1, vRB, vMR2);
        this.drawTriangle(ctx, this.mtnColors[5], vMR2, vCB, vRB);

        if (snowAlpha > 0) {
            ctx.globalAlpha = snowAlpha;
            const s1 = [peakX - halfW * 0.3, peakY + (baseY - peakY) * 0.2];
            const s2 = [peakX - halfW * 0.1, peakY + (baseY - peakY) * 0.35];
            const s3 = [peakX + halfW * 0.2, peakY + (baseY - peakY) * 0.25];
            const s4 = [peakX + halfW * 0.4, peakY + (baseY - peakY) * 0.15];
            this.drawTriangle(ctx, this.snowColors[0], vPeak, s1, s2);
            this.drawTriangle(ctx, this.snowColors[1], vPeak, s2, s3);
            this.drawTriangle(ctx, this.snowColors[2], vPeak, s3, s4);
            ctx.globalAlpha = 1.0;
        }
    }

    private drawFacetedPineWithDepth(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, snowAlpha: number) {
        ctx.save();
        ctx.translate(x, y);

        const pineShadow = () => {
            ctx.beginPath(); ctx.moveTo(0, -size * 1.5); ctx.lineTo(-size * 0.5, 0); ctx.lineTo(size * 0.5, 0); ctx.closePath();
        };
        ctx.save(); ctx.translate(10, 15); ctx.fillStyle = this.shadowColor; pineShadow(); ctx.fill(); ctx.restore();

        ctx.fillStyle = "#4E342E"; ctx.fillRect(-size * 0.1, 0, size * 0.1, size * 0.3);
        ctx.fillStyle = "#3E2723"; ctx.fillRect(0, 0, size * 0.1, size * 0.3);

        for (let i = 0; i < 4; i++) {
            const scale = 1.0 - (i / 4 * 0.6);
            const w = size * scale, h = size * 0.5 * scale, ty = -i * (size * 0.35);
            const top = [0, ty - h], lE = [-w, ty], lM = [-w * 0.3, ty + h * 0.1], rM = [w * 0.4, ty + h * 0.15], rE = [w, ty];

            this.drawTriangle(ctx, "#43A047", top, lE, lM);
            this.drawTriangle(ctx, "#2E7D32", top, lM, rM);
            this.drawTriangle(ctx, "#1B5E20", top, rM, rE);

            if (snowAlpha > 0) {
                ctx.globalAlpha = snowAlpha;
                const sw = w * 0.7, sh = h * 0.5;
                const sL = [-sw, ty - h + sh], sM1 = [-sw * 0.2, ty - h + sh * 1.2], sM2 = [sw * 0.3, ty - h + sh * 1.3], sR = [sw, ty - h + sh * 0.8];
                this.drawTriangle(ctx, this.snowColors[0], top, sL, sM1);
                this.drawTriangle(ctx, this.snowColors[1], top, sM1, sM2);
                this.drawTriangle(ctx, this.snowColors[2], top, sM2, sR);
                ctx.globalAlpha = 1.0;
            }
        }
        ctx.restore();
    }

    private draw3DStone(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
        const t = [cx, cy - radius], l = [cx - radius * 0.9, cy - radius * 0.2], r = [cx + radius * 0.9, cy - radius * 0.2];
        const c = [cx, cy + radius * 0.2], bL = [cx - radius * 0.5, cy + radius * 0.8], bR = [cx + radius * 0.5, cy + radius * 0.8];

        ctx.save(); ctx.translate(2, 4); ctx.fillStyle = this.shadowColor;
        ctx.beginPath(); ctx.moveTo(t[0], t[1]); ctx.lineTo(l[0], l[1]); ctx.lineTo(bL[0], bL[1]);
        ctx.lineTo(bR[0], bR[1]); ctx.lineTo(r[0], r[1]); ctx.closePath(); ctx.fill(); ctx.restore();

        this.drawTriangle(ctx, this.stoneColors[0], t, l, c);
        this.drawTriangle(ctx, this.stoneColors[0], t, c, r);
        this.drawTriangle(ctx, this.stoneColors[1], l, bL, c);
        this.drawTriangle(ctx, this.stoneColors[2], r, c, bR);
        this.drawTriangle(ctx, this.stoneColors[2], c, bL, bR);

        ctx.strokeStyle = "rgba(0,0,0,0.33)";
        ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r[0], r[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(t[0], t[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }

    private drawComplexSnowPile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number) {
        const segments = 6, segW = w / segments;
        ctx.globalAlpha = alpha;
        for (let i = 0; i < segments; i++) {
            const sx = x + (i * segW), sy = y + (h * 0.5);
            const pTL = [sx, y], pTR = [sx + segW, y], pM = [sx + segW * 0.5, sy + 15], pBL = [sx - 5, sy], pBR = [sx + segW + 5, sy + 5];

            ctx.save(); ctx.translate(0, 4); ctx.fillStyle = this.shadowColor;
            ctx.beginPath(); ctx.moveTo(pTL[0], pTL[1]); ctx.lineTo(pTR[0], pTR[1]); ctx.lineTo(pBR[0], pBR[1]); ctx.lineTo(pBL[0], pBL[1]); ctx.closePath(); ctx.fill(); ctx.restore();

            this.drawTriangle(ctx, this.snowColors[0], pTL, pTR, pM);
            this.drawTriangle(ctx, this.snowColors[1], pTL, pBL, pM);
            this.drawTriangle(ctx, this.snowColors[2], pTR, pM, pBR);
        }
        ctx.globalAlpha = 1.0;
    }

    private drawTriangle(ctx: CanvasRenderingContext2D, color: string, p1: number[], p2: number[], p3: number[]) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath(); ctx.fill();
    }

    private drawPaperSun(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
        ctx.save(); ctx.translate(4, 8); ctx.fillStyle = this.shadowColor;
        ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#FFD54F"; ctx.beginPath(); ctx.arc(cx, cy, 60, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FBC02D"; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();
    }

    private drawPaperClouds(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
        ctx.fillStyle = "white";
        for (let i = 0; i <= 2; i++) {
            const speed = 3000 + (i * 1000);
            const cx = ((time / speed) % 1.0) * (w + 200) - 100;
            const cy = h * 0.1 + (i * 40);
            const cloud = () => {
                ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.arc(cx + 30, cy + 10, 25, 0, Math.PI * 2); ctx.arc(cx - 30, cy + 10, 25, 0, Math.PI * 2); ctx.fill();
            };
            ctx.save(); ctx.translate(4, 8); ctx.fillStyle = this.shadowColor; cloud(); ctx.restore();
            ctx.fillStyle = "white"; cloud();
        }
    }

    private drawStormClouds(ctx: CanvasRenderingContext2D, cx: number, cy: number, snowAlpha: number) {
        ctx.save(); ctx.globalAlpha = snowAlpha; ctx.translate(4, 8); ctx.fillStyle = this.shadowColor;
        ctx.beginPath(); ctx.arc(cx - 30, cy + 10, 70, 0, Math.PI * 2); ctx.arc(cx + 40, cy - 10, 80, 0, Math.PI * 2); ctx.arc(cx + 90, cy + 20, 60, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#78909C"; ctx.globalAlpha = snowAlpha;
        ctx.beginPath(); ctx.arc(cx - 30, cy + 10, 70, 0, Math.PI * 2); ctx.arc(cx + 40, cy - 10, 80, 0, Math.PI * 2); ctx.arc(cx + 90, cy + 20, 60, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    drawVillageBuilding(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
        ctx.save(); ctx.translate(4, 8); ctx.fillStyle = this.shadowColor;
        ctx.fillRect(cx - size * 0.4, cy - size * 0.4, size * 0.8, size * 0.8);
        ctx.beginPath(); ctx.moveTo(cx - size * 0.5, cy - size * 0.4); ctx.lineTo(cx, cy - size * 0.8); ctx.lineTo(cx + size * 0.5, cy - size * 0.4); ctx.closePath(); ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#A1887F"; ctx.fillRect(cx - size * 0.4, cy - size * 0.4, size * 0.8, size * 0.8);
        ctx.fillStyle = "#8D6E63"; ctx.beginPath(); ctx.moveTo(cx - size * 0.5, cy - size * 0.4); ctx.lineTo(cx, cy - size * 0.8); ctx.lineTo(cx + size * 0.5, cy - size * 0.4); ctx.closePath(); ctx.fill();
    }
}