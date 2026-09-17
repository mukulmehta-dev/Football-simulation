// Football Hub - Core Application Controller
import { storage } from './storage.js';
import { teamsModule } from './teams.js';
import { simulatorModule } from './simulator.js';
import { transfersModule } from './transfers.js';
import { adminModule } from './admin.js';

class FootballHubApp {
  constructor() {
    this.soundEnabled = true;
    this.audioCtx = null;
  }

  init() {
    // Initialize modules
    teamsModule.init();
    simulatorModule.init();
    transfersModule.init();
    adminModule.init();

    // Setup Routing
    this.setupRouting();
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();

    // Setup Global Search
    this.setupGlobalSearch();

    // Setup Audio Toggles & Effects
    this.setupAudio();

    // Setup Home View Components (Mockup Theme Exact)
    this.setupHomeView();

    // Setup Dedicated News & Matches Views
    this.setupNewsView();
    this.setupMatchesView();

    // Mobile Menu Toggle
    this.setupMobileMenu();
  }

  // --- ROUTING SYSTEM ---
  setupRouting() {
    document.querySelectorAll('[data-nav-target]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = link.dataset.navTarget;
        window.location.hash = target;
      });
    });
  }

  handleRoute() {
    const rawHash = window.location.hash.replace('#', '') || 'home';
    let activeView = rawHash;

    // Handle parameterized routes like #team-detail-barcelona
    if (rawHash.startsWith('team-detail-')) {
      const teamId = rawHash.replace('team-detail-', '');
      activeView = 'team-detail';
      teamsModule.openTeamSquadView(teamId);
    }

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

    // Show target section
    const targetSection = document.getElementById(`view-${activeView}`);
    if (targetSection) {
      targetSection.classList.add('active');
    } else {
      document.getElementById('view-home')?.classList.add('active');
      activeView = 'home';
    }

    // Update active state in nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      const navTarget = item.querySelector('a')?.getAttribute('href')?.replace('#', '');
      if (navTarget === activeView || (activeView === 'team-detail' && navTarget === 'teams')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Refresh components when navigating
    if (activeView === 'home') {
      this.setupHomeView();
    } else if (activeView === 'news') {
      this.setupNewsView();
    } else if (activeView === 'matches') {
      this.setupMatchesView();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- HOMEPAGE SPECIFIC COMPONENTS (MATCHING MOCKUP) ---
  setupHomeView() {
    const transferCardsContainer = document.getElementById('home-transfer-cards-container');
    const upcomingMatchesContainer = document.getElementById('home-upcoming-matches-container');

    // 1. Render Left Panel: Latest Transfer News (3 Cards matching mockup)
    if (transferCardsContainer) {
      const transfers = storage.getTransfers().slice(0, 3);
      transferCardsContainer.innerHTML = transfers.map(t => {
        const fromTeam = storage.getTeams().find(tm => tm.name.toLowerCase().includes(t.fromClub.toLowerCase())) || null;
        const toTeam = storage.getTeams().find(tm => tm.name.toLowerCase().includes(t.toClub.toLowerCase())) || null;

        let badgeClass = 'badge-here-we-go';
        let badgeLabel = 'HERE WE GO';

        if (t.status.toLowerCase().includes('official') || t.status.toLowerCase().includes('done')) {
          badgeClass = 'badge-official';
          badgeLabel = 'OFFICIAL';
        } else if (t.status.toLowerCase().includes('rumour')) {
          badgeClass = 'badge-rumour';
          badgeLabel = 'RUMOUR';
        }

        const portraitSrc = t.image || 'assets/images/portrait_jonathan_david.jpg';

        return `
          <div class="home-transfer-card" data-transfer-id="${t.id}">
            <div class="transfer-club-crest-strip">
              <div class="crest-icon-xs">${fromTeam ? fromTeam.logo : `<svg viewBox="0 0 100 100" class="team-crest"><circle cx="50" cy="50" r="45" fill="#1e293b"/><text x="50" y="58" font-size="28" fill="#94a3b8" text-anchor="middle">⚽</text></svg>`}</div>
              <span class="transfer-arrow-sm">➔</span>
              <div class="crest-icon-xs">${toTeam ? toTeam.logo : `<svg viewBox="0 0 100 100" class="team-crest"><circle cx="50" cy="50" r="45" fill="#1e293b"/><text x="50" y="58" font-size="28" fill="#94a3b8" text-anchor="middle">🛡️</text></svg>`}</div>
            </div>

            <div class="transfer-player-portrait-wrap">
              <img src="${portraitSrc}" alt="${t.playerName}" class="transfer-player-img" onerror="this.src='assets/images/portrait_jonathan_david.jpg'">
            </div>

            <span class="transfer-badge-pill ${badgeClass}">${badgeLabel}</span>
            <h4 class="transfer-card-headline">${t.headline}</h4>
            <div class="transfer-card-date">${t.date || '30 May 2025 • 2h ago'}</div>
          </div>
        `;
      }).join('');

      transferCardsContainer.querySelectorAll('.home-transfer-card').forEach(card => {
        card.addEventListener('click', () => {
          const t = storage.getTransferById(card.dataset.transferId);
          if (t) transfersModule.openStoryModal(t);
        });
      });
    }

    // 2. Render Right Panel: Upcoming Top Matches (3 Fixtures matching mockup)
    if (upcomingMatchesContainer) {
      const upcomingMatches = [
        {
          homeId: 'barcelona',
          awayId: 'real-madrid',
          time: '8:00 PM',
          date: '31 May 2025'
        },
        {
          homeId: 'manchester-city',
          awayId: 'liverpool',
          time: '10:30 PM',
          date: '31 May 2025'
        },
        {
          homeId: 'bayern-munich',
          awayId: 'borussia-dortmund',
          time: '12:30 AM',
          date: '01 Jun 2025'
        }
      ];

      upcomingMatchesContainer.innerHTML = upcomingMatches.map(m => {
        const homeTeam = storage.getTeamById(m.homeId) || { name: 'FC Barcelona', logo: '' };
        const awayTeam = storage.getTeamById(m.awayId) || { name: 'Real Madrid', logo: '' };

        return `
          <div class="upcoming-match-row" data-home="${m.homeId}" data-away="${m.awayId}" title="Click to Simulate This Match">
            <div class="match-row-team">
              <div class="match-team-crest">${homeTeam.logo}</div>
              <span class="match-team-name">${homeTeam.name}</span>
            </div>

            <div class="match-row-time-box">
              <div class="match-time-val">${m.time}</div>
              <div class="match-date-val">${m.date}</div>
            </div>

            <div class="match-row-team away">
              <span class="match-team-name">${awayTeam.name}</span>
              <div class="match-team-crest">${awayTeam.logo}</div>
            </div>
          </div>
        `;
      }).join('');

      upcomingMatchesContainer.querySelectorAll('.upcoming-match-row').forEach(row => {
        row.addEventListener('click', () => {
          const home = row.dataset.home;
          const away = row.dataset.away;
          window.location.hash = '#simulator';
          setTimeout(() => {
            simulatorModule.loadMatchup(home, away);
          }, 100);
        });
      });
    }
  }

  // --- DEDICATED NEWS VIEW ---
  setupNewsView() {
    const container = document.getElementById('news-grid-container');
    if (!container) return;

    const newsArticles = [
      {
        id: 'news-1',
        title: 'UEFA Champions League 2025/26: Group Stage Draw & Tactical Power Rankings',
        category: 'Champions League',
        badge: 'ANALYSIS',
        date: '31 May 2025',
        readTime: '4 min read',
        image: 'assets/images/hero_football_stadium.jpg',
        summary: 'A comprehensive tactical analysis of the marquee match-ups as Real Madrid, Manchester City, and Bayern Munich prepare for the European showdown.'
      },
      {
        id: 'news-2',
        title: 'Tactical Masterclass: How Hansi Flick Transformed Barcelona High-Pressing System',
        category: 'Tactical Column',
        badge: 'TACTICS',
        date: '30 May 2025',
        readTime: '6 min read',
        image: 'assets/images/transfer_trio_players.jpg',
        summary: 'Breaking down the vertical transitions, compact midfield diamond, and dynamic wide overloads driving Barcelona stunning resurgence.'
      },
      {
        id: 'news-3',
        title: 'The Evolution of the Modern Number 9: Haaland and Mbappé Statistical Comparison',
        category: 'Premier League',
        badge: 'DEEP DIVE',
        date: '29 May 2025',
        readTime: '5 min read',
        image: 'assets/images/simulator_duo_players.jpg',
        summary: 'Comparing non-penalty xG, conversion rates in high-leverage matches, and box dominance between football two premier generational goalscorers.'
      }
    ];

    container.innerHTML = newsArticles.map(art => `
      <div class="transfer-card" style="cursor: default;">
        <div style="height: 160px; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 1rem;">
          <img src="${art.image}" alt="${art.title}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge badge-cyan">${art.badge}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${art.readTime}</span>
        </div>
        <h3 style="font-size: 1.1rem; color: #ffffff; line-height: 1.35; margin: 0.5rem 0;">${art.title}</h3>
        <p style="font-size: 0.88rem; color: var(--text-secondary);">${art.summary}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid var(--border-subtle); margin-top: auto;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">📅 ${art.date}</span>
          <span class="badge badge-green">Featured Story</span>
        </div>
      </div>
    `).join('');
  }

  // --- DEDICATED MATCHES VIEW ---
  setupMatchesView() {
    const container = document.getElementById('matches-center-container');
    if (!container) return;

    const fixtures = [
      { home: 'barcelona', away: 'real-madrid', league: 'La Liga • Matchday 32', time: '8:00 PM', stadium: 'Spotify Camp Nou' },
      { home: 'manchester-city', away: 'liverpool', league: 'Premier League • Title Clash', time: '10:30 PM', stadium: 'Etihad Stadium' },
      { home: 'bayern-munich', away: 'borussia-dortmund', league: 'Bundesliga • Der Klassiker', time: '12:30 AM', stadium: 'Allianz Arena' },
      { home: 'arsenal', away: 'chelsea', league: 'Premier League • London Derby', time: '5:30 PM', stadium: 'Emirates Stadium' },
      { home: 'juventus', away: 'ac-milan', league: 'Serie A • Superclasico', time: '8:45 PM', stadium: 'Allianz Stadium' },
      { home: 'atletico-madrid', away: 'real-madrid', league: 'La Liga • Madrid Derby', time: '9:00 PM', stadium: 'Cívitas Metropolitano' }
    ];

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
        ${fixtures.map(f => {
          const h = storage.getTeamById(f.home) || { name: f.home, logo: '' };
          const a = storage.getTeamById(f.away) || { name: f.away, logo: '' };
          return `
            <div class="glass-card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge badge-green">${f.league}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted);">🏟️ ${f.stadium}</span>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 0;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 40%;">
                  <div style="width: 44px; height: 44px;">${h.logo}</div>
                  <strong style="font-size: 0.95rem; text-align: center;">${h.name}</strong>
                </div>

                <div style="text-align: center;">
                  <div style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 800; color: var(--accent-green);">${f.time}</div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">LIVE SIM</span>
                </div>

                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 40%;">
                  <div style="width: 44px; height: 44px;">${a.logo}</div>
                  <strong style="font-size: 0.95rem; text-align: center;">${a.name}</strong>
                </div>
              </div>

              <button class="btn btn-primary btn-sm btn-fixture-sim" data-home="${f.home}" data-away="${f.away}" style="width: 100%;">
                <span>🎮</span> Simulate Match
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-fixture-sim').forEach(btn => {
      btn.addEventListener('click', () => {
        const home = btn.dataset.home;
        const away = btn.dataset.away;
        window.location.hash = '#simulator';
        setTimeout(() => {
          simulatorModule.loadMatchup(home, away);
        }, 100);
      });
    });
  }

  // --- GLOBAL SEARCH SYSTEM ---
  setupGlobalSearch() {
    const searchTrigger = document.getElementById('nav-search-trigger');
    const searchModal = document.getElementById('global-search-modal');
    const searchInput = document.getElementById('global-search-input');
    const searchResults = document.getElementById('global-search-results');

    if (!searchTrigger || !searchModal || !searchInput || !searchResults) return;

    searchTrigger.addEventListener('click', () => {
      searchModal.classList.add('active');
      searchInput.value = '';
      searchResults.innerHTML = `<p style="color: var(--text-muted); padding: 1rem; text-align: center;">Type to search for clubs, players, or transfer stories...</p>`;
      setTimeout(() => searchInput.focus(), 100);
    });

    // Keyboard shortcut (Cmd/Ctrl + K)
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchTrigger.click();
      }
      if (e.key === 'Escape' && searchModal.classList.contains('active')) {
        searchModal.classList.remove('active');
      }
    });

    // Close button
    searchModal.querySelector('.modal-close-btn')?.addEventListener('click', () => {
      searchModal.classList.remove('active');
    });

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        searchResults.innerHTML = `<p style="color: var(--text-muted); padding: 1rem; text-align: center;">Type to search...</p>`;
        return;
      }

      const teams = storage.getTeams();
      const transfers = storage.getTransfers();

      const matchedTeams = teams.filter(t => t.name.toLowerCase().includes(q) || t.league.toLowerCase().includes(q));

      const matchedPlayers = [];
      teams.forEach(t => {
        (t.squad || []).forEach(p => {
          if (p.name.toLowerCase().includes(q) || p.position.toLowerCase().includes(q) || p.nationality.toLowerCase().includes(q)) {
            matchedPlayers.push({ player: p, team: t });
          }
        });
      });

      const matchedTransfers = transfers.filter(t => 
        t.playerName.toLowerCase().includes(q) || 
        t.fromClub.toLowerCase().includes(q) || 
        t.toClub.toLowerCase().includes(q) || 
        t.headline.toLowerCase().includes(q)
      );

      let resultsHtml = '';

      if (matchedTeams.length > 0) {
        resultsHtml += `<div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-green); text-transform: uppercase; margin: 0.5rem 0;">Clubs (${matchedTeams.length})</div>`;
        matchedTeams.forEach(t => {
          resultsHtml += `
            <div class="search-result-item" data-action="open-team" data-id="${t.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: var(--radius-sm); cursor: pointer; background: var(--bg-surface); margin-bottom: 0.4rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 24px; height: 24px;">${t.logo}</div>
                <strong>${t.name}</strong>
              </div>
              <span class="badge badge-green">${t.overallRating} OVR</span>
            </div>
          `;
        });
      }

      if (matchedPlayers.length > 0) {
        resultsHtml += `<div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin: 0.5rem 0;">Players (${matchedPlayers.length})</div>`;
        matchedPlayers.slice(0, 5).forEach(({ player, team }) => {
          resultsHtml += `
            <div class="search-result-item" data-action="open-player" data-team-id="${team.id}" data-player-id="${player.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: var(--radius-sm); cursor: pointer; background: var(--bg-surface); margin-bottom: 0.4rem;">
              <div>
                <strong>${player.name}</strong>
                <span style="font-size: 0.8rem; color: var(--text-muted);"> (#${player.number} • ${player.position} • ${team.name})</span>
              </div>
              <span class="badge badge-gold">${player.rating} OVR</span>
            </div>
          `;
        });
      }

      if (matchedTransfers.length > 0) {
        resultsHtml += `<div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-gold); text-transform: uppercase; margin: 0.5rem 0;">Transfers (${matchedTransfers.length})</div>`;
        matchedTransfers.slice(0, 3).forEach(t => {
          resultsHtml += `
            <div class="search-result-item" data-action="open-transfer" data-id="${t.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: var(--radius-sm); cursor: pointer; background: var(--bg-surface); margin-bottom: 0.4rem;">
              <div>
                <strong>${t.playerName}</strong>: ${t.fromClub} ➔ ${t.toClub}
              </div>
              <span class="badge badge-green">${t.status}</span>
            </div>
          `;
        });
      }

      if (!resultsHtml) {
        resultsHtml = `<p style="color: var(--text-muted); padding: 1.5rem; text-align: center;">No matching results for "${q}".</p>`;
      }

      searchResults.innerHTML = resultsHtml;

      // Search Item Handlers
      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action;
          searchModal.classList.remove('active');

          if (action === 'open-team') {
            window.location.hash = `#team-detail-${item.dataset.id}`;
          } else if (action === 'open-player') {
            window.location.hash = `#team-detail-${item.dataset.teamId}`;
            setTimeout(() => {
              const team = storage.getTeamById(item.dataset.teamId);
              const player = team?.squad?.find(p => p.id === item.dataset.playerId);
              if (player && team) teamsModule.openPlayerModal(player, team);
            }, 150);
          } else if (action === 'open-transfer') {
            const transfer = storage.getTransferById(item.dataset.id);
            if (transfer) transfersModule.openStoryModal(transfer);
          }
        });
      });
    });
  }

  // --- AUDIO SYNTHESIZER ---
  setupAudio() {
    const audioBtn = document.getElementById('btn-audio-toggle');
    if (!audioBtn) return;

    audioBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      if (this.soundEnabled) {
        audioBtn.textContent = '🔊';
        audioBtn.classList.remove('muted');
        this.playWhistle();
      } else {
        audioBtn.textContent = '🔇';
        audioBtn.classList.add('muted');
      }
    });

    window.soundEngine = {
      playGoal: () => this.soundEnabled && this.playGoalCheer(),
      playWhistle: () => this.soundEnabled && this.playWhistle(),
      playKick: () => this.soundEnabled && this.playKickSound()
    };
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playWhistle() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2900, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  playKickSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }

  playGoalCheer() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      this.playWhistle();
      setTimeout(() => this.playWhistle(), 150);
    } catch (e) {}
  }

  // --- MOBILE MENU ---
  setupMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle-btn');
    const nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      const isVisible = nav.style.display === 'flex';
      nav.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        nav.style.position = 'absolute';
        nav.style.top = '74px';
        nav.style.left = '0';
        nav.style.right = '0';
        nav.style.background = '#070a0e';
        nav.style.padding = '1.5rem';
        nav.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        nav.querySelector('.nav-links').style.flexDirection = 'column';
        nav.querySelector('.nav-links').style.width = '100%';
      }
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          nav.style.display = 'none';
        }
      });
    });
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const app = new FootballHubApp();
  app.init();
});
