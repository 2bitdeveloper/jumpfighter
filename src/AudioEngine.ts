export class AudioEngine {
    public isMusicEnabled: boolean = true;
    public isSfxEnabled: boolean = true;

    private backgroundMusic: HTMLAudioElement | null = null;
    private bgMusicUrls: string[] = ['theme_asteroid.mp3', 'theme_graveyard.mp3', 'theme_comet.mp3'];
    
    private explosionSound: HTMLAudioElement;
    private clickSound: HTMLAudioElement;

    private isPreparing: boolean = false;
    private pendingBgColorIndex: number = -1;

    private getPath(src: string): string {
        return `./${src}`;
    }

    constructor() {
        // SAFE STORAGE READ
        try {
            this.isMusicEnabled = localStorage.getItem("isMusicEnabled") !== "false";
            this.isSfxEnabled = localStorage.getItem("isSfxEnabled") !== "false";
        } catch (e) {
            console.warn("AudioEngine: LocalStorage blocked. Using default audio settings.");
            this.isMusicEnabled = true;
            this.isSfxEnabled = true;
        }

        this.explosionSound = new Audio(this.getPath('explosion.wav'));
        this.clickSound = new Audio(this.getPath('click.wav'));
    }

    // SAFE STORAGE WRITE
    private safeSetItem(key: string, value: string) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            // Ignore if iframe blocks saving
        }
    }

    public playThemeMusic(bgColorIndex: number) {
        if (this.isPreparing) { this.pendingBgColorIndex = bgColorIndex; return; }
        this.isPreparing = true;

        if (this.backgroundMusic) { 
            this.backgroundMusic.pause(); 
            this.backgroundMusic.currentTime = 0; 
        }

        this.backgroundMusic = new Audio(this.getPath(this.bgMusicUrls[bgColorIndex]));
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5;

        if (this.isMusicEnabled) {
            const playPromise = this.backgroundMusic.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.isPreparing = false;
                    if (this.pendingBgColorIndex !== -1) {
                        const nextIndex = this.pendingBgColorIndex;
                        this.pendingBgColorIndex = -1;
                        this.playThemeMusic(nextIndex);
                    }
                }).catch(() => { 
                    this.isPreparing = false; 
                });
            }
        } else { this.isPreparing = false; }
    }

    public pauseMusic() { 
        if (this.backgroundMusic && !this.backgroundMusic.paused) this.backgroundMusic.pause(); 
    }
    
    public resumeMusic(bgColorIndex: number) {
        if (this.isMusicEnabled) {
            if (!this.backgroundMusic) {
                this.playThemeMusic(bgColorIndex);
            } else if (this.backgroundMusic.paused && !this.isPreparing) {
                this.backgroundMusic.play().catch(() => {});
            }
        }
    }

    public toggleMusic(bgColorIndex: number) {
        this.isMusicEnabled = !this.isMusicEnabled;
        this.safeSetItem("isMusicEnabled", this.isMusicEnabled.toString());
        
        if (this.isMusicEnabled) {
            if (this.backgroundMusic && !this.isPreparing) {
                this.backgroundMusic.play().catch(() => {});
            } else if (!this.backgroundMusic) {
                this.playThemeMusic(bgColorIndex);
            }
        } else {
            if (this.backgroundMusic && !this.backgroundMusic.paused) this.backgroundMusic.pause();
        }
    }

    public toggleSfx() {
        this.isSfxEnabled = !this.isSfxEnabled;
        this.safeSetItem("isSfxEnabled", this.isSfxEnabled.toString());
    }

    public playClickSound() {
        if (!this.isSfxEnabled) return;
        const sound = this.clickSound.cloneNode(true) as HTMLAudioElement;
        sound.volume = 0.8;
        sound.play().catch(() => {});
    }

    public playExplosionSound() {
        if (!this.isSfxEnabled) return;
        const sound = this.explosionSound.cloneNode(true) as HTMLAudioElement;
        sound.play().catch(() => {});
    }

    public triggerVibration(ms: number) {
        if (!this.isSfxEnabled) return;
        if (navigator.vibrate) navigator.vibrate(ms);
    }
}