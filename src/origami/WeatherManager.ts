export class WeatherManager {
    private static screenW: number = 0;
    private static screenH: number = 0;

    // Timer & Transparency Data
    private static globalStartTime: number = 0;
    public static alphaMult: number = 0;
    private static wasClear: boolean = true;

    // Particle Data (Using Float32Arrays for high-performance numeric storage)
    private static readonly MAX_PARTICLES = 250;
    private static readonly STANDARD_PARTICLES = 100;

    private static particleX = new Float32Array(WeatherManager.MAX_PARTICLES);
    private static particleY = new Float32Array(WeatherManager.MAX_PARTICLES);
    private static particleSpeed = new Float32Array(WeatherManager.MAX_PARTICLES);
    private static particleSize = new Float32Array(WeatherManager.MAX_PARTICLES);

    // Color Constants
    private static readonly craneLeafColors = ["#8D4343", "#D4A352", "#B86630"];
    private static readonly fireflyGlow = "#39FF14";
    private static readonly snowGlow = "#00E5FF";

    public static init(width: number, height: number) {
        this.screenW = width;
        this.screenH = height;
        this.globalStartTime = Date.now();

        // Populate entire array to prevent empty elements
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            this.resetParticle(i, true, "crane");
        }
    }

    private static resetParticle(i: number, randomY: boolean, character: string) {
        this.particleX[i] = Math.random() * this.screenW;

        if (character === "fish" || character === "cat" || character === "frog") {
            this.particleY[i] = randomY ? Math.random() * this.screenH : this.screenH + 50;
        } else if (character === "kangaroo") {
            this.particleY[i] = Math.random() * this.screenH;
            this.particleX[i] = randomY ? Math.random() * this.screenW : this.screenW + 50;
        } else {
            this.particleY[i] = randomY ? Math.random() * this.screenH : -50;
        }

        this.particleSpeed[i] = 10 + Math.random() * 15;
        this.particleSize[i] = 5 + Math.random() * 15;
    }

    public static update(character: string) {
        const isFox = character === "fox";
        const cycleDuration = isFox ? 94000 : 60000;
        const cycleTime = (Date.now() - this.globalStartTime) % cycleDuration;

        if (isFox) {
            if (cycleTime < 30000) this.alphaMult = 0;
            else if (cycleTime < 32000) this.alphaMult = (cycleTime - 30000) / 2000;
            else if (cycleTime < 92000) this.alphaMult = 1;
            else this.alphaMult = 1 - ((cycleTime - 92000) / 2000);
        } else {
            if (cycleTime < 30000) this.alphaMult = 0;
            else if (cycleTime < 32000) this.alphaMult = (cycleTime - 30000) / 2000;
            else if (cycleTime < 58000) this.alphaMult = 1;
            else this.alphaMult = 1 - ((cycleTime - 58000) / 2000);
        }

        if (this.alphaMult <= 0) {
            this.wasClear = true;
            return;
        }

        if (this.wasClear) {
            for (let i = 0; i < this.MAX_PARTICLES; i++) this.resetParticle(i, true, character);
            this.wasClear = false;
        }

        const activeParticleCount = character === "kangaroo" ? this.MAX_PARTICLES : this.STANDARD_PARTICLES;

        for (let i = 0; i < activeParticleCount; i++) {
            switch (character) {
                case "crane":
                    this.particleY[i] += this.particleSpeed[i] * 0.25;
                    this.particleX[i] -= 1 + Math.sin(this.particleY[i] * 0.02) * 2;
                    if (this.particleY[i] > this.screenH) this.resetParticle(i, false, character);
                    break;
                case "fish":
                    this.particleY[i] -= this.particleSpeed[i] * 0.4;
                    this.particleX[i] += Math.sin(this.particleY[i] * 0.05) * 2;
                    if (this.particleY[i] < -50) this.resetParticle(i, false, character);
                    break;
                case "kangaroo":
                    this.particleY[i] += this.particleSpeed[i] * 0.2;
                    this.particleX[i] -= this.particleSpeed[i] * 0.8;
                    if (this.particleX[i] < -50 || this.particleY[i] > this.screenH) this.resetParticle(i, false, character);
                    break;
                case "bunny":
                case "panda":
                    this.particleY[i] += this.particleSpeed[i] * 0.3;
                    this.particleX[i] -= 2 + Math.sin(this.particleY[i] * 0.02) * 3;
                    if (this.particleY[i] > this.screenH) this.resetParticle(i, false, character);
                    break;
                case "fox":
                    this.particleY[i] += this.particleSpeed[i] * 0.15;
                    this.particleX[i] += Math.sin(this.particleY[i] * 0.02 + this.particleSpeed[i]) * 1.5;
                    if (this.particleY[i] > this.screenH) this.resetParticle(i, false, character);
                    break;
                case "frog":
                    this.particleY[i] -= this.particleSpeed[i] * 0.15;
                    this.particleX[i] += Math.sin(this.particleY[i] * 0.03 + i) * 1.5;
                    if (this.particleY[i] < -50) this.resetParticle(i, false, character);
                    break;
                case "cat":
                    this.particleY[i] -= this.particleSpeed[i] * 0.2;
                    this.particleX[i] += Math.sin(this.particleY[i] * 0.03) * 1.5;
                    if (this.particleY[i] < -50) this.resetParticle(i, false, character);
                    break;
                default:
                    this.particleY[i] += this.particleSpeed[i] * 0.1;
                    this.particleX[i] -= 1;
                    if (this.particleY[i] > this.screenH) this.resetParticle(i, false, character);
            }

            if (character !== "kangaroo") {
                if (this.particleX[i] < -50) this.particleX[i] = this.screenW + 50;
                else if (this.particleX[i] > this.screenW + 50) this.particleX[i] = -50;
            }
        }
    }

    public static draw(ctx: CanvasRenderingContext2D, character: string) {
        if (this.alphaMult <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alphaMult;

        switch (character) {
            case "crane": this.drawRusticLeaves(ctx); break;
            case "frog": this.drawNeonFireflies(ctx); break;
            case "bunny": this.drawFallingLeaves(ctx, "rgba(255, 183, 197, 1)", 0.5); break;
            case "fox": this.drawNeonSnow(ctx); break;
            case "panda": this.drawFallingLeaves(ctx, "rgba(205, 220, 57, 1)", 1.0); break;
            case "fish": this.drawBubbles(ctx); break;
            case "kangaroo": this.drawSandstorm(ctx); break;
            case "cat": this.drawEmbers(ctx); break;
            default: this.drawPollen(ctx); break;
        }

        ctx.restore();
    }

    private static drawNeonFireflies(ctx: CanvasRenderingContext2D) {
        // Deep swamp mist gradient
        const gradient = ctx.createLinearGradient(0, this.screenH * 0.6, 0, this.screenH);
        gradient.addColorStop(0, "rgba(0, 40, 20, 0)");
        gradient.addColorStop(1, "rgba(0, 40, 20, 0.7)");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, this.screenH * 0.6, this.screenW, this.screenH * 0.4);

        // Pulsing fireflies
        const time = Date.now();
        for (let i = 0; i < this.STANDARD_PARTICLES; i++) {
            const pulse = (Math.sin((time + i * 200) / 400.0) + 1) / 2;
            
            ctx.save();
            ctx.globalAlpha = (0.2 + 0.8 * pulse) * this.alphaMult;
            ctx.shadowBlur = 12;
            ctx.shadowColor = this.fireflyGlow;
            ctx.fillStyle = "white";
            
            ctx.beginPath();
            ctx.arc(this.particleX[i], this.particleY[i], this.particleSize[i] * 0.25, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    private static drawNeonSnow(ctx: CanvasRenderingContext2D) {
        for (let i = 0; i < this.STANDARD_PARTICLES; i++) {
            ctx.save();
            ctx.shadowBlur = 12;
            ctx.shadowColor = this.snowGlow;
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(this.particleX[i], this.particleY[i], this.particleSize[i] * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    private static drawRusticLeaves(ctx: CanvasRenderingContext2D) {
        for (let i = 0; i < this.STANDARD_PARTICLES; i++) {
            const color = this.craneLeafColors[i % this.craneLeafColors.length];
            const size = this.particleSize[i] * 0.5;
            
            ctx.save();
            ctx.translate(this.particleX[i], this.particleY[i]);
            ctx.rotate((this.particleY[i] * 2 * Math.PI) / 180);
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.6, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size * 0.6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    private static drawFallingLeaves(ctx: CanvasRenderingContext2D, color: string, sizeMult: number) {
        ctx.fillStyle = color;
        for (let i = 0; i < this.STANDARD_PARTICLES; i++) {
            const size = this.particleSize[i] * 0.6 * sizeMult;
            ctx.save();
            ctx.translate(this.particleX[i], this.particleY[i]);
            ctx.rotate((this.particleY[i] * Math.PI) / 180);
            ctx.fillRect(-size, -size * 0.5, size * 2, size);
            ctx.restore();
        }
    }

    private static drawBubbles(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        for (let i = 0; i < this.STANDARD_PARTICLES; i++) {
            ctx.beginPath();
            ctx.arc(this.particleX[i], this.particleY[i], this.particleSize[i] * 0.4, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    private static drawSandstorm(ctx: CanvasRenderingContext2D) {
        ctx.strokeStyle = "rgba(255, 202, 40, 0.6)";
        ctx.lineWidth = 2;
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            ctx.beginPath();
            ctx.moveTo(this.particleX[i], this.particleY[i]);
            ctx.lineTo(this.particleX[i] + this.particleSize[i], this.particleY[i]);
            ctx.stroke();
        }
    }

    private static drawEmbers(ctx: CanvasRenderingContext2D) {
        for (let i = 0; i < this.STANDARD_PARTICLES; i++) {
            ctx.save();
            ctx.shadowBlur = 6;
            ctx.shadowColor = "magenta";
            ctx.fillStyle = "rgba(255, 64, 129, 1)";
            ctx.beginPath();
            ctx.arc(this.particleX[i], this.particleY[i], this.particleSize[i] * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    private static drawPollen(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        for (let i = 0; i < this.STANDARD_PARTICLES; i++) {
            ctx.beginPath();
            ctx.arc(this.particleX[i], this.particleY[i], this.particleSize[i] * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}