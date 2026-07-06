// JUMP FIGHTER entry (2bitArcade edition).
// The intro video now plays on the arcade landing page, not here.
import { GameView } from './GameView';

window.addEventListener('DOMContentLoaded', () => {
    const game = new GameView('gameCanvas');
    (window as any).jumpFighter = game;
    console.log("JumpFighter Engine Initialized!");
});