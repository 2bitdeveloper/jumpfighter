export class Player {
    public x: number;
    public y: number;
    public size: number;
    public velocityX: number;
    public velocityY: number;
    public facingRight: boolean;

    constructor(
        x: number = 0, 
        y: number = 0, 
        size: number = 60, 
        velocityX: number = 0, 
        velocityY: number = 0
    ) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.facingRight = true;
    }

    /**
     * Replaces fun updateFacing()
     * Determines which direction the sprite should flip based on movement.
     */
    public updateFacing() {
        if (this.velocityX > 0) {
            this.facingRight = true;
        } else if (this.velocityX < 0) {
            this.facingRight = false;
        }
    }
}