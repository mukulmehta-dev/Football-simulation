// Admin Panel Controller Module
import { storage } from './storage.js';

class AdminModule {
  constructor() {
    this.currentAdminTab = 'publish-transfer';
    this.selectedTeamId = null;
  }

  init() {
    this.setupTabNavigation();
    this.setupPublishTransferForm();
    this.setupSquadManager();
    this.setupTransferListManager();
    this.setupBackupTools();
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.currentAdminTab = targetTab;

        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`tab-${targetTab}`)?.classList.add('active');

        // Re-render specific tab contents
        if (targetTab === 'manage-squads') this.renderSquadManagerTable();
        if (targetTab === 'manage-transfers') this.renderTransferPostsList();
      });
    });
  }

  // --- TAB 1: PUBLISH TRANSFER FORM ---
  setupPublishTransferForm() {
    const form = document.getElementById('admin-publish-transfer-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const playerName = document.getElementById('transfer-player-name')?.value.trim();
      const fromClub = document.getElementById('transfer-from-club')?.value.trim();
      const toClub = document.getElementById('transfer-to-club')?.value.trim();
      const fee = document.getElementById('transfer-fee')?.value.trim();
      const status = document.getElementById('transfer-status')?.value;
      const tier = document.getElementById('transfer-tier')?.value;
      const author = document.getElementById('transfer-author')?.value.trim();
      const headline = document.getElementById('transfer-headline')?.value.trim();
      const summary = document.getElementById('transfer-summary')?.value.trim();
      const fullArticle = document.getElementById('transfer-article')?.value.trim();

      if (!playerName || !fromClub || !toClub || !headline || !summary) {
        window.footballHubApp?.showToast('Please fill in all required transfer fields.', 'error');
        return;
      }

      const newPost = {
        playerName,
        fromClub,
        toClub,
        fee: fee || 'Undisclosed Fee',
        status,
        tier: tier || 'Tier 1',
        author: author || 'Football Hub News',
        headline,
        summary,
        fullArticle: fullArticle || summary,
        date: new Date().toISOString().split('T')[0]
      };

      storage.addTransfer(newPost);
      form.reset();

      window.footballHubApp?.showToast(`Transfer for ${playerName} published successfully!`, 'success');
      
      // Refresh transfer feeds
      import('./transfers.js').then(m => m.transfersModule.init());
    });
  }

  // --- TAB 2: SQUAD & PLAYER RATINGS MANAGER ---
  setupSquadManager() {
    const teamSelect = document.getElementById('admin-squad-team-select');
    if (!teamSelect) return;

    const teams = storage.getTeams();
    teamSelect.innerHTML = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    if (teams.length > 0) {
      this.selectedTeamId = teams[0].id;
    }

    teamSelect.addEventListener('change', (e) => {
      this.selectedTeamId = e.target.value;
      this.renderSquadManagerTable();
    });

    // Add Player Modal / Form
    const addPlayerForm = document.getElementById('admin-add-player-form');
    addPlayerForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const teamId = this.selectedTeamId;
      if (!teamId) return;

      const name = document.getElementById('new-player-name')?.value.trim();
      const number = Number(document.getElementById('new-player-number')?.value) || 99;
      const category = document.getElementById('new-player-category')?.value;
      const position = document.getElementById('new-player-position')?.value.toUpperCase();
      const rating = Number(document.getElementById('new-player-rating')?.value) || 80;
      const nationality = document.getElementById('new-player-nationality')?.value.trim() || 'Unknown';
      const age = Number(document.getElementById('new-player-age')?.value) || 24;

      if (!name) {
        window.footballHubApp?.showToast('Player name is required.', 'error');
        return;
      }

      const newPlayer = {
        id: `${teamId}-custom-${Date.now()}`,
        name,
        number,
        category,
        position,
        rating,
        nationality,
        age,
        pace: rating - 2,
        shooting: category === 'Forwards' ? rating : 65,
        passing: category === 'Midfielders' ? rating : 70,
        dribbling: rating - 3,
        defending: category === 'Defenders' || category === 'Goalkeepers' ? rating : 50,
        physical: rating - 4
      };

      storage.updatePlayer(teamId, newPlayer);
      addPlayerForm.reset();
      this.renderSquadManagerTable();

      window.footballHubApp?.showToast(`Added ${name} to squad!`, 'success');
      import('./teams.js').then(m => m.teamsModule.init());
      import('./simulator.js').then(m => m.simulatorModule.init());
    });
  }

  renderSquadManagerTable() {
    const tbody = document.getElementById('admin-squad-table-body');
    if (!tbody || !this.selectedTeamId) return;

    const team = storage.getTeamById(this.selectedTeamId);
    if (!team || !team.squad) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No squad data found.</td></tr>`;
      return;
    }

    tbody.innerHTML = team.squad.map(player => `
      <tr data-player-id="${player.id}">
        <td><strong>#${player.number}</strong></td>
        <td>
          <div style="font-weight: 600;">${player.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${player.nationality} • ${player.age || 24}y</div>
        </td>
        <td><span class="position-tag">${player.position}</span> (${player.category})</td>
        <td>
          <input 
            type="number" 
            class="rating-input-sm player-rating-field" 
            min="50" 
            max="99" 
            value="${player.rating}" 
            data-player-id="${player.id}"
          />
        </td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm btn-save-rating" data-player-id="${player.id}">Save</button>
            <button class="btn btn-danger btn-sm btn-delete-player" data-player-id="${player.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach save rating listeners
    tbody.querySelectorAll('.btn-save-rating').forEach(btn => {
      btn.addEventListener('click', () => {
        const playerId = btn.dataset.playerId;
        const input = tbody.querySelector(`.player-rating-field[data-player-id="${playerId}"]`);
        const newRating = Number(input.value);

        if (newRating >= 50 && newRating <= 99) {
          const player = team.squad.find(p => p.id === playerId);
          if (player) {
            player.rating = newRating;
            storage.updatePlayer(team.id, player);
            window.footballHubApp?.showToast(`Updated rating for ${player.name} to ${newRating}!`, 'success');
            import('./teams.js').then(m => m.teamsModule.init());
            import('./simulator.js').then(m => m.simulatorModule.init());
          }
        } else {
          window.footballHubApp?.showToast('Rating must be between 50 and 99', 'error');
        }
      });
    });

    // Attach delete listeners
    tbody.querySelectorAll('.btn-delete-player').forEach(btn => {
      btn.addEventListener('click', () => {
        const playerId = btn.dataset.playerId;
        if (confirm('Are you sure you want to remove this player from the squad?')) {
          storage.deletePlayer(team.id, playerId);
          this.renderSquadManagerTable();
          window.footballHubApp?.showToast('Player deleted from squad', 'info');
          import('./teams.js').then(m => m.teamsModule.init());
        }
      });
    });
  }

  // --- TAB 3: MANAGE TRANSFER POSTS (EDIT / DELETE) ---
  setupTransferListManager() {
    this.renderTransferPostsList();
  }

  renderTransferPostsList() {
    const listContainer = document.getElementById('admin-transfers-list-container');
    if (!listContainer) return;

    const transfers = storage.getTransfers();
    if (transfers.length === 0) {
      listContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted);">No transfer posts available.</p>`;
      return;
    }

    listContainer.innerHTML = transfers.map(t => `
      <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 250px;">
          <div style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 700;">${t.status} • ${t.date}</div>
          <h4 style="margin: 0.2rem 0;">${t.headline}</h4>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${t.fromClub} ➔ ${t.toClub} (${t.fee})</div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-danger btn-sm btn-delete-transfer" data-transfer-id="${t.id}">Delete Post</button>
        </div>
      </div>
    `).join('');

    listContainer.querySelectorAll('.btn-delete-transfer').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.transferId;
        if (confirm('Delete this transfer post?')) {
          storage.deleteTransfer(id);
          this.renderTransferPostsList();
          window.footballHubApp?.showToast('Transfer post removed', 'info');
          import('./transfers.js').then(m => m.transfersModule.init());
        }
      });
    });
  }

  // --- TAB 4: BACKUP, RESTORE & FACTORY RESET ---
  setupBackupTools() {
    const btnExport = document.getElementById('btn-export-backup');
    const btnImport = document.getElementById('btn-import-backup');
    const fileInput = document.getElementById('import-backup-file');
    const btnReset = document.getElementById('btn-factory-reset');

    btnExport?.addEventListener('click', () => {
      const json = storage.exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `football-hub-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      window.footballHubApp?.showToast('Backup JSON exported successfully!', 'success');
    });

    btnImport?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const success = storage.importBackupJSON(event.target.result);
        if (success) {
          window.footballHubApp?.showToast('Backup restored successfully!', 'success');
          setTimeout(() => location.reload(), 800);
        } else {
          window.footballHubApp?.showToast('Invalid backup file format.', 'error');
        }
      };
      reader.readAsText(file);
    });

    btnReset?.addEventListener('click', () => {
      if (confirm('⚠️ Reset all squads, ratings, and transfers back to default data? Any custom players or articles will be cleared.')) {
        storage.resetToDefaults();
        window.footballHubApp?.showToast('Database reset to defaults!', 'success');
        setTimeout(() => location.reload(), 600);
      }
    });
  }
}

export const adminModule = new AdminModule();
