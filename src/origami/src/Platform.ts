export class Platform {
    private static idCounter = 0;
    public id: number;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    public type: number;
    public moveDir: number;
    public scale: number = 0.0;
    public isAnimating: boolean = false;
    public hasBloomed: boolean = false;
    public hazard: any = null;
    private topEdgeOffsets: number[] = [];

    constructor(x: number, y: number, width: number = 150, height: number = 30, type: number = 0, moveDir: number = 1) {
        this.id = ++Platform.idCounter; // Unique ID for brokenPlatforms tracking
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.moveDir = moveDir;
        this.generatePapercraftPath();
    }

    public generatePapercraftPath() {
        this.topEdgeOffsets = [];
        const segments = 6;
        for (let i = 0; i <= segments; i++) {
            this.topEdgeOffsets.push((i === 0 || i === segments) ? 0 : Math.floor(Math.random() * 13) - 6);
        }
    }

    public moveDown(offset: number) {
        this.y += offset;
        if (this.hazard) this.hazard.y = this.y;
    }

    public moveSide(offset: number) {
        this.x += offset;
        if (this.hazard) this.hazard.x = this.x + (this.width / 2);
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const segments = 6;
        const sw = this.width / segments;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.topEdgeOffsets[0]);
        for (let i = 1; i <= segments; i++) {
            ctx.lineTo(this.x + (i * sw), this.y + this.topEdgeOffsets[i]);
        }
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
    }
}