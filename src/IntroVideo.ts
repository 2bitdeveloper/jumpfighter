// ============================================================
// INTRO VIDEO OVERLAY
// Plays ./intro.mp4 (from /public) fullscreen over the game while
// the engine boots behind it. Resolves when the video ends, is
// skipped, fails to load, or stalls - it can never block the game.
// ============================================================

export interface IntroVideoOptions {
    src?: string;                 // default './intro.mp4'
    showOncePerPlayer?: boolean;  // true = only play on a player's first ever visit
}

export function playIntroVideo(options: IntroVideoOptions = {}): Promise<void> {
    return new Promise((resolve) => {
        const src = options.src || './intro.mp4';
        const ONCE_KEY = 'introSeen';

        if (options.showOncePerPlayer) {
            try { if (localStorage.getItem(ONCE_KEY)) { resolve(); return; } } catch (e) {}
        }

        // --- Overlay ---
        const overlay = document.createElement('div');
        overlay.id = 'intro-video-overlay';
        overlay.style.cssText =
            'position:fixed; inset:0; background:#000; z-index:100000;' +
            'display:flex; justify-content:center; align-items:center;' +
            'opacity:1; transition:opacity 0.4s ease;';

        // --- Video ---
        // object-fit:contain letterboxes any aspect ratio safely.
        // Switch to 'cover' for edge-to-edge cinematic (crops instead of bars).
        const video = document.createElement('video');
        video.src = src;
        video.playsInline = true;   // required so iOS doesn't hijack into fullscreen player
        video.preload = 'auto';
        video.style.cssText = 'width:100%; height:100%; object-fit:contain; background:#000;';
        overlay.appendChild(video);

        // --- "TAP FOR SOUND" hint (only shown when muted-autoplay fallback kicks in) ---
        const soundHint = document.createElement('div');
        soundHint.innerText = 'TAP FOR SOUND \uD83D\uDD0A';
        soundHint.style.cssText =
            'position:absolute; top:6%; left:50%; transform:translateX(-50%);' +
            "display:none; color:#FFF; font-family:'VT323', monospace; font-size:26px;" +
            'background:rgba(0,0,0,0.6); border:2px solid #00FFFF; padding:8px 18px;' +
            'text-shadow:0 0 10px #00FFFF; pointer-events:none;';
        overlay.appendChild(soundHint);

        // --- Skip button (appears after a short delay) ---
        const skipBtn = document.createElement('button');
        skipBtn.innerText = 'SKIP >>';
        skipBtn.style.cssText =
            'position:absolute; bottom:5%; right:4%; display:none; cursor:pointer;' +
            "font-family:'VT323', monospace; font-size:28px; color:#FF9900;" +
            'background:rgba(0,0,0,0.6); border:2px solid #FF9900; padding:10px 24px;' +
            'letter-spacing:2px; text-shadow:0 0 10px #FF6600;';
        overlay.appendChild(skipBtn);
        setTimeout(() => { skipBtn.style.display = 'block'; }, 800);

        // --- Finish (idempotent) ---
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            try { if (options.showOncePerPlayer) localStorage.setItem(ONCE_KEY, 'true'); } catch (e) {}
            try { video.pause(); } catch (e) {}
            window.removeEventListener('keydown', onKeyDown, true);
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 450);
            resolve();
        };

        video.addEventListener('ended', finish);
        video.addEventListener('error', finish); // missing/corrupt file: straight into the game

        // Failsafe: if the video hasn't started rendering within 5s (slow
        // network, codec issue), don't hold the game hostage.
        const stallTimeout = setTimeout(() => { if (video.readyState < 2) finish(); }, 5000);
        video.addEventListener('playing', () => clearTimeout(stallTimeout));

        skipBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); finish(); });

        // Tapping the video: unmute if we fell back to muted autoplay.
        // stopPropagation keeps the tap from leaking into the game's
        // window-level input handling underneath.
        overlay.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (video.muted) {
                video.muted = false;
                soundHint.style.display = 'none';
            }
        });

        // Keyboard skip (capture phase runs before the game's own key handler)
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
                e.preventDefault(); e.stopPropagation(); finish();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);

        document.body.appendChild(overlay);

        // --- Autoplay strategy: try WITH sound, fall back to muted ---
        video.muted = false;
        const attempt = video.play();
        if (attempt) {
            attempt.catch(() => {
                video.muted = true;
                soundHint.style.display = 'block';
                video.play().catch(() => finish()); // even muted refused: bail to game
            });
        }
    });
}
