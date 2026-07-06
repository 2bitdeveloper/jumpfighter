import type { BiomeRenderer } from './BiomeRenderer';
import { JumperGame, Platform, BgTree } from './JumperGame';

interface Cloud { x: number; y: number; speed: number; scale: number; }
interface Bird { x: number; y: number; speed: number; scale: number; flap: number; baseColor: string; }
interface Star { x: number; y: number; size: number; twinkleOffset: number; }
interface Lotus { progress: number; laneOffset: number; scale: number; speed: number; }

export class PandaBiomeRenderer implements BiomeRenderer {
    private readonly daySky = ["#B3E5FC", "#81D4FA", "#E1F5FE"];
    private readonly nightSky = ["#0A0E21", "#1A237E", "#283593"];
    
    private readonly daySkyLayers = ["#E1F5FE", "#B3E5FC", "#81D4FA", "#4FC3F7", "#29B6F6", "#03A9F4"];
    private readonly nightSkyLayers = ["#3F51B5", "#3949AB", "#303F9F", "#283593", "#1A237E", "#0D1230"];

    public skyColors: string[] = [...this.daySky];

    private readonly shadowColor = "rgba(0, 0, 0, 0.3)";
    private readonly sunColors = ["rgba(255, 179, 0, 0.2)", "rgba(255, 202, 40, 0.53)", "#FFD54F"];
    private readonly bankGrassColors = ["#DCE775", "#C0CA33", "#AFB42B"];
    private readonly bankEarthColors = ["#8D6E63", "#795548", "#6D4C41"];

    private platformCrackLevels = new WeakMap<Platform, number>();
    private platformCrackTimes = new WeakMap<Platform, number>();
    private platformIsHit = new WeakMap<Platform, boolean>();

    private clouds: Cloud[] = Array.from({ length: 15 }, () => ({
        x: Math.random() * 2000, y: Math.random() * 600 + 50, speed: Math.random() * 0.5 + 0.2, scale: Math.random() * 0.4 + 0.6
    }));

    private birds: Bird[] = Array.from({ length: 7 }, () => ({
        x: Math.random() * 2000, y: Math.random() * 350 + 100, speed: Math.random() * 1.5 + 1, scale: Math.random() * 0.3 + 0.3, flap: Math.random() * 10,
        baseColor: ["#111111", "#FFFFFF", "#D32F2F"][Math.floor(Math.random() * 3)]
    }));

    private stars: Star[] = Array.from({ length: 150 }, () => ({
        x: Math.random() * 2000, y: Math.random() * 1200, size: Math.random() * 2.5 + 1, twinkleOffset: Math.random() * 5000
    }));

    private lotuses: Lotus[] = Array.from({ length: 8 }, () => ({
        progress: Math.random(), laneOffset: Math.random() * 1.6 - 0.8, scale: Math.random() * 0.5 + 0.5, speed: Math.random() * 0.0005 + 0.001
    }));

    private lerpColor(a: string, b: string, amount: number): string {
        const ah = parseInt(a.replace(/#/g, ''), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16),
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = Math.round(ar + amount * (br - ar)),
            rg = Math.round(ag + amount * (bg - ag)),
            rb = Math.round(ab + amount * (bb - ab));
        return `rgb(${rr}, ${rg}, ${rb})`;
    }

    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        const w = game.width;
        const h = game.height;
        const horizonY = h * 0.7;

        const cycleTime = time % 100000;
        let nightRatio = 0;
        if (cycleTime < 55000) nightRatio = 0;
        else if (cycleTime < 60000) nightRatio = (cycleTime - 55000) / 5000;
        else if (cycleTime < 95000) nightRatio = 1;
        else nightRatio = 1 - ((cycleTime - 95000) / 5000);

        for (let i = 0; i < 3; i++) this.skyColors[i] = this.lerpColor(this.daySky[i], this.nightSky[i], nightRatio);

        const skyLayerColors = this.daySkyLayers.map((c, i) => this.lerpColor(c, this.nightSkyLayers[i], nightRatio));
        this.drawWavyDioramaSky(ctx, w, horizonY, skyLayerColors);

        const skyObX = w * 0.35;
        const skyObY = h * 0.25;

        if (nightRatio < 1.0) {
            ctx.globalAlpha = 1.0 - nightRatio;
            this.sunColors.forEach((color, i) => {
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(skyObX, skyObY, 160 - (i * 35), 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1.0;
        }

        if (nightRatio > 0.6) {
            const nrAlpha = (nightRatio - 0.6) / 0.4;
            this.stars.forEach(star => {
                const twinkle = Math.sin((time + star.twinkleOffset) / 300.0) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(255, 255, 255, ${nrAlpha * twinkle})`;
                ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
            });

            ctx.fillStyle = `rgba(224, 224, 224, ${0.26 * nightRatio})`;
            ctx.beginPath(); ctx.arc(skyObX, skyObY, 100, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(245, 245, 245, ${nrAlpha})`;
            ctx.beginPath(); ctx.arc(skyObX, skyObY, 60, 0, Math.PI * 2); ctx.fill();
        }

        if (nightRatio < 1.0) {
            ctx.globalAlpha = 1.0 - nightRatio;
            this.clouds.forEach(cloud => {
                cloud.x += cloud.speed;
                if (cloud.x > w + 200) cloud.x = -200;
                this.drawLayeredCloud(ctx, cloud.x, cloud.y, cloud.scale);
            });
            ctx.globalAlpha = 1.0;
        }

        this.birds.forEach(bird => {
            bird.x -= bird.speed;
            if (bird.x < -100) bird.x = w + 100;
            const currentBirdColor = this.lerpColor(bird.baseColor, "#000000", nightRatio);
            this.drawOrigamiCrane(ctx, bird, time, currentBirdColor);
        });

        this.drawHorizonPagodas(ctx, w, horizonY, nightRatio);
        this.drawWindingRiver(ctx, w, h, horizonY, nightRatio, time);
        this.drawTectonicGrasslands(ctx, w, h, horizonY, nightRatio);
        this.drawLotuses(ctx, w, h, horizonY, time);
        this.drawZDepthBamboo(ctx, w, h, game);
    }

    private drawWindingRiver(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, nightRatio: number, time: number) {
        const segments = 30;
        const riverPath = () => {
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const y = horizonY + t * (h - horizonY);
                const cx = w * 0.5 + Math.sin(t * Math.PI * 1.5) * (w * 0.25 * t);
                const rw = w * 0.05 + (t * t) * (w * 0.45);
                if (i === 0) ctx.moveTo(cx - rw, y); else ctx.lineTo(cx - rw, y);
            }
            for (let i = segments; i >= 0; i--) {
                const t = i / segments;
                const y = horizonY + t * (h - horizonY);
                const cx = w * 0.5 + Math.sin(t * Math.PI * 1.5) * (w * 0.25 * t);
                const rw = w * 0.05 + (t * t) * (w * 0.45);
                ctx.lineTo(cx + rw, y);
            }
            ctx.closePath();
        };

        ctx.save(); ctx.translate(0, 6); ctx.fillStyle = this.shadowColor; riverPath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = this.lerpColor("#4FC3F7", "#1A237E", nightRatio);
        riverPath(); ctx.fill();

        const phase = (time % 10000) / 3;
        ctx.save();
        ctx.setLineDash([60, 30, 20, 40, 100, 50]);
        ctx.lineDashOffset = phase;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 3;

        for (let lane = -1; lane <= 1; lane++) {
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const y = horizonY + t * (h - horizonY);
                const cx = w * 0.5 + Math.sin(t * Math.PI * 1.5) * (w * 0.25 * t);
                const rw = w * 0.05 + (t * t) * (w * 0.45);
                const lx = cx + (lane * rw * 0.4);
                if (i === 0) ctx.moveTo(lx, y); else ctx.lineTo(lx, y);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    private drawLotuses(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, time: number) {
        this.lotuses.forEach(lotus => {
            lotus.progress += lotus.speed;
            if (lotus.progress > 1.0) {
                lotus.progress = 0;
                lotus.laneOffset = Math.random() * 1.6 - 0.8;
            }
            if (lotus.progress > 0.05) {
                const t = lotus.progress;
                const y = horizonY + t * (h - horizonY);
                const cx = w * 0.5 + Math.sin(t * Math.PI * 1.5) * (w * 0.25 * t);
                const rw = w * 0.05 + (t * t) * (w * 0.45);
                const lx = cx + (lotus.laneOffset * rw);
                this.drawOrigamiLotus(ctx, lx, y, lotus.scale * (0.3 + t * 1.5), time);
            }
        });
    }

    private drawOrigamiLotus(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, time: number) {
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(scale, scale);
        ctx.rotate(Math.sin(time / 400.0 + cx) * 0.17);

        const leafPath = () => {
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, -10);
            ctx.arc(0, 0, 20, -0.5, 5.2); ctx.closePath();
        };

        ctx.save(); ctx.translate(2, 4); ctx.fillStyle = this.shadowColor; leafPath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#8BC34A"; leafPath(); ctx.fill();

        ctx.fillStyle = "#F48FB1";
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-8, -12); ctx.lineTo(-3, -18); ctx.lineTo(0, -10); ctx.lineTo(3, -18); ctx.lineTo(8, -12); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    private drawTectonicGrasslands(ctx: CanvasRenderingContext2D, w: number, h: number, horizonY: number, nightRatio: number) {
        const steps = 14;
        for (let i = 0; i < steps; i++) {
            const tB = i / steps, tF = (i + 1) / steps;
            const yB = horizonY + tB * (h - horizonY), yF = horizonY + tF * (h - horizonY);
            const cxB = w * 0.5 + Math.sin(tB * Math.PI * 1.5) * (w * 0.25 * tB), cxF = w * 0.5 + Math.sin(tF * Math.PI * 1.5) * (w * 0.25 * tF);
            const rwB = w * 0.05 + (tB * tB) * (w * 0.45), rwF = w * 0.05 + (tF * tF) * (w * 0.45);

            const grassColor = this.lerpColor(this.bankGrassColors[i % 3], "#0A2F0A", nightRatio);
            const earthColor = this.lerpColor(this.bankEarthColors[i % 3], "#000000", nightRatio);

            [[cxB - rwB, cxF - rwF, 0], [cxB + rwB, cxF + rwF, w]].forEach(([xB, xF, edgeX]) => {
                ctx.fillStyle = grassColor;
                ctx.beginPath(); ctx.moveTo(edgeX, yB); ctx.lineTo(xB, yB); ctx.lineTo(xF, yF); ctx.lineTo(edgeX, yF); ctx.closePath();
                ctx.save(); ctx.translate(0, 6); ctx.fillStyle = this.shadowColor; ctx.fill(); ctx.restore();
                ctx.fillStyle = grassColor; ctx.fill();

                ctx.fillStyle = earthColor;
                const drop = 5 + (tF * tF) * 40;
                ctx.beginPath(); ctx.moveTo(edgeX, yF); ctx.lineTo(xF, yF); ctx.lineTo(xF, yF + drop); ctx.lineTo(edgeX, yF + drop); ctx.closePath(); ctx.fill();
            });
        }
    }

    private drawWavyDioramaSky(ctx: CanvasRenderingContext2D, w: number, horizonY: number, layerColors: string[]) {
        layerColors.forEach((color, i) => {
            ctx.fillStyle = color;
            const t = i / (layerColors.length - 1);
            const topY = t * (horizonY * 0.7) - 50;

            const skyPath = () => {
                ctx.beginPath();
                for (let ix = 0; ix <= 10; ix++) {
                    const cx = ix * (w / 10);
                    const waveOffset = (Math.sin(ix * 1.3 + i * 2.0) * 12 + Math.sin(ix * 0.7 - i * 1.1) * 8) * (1 - t);
                    if (ix === 0) ctx.moveTo(cx, topY + waveOffset); else ctx.lineTo(cx, topY + waveOffset);
                }
                ctx.lineTo(w, horizonY); ctx.lineTo(0, horizonY); ctx.closePath();
            };
            ctx.save(); ctx.translate(0, 6); ctx.fillStyle = this.shadowColor; skyPath(); ctx.fill(); ctx.restore();
            ctx.fillStyle = color; skyPath(); ctx.fill();
        });
    }

    private drawLayeredCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(scale, scale);
        const cloudShapes = () => {
            ctx.beginPath(); ctx.arc(-35, 0, 35, 0, Math.PI * 2); ctx.arc(0, -10, 45, 0, Math.PI * 2); ctx.arc(35, 5, 30, 0, Math.PI * 2); ctx.arc(65, 10, 20, 0, Math.PI * 2); ctx.rect(-60, 0, 135, 35);
        };
        ctx.save(); ctx.translate(6, 10); ctx.fillStyle = this.shadowColor; cloudShapes(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#CFD8DC"; ctx.save(); ctx.translate(0, 5); cloudShapes(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "white"; cloudShapes(); ctx.fill();
        ctx.restore();
    }

    private drawOrigamiCrane(ctx: CanvasRenderingContext2D, bird: Bird, time: number, activeColor: string) {
        ctx.save();
        ctx.translate(bird.x, bird.y); ctx.scale(bird.scale, bird.scale);
        const flap = Math.sin((time / 150.0) + bird.flap);
        const flapY = flap > 0 ? flap * 25 : flap * 10;
        const cranePath = () => {
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(35, flapY); ctx.lineTo(15, 10); ctx.lineTo(0, 25); ctx.lineTo(-15, 10); ctx.lineTo(-35, flapY); ctx.lineTo(-20, -10); ctx.lineTo(-35, -25); ctx.lineTo(-45, -20); ctx.lineTo(-25, -5); ctx.closePath();
        };
        ctx.save(); ctx.translate(4, 8); ctx.fillStyle = this.shadowColor; cranePath(); ctx.fill(); ctx.restore();
        ctx.fillStyle = activeColor; cranePath(); ctx.fill();
        ctx.restore();
    }

    private drawHorizonPagodas(ctx: CanvasRenderingContext2D, w: number, y: number, nightRatio: number) {
        this.drawDetailedPagoda(ctx, w * 0.15, y, 0.7, nightRatio);
        this.drawDetailedPagoda(ctx, w * 0.85, y - 10, 0.8, nightRatio);
    }

    private drawDetailedPagoda(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, nightRatio: number) {
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(scale, scale);
        let curY = 0, tW = 75;
        ctx.fillStyle = "#3E2723"; ctx.fillRect(-20, -30, 40, 30);
        if (nightRatio > 0) { ctx.save(); ctx.shadowBlur = 25; ctx.shadowColor = "#FFCA28"; ctx.fillStyle = `rgba(255, 213, 79, ${nightRatio})`; ctx.fillRect(-10, -20, 20, 15); ctx.restore(); }
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = "#3E2723"; ctx.fillRect(-tW * 0.35, curY - 50, tW * 0.7, 50);
            ctx.fillStyle = "#4E342E"; ctx.fillRect(-tW * 0.8, curY - 6, tW * 1.6, 6);
            const roof = () => { ctx.beginPath(); ctx.moveTo(-tW * 1.1, curY - 15); ctx.quadraticCurveTo(-tW * 0.5, curY - 15, 0, curY - 45); ctx.quadraticCurveTo(tW * 0.5, curY - 15, tW * 1.1, curY - 15); ctx.lineTo(tW * 0.7, curY - 35); ctx.lineTo(-tW * 0.7, curY - 35); ctx.closePath(); };
            ctx.fillStyle = "#C62828"; roof(); ctx.fill();
            curY -= 40; tW *= 0.75;
        }
        ctx.restore();
    }

    private drawZDepthBamboo(ctx: CanvasRenderingContext2D, w: number, h: number, game: JumperGame) {
        for (let z = 2; z >= 0; z--) {
            const count = 3 + z;
            for (let s = 0; s < count; s++) {
                const sX = (s * 15) + (z * 25) - 10;
                if (sX < w * 0.25) this.drawCurvedBambooStalk(ctx, sX, h + 200, -200 + game.frontMountainY * (0.05 * z), (8 - z * 1.5) + (s % 2) * 2, true, s, z);
                const rsX = w - sX;
                if (rsX > w * 0.75) this.drawCurvedBambooStalk(ctx, rsX, h + 200, -200 + game.frontMountainY * (0.05 * z), (8 - z * 1.5) + (s % 2) * 2, false, s, z);
            }
        }
    }

    private drawCurvedBambooStalk(ctx: CanvasRenderingContext2D, sX: number, sY: number, tY: number, rad: number, isL: boolean, s: number, z: number) {
        let pX = sX, pY = sY;
        const segs = 10, sH = (sY - tY) / segs;
        for (let i = 1; i <= segs; i++) {
            const cY = sY - i * sH, prog = i / segs;
            const cX = sX + Math.sin(prog * Math.PI + s * 0.5) * 60 * (isL ? 1 : -1) * (1 - z * 0.3);
            const stalkPath = () => { ctx.beginPath(); ctx.moveTo(pX - rad * 1.5, pY); ctx.lineTo(pX + rad * 1.5, pY); ctx.lineTo(cX + rad * 1.5, cY); ctx.lineTo(cX - rad * 1.5, cY); ctx.closePath(); };
            ctx.save(); ctx.translate(4, 6); ctx.fillStyle = this.shadowColor; stalkPath(); ctx.fill(); ctx.restore();
            [this.lerpColor("#81C784", "#1B5E20", z / 3), this.lerpColor("#4CAF50", "#003300", z / 3), this.lerpColor("#2E7D32", "#000000", z / 3)].forEach((c, j) => {
                ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pX + rad * (j - 1.5), pY); ctx.lineTo(pX + rad * (j - 0.5), pY); ctx.lineTo(cX + rad * (j - 0.5), cY); ctx.lineTo(cX + rad * (j - 1.5), cY); ctx.closePath(); ctx.fill();
            });
            pX = cX; pY = cY;
        }
    }

    drawParallaxObject(): void {}
    drawForeground(): void {}

    drawPlatform(ctx: CanvasRenderingContext2D, game: JumperGame, platform: Platform): void {
        const p = platform;
        const now = Date.now();
        if (p.y < 0 || p.scale < 1) { this.platformCrackLevels.delete(p); this.platformIsHit.set(p, false); }
        else {
            const pB = game.player.y + game.player.size, pC = game.player.x + (game.player.size / 2);
            if (!this.platformIsHit.get(p) && game.player.velocityY > 0 && pB >= p.y && pB <= p.y + 40 && pC > p.x && pC < p.x + p.width) {
                this.platformIsHit.set(p, true);
                if (now - (this.platformCrackTimes.get(p) || 0) > 400) {
                    const c = (this.platformCrackLevels.get(p) || 0) + 1;
                    if (c <= 3) { this.platformCrackLevels.set(p, c); this.platformCrackTimes.set(p, now); }
                }
            }
        }

        ctx.save(); ctx.translate(6, 10); ctx.fillStyle = this.shadowColor; p.draw(ctx); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#90A4AE"; p.draw(ctx); ctx.fill();
        ctx.save(); p.draw(ctx); ctx.clip();
        ctx.fillStyle = "#CFD8DC"; ctx.fillRect(p.x, p.y, p.width, p.height * 0.3);
        ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1;
        for(let i=0; i<p.width/20; i++) { ctx.beginPath(); ctx.moveTo(p.x+i*20, p.y); ctx.lineTo(p.x+i*20, p.y+p.height*0.3); ctx.stroke(); }
        ctx.restore();

        const hitT = this.platformCrackTimes.get(p) || 0, elapsed = now - hitT;
        const gA = 0.12 + (elapsed < 800 ? (1 - elapsed / 800) * 0.5 : 0);
        ctx.save(); ctx.translate(p.x + 20, p.y + p.height);
        ctx.fillStyle = `rgba(255, 235, 59, ${gA})`; ctx.beginPath(); ctx.arc(0, 45, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#111111"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 35); ctx.stroke();
        ctx.fillStyle = "#D32F2F"; ctx.beginPath(); ctx.moveTo(-9, 35); ctx.lineTo(9, 35); ctx.lineTo(14, 44); ctx.lineTo(9, 53); ctx.lineTo(-9, 53); ctx.lineTo(-14, 44); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    drawVillageBuilding(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
        this.drawDetailedPagoda(ctx, cx, cy, size / 60, 0);
    }
}