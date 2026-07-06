export class AudioEngine {
    private bgm: HTMLAudioElement | null = null;
    private audioContext: AudioContext | null = null;
    private sfxBuffers: Map<string, AudioBuffer> = new Map();

    // Volume levels
    public bgmVolume: number = 1.0;
    public sfxVolume: number = 1.0;

    // State tracking to prevent play-before-load errors
    private isBgmPrepared: boolean = false;
    private playBgmWhenReady: boolean = false;

    constructor() {
        // Initialize Web Audio API for low-latency SFX (replaces SoundPool)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            this.audioContext = new AudioContextClass();
            this.preloadSFX();
        }
    }

    // Replaces Coroutine/SoundPool loading
    private async preloadSFX() {
        if (!this.audioContext) return;
        
        // Assuming your files are placed in a public /assets/ folder
        const sounds = [
            { id: 'jump', path: './origami/sfx_jump.wav' },
            { id: 'land', path: './origami/sfx_land.wav' },
            { id: 'stomp', path: './origami/sfx_stomp.wav' }
        ];

        for (const sound of sounds) {
            try {
                const response = await fetch(sound.path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sfxBuffers.set(sound.id, audioBuffer);
            } catch (e) {
                console.error(`Failed to load SFX: ${sound.path}`, e);
            }
        }
    }

    // 1. Pre-loads the audio silently in the background when the game opens
    public preloadBGM() {
        if (this.bgm) return;

        this.bgm = new Audio();
        this.bgm.src = './origami/bgm_koto.mp3';
        this.bgm.loop = true;
        this.bgm.volume = this.bgmVolume;

        // Safely handle decoding completion (replaces setOnPreparedListener)
        this.bgm.addEventListener('canplaythrough', () => {
            this.isBgmPrepared = true;
            if (this.playBgmWhenReady) {
                this.bgm?.play().catch(e => console.warn("Autoplay prevented by browser:", e));
                this.playBgmWhenReady = false;
            }
        });

        // Replaces setOnErrorListener
        this.bgm.addEventListener('error', () => {
            console.error("Error loading BGM");
            this.isBgmPrepared = false;
            this.bgm = null;
        });

        this.bgm.load();
    }

    // 2. Only plays the file if it is ready, otherwise queues it up
    public startBGM() {
        // Browsers require audio contexts to be resumed after a user gesture
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }

        if (this.isBgmPrepared && this.bgm) {
            if (this.bgm.paused) {
                this.bgm.play().catch(e => {
                    console.warn("Autoplay blocked. Waiting for user interaction.", e);
                    this.playBgmWhenReady = true;
                });
            }
        } else {
            // Tell the listener to start it as soon as decoding finishes
            this.playBgmWhenReady = true;
        }
    }

    public pauseBGM() {
        this.playBgmWhenReady = false; // Cancel the queue if they pause before it loads
        if (this.isBgmPrepared && this.bgm && !this.bgm.paused) {
            this.bgm.pause();
        }
    }

    public applyBgmVolume() {
        if (this.bgm) {
            this.bgm.volume = this.bgmVolume;
        }
    }

    public updateBgmVolume(level: number) {
        this.bgmVolume = Math.max(0, Math.min(1, level)); // Clamp between 0.0 and 1.0
        this.applyBgmVolume();
    }

    // Helper to replace SoundPool.play()
    private playSFX(id: string, rate: number = 1.0) {
        if (!this.audioContext || !this.sfxBuffers.has(id)) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sfxBuffers.get(id)!;
        source.playbackRate.value = rate;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.sfxVolume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
    }

    public playJump() { this.playSFX('jump', 1.0); }
    public playLand() { this.playSFX('land', 0.8); } // Preserved the 0.8f pitch drop
    public playStomp() { this.playSFX('stomp', 1.0); }

    public release() {
        this.isBgmPrepared = false;
        this.playBgmWhenReady = false;
        
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.src = "";
            this.bgm = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.sfxBuffers.clear();
    }

    public destroy() {
        this.release();
    }
}