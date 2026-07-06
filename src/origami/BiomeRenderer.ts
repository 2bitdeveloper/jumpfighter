import { JumperGame, Platform, BgTree } from './JumperGame';

export interface BiomeRenderer {
    /**
     * Replaces BiomeManager.getSkyColors()
     * In Web, these are typically hex strings (e.g., ["#87CEEB", "#E0F7FA"])
     */
    readonly skyColors: string[];

    /**
     * Draws the background elements (mountains, distant objects)
     */
    drawBackground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void;

    /**
     * Draws foreground elements (particles, weather effects overlay)
     */
    drawForeground(ctx: CanvasRenderingContext2D, game: JumperGame, time: number): void;

    /**
     * Handles the specific drawing logic for a platform based on biome
     */
    drawPlatform(ctx: CanvasRenderingContext2D, game: JumperGame, platform: Platform): void;

    /**
     * Replacements for BiomeManager parallax logic
     */
    drawParallaxObject(ctx: CanvasRenderingContext2D, game: JumperGame, tree: BgTree): void;

    /**
     * Draws biome-specific buildings in the Village menu
     */
    drawVillageBuilding(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void;
}