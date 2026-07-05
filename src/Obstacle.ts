import { RectF } from './SceneRenderer';

export class Obstacle {
    public static readonly TYPE_LASER = 0;
    public static readonly TYPE_BLADE = 1;
    public static readonly TYPE_MISSILE = 2;

    private static readonly BLADE_PIVOT_OFFSET_X = 0.0;
    private static readonly BLADE_PIVOT_OFFSET_Y = -3.0;

    public bitmap: HTMLImageElement | null;
    public x: number;
    public y: number;
    private speed: number;
    private type: number;
    public width: number;
    public height: number;
    public scored: boolean = false;
    private screenScale: number;
    private trackingMultiplier: number;
    private rotation: number = 0;

    private wavePhase: number = 0;
    private waveFrequency: number = 0;
    private waveAmplitude: number = 0;

    private currentFrame: number = 0;
    private animationTimer: number = 0;

    private static readonly SPRITE_COLS = 10;
    private static readonly SPRITE_ROWS = 12;
    private static readonly SPRITE_TOTAL_FRAMES = 120;

    private missileRect = new RectF();
    private topPipe = new RectF();
    private bottomPipe = new RectF();

    constructor(
        bitmap: HTMLImageElement | null, 
        x: number, y: number, 
        speed: number, type: number, 
        width: number, height: number, 
        screenScale: number, trackingMultiplier: number
    ) {
        this.bitmap = bitmap;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.type = type;
        this.width = width;
        this.height = height;
        this.screenScale = screenScale;
        this.trackingMultiplier = trackingMultiplier;

        if (type === Obstacle.TYPE_BLADE || type === Obstacle.TYPE_MISSILE) {
            this.currentFrame = Math.floor(Math.random() * Obstacle.SPRITE_TOTAL_FRAMES);
        }

        if (type === Obstacle.TYPE_MISSILE) {
            this.wavePhase = Math.random() * Math.PI * 2;
            this.waveFrequency = 0.015 + Math.random() * 0.02;
            this.waveAmplitude = 3.0 + Math.random() * 4.0;
        }
    }

    public update(playerY: number, dt: number) {
        const efm = 60 * dt;
        this.x -= this.speed * efm;

        if (this.type === Obstacle.TYPE_BLADE || this.type === Obstacle.TYPE_MISSILE) {
            this.animationTimer += dt;
            if (this.animationTimer >= 1.0 / 60.0) {
                this.currentFrame = (this.currentFrame + 1) % Obstacle.SPRITE_TOTAL_FRAMES;
                this.animationTimer -= (1.0 / 60.0);
            }
        }

        if (this.type === Obstacle.TYPE_BLADE) {
            this.rotation -= 17.5 * efm;
        } else if (this.type === Obstacle.TYPE_MISSILE) {
            const targetY = playerY - (this.height / 2.0);
            const yDiff = targetY - this.y;
            const homingVelocity = yDiff * 0.03 * this.trackingMultiplier;
            const wobbleVelocity = Math.sin((this.x * this.waveFrequency) + this.wavePhase) * this.waveAmplitude * this.screenScale;
            const yVelocity = (homingVelocity + wobbleVelocity) * efm;
            this.y += yVelocity;
            this.rotation = Math.atan2(-yVelocity, this.speed * efm) * (180 / Math.PI);
        }
    }

    public draw(ctx: CanvasRenderingContext2D, glowColor: string, screenHeight: number) {
        if (this.type === Obstacle.TYPE_LASER) {
            this.drawLaser(ctx, glowColor, screenHeight);
        } else if (this.type === Obstacle.TYPE_BLADE && this.bitmap && this.bitmap.complete) {
            ctx.save();
            const cx = this.x + (this.width / 2.0) + (Obstacle.BLADE_PIVOT_OFFSET_X * this.screenScale);
            const cy = this.y + (this.height / 2.0) + (Obstacle.BLADE_PIVOT_OFFSET_Y * this.screenScale);
            ctx.translate(cx, cy);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.translate(-cx, -cy);
            const frameW = this.bitmap.width / Obstacle.SPRITE_COLS;
            const frameH = this.bitmap.height / Obstacle.SPRITE_ROWS;
            const col = this.currentFrame % Obstacle.SPRITE_COLS;
            const row = (Obstacle.SPRITE_ROWS - 1) - Math.floor(this.currentFrame / Obstacle.SPRITE_COLS);
            ctx.drawImage(this.bitmap, col * frameW, row * frameH, frameW, frameH, this.x, this.y, this.width, this.height);
            ctx.restore();
        } else if (this.type === Obstacle.TYPE_MISSILE && this.bitmap && this.bitmap.complete) {
            ctx.save();
            const cx = this.x + (this.width / 2.0);
            const cy = this.y + (this.height / 2.0);
            ctx.translate(cx, cy);
            ctx.rotate(this.rotation * Math.PI / 180);
            ctx.translate(-cx, -cy);
            const frameW = this.bitmap.width / Obstacle.SPRITE_COLS;
            const frameH = this.bitmap.height / Obstacle.SPRITE_ROWS;
            const col = this.currentFrame % Obstacle.SPRITE_COLS;
            const row = (Obstacle.SPRITE_ROWS - 1) - Math.floor(this.currentFrame / Obstacle.SPRITE_COLS);
            ctx.drawImage(this.bitmap, col * frameW, row * frameH, frameW, frameH, this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }

    private drawLaser(ctx: CanvasRenderingContext2D, glowColor: string, screenHeight: number) {
        const laserW = 30 * this.screenScale;
        const t = Date.now() / 1000.0;
        
        // FIX: Remove 'this.x' from the pulse math to prevent movement cancellation.
        // This makes the laser pulse globally at a fixed speed.
        const pulse = Math.sin(t * 12.0) * 0.5 + 0.5;

        // 1. DRAW OUTER GLOW (Aura)
        const auraOverflow = 15 * this.screenScale * pulse;
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = (60 * pulse) / 255.0;
        ctx.fillRect(this.x - auraOverflow, 0, laserW + (auraOverflow * 2), this.y);
        ctx.fillRect(this.x - auraOverflow, this.y + this.height, laserW + (auraOverflow * 2), screenHeight - (this.y + this.height));

        // 2. DRAW MAIN BEAM
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = (160 + pulse * 95) / 255.0;
        ctx.fillRect(this.x, 0, laserW, this.y);
        ctx.fillRect(this.x, this.y + this.height, laserW, screenHeight - (this.y + this.height));

        // 3. DRAW INNER CORE (Flickering)
        // FIX: Make strobe time-based so it doesn't slow down if FPS drops.
        const strobe = (Math.sin(t * 45.0) > 0.7); 
        ctx.fillStyle = "white";
        ctx.globalAlpha = strobe ? 0.4 : 1.0;

        const jitter = (Math.sin(t * 30.0) * 2 * this.screenScale);
        const corePadding = (laserW * 0.35) + jitter;
        const coreW = Math.max(2, laserW - (corePadding * 2));

        ctx.fillRect(this.x + corePadding, 0, coreW, this.y);
        ctx.fillRect(this.x + corePadding, this.y + this.height, coreW, screenHeight - (this.y + this.height));

        ctx.globalAlpha = 1.0;
    }

    public checkCollision(playerRect: RectF, screenHeight: number): boolean {
        if (this.type === Obstacle.TYPE_LASER) {
            const laserW = 30 * this.screenScale;
            const forgiveness = 10 * this.screenScale;
            this.topPipe.set(this.x, 0, this.x + laserW, this.y - forgiveness);
            this.bottomPipe.set(this.x, this.y + this.height + forgiveness, this.x + laserW, screenHeight);
            return this.intersects(playerRect, this.topPipe) || this.intersects(playerRect, this.bottomPipe);
        } else if (this.type === Obstacle.TYPE_BLADE) {
            const radius = this.width / 2.0 * 0.8;
            const cx = this.x + this.width / 2.0;
            const cy = this.y + this.height / 2.0;
            const closestX = Math.max(playerRect.left, Math.min(cx, playerRect.right));
            const closestY = Math.max(playerRect.top, Math.min(cy, playerRect.bottom));
            const distanceX = cx - closestX;
            const distanceY = cy - closestY;
            return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
        } else if (this.type === Obstacle.TYPE_MISSILE) {
            this.missileRect.set(
                this.x + (this.width * 0.15),
                this.y + (this.height * 0.35),
                this.x + (this.width * 0.80),
                this.y + (this.height * 0.65)
            );
            return this.intersects(playerRect, this.missileRect);
        }
        return false;
    }

    private intersects(a: RectF, b: RectF): boolean {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    public getType(): number {
        return this.type;
    }
}