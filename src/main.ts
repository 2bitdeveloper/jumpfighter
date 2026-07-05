import { GameView } from './GameView';

window.addEventListener('DOMContentLoaded', () => {
    // Boot the engine immediately on load
    const game = new GameView('gameCanvas');
    (window as any).jumpFighter = game;
    console.log("JumpFighter Engine Initialized!");
});