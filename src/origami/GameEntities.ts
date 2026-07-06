/**
 * Replaces: data class Coin(var x: Float, var y: Float, val size: Float = 15f, var isCollected: Boolean = false)
 */
export class Coin {
    public x: number;
    public y: number;
    public size: number;
    public isCollected: boolean;

    constructor(x: number, y: number, size: number = 15, isCollected: boolean = false) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.isCollected = isCollected;
    }
}

/**
 * Replaces: data class Enemy(var x: Float, var y: Float, val size: Float = 45f)
 */
export class Enemy {
    public x: number;
    public y: number;
    public size: number;

    constructor(x: number, y: number, size: number = 45) {
        this.x = x;
        this.y = y;
        this.size = size;
    }
}

/**
 * Replaces: data class BgTree(var x: Float, var y: Float, val size: Float)
 */
export class BgTree {
    public x: number;
    public y: number;
    public size: number;

    constructor(x: number, y: number, size: number) {
        this.x = x;
        this.y = y;
        this.size = size;
    }
}

/**
 * Interfaces are always "erasable," so this stays the same.
 */
export interface TutorialLine {
    text: string;
    words: string[];
    hasDigit: boolean;
}