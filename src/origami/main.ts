// ============================================================
// ORIGAMI ASCENT - ENTRY (2bitArcade edition)
// Sitelock and CrazyGames SDK removed: this build is hosted at
// 2bitdeveloper.github.io/2bitArcade. Web3Service silently restores
// the wallet connected on the Arcade home page.
// ============================================================
import { JumperGame } from './JumperGame';
import { GameLoop } from './GameLoop';
import { SettingsDialog } from './SettingsDialog';

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    canvas.style.touchAction = 'none';

    try {
        // Relative path: resolves under the /2bitArcade/ base on GitHub Pages
        const origraphFont = new FontFace('origraph', 'url(./origami/origraph.otf)', {
            unicodeRange: 'U+0000-002F, U+003A-10FFFF'
        });
        try {
            await origraphFont.load();
            document.fonts.add(origraphFont);
        } catch (fontError) {
            console.warn("origraph font missing - falling back to default font.", fontError);
        }

        // --- START GAME ---
        const game = new JumperGame(canvas);
        game.surfaceCreated();

        const loop = new GameLoop(game);
        loop.setTargetFPS(60);

        const settings = new SettingsDialog(game.audio, loop);

        game.onOpenSettings = () => {
            settings.show();
        };

        loop.start();

    } catch (error) {
        console.error("CRASH DURING INITIALIZATION:", error);
    }
});
