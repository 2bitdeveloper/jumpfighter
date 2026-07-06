export class CharacterRenderer {
    private static spriteSheets: Record<string, HTMLImageElement> = {};
    private static spinSpriteSheets: Record<string, HTMLImageElement> = {};

    public static initializeSprites() {
        if (Object.keys(this.spriteSheets).length > 0) return;

        const roster = ["crane", "frog", "bunny", "fish", "fox", "kangaroo", "panda", "cat"];

        // Load all gameplay jump sprites
        roster.forEach(char => {
            const img = new Image();
            img.src = `./origami/${char}_spritesheet.png`;
            img.onload = () => { this.spriteSheets[char] = img; };
        });

        // Load all Village Spin sprites
        roster.forEach(char => {
            const img = new Image();
            img.src = `./origami/${char}_spin.png`;
            img.onload = () => { this.spinSpriteSheets[char] = img; };
        });
    }

    public static drawVillageSpin(
        ctx: CanvasRenderingContext2D,
        character: string,
        cx: number,
        cy: number,
        size: number,
        time: number,
        isUnlocked: boolean
    ) {
        const bitmap = this.spinSpriteSheets[character];
        if (!bitmap) return;

        ctx.save();

        try {
            let spinMultiplier = 1.0;
            switch (character) {
                case "kangaroo": spinMultiplier = 1.45; break;
                case "panda": spinMultiplier = 1.55; break;
                case "fox": spinMultiplier = 1.3; break;
                case "cat": spinMultiplier = 1.25; break;
                case "crane": spinMultiplier = 1.2; break;
            }

            const finalSize = size * spinMultiplier;

            const cols = 10;
            const rows = 12;
            const speedMs = 24;
            const frameIndex = Math.floor(time / speedMs) % 120;

            const finalCol = frameIndex % cols;
            const finalRow = Math.floor(frameIndex / cols);

            const frameW = bitmap.width / cols;
            const frameH = bitmap.height / rows;

            const sx = finalCol * frameW;
            const sy = finalRow * frameH;

            const shiftY = (character === "cat") ? finalSize * -0.1 : 0;
            const dx = cx - (finalSize / 2);
            const dy = cy - (finalSize / 2) - shiftY;

            ctx.save();
            const depthOffsetX = 12;
            const depthOffsetY = 15;
            ctx.translate(depthOffsetX, depthOffsetY);
            ctx.filter = 'brightness(0) opacity(0.3)';
            ctx.drawImage(bitmap, sx, sy, frameW, frameH, dx, dy, finalSize, finalSize);
            ctx.restore();

            if (!isUnlocked) {
                ctx.filter = 'brightness(0)'; 
            } else {
                ctx.filter = 'none';
            }

            ctx.drawImage(bitmap, sx, sy, frameW, frameH, dx, dy, finalSize, finalSize);
            ctx.filter = 'none'; 

        } finally {
            ctx.restore();
        }
    }

    public static drawCharacter(
        ctx: CanvasRenderingContext2D,
        character: string,
        x: number,
        y: number,
        size: number,
        velocityY: number,
        facingRight: boolean,
        time: number
    ) {
        const bitmap = this.spriteSheets[character];

        let visualMultiplier = 2.0;
        switch (character) {
            case "fox": visualMultiplier = 3.8; break;
            case "bunny": visualMultiplier = 2.5; break;
            case "frog": visualMultiplier = 3.0; break;
            case "crane": visualMultiplier = 2.5; break;
            case "kangaroo": visualMultiplier = 4.5; break;
            case "panda": visualMultiplier = 4.0; break;
            case "cat": visualMultiplier = 3.5; break;
        }
        const visualSize = size * visualMultiplier;

        let visualOffsetY = 0;
        switch (character) {
            case "fox": visualOffsetY = visualSize * 0.22; break;
            case "frog": visualOffsetY = visualSize * 0.22; break;
            case "bunny": visualOffsetY = visualSize * 0.05; break;
            case "crane": visualOffsetY = 0; break;
            case "kangaroo": visualOffsetY = visualSize * 0.15; break;
            case "panda": visualOffsetY = visualSize * 0.2; break;
            case "cat": visualOffsetY = visualSize * 0.1; break;
        }

        const bottomY = y + size;
        const pivotY = bottomY - (visualSize / 2);

        ctx.save();

        try {
            let stretchFactor = velocityY * 0.012;
            stretchFactor = Math.max(-0.2, Math.min(0.2, stretchFactor)); 
            
            const stretchX = 1.0 - Math.abs(stretchFactor);
            const stretchY = 1.0 + Math.abs(stretchFactor);

            let rotationAngle = 0;
            if (character === "fish") {
                rotationAngle = Math.max(-85, Math.min(85, velocityY * 5.5));
            }

            const is120FpsGroup = ["fox", "bunny", "frog", "crane", "kangaroo", "cat"].includes(character);

            let actualFacingRight = facingRight;
            if (["fox", "bunny", "cat"].includes(character)) {
                actualFacingRight = !facingRight;
            } else if (["frog", "crane", "kangaroo", "panda"].includes(character)) {
                actualFacingRight = facingRight;
            }

            ctx.translate(x, pivotY);
            ctx.scale(actualFacingRight ? stretchX : -stretchX, stretchY);
            ctx.rotate(rotationAngle * (Math.PI / 180)); 
            ctx.translate(-x, -pivotY);

            if (bitmap && bitmap.width > 0) {
                let cols = 8;
                if (["cat", "fox", "panda"].includes(character)) cols = 12;
                else if (is120FpsGroup) cols = 10;

                let rows = 8;
                if (["cat", "fox", "panda"].includes(character)) rows = 10;
                else if (is120FpsGroup) rows = 12;

                let finalCol = 0;
                let finalRow = 0;

                if (character === "crane") {
                    const speedMs = 8;
                    const frameIndex = Math.floor(time / speedMs) % 120;
                    finalCol = frameIndex % cols;
                    finalRow = Math.floor(frameIndex / cols);

                } else if (character === "panda") {
                    const jumpStartVelocity = -17;
                    const velocityRange = 32;
                    let normalizedV = (velocityY - jumpStartVelocity) / velocityRange;
                    normalizedV = Math.max(0, Math.min(1, normalizedV));
                    
                    let frameIndex = Math.floor(normalizedV * 59);
                    frameIndex = Math.max(0, Math.min(59, frameIndex));
                    
                    finalCol = frameIndex % cols;
                    finalRow = Math.floor(frameIndex / cols);

                } else if (is120FpsGroup) {
                    const jumpStartVelocity = -17;
                    const velocityRange = 32;
                    let normalizedV = (velocityY - jumpStartVelocity) / velocityRange;
                    normalizedV = Math.max(0, Math.min(1, normalizedV));
                    
                    let frameIndex = Math.floor(normalizedV * 119);
                    frameIndex = Math.max(0, Math.min(119, frameIndex));
                    
                    finalCol = frameIndex % cols;
                    finalRow = Math.floor(frameIndex / cols);

                } else {
                    const speedMs = (character === "fish") ? 8 : 32;
                    const frameIndex = Math.floor(time / speedMs) % 60;
                    finalCol = frameIndex % cols;
                    finalRow = Math.floor(frameIndex / cols);
                }

                const frameW = bitmap.width / cols;
                const frameH = bitmap.height / rows;

                const sx = Math.max(0, Math.min(bitmap.width - 1, finalCol * frameW));
                const sy = Math.max(0, Math.min(bitmap.height - 1, finalRow * frameH));

                const dx = x - (visualSize / 2);
                const dy = bottomY - visualSize + visualOffsetY;

                ctx.save();
                const depthOffsetX = 9;
                const depthOffsetY = 12;
                ctx.translate(depthOffsetX, depthOffsetY);
                ctx.filter = 'brightness(0) opacity(0.3)';
                ctx.drawImage(bitmap, sx, sy, frameW, frameH, dx, dy, visualSize, visualSize);
                ctx.restore();

                ctx.filter = 'none';
                ctx.drawImage(bitmap, sx, sy, frameW, frameH, dx, dy, visualSize, visualSize);

            } else {
                ctx.fillStyle = "lightgray";
                const left = x - (visualSize / 2);
                const top = bottomY - visualSize;
                ctx.fillRect(left, top + (visualSize * 0.2), visualSize, visualSize * 0.8);
            }

        } catch (e) {
            ctx.fillStyle = "lightgray";
            const left = x - (visualSize / 2);
            const top = bottomY - visualSize;
            ctx.fillRect(left, top + (visualSize * 0.2), visualSize, visualSize * 0.8);
        } finally {
            ctx.restore();
        }
    }
}