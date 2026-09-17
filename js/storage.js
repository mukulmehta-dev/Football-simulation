// Storage Manager for Football Hub
import { DEFAULT_TEAMS } from './data/defaultTeams.js';
import { DEFAULT_TRANSFERS } from './data/defaultTransfers.js';

const DATA_VERSION = 'football_hub_v3_theme';
const STORAGE_KEYS = {
  VERSION: 'football_hub_version',
  TEAMS: 'football_hub_teams',
  TRANSFERS: 'football_hub_transfers',
  SIM_HISTORY: 'football_hub_sim_history'
};

class StorageManager {
  constructor() {
    this.init();
  }

  get isBrowser() {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  init() {
    if (!this.isBrowser) return;

    const currentVer = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (currentVer !== DATA_VERSION) {
      // Force sync with latest rich dataset for new theme
      this.saveTeams(DEFAULT_TEAMS);
      this.saveTransfers(DEFAULT_TRANSFERS);
      if (!localStorage.getItem(STORAGE_KEYS.SIM_HISTORY)) {
        this.saveSimHistory([]);
      }
      localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
      return;
    }

    if (!localStorage.getItem(STORAGE_KEYS.TEAMS)) {
      this.saveTeams(DEFAULT_TEAMS);
    }

    if (!localStorage.getItem(STORAGE_KEYS.TRANSFERS)) {
      this.saveTransfers(DEFAULT_TRANSFERS);
    }

    if (!localStorage.getItem(STORAGE_KEYS.SIM_HISTORY)) {
      this.saveSimHistory([]);
    }
  }

  // --- TEAMS ---
  getTeams() {
    if (!this.isBrowser) return DEFAULT_TEAMS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEAMS);
      return data ? JSON.parse(data) : DEFAULT_TEAMS;
    } catch (e) {
      console.error('Error loading teams from storage:', e);
      return DEFAULT_TEAMS;
    }
  }

  getTeamById(id) {
    const teams = this.getTeams();
    return teams.find(t => t.id === id) || null;
  }

  saveTeams(teams) {
    if (!this.isBrowser) return false;
    try {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      return true;
    } catch (e) {
      console.error('Error saving teams:', e);
      return false;
    }
  }

  updatePlayer(teamId, updatedPlayer) {
    const teams = this.getTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) return false;

    const squad = teams[teamIndex].squad;
    const playerIndex = squad.findIndex(p => p.id === updatedPlayer.id);

    if (playerIndex !== -1) {
      squad[playerIndex] = { ...squad[playerIndex], ...updatedPlayer };
    } else {
      squad.push(updatedPlayer);
    }

    this.recalculateTeamStats(teams[teamIndex]);
    this.saveTeams(teams);
    return true;
  }

  deletePlayer(teamId, playerId) {
    const teams = this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) return false;

    team.squad = team.squad.filter(p => p.id !== playerId);
    this.recalculateTeamStats(team);
    this.saveTeams(teams);
    return true;
  }

  recalculateTeamStats(team) {
    if (!team.squad || team.squad.length === 0) return;

    const forwards = team.squad.filter(p => p.category === 'Forwards');
    const midfielders = team.squad.filter(p => p.category === 'Midfielders');
    const defenders = team.squad.filter(p => p.category === 'Defenders');
    const gks = team.squad.filter(p => p.category === 'Goalkeepers');

    const avg = arr => arr.length ? Math.round(arr.reduce((acc, curr) => acc + (Number(curr.rating) || 75), 0) / arr.length) : 75;

    team.attackRating = avg(forwards);
    team.midfieldRating = avg(midfielders);
    team.defenseRating = Math.round((avg(defenders) * 0.7) + (avg(gks) * 0.3));
    team.overallRating = Math.round((team.attackRating + team.midfieldRating + team.defenseRating) / 3);
  }

  // --- TRANSFERS ---
  getTransfers() {
    if (!this.isBrowser) return DEFAULT_TRANSFERS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
      const transfers = data ? JSON.parse(data) : DEFAULT_TRANSFERS;
      return transfers.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
      console.error('Error loading transfers from storage:', e);
      return DEFAULT_TRANSFERS;
    }
  }

  getTransferById(id) {
    const transfers = this.getTransfers();
    return transfers.find(t => t.id === id) || null;
  }

  saveTransfers(transfers) {
    if (!this.isBrowser) return false;
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers));
      return true;
    } catch (e) {
      console.error('Error saving transfers:', e);
      return false;
    }
  }

  addTransfer(transfer) {
    const transfers = this.getTransfers();
    const newTransfer = {
      ...transfer,
      id: transfer.id || `transfer-${Date.now()}`,
      timestamp: transfer.timestamp || Date.now(),
      date: transfer.date || new Date().toISOString().split('T')[0]
    };
    transfers.unshift(newTransfer);
    this.saveTransfers(transfers);
    return newTransfer;
  }

  updateTransfer(id, updatedData) {
    const transfers = this.getTransfers();
    const index = transfers.findIndex(t => t.id === id);
    if (index === -1) return false;

    transfers[index] = { ...transfers[index], ...updatedData };
    this.saveTransfers(transfers);
    return true;
  }

  deleteTransfer(id) {
    const transfers = this.getTransfers();
    const filtered = transfers.filter(t => t.id !== id);
    this.saveTransfers(filtered);
    return true;
  }

  // --- SIMULATION HISTORY ---
  getSimHistory() {
    if (!this.isBrowser) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SIM_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveSimHistory(history) {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SIM_HISTORY, JSON.stringify(history.slice(0, 20)));
    } catch (e) {
      console.error('Error saving sim history:', e);
    }
  }

  addSimResult(result) {
    const history = this.getSimHistory();
    history.unshift({
      ...result,
      id: `sim-${Date.now()}`,
      timestamp: Date.now(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    this.saveSimHistory(history);
  }

  // --- BACKUP & RESTORE ---
  exportBackupJSON() {
    return JSON.stringify({
      version: "3.0",
      exportDate: new Date().toISOString(),
      teams: this.getTeams(),
      transfers: this.getTransfers(),
      simHistory: this.getSimHistory()
    }, null, 2);
  }

  importBackupJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.teams && Array.isArray(data.teams)) {
        this.saveTeams(data.teams);
      }
      if (data.transfers && Array.isArray(data.transfers)) {
        this.saveTransfers(data.transfers);
      }
      return true;
    } catch (e) {
      console.error('Invalid backup JSON:', e);
      return false;
    }
  }

  resetToDefaults() {
    if (!this.isBrowser) return false;
    localStorage.removeItem(STORAGE_KEYS.TEAMS);
    localStorage.removeItem(STORAGE_KEYS.TRANSFERS);
    localStorage.removeItem(STORAGE_KEYS.SIM_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.VERSION);
    this.init();
    return true;
  }
}

export const storage = new StorageManager();
