import { AudioEngine } from './AudioEngine';
import { GameLoop } from './GameLoop';

declare global {
    interface Window {
        CrazyGames?: any;
    }
}

export class SettingsDialog {
    private overlay: HTMLElement;
    private audioEngine: AudioEngine;
    private _loop: GameLoop; 

    constructor(audio: AudioEngine, loop: GameLoop) {
        this.audioEngine = audio;
        this._loop = loop;
        this.injectCSS();
        this.overlay = this.createHTMLLayout();
        document.body.appendChild(this.overlay);
        this.setupListeners();
        this.loadSettings();
    }

    private injectCSS() {
        if (document.getElementById('settings-styles')) return;
        const style = document.createElement('style');
        style.id = 'settings-styles';
        style.innerHTML = `
            #settings-overlay, #settings-overlay * {
                font-family: 'origraph', system-ui, -apple-system, sans-serif;
            }
            
            #settings-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: none; justify-content: center; align-items: center; z-index: 1000; }
            .settings-dialog { background: #2C363F; width: 90%; max-width: 450px; max-height: 85vh; padding: 24px; border-radius: 12px; overflow-y: auto; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative; }
            .settings-dialog h2 { text-align: center; color: #FF7B54; margin-bottom: 24px; font-size: 28px; text-transform: uppercase; }
            .setting-group { margin-bottom: 24px; display: flex; flex-direction: column; }
            .setting-group label { margin-bottom: 12px; font-size: 18px; }
            input[type="range"] { accent-color: #FF7B54; cursor: pointer; height: 8px; }
            
            .btn-primary { background: #FF7B54; color: white; border: none; padding: 14px; width: 100%; border-radius: 6px; font-weight: bold; font-size: 18px; margin-bottom: 16px; cursor: pointer; transition: 0.2s; }
            .btn-secondary { background: #455A64; color: white; border: none; padding: 14px; width: 100%; border-radius: 6px; font-weight: bold; font-size: 16px; margin-bottom: 16px; cursor: pointer; transition: 0.2s; }
            
            #view-about { display: none; text-align: center; }
            #view-about p { font-size: 20px; line-height: 1.5; margin-bottom: 24px; }
            #view-about small { font-size: 18px; color: #BDBDBD; display: block; margin-bottom: 32px; }
        `;
        document.head.appendChild(style);
    }

    private createHTMLLayout(): HTMLElement {
        const div = document.createElement('div');
        div.id = 'settings-overlay';
        div.innerHTML = `
            <div class="settings-dialog">
                <div id="view-main">
                    <h2>Settings</h2>
                    <div class="setting-group"><label>Music Volume</label><input type="range" id="seekMusic" min="0" max="100" value="70"></div>
                    <div class="setting-group"><label>SFX Volume</label><input type="range" id="seekSfx" min="0" max="100" value="100"></div>
                    <button class="btn-primary" id="btnAbout">About Game</button>
                    <button class="btn-secondary" id="btnTos">Privacy Policy & TOS</button>
                    <button class="btn-secondary" style="margin-top:8px; background:transparent; border:2px solid #FF7B54" id="btnClose">Close</button>
                </div>
                <div id="view-about">
                    <h2>Origami Ascent</h2>
                    <p>Ascend the beautiful paper mountains and unlock characters.</p>
                    <small>Developed by Two Bit Developer</small>
                    <button class="btn-secondary" style="background:transparent; border:2px solid #FF7B54" id="btnBack">Back</button>
                </div>
            </div>
        `;
        return div;
    }

    private setupListeners() {
        const musicSlider = document.getElementById('seekMusic') as HTMLInputElement;
        const sfxSlider = document.getElementById('seekSfx') as HTMLInputElement;
        const viewMain = document.getElementById('view-main') as HTMLElement;
        const viewAbout = document.getElementById('view-about') as HTMLElement;

        musicSlider.oninput = (e) => {
            const vol = parseInt((e.target as HTMLInputElement).value) / 100;
            this.audioEngine.updateBgmVolume(vol);
            try {
                if (window.CrazyGames?.SDK?.data) window.CrazyGames.SDK.data.setItem('music_vol', vol.toString());
                localStorage.setItem('music_vol', vol.toString());
            } catch(err) {}
        };

        sfxSlider.oninput = (e) => {
            const vol = parseInt((e.target as HTMLInputElement).value) / 100;
            this.audioEngine.sfxVolume = vol;
            try {
                if (window.CrazyGames?.SDK?.data) window.CrazyGames.SDK.data.setItem('sfx_vol', vol.toString());
                localStorage.setItem('sfx_vol', vol.toString());
            } catch(err) {}
        };

        document.getElementById('btnAbout')?.addEventListener('click', () => {
            viewMain.style.display = 'none';
            viewAbout.style.display = 'block';
        });

        document.getElementById('btnBack')?.addEventListener('click', () => {
            viewAbout.style.display = 'none';
            viewMain.style.display = 'block';
        });

        document.getElementById('btnTos')?.addEventListener('click', () => {
            window.open('https://sites.google.com/view/2bit-dev-privacy/data-privacy?authuser=0', '_blank');
        });

        document.getElementById('btnClose')?.addEventListener('click', () => this.hide());
    }

    private loadSettings() {
        let musicVol: string | null = null;
        let sfxVol: string | null = null;

        try {
            if (window.CrazyGames?.SDK?.data) {
                musicVol = window.CrazyGames.SDK.data.getItem('music_vol');
                sfxVol = window.CrazyGames.SDK.data.getItem('sfx_vol');
            }
            if (musicVol === null) musicVol = localStorage.getItem('music_vol');
            if (sfxVol === null) sfxVol = localStorage.getItem('sfx_vol');
        } catch (e) {}

        musicVol = musicVol || '0.7';
        sfxVol = sfxVol || '1.0';

        (document.getElementById('seekMusic') as HTMLInputElement).value = (parseFloat(musicVol) * 100).toString();
        (document.getElementById('seekSfx') as HTMLInputElement).value = (parseFloat(sfxVol) * 100).toString();
    }

    public show() { this.overlay.style.display = 'flex'; }
    public hide() { this.overlay.style.display = 'none'; }
}