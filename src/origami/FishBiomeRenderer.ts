import type { BiomeRenderer } from './BiomeRenderer';
import type { JumperGame, BgTree } from './JumperGame'; // Removed Platform from here
import { Platform } from './Platform'; // Import the REAL Platform class here

export class FishBiomeRenderer implements BiomeRenderer {
    // Deep Ocean Teal Gradient
    readonly skyColors = ["#00362D", "#00695C", "#26A69A"];

    private readonly shadowColor = "rgba(0, 0, 0, 0.3)";
    private readonly rayColor = "rgba(255, 255, 255, 0.1)"; // 0x1AFFFFFF
    private readonly platformBaseColor = "#880E4F";
    private readonly platformLiquidColor = "#C2185B";
    private readonly platformHighlightColor = "#E91E63";
    private readonly platformEdgeColor = "#FF4081";

    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void {
        const w = game.width;
        const h = game.height;

        // 1. SWEEPING GOD RAYS
        ctx.fillStyle = this.rayColor;
        for (let i = 0; i < 5; i++) {
            const offset = i * 1500;
            const swing = Math.sin((time + offset) / 2500.0) * w * 0.4;
            const startX = (w * 0.2 * i);

            ctx.beginPath();
            ctx.moveTo(startX - 60, 0);
            ctx.lineTo(startX + 60, 0);
            ctx.lineTo(startX + swing + 200, h);
            ctx.lineTo(startX + swing - 200, h);
            ctx.closePath();
            ctx.fill();
        }

        const isFishCycle = Math.floor(time / 15000) % 2 === 0;
        const safeTime = time % 100000;

        if (isFishCycle) {
            ctx.fillStyle = "rgba(0, 229, 255, 0.53)"; // 0x8800E5FF
            for (let i = 0; i < 10; i++) {
                const speed = 25 + (i % 3) * 10;
                const x = ((safeTime / speed) + (i * 150)) % (w + 200) - 100;
                const y = (h * 0.15) + (i * (h * 0.08)) + Math.sin((time + i * 1000) / 500.0) * 20;
                const size = 15 + (i % 3) * 5;

                ctx.save();
                ctx.translate(x, y);
                const fishPath = () => {
                    ctx.beginPath();
                    ctx.moveTo(size, 0);
                    ctx.lineTo(0, size * 0.5);
                    ctx.lineTo(-size, 0);
                    ctx.lineTo(-size * 1.5, -size * 0.6);
                    ctx.lineTo(-size * 1.2, 0);
                    ctx.lineTo(-size * 1.5, size * 0.6);
                    ctx.lineTo(-size, 0);
                    ctx.lineTo(0, -size * 0.5);
                    ctx.closePath();
                };

                // Fish Shadow
                ctx.save(); ctx.translate(4, 6); ctx.fillStyle = this.shadowColor; fishPath(); ctx.fill(); ctx.restore();
                fishPath(); ctx.fill();
                ctx.restore();
            }
        } else {
            ctx.fillStyle = "rgba(24, 255, 255, 0.26)"; // 0x4418FFFF
            for (let i = 0; i < 4; i++) {
                const speed = 35 + (i * 15);
                const x = w * 0.1 + (i * w * 0.25) + Math.sin((time + i * 2000) / 1000.0) * 60;
                const y = h + 100 - (((safeTime / speed) + (i * 400)) % (h + 300));
                const pulse = 1 + Math.sin((time + i * 500) / 400.0) * 0.15;
                const size = 35;

                ctx.save();
                ctx.translate(x, y);
                ctx.scale(pulse, 1 + (1 - pulse));

                // Jellyfish Head Shadow
                ctx.save();
                ctx.translate(4, 6);
                ctx.fillStyle = this.shadowColor;
                ctx.beginPath(); ctx.arc(0, 0, size, Math.PI, 0); ctx.fill();
                ctx.restore();

                ctx.beginPath(); ctx.arc(0, 0, size, Math.PI, 0); ctx.fill();

                // Tentacles
                ctx.strokeStyle = "rgba(24, 255, 255, 0.26)";
                ctx.lineWidth = 2.5;
                for (let t = -2; t <= 2; t++) {
                    const tX = t * (size * 0.3);
                    const wave = Math.sin((time + t * 200) / 250.0) * 12;
                    ctx.beginPath();
                    ctx.moveTo(tX, 0);
                    ctx.quadraticCurveTo(tX - wave, size, tX + wave, size * 2);
                    ctx.quadraticCurveTo(tX - wave, size * 3, tX, size * 4.5);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // 3. ORGANIC SWAYING KELP FOREST
        const kelpBaseY = Math.min(h * 0.7 + game.frontMountainY, h * 0.85);
        const kelpColors = ["#00251A", "#004D40", "#00695C"];

        for (let layer = 0; layer <= 2; layer++) {
            ctx.fillStyle = kelpColors[layer];
            const count = 10 - layer * 2;
            const spacing = w / count;

            for (let i = 0; i <= count; i++) {
                const startX = i * spacing + (layer * 25);
                const kelpHeight = h - kelpBaseY + (layer * 60);

                ctx.save();
                ctx.translate(startX, h);

                const kelpPath = () => {
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    const segments = 6;
                    const segH = kelpHeight / segments;

                    for (let j = 1; j <= segments; j++) {
                        const yVal = -j * segH;
                        const phase = (time / 1000.0) + (startX / 200.0) - (j * 0.5);
                        const swayX = Math.sin(phase) * (15 + layer * 10);
                        ctx.lineTo(-12 + swayX, yVal);
                    }
                    for (let j = segments; j >= 0; j--) {
                        const yVal = -j * segH;
                        const phase = (time / 1000.0) + (startX / 200.0) - (j * 0.5);
                        const swayX = Math.sin(phase) * (15 + layer * 10);
                        if (j === segments) ctx.lineTo(swayX, yVal - 15);
                        else ctx.lineTo(12 + swayX, yVal);
                    }
                    ctx.closePath();
                };

                ctx.save(); ctx.translate(4, 6); ctx.fillStyle = this.shadowColor; kelpPath(); ctx.fill(); ctx.restore();
                kelpPath(); ctx.fill();
                ctx.restore();
            }
        }

        // Sea Floor
        ctx.fillStyle = "#001A12";
        const floorPath = () => {
            ctx.beginPath();
            ctx.moveTo(0, kelpBaseY + 60);
            ctx.lineTo(w, kelpBaseY + 40);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
        };
        ctx.save(); ctx.translate(0, 8); ctx.fillStyle = this.shadowColor; floorPath(); ctx.fill(); ctx.restore();
        floorPath(); ctx.fill();
    }

    drawForeground(): void {}

    drawPlatform(ctx: CanvasRenderingContext2D, _game: JumperGame, platform: Platform): void {
        const pX = platform.x;
        const pY = platform.y;
        const width = platform.width;
        const height = platform.height;

        // PLATFORM SHADOW: Drawn before composite operation
        ctx.save();
        ctx.translate(4, 8);
        ctx.fillStyle = this.shadowColor;
        platform.draw(ctx);
        ctx.fill();
        ctx.restore();

        // 1. Draw Base Dark Coral (The Mask)
        ctx.fillStyle = this.platformBaseColor;
        platform.draw(ctx);
        ctx.fill();

        // 2. Setup Composite for "Liquid" effect
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        const waveOffset = Date.now() / 6;
        const segments = 15;
        const step = width / segments;

        // magenta liquid wave
        ctx.fillStyle = this.platformLiquidColor;
        ctx.beginPath();
        ctx.moveTo(pX, pY + height);
        ctx.lineTo(pX, pY + height * 0.35);
        for (let i = 0; i <= segments; i++) {
            const x = pX + i * step;
            const y = pY + height * 0.35 + Math.sin((x + waveOffset) / 20.0) * 8;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(pX + width, pY + height);
        ctx.closePath();
        ctx.fill();

        // top neon highlight wave
        ctx.fillStyle = this.platformHighlightColor;
        ctx.beginPath();
        ctx.moveTo(pX, pY + height);
        ctx.lineTo(pX, pY + height * 0.65);
        for (let i = 0; i <= segments; i++) {
            const x = pX + i * step;
            const y = pY + height * 0.65 + Math.cos((x + waveOffset * 1.5) / 15.0) * 6;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(pX + width, pY + height);
        ctx.closePath();
        ctx.fill();

        ctx.restore(); // Resets globalCompositeOperation to 'source-over'

        // 3. Breathing Outer Stroke
        ctx.strokeStyle = this.platformEdgeColor;
        ctx.lineWidth = 3 + Math.sin(Date.now() / 250.0) * 1.5;
        platform.draw(ctx);
        ctx.stroke();
    }

    drawParallaxObject(ctx: CanvasRenderingContext2D, _game: JumperGame, tree: BgTree): void {
        const layer1 = () => {
            ctx.beginPath();
            ctx.moveTo(tree.x - tree.size, tree.y);
            ctx.lineTo(tree.x - tree.size * 0.3, tree.y - tree.size * 0.4);
            ctx.lineTo(tree.x + tree.size * 0.9, tree.y - tree.size * 0.2);
            ctx.lineTo(tree.x + tree.size, tree.y + tree.size * 0.3);
            ctx.lineTo(tree.x - tree.size * 0.1, tree.y + tree.size * 0.4);
            ctx.closePath();
        };
        ctx.save(); ctx.translate(4, 6); ctx.fillStyle = this.shadowColor; layer1(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#004D40"; layer1(); ctx.fill();

        const layer2 = () => {
            ctx.beginPath();
            ctx.moveTo(tree.x, tree.y);
            ctx.lineTo(tree.x - tree.size * 0.6, tree.y + tree.size * 0.5);
            ctx.lineTo(tree.x - tree.size * 0.1, tree.y + tree.size * 0.6);
            ctx.closePath();
        };
        ctx.save(); ctx.translate(2, 4); ctx.fillStyle = this.shadowColor; layer2(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#00695C"; layer2(); ctx.fill();
    }

    drawVillageBuilding(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "#00ACC1";

        const pillar = (x: number) => {
            ctx.beginPath();
            ctx.rect(x, -size * 0.3, size * 0.2, size * 0.8);
            ctx.closePath();
        };

        // Left & Right Pillars
        [-0.4 * size, 0.2 * size].forEach(x => {
            ctx.save(); ctx.translate(4, 6); ctx.fillStyle = this.shadowColor; pillar(x); ctx.fill(); ctx.restore();
            ctx.fillStyle = "#00ACC1"; pillar(x); ctx.fill();
        });

        // Roof
        const roof = () => {
            ctx.beginPath();
            ctx.moveTo(-size * 0.5, -size * 0.3);
            ctx.lineTo(0, -size * 0.6);
            ctx.lineTo(size * 0.5, -size * 0.3);
            ctx.closePath();
        };
        ctx.save(); ctx.translate(4, 6); ctx.fillStyle = this.shadowColor; roof(); ctx.fill(); ctx.restore();
        ctx.fillStyle = "#00ACC1"; roof(); ctx.fill();

        ctx.restore();
    }
}