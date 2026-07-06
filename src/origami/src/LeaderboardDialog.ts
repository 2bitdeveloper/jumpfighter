import { Web3Service } from './Web3Service';

export class LeaderboardDialog {
    private overlay: HTMLElement;

    constructor() {
        this.injectCSS();
        this.overlay = this.createHTMLLayout();
        document.body.appendChild(this.overlay);
        this.setupListeners();
    }

    private injectCSS() {
        if (document.getElementById('lb-styles')) return;
        const style = document.createElement('style');
        style.id = 'lb-styles';
        style.innerHTML = `
            #lb-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: none; justify-content: center; align-items: center; z-index: 2000; font-family: 'origraph', sans-serif; }
            .lb-dialog { background: #2C363F; width: 90%; max-width: 400px; padding: 24px; border-radius: 12px; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
            .lb-dialog h2 { color: #FF7B54; margin-bottom: 20px; text-transform: uppercase; font-size: 24px; }
            .lb-list { list-style: none; padding: 0; margin: 0 0 24px 0; max-height: 40vh; overflow-y: auto; text-align: left; }
            .lb-row { display: flex; justify-content: space-between; padding: 12px 8px; border-bottom: 1px solid #455A64; font-family: system-ui, sans-serif; }
            .lb-rank { color: #BDBDBD; margin-right: 10px; font-weight: bold; }
            .lb-score { color: #FF7B54; font-weight: bold; }
        `;
        document.head.appendChild(style);
    }

    private createHTMLLayout(): HTMLElement {
        const div = document.createElement('div');
        div.id = 'lb-overlay';
        div.innerHTML = `
            <div class="lb-dialog">
                <h2>Top Ascenders</h2>
                <ul class="lb-list" id="lb-content"></ul>
                <button id="btnLbClose" style="background:#FF7B54; color:white; border:none; padding:12px 30px; border-radius:6px; cursor:pointer; font-family:'origraph'; font-weight:bold;">CLOSE</button>
            </div>
        `;
        return div;
    }

    private setupListeners() {
        document.getElementById('btnLbClose')?.addEventListener('click', () => this.hide());
    }

    public async show() {
        this.overlay.style.display = 'flex';
        const listContainer = document.getElementById('lb-content');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Loading Scores...</div>';
        
        const scores = await Web3Service.getTopScores();
        
        if (scores.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#BDBDBD;">No records found.</div>';
            return;
        }

        // FIX: Display the generated player name, or fallback to their member_id
        listContainer.innerHTML = scores.map((item, index) => `
            <li class="lb-row">
                <div>
                    <span class="lb-rank">#${item.rank || index + 1}</span> 
                    <span>${item.player?.name || 'Player ' + item.member_id}</span>
                </div>
                <span class="lb-score">${item.score} ft</span>
            </li>
        `).join('');
    }

    public hide() {
        this.overlay.style.display = 'none';
    }
}