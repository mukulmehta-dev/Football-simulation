// Teams & Squads Module
import { storage } from './storage.js';

class TeamsModule {
  constructor() {
    this.currentLeagueFilter = 'all';
    this.currentTeam = null;
    this.currentPositionFilter = 'all';
  }

  init() {
    this.renderLeagueFilters();
    this.renderTeamsGrid();
    this.setupEventListeners();
  }

  renderLeagueFilters() {
    const filterContainer = document.getElementById('teams-league-filters');
    if (!filterContainer) return;

    const leagues = [
      { id: 'all', label: 'All Clubs' },
      { id: 'Premier League', label: 'Premier League' },
      { id: 'La Liga', label: 'La Liga' },
      { id: 'Serie A', label: 'Serie A' },
      { id: 'Bundesliga', label: 'Bundesliga' },
      { id: 'Ligue 1', label: 'Ligue 1' }
    ];

    filterContainer.innerHTML = leagues.map(l => `
      <button class="filter-btn ${this.currentLeagueFilter === l.id ? 'active' : ''}" data-league="${l.id}">
        ${l.label}
      </button>
    `).join('');

    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentLeagueFilter = btn.dataset.league;
        this.renderLeagueFilters();
        this.renderTeamsGrid();
      });
    });
  }

  renderTeamsGrid() {
    const grid = document.getElementById('teams-grid-container');
    if (!grid) return;

    const teams = storage.getTeams();
    const filteredTeams = this.currentLeagueFilter === 'all'
      ? teams
      : teams.filter(t => t.league === this.currentLeagueFilter);

    if (filteredTeams.length === 0) {
      grid.innerHTML = `<div class="glass-card" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <p>No teams found for this league.</p>
      </div>`;
      return;
    }

    grid.innerHTML = filteredTeams.map(team => `
      <div class="team-card" data-team-id="${team.id}">
        <div class="team-card-header">
          <div class="team-badge-wrap">
            ${team.logo}
          </div>
          <div class="team-rating-badge">
            <span class="ovr-num">${team.overallRating || 85}</span>
            <span class="ovr-txt">OVR</span>
          </div>
        </div>

        <div class="team-card-info">
          <h3>${team.name}</h3>
          <div class="team-league-tag">
            <span>📍 ${team.country}</span>
            <span>•</span>
            <span>🏆 ${team.league}</span>
          </div>
        </div>

        <div class="team-stat-bars">
          <div class="team-stat-col">
            <div class="stat-val" style="color: var(--accent-gold);">${team.attackRating || 85}</div>
            <div class="stat-lbl">ATT</div>
          </div>
          <div class="team-stat-col">
            <div class="stat-val" style="color: var(--accent-green);">${team.midfieldRating || 85}</div>
            <div class="stat-lbl">MID</div>
          </div>
          <div class="team-stat-col">
            <div class="stat-val" style="color: var(--accent-cyan);">${team.defenseRating || 85}</div>
            <div class="stat-lbl">DEF</div>
          </div>
        </div>

        <div class="team-card-footer">
          <span>🏟️ ${team.stadium}</span>
          <span>👥 ${team.squad ? team.squad.length : 0} Players</span>
        </div>
      </div>
    `).join('');

    // Attach click handlers to open squad view
    grid.querySelectorAll('.team-card').forEach(card => {
      card.addEventListener('click', () => {
        const teamId = card.dataset.teamId;
        this.openTeamSquadView(teamId);
      });
    });
  }

  openTeamSquadView(teamId) {
    const team = storage.getTeamById(teamId);
    if (!team) return;

    this.currentTeam = team;
    this.currentPositionFilter = 'all';

    // Switch view in app
    window.location.hash = `team-detail-${teamId}`;
    this.renderSquadView();
  }

  renderSquadView() {
    const team = this.currentTeam;
    if (!team) return;

    const banner = document.getElementById('team-squad-banner');
    const squadContainer = document.getElementById('team-squad-players-container');
    if (!banner || !squadContainer) return;

    // Render Banner
    banner.innerHTML = `
      <div class="team-hero-banner-inner">
        <div class="team-hero-info">
          <div class="team-hero-crest">${team.logo}</div>
          <div class="team-hero-text">
            <div class="badge badge-cyan" style="margin-bottom: 0.5rem;">${team.league} • ${team.country}</div>
            <h1>${team.name}</h1>
            <div class="team-meta-pills">
              <span>🏟️ ${team.stadium}</span>
              <span>•</span>
              <span>👥 ${team.squad ? team.squad.length : 0} Total Squad Members</span>
            </div>
          </div>
        </div>

        <div class="team-ratings-cluster">
          <div class="rating-box ovr-box">
            <div class="score gold">${team.overallRating || 85}</div>
            <div class="lbl">OVERALL</div>
          </div>
          <div class="rating-box">
            <div class="score gold">${team.attackRating || 85}</div>
            <div class="lbl">ATTACK</div>
          </div>
          <div class="rating-box">
            <div class="score green">${team.midfieldRating || 85}</div>
            <div class="lbl">MIDFIELD</div>
          </div>
          <div class="rating-box">
            <div class="score cyan">${team.defenseRating || 85}</div>
            <div class="lbl">DEFENSE</div>
          </div>
        </div>
      </div>
    `;

    // Render Position Filter Tabs
    const positionNav = document.getElementById('squad-position-tabs');
    if (positionNav) {
      const posTabs = [
        { id: 'all', label: 'All Squad' },
        { id: 'Goalkeepers', label: '🧤 Goalkeepers' },
        { id: 'Defenders', label: '🛡️ Defenders' },
        { id: 'Midfielders', label: '⚡ Midfielders' },
        { id: 'Forwards', label: '⚽ Forwards' }
      ];

      positionNav.innerHTML = posTabs.map(tab => `
        <button class="filter-btn ${this.currentPositionFilter === tab.id ? 'active' : ''}" data-pos="${tab.id}">
          ${tab.label}
        </button>
      `).join('');

      positionNav.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.currentPositionFilter = btn.dataset.pos;
          this.renderSquadView();
        });
      });
    }

    // Render Squad Categories
    const categories = ['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'];
    const activeCategories = this.currentPositionFilter === 'all'
      ? categories
      : [this.currentPositionFilter];

    let html = '';

    activeCategories.forEach(cat => {
      const players = team.squad ? team.squad.filter(p => p.category === cat) : [];
      if (players.length === 0) return;

      html += `
        <div class="position-category-section">
          <div class="category-header">
            <h3>${cat}</h3>
            <span class="count-pill">${players.length}</span>
          </div>
          <div class="players-grid">
            ${players.map(p => this.renderPlayerCard(p)).join('')}
          </div>
        </div>
      `;
    });

    squadContainer.innerHTML = html;

    // Attach click listeners to player cards
    squadContainer.querySelectorAll('.player-card').forEach(card => {
      card.addEventListener('click', () => {
        const playerId = card.dataset.playerId;
        const player = team.squad.find(p => p.id === playerId);
        if (player) {
          this.openPlayerModal(player, team);
        }
      });
    });
  }

  renderPlayerCard(player) {
    let ratingClass = 'rating-silver';
    if (player.rating >= 88) ratingClass = 'rating-elite';
    else if (player.rating >= 83) ratingClass = 'rating-gold';

    return `
      <div class="player-card" data-player-id="${player.id}">
        <div class="player-card-top">
          <span class="player-jersey-num">#${player.number}</span>
          <span class="player-rating-pill ${ratingClass}">${player.rating} OVR</span>
        </div>

        <div class="player-card-main">
          <div class="player-avatar">👤</div>
          <div class="player-identity">
            <h4>${player.name}</h4>
            <div class="player-sub-meta">
              <span class="position-tag">${player.position}</span>
              <span>•</span>
              <span>${player.nationality}</span>
              <span>•</span>
              <span>${player.age || 24}y</span>
            </div>
          </div>
        </div>

        <div class="player-mini-stats">
          <div class="stat-chip">
            <div class="val">${player.pace || 75}</div>
            <div class="lbl">PAC</div>
          </div>
          <div class="stat-chip">
            <div class="val">${player.shooting || 75}</div>
            <div class="lbl">SHO</div>
          </div>
          <div class="stat-chip">
            <div class="val">${player.passing || 75}</div>
            <div class="lbl">PAS</div>
          </div>
          <div class="stat-chip">
            <div class="val">${player.dribbling || 75}</div>
            <div class="lbl">DRI</div>
          </div>
          <div class="stat-chip">
            <div class="val">${player.defending || 75}</div>
            <div class="lbl">DEF</div>
          </div>
          <div class="stat-chip">
            <div class="val">${player.physical || 75}</div>
            <div class="lbl">PHY</div>
          </div>
        </div>
      </div>
    `;
  }

  openPlayerModal(player, team) {
    const modal = document.getElementById('player-detail-modal');
    if (!modal) return;

    let ratingClass = 'rating-silver';
    if (player.rating >= 88) ratingClass = 'rating-elite';
    else if (player.rating >= 83) ratingClass = 'rating-gold';

    const stats = [
      { name: 'Pace', val: player.pace || 75 },
      { name: 'Shooting', val: player.shooting || 75 },
      { name: 'Passing', val: player.passing || 75 },
      { name: 'Dribbling', val: player.dribbling || 75 },
      { name: 'Defending', val: player.defending || 75 },
      { name: 'Physicality', val: player.physical || 75 }
    ];

    modal.querySelector('.modal-body').innerHTML = `
      <div class="player-modal-profile">
        <div class="player-modal-avatar">👤</div>
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.35rem;">
            <h2 style="font-size: 1.6rem;">${player.name}</h2>
            <span class="player-rating-pill ${ratingClass}">${player.rating} OVR</span>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">
            #${player.number} • <strong>${player.position}</strong> (${player.category}) • ${team.name}
          </p>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">
            🌍 Nationality: ${player.nationality} • Age: ${player.age || 24}
          </p>
        </div>
      </div>

      <div class="player-modal-stats-list">
        ${stats.map(s => `
          <div class="stat-bar-row">
            <div class="stat-bar-header">
              <span>${s.name}</span>
              <strong style="color: var(--accent-green);">${s.val}</strong>
            </div>
            <div class="stat-progress-bg">
              <div class="stat-progress-fill" style="width: ${s.val}%;"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button class="btn btn-secondary btn-sm" id="close-player-modal-btn">Close</button>
      </div>
    `;

    modal.classList.add('active');

    modal.querySelector('#close-player-modal-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  setupEventListeners() {
    const backBtn = document.getElementById('btn-back-to-teams');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.hash = 'teams';
      });
    }

    // Modal close button
    const modal = document.getElementById('player-detail-modal');
    modal?.querySelector('.modal-close-btn')?.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }
}

export const teamsModule = new TeamsModule();
