// 1. Define the type as a string union (This is "erasable")
export type ParticleType = 'PAPER' | 'WATER' | 'SAKURA' | 'SAND';

// 2. Define a constant object for easy access (Standard JS object)
export const ParticleTypes = {
    PAPER: 'PAPER' as ParticleType,
    WATER: 'WATER' as ParticleType,
    SAKURA: 'SAKURA' as ParticleType,
    SAND: 'SAND' as ParticleType
};

export class Particle {
    public x: number = 0;
    public y: number = 0;
    public color: string = "#FFFFFF";
    public size: number = 0;
    public life: number = 0;
    public velocityX: number = 0;
    public velocityY: number = 0;
    public rotation: number = 0;
    public rotationSpeed: number = 0;
    public type: ParticleType = ParticleTypes.PAPER;

    public sineOffset: number = 0;
    public sineSpeed: number = 0;

    public spawn(startX: number, startY: number, pColor: string, pType: ParticleType) {
        this.x = startX;
        this.y = startY;
        this.color = pColor;
        this.type = pType;

        this.life = 255;
        this.rotation = Math.random() * 360;
        this.sineOffset = Math.random() * 10;

        switch (this.type) {
            case ParticleTypes.SAKURA:
                this.size = Math.random() * 8 + 10;
                this.velocityX = Math.random() * 4 - 2;
                this.velocityY = Math.random() * 2 + 1;
                this.rotationSpeed = Math.random() * 4 - 2;
                this.sineSpeed = Math.random() * 0.05 + 0.02;
                break;
            case ParticleTypes.WATER:
                this.size = Math.random() * 6 + 4;
                this.velocityX = Math.random() * 20 - 10;
                this.velocityY = Math.random() * -15 - 10;
                this.rotationSpeed = 0;
                break;
            case ParticleTypes.PAPER:
                this.size = Math.random() * 12 + 6;
                this.velocityX = Math.random() * 16 - 8;
                this.velocityY = Math.random() * -12 - 4;
                this.rotationSpeed = Math.random() * 30 - 15;
                break;
            case ParticleTypes.SAND:
                this.velocityX = (Math.random() - 0.5) * 18;
                this.velocityY = -(Math.random() * 8) - 2;
                this.rotation = Math.random() * 360;
                this.size = Math.random() * 5 + 5;
                this.rotationSpeed = this.velocityX;
                break;
        }
    }

    public update() {
        if (this.life <= 0) return;

        switch (this.type) {
            case ParticleTypes.SAKURA:
                this.sineOffset += this.sineSpeed;
                this.x += this.velocityX + (Math.sin(this.sineOffset) * 2);
                this.y += this.velocityY;
                this.life -= 3;
                break;
            case ParticleTypes.WATER:
                this.x += this.velocityX;
                this.y += this.velocityY;
                this.velocityY += 1.2;
                this.velocityX *= 0.98;
                this.life -= 15;
                break;
            case ParticleTypes.PAPER:
                this.x += this.velocityX;
                this.y += this.velocityY;
                this.velocityY += 0.7;
                this.velocityX *= 0.92;
                this.life -= 10;
                break;
            case ParticleTypes.SAND:
                this.velocityX *= 0.85;
                this.velocityY += 0.4;
                this.x += this.velocityX;
                this.y += this.velocityY;
                this.rotation += this.velocityX * 2;
                this.size += 0.2;
                this.life -= 12;
                break;
        }

        this.rotation += this.rotationSpeed;
        this.size *= 0.97;
    }

    public draw(ctx: CanvasRenderingContext2D) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / 255);
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * (Math.PI / 180));
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}