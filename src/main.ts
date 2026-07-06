import { GameView } from './GameView';
import { playIntroVideo } from './IntroVideo';

window.addEventListener('DOMContentLoaded', () => {
    // Boot the engine immediately - it loads assets BEHIND the intro video,
    // so the video doubles as a loading screen.
    const game = new GameView('gameCanvas');
    (window as any).jumpFighter = game;
    console.log("JumpFighter Engine Initialized!");

    // Fullscreen intro overlay. Resolves on video end, skip, or any failure.
    // Set showOncePerPlayer: true to only play it on a player's first visit.
    playIntroVideo({ src: './intro.mp4', showOncePerPlayer: false }).then(() => {
        console.log("Intro finished - game visible.");
    });
});