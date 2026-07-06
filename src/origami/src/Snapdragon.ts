export class Snapdragon {
    public x: number;
    public y: number;
    public size: number = 80;

    // 0 = Closed, 1 = Open & Pulsing, 2 = Snapped Shut
    public state: number = 0;

    private readonly shadowColor = "rgba(0, 0, 0, 0.3)"; // 0x4D000000

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public update() {
        // Reserved for future logic
    }

    /**
     * Helper to rotate around a specific pivot point in HTML5 Canvas
     */
    private rotateAround(ctx: CanvasRenderingContext2D, angleDegrees: number, px: number, py: number) {
        const radians = angleDegrees * (Math.PI / 180);
        ctx.translate(px, py);
        ctx.rotate(radians);
        ctx.translate(-px, -py);
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const time = Date.now() + (this.x * 10);

        let jawAngle = 0;
        if (this.state === 1) {
            jawAngle = 35 + (Math.sin(time / 80.0) * 6);
        }

        const bobSpeed = this.state === 1 ? 150.0 : 250.0;
        const bobY = Math.sin(time / bobSpeed) * (this.size * 0.15);

        // ---------------------------------------------------------
        // 1. DRAW THE DROP SHADOW FIRST
        // ---------------------------------------------------------
        ctx.save();
        // Offset the shadow by 4px right and 8px down
        ctx.translate(this.x + 4, (this.y - this.size * 0.4) + bobY + 8);
        ctx.rotate(-90 * (Math.PI / 180));
        ctx.fillStyle = this.shadowColor;

        // Shadow: Right Jaw
        ctx.save();
        this.rotateAround(ctx, jawAngle, -this.size * 0.3, 0);
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.4, 0);
        ctx.lineTo(this.size * 0.5, this.size * 0.1);
        ctx.lineTo(0, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Shadow: Left Jaw
        ctx.save();
        this.rotateAround(ctx, -jawAngle, -this.size * 0.3, 0);
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.4, 0);
        ctx.lineTo(this.size * 0.5, -this.size * 0.1);
        ctx.lineTo(0, -this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore(); // End Shadow block

        // ---------------------------------------------------------
        // 2. DRAW THE ACTUAL SNAPDRAGON
        // ---------------------------------------------------------
        ctx.save();
        ctx.translate(this.x, this.y - this.size * 0.4);
        ctx.translate(0, bobY);
        ctx.rotate(-90 * (Math.PI / 180));

        let exteriorColor = "#2E7D32"; // Safe Forest Green
        if (this.state === 1) exteriorColor = "#880E4F"; // Danger Crimson
        else if (this.state === 2) exteriorColor = "#B71C1C"; // Dead Dark Red

        const interiorColor = "#FF1744";
        let eyeColor = "#81C784";
        if (this.state === 1) eyeColor = "#FFEA00";
        else if (this.state === 2) eyeColor = "#FF5252";

        // --- RIGHT JAW ---
        ctx.save();
        this.rotateAround(ctx, jawAngle, -this.size * 0.3, 0);

        if (jawAngle > 5) {
            ctx.fillStyle = interiorColor;
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.2, 0);
            ctx.lineTo(this.size * 0.5, 0);
            ctx.lineTo(this.size * 0.3, this.size * 0.25);
            ctx.lineTo(this.size * 0.1, 0);
            ctx.lineTo(-this.size * 0.05, this.size * 0.2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = exteriorColor;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.4, 0);
        ctx.lineTo(this.size * 0.5, this.size * 0.1);
        ctx.lineTo(0, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // --- LEFT JAW & EYE ---
        ctx.save();
        this.rotateAround(ctx, -jawAngle, -this.size * 0.3, 0);

        if (jawAngle > 5) {
            ctx.fillStyle = interiorColor;
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.2, 0);
            ctx.lineTo(this.size * 0.5, 0);
            ctx.lineTo(this.size * 0.4, -this.size * 0.25);
            ctx.lineTo(this.size * 0.2, 0);
            ctx.lineTo(0.0, -this.size * 0.2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = exteriorColor;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.4, 0);
        ctx.lineTo(this.size * 0.5, -this.size * 0.1);
        ctx.lineTo(0, -this.size * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.15);
        ctx.lineTo(this.size * 0.12, -this.size * 0.22);
        ctx.lineTo(0, -this.size * 0.3);
        ctx.lineTo(-this.size * 0.1, -this.size * 0.22);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }
}