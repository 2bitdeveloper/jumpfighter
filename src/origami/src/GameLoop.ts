import { JumperGame } from './JumperGame';

export class GameLoop {
    private game: JumperGame;
    private isRunning: boolean = false;
    private lastTime: number = 0;
    private accumulator: number = 0;
    private readonly timeStep: number = 1000 / 60; 

    constructor(game: JumperGame) {
        this.game = game;
    }

    public setTargetFPS(fps: number) {
        // We use requestAnimationFrame which syncs to the monitor,
        // but we can adjust the internal physics timestep here if needed.
        (this as any)._internalStep = 1000 / fps;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    public stop() {
        this.isRunning = false;
    }

    private loop(currentTime: number) {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Prevent "Spiral of Death" on slow tabs
        this.accumulator += Math.min(deltaTime, 250);

        while (this.accumulator >= this.timeStep) {
            this.game.update(1.0); 
            this.accumulator -= this.timeStep;
        }

        this.game.draw();
        requestAnimationFrame((t) => this.loop(t));
    }
}