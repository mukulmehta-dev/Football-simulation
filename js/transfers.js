// Football Transfer News Module
import { storage } from './storage.js';

class TransfersModule {
  constructor() {
    this.currentStatusFilter = 'all';
    this.searchQuery = '';
    this.clubFilter = 'all';
  }

  init() {
    this.renderTicker();
    this.renderStatusFilterButtons();
    this.populateClubDropdown();
    this.renderTransfersGrid();
    this.setupEventListeners();
  }

  renderTicker() {
    const tickerEl = document.getElementById('transfer-ticker-text');
    if (!tickerEl) return;

    const transfers = storage.getTransfers();
    if (transfers.length === 0) {
      tickerEl.textContent = "No recent transfer updates.";
      return;
    }

    const tickerItems = transfers.slice(0, 5).map(t => 
      `🚨 [${t.status.toUpperCase()}] ${t.playerName}: ${t.fromClub} ➔ ${t.toClub} (${t.fee})`
    ).join('  •  ');

    tickerEl.textContent = tickerItems;
  }

  renderStatusFilterButtons() {
    const container = document.getElementById('transfer-status-filters');
    if (!container) return;

    const filters = [
      { id: 'all', label: 'All Transfers' },
      { id: 'HERE WE GO', label: '🔥 HERE WE GO' },
      { id: 'Official Done Deal', label: '✅ Official Deals' },
      { id: 'Negotiations Ongoing', label: '💬 Negotiations' },
      { id: 'Transfer Rumour', label: '👀 Rumours' }
    ];

    container.innerHTML = filters.map(f => `
      <button class="filter-btn ${this.currentStatusFilter === f.id ? 'active' : ''}" data-status="${f.id}">
        ${f.label}
      </button>
    `).join('');

    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentStatusFilter = btn.dataset.status;
        this.renderStatusFilterButtons();
        this.renderTransfersGrid();
      });
    });
  }

  populateClubDropdown() {
    const select = document.getElementById('transfers-club-filter');
    if (!select) return;

    const teams = storage.getTeams();
    const options = [`<option value="all">All Clubs</option>`]
      .concat(teams.map(t => `<option value="${t.name}">${t.name}</option>`));

    select.innerHTML = options.join('');
  }

  renderTransfersGrid() {
    const grid = document.getElementById('transfers-grid-container');
    if (!grid) return;

    let transfers = storage.getTransfers();

    // Apply Status Filter
    if (this.currentStatusFilter !== 'all') {
      transfers = transfers.filter(t => t.status.toLowerCase() === this.currentStatusFilter.toLowerCase());
    }

    // Apply Club Filter
    if (this.clubFilter !== 'all') {
      transfers = transfers.filter(t => 
        t.fromClub.toLowerCase().includes(this.clubFilter.toLowerCase()) || 
        t.toClub.toLowerCase().includes(this.clubFilter.toLowerCase())
      );
    }

    // Apply Search Query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      transfers = transfers.filter(t => 
        t.playerName.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q) ||
        t.fromClub.toLowerCase().includes(q) ||
        t.toClub.toLowerCase().includes(q)
      );
    }

    if (transfers.length === 0) {
      grid.innerHTML = `
        <div class="glass-card" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <p>No transfer news matching your current filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = transfers.map(t => this.renderTransferCard(t)).join('');

    // Attach click handlers to "Read Full Story"
    grid.querySelectorAll('.btn-read-story').forEach(btn => {
      btn.addEventListener('click', () => {
        const transferId = btn.dataset.transferId;
        const transfer = storage.getTransferById(transferId);
        if (transfer) this.openStoryModal(transfer);
      });
    });
  }

  getStatusBadge(status) {
    const s = status.toLowerCase();
    if (s.includes('here we go')) {
      return `<span class="status-here-we-go">🔥 HERE WE GO</span>`;
    } else if (s.includes('official') || s.includes('done deal')) {
      return `<span class="status-official">✅ OFFICIAL</span>`;
    } else if (s.includes('negotiation') || s.includes('advanced')) {
      return `<span class="status-negotiating">💬 TALKS ONGOING</span>`;
    } else {
      return `<span class="status-rumour">👀 RUMOUR</span>`;
    }
  }

  renderTransferCard(t) {
    return `
      <div class="transfer-card" data-transfer-id="${t.id}">
        <div class="transfer-card-header">
          ${this.getStatusBadge(t.status)}
          <span class="transfer-tier">${t.tier || 'Tier 2'} • ${t.date}</span>
        </div>

        <div class="transfer-pathway">
          <div class="path-club">
            <span>${t.fromClub}</span>
          </div>
          <div class="path-arrow">
            <span class="arrow-icon">➔</span>
            <span class="path-fee-pill">${t.fee || 'Undisclosed'}</span>
          </div>
          <div class="path-club">
            <span>${t.toClub}</span>
          </div>
        </div>

        <h3 class="transfer-headline">${t.headline}</h3>
        <p class="transfer-summary">${t.summary || t.fullArticle.substring(0, 140) + '...'}</p>

        <div class="transfer-card-footer">
          <div class="transfer-author">
            <span>✍️ ${t.author || 'Football Hub News'}</span>
          </div>
          <button class="btn btn-secondary btn-sm btn-read-story" data-transfer-id="${t.id}">
            Read Story ➔
          </button>
        </div>
      </div>
    `;
  }

  openStoryModal(t) {
    const modal = document.getElementById('transfer-story-modal');
    if (!modal) return;

    modal.querySelector('.modal-body').innerHTML = `
      <div class="story-header-status">
        ${this.getStatusBadge(t.status)}
        <span class="badge badge-purple">${t.tier || 'Tier 1'}</span>
      </div>

      <h2 style="font-size: 1.75rem; margin-bottom: 1.25rem; line-height: 1.25;">${t.headline}</h2>

      <div class="story-full-pathway">
        <div class="story-club-item">
          <span>🏛️ Current Club</span>
          <strong>${t.fromClub}</strong>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1.8rem; color: var(--accent-green);">➔</div>
          <div class="path-fee-pill" style="margin-top: 0.35rem;">${t.fee || 'Fee Undisclosed'}</div>
        </div>
        <div class="story-club-item">
          <span>🎯 Destination</span>
          <strong>${t.toClub}</strong>
        </div>
      </div>

      <div class="story-article-body">
        ${t.fullArticle || t.summary}
      </div>

      <div class="story-footer-meta">
        <span>✍️ Reported by <strong>${t.author || 'Fabrizio Romano / Sky Sports'}</strong></span>
        <span>📅 ${t.date}</span>
      </div>

      <div style="margin-top: 2rem; display: flex; justify-content: flex-end;">
        <button class="btn btn-secondary btn-sm" id="close-story-modal-btn">Close Story</button>
      </div>
    `;

    modal.classList.add('active');

    modal.querySelector('#close-story-modal-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  setupEventListeners() {
    const searchInput = document.getElementById('transfers-search-input');
    const clubSelect = document.getElementById('transfers-club-filter');

    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderTransfersGrid();
    });

    clubSelect?.addEventListener('change', (e) => {
      this.clubFilter = e.target.value;
      this.renderTransfersGrid();
    });

    // Modal Close handlers
    const modal = document.getElementById('transfer-story-modal');
    modal?.querySelector('.modal-close-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }
}

export const transfersModule = new TransfersModule();
