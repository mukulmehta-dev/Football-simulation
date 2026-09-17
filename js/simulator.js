// Match Simulator Module
import { storage } from './storage.js';

class SimulatorModule {
  constructor() {
    this.homeTeam = null;
    this.awayTeam = null;
    this.homeFormation = '4-3-3';
    this.awayFormation = '4-3-3';
    this.simSpeed = 'fast'; // 'instant', 'fast', 'live'
    this.isSimulating = false;
    this.simInterval = null;
    this.currentMatchData = null;
  }

  init() {
    this.populateTeamSelectors();
    this.setupEventListeners();
  }

  populateTeamSelectors() {
    const teams = storage.getTeams();
    const homeSelect = document.getElementById('sim-home-team-select');
    const awaySelect = document.getElementById('sim-away-team-select');
    if (!homeSelect || !awaySelect) return;

    const optionsHtml = teams.map(t => `<option value="${t.id}">${t.name} (${t.league})</option>`).join('');
    homeSelect.innerHTML = optionsHtml;
    awaySelect.innerHTML = optionsHtml;

    // Default select 1st and 2nd team
    if (teams.length >= 2) {
      homeSelect.value = teams[0].id;
      awaySelect.value = teams[1].id;
      this.homeTeam = teams[0];
      this.awayTeam = teams[1];
    } else if (teams.length === 1) {
      this.homeTeam = teams[0];
      this.awayTeam = teams[0];
    }

    this.updateTeamPreviews();
  }

  loadMatchup(homeId, awayId) {
    const homeSelect = document.getElementById('sim-home-team-select');
    const awaySelect = document.getElementById('sim-away-team-select');
    
    const h = storage.getTeamById(homeId);
    const a = storage.getTeamById(awayId);

    if (h && a) {
      this.homeTeam = h;
      this.awayTeam = a;
      if (homeSelect) homeSelect.value = homeId;
      if (awaySelect) awaySelect.value = awayId;
      this.updateTeamPreviews();
    }
  }

  updateTeamPreviews() {
    if (!this.homeTeam || !this.awayTeam) return;

    // Home Preview
    const homeCrest = document.getElementById('home-preview-crest');
    const homeAtt = document.getElementById('home-preview-att');
    const homeMid = document.getElementById('home-preview-mid');
    const homeDef = document.getElementById('home-preview-def');
    if (homeCrest) homeCrest.innerHTML = this.homeTeam.logo;
    if (homeAtt) homeAtt.textContent = this.homeTeam.attackRating || 85;
    if (homeMid) homeMid.textContent = this.homeTeam.midfieldRating || 85;
    if (homeDef) homeDef.textContent = this.homeTeam.defenseRating || 85;

    // Away Preview
    const awayCrest = document.getElementById('away-preview-crest');
    const awayAtt = document.getElementById('away-preview-att');
    const awayMid = document.getElementById('away-preview-mid');
    const awayDef = document.getElementById('away-preview-def');
    if (awayCrest) awayCrest.innerHTML = this.awayTeam.logo;
    if (awayAtt) awayAtt.textContent = this.awayTeam.attackRating || 85;
    if (awayMid) awayMid.textContent = this.awayTeam.midfieldRating || 85;
    if (awayDef) awayDef.textContent = this.awayTeam.defenseRating || 85;
  }

  setupEventListeners() {
    const homeSelect = document.getElementById('sim-home-team-select');
    const awaySelect = document.getElementById('sim-away-team-select');
    const homeFormationSelect = document.getElementById('home-formation-select');
    const awayFormationSelect = document.getElementById('away-formation-select');
    const btnSimulate = document.getElementById('btn-start-simulation');
    const speedButtons = document.querySelectorAll('.speed-btn');

    homeSelect?.addEventListener('change', (e) => {
      this.homeTeam = storage.getTeamById(e.target.value);
      this.updateTeamPreviews();
    });

    awaySelect?.addEventListener('change', (e) => {
      this.awayTeam = storage.getTeamById(e.target.value);
      this.updateTeamPreviews();
    });

    homeFormationSelect?.addEventListener('change', (e) => {
      this.homeFormation = e.target.value;
    });

    awayFormationSelect?.addEventListener('change', (e) => {
      this.awayFormation = e.target.value;
    });

    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.simSpeed = btn.dataset.speed;
      });
    });

    btnSimulate?.addEventListener('click', () => {
      if (this.isSimulating) return;
      this.startSimulation();
    });
  }

  // Auto pick best 11 players for a team based on ratings & positions
  getStartingXI(team, formation) {
    const squad = team.squad || [];
    const gks = squad.filter(p => p.category === 'Goalkeepers').sort((a, b) => b.rating - a.rating);
    const defs = squad.filter(p => p.category === 'Defenders').sort((a, b) => b.rating - a.rating);
    const mids = squad.filter(p => p.category === 'Midfielders').sort((a, b) => b.rating - a.rating);
    const fwds = squad.filter(p => p.category === 'Forwards').sort((a, b) => b.rating - a.rating);

    const xi = [];
    if (gks.length) xi.push(gks[0]);

    // Parse formation e.g. "4-3-3" -> 4 DEF, 3 MID, 3 FWD
    const parts = formation.split('-').map(Number);
    const numDefs = parts[0] || 4;
    const numMids = parts[1] || 3;
    const numFwds = parts[2] || 3;

    xi.push(...defs.slice(0, numDefs));
    xi.push(...mids.slice(0, numMids));
    xi.push(...fwds.slice(0, numFwds));

    // Fill remaining if squad is small
    while (xi.length < 11 && squad.length > xi.length) {
      const remaining = squad.filter(p => !xi.some(x => x.id === p.id));
      if (remaining.length) xi.push(remaining[0]);
      else break;
    }

    return xi;
  }

  // Core Simulation Generator
  generateMatchEvents(homeTeam, awayTeam, homeFormation, awayFormation) {
    const homeXI = this.getStartingXI(homeTeam, homeFormation);
    const awayXI = this.getStartingXI(awayTeam, awayFormation);

    // Calculate effective strengths
    const calcAvg = arr => arr.length ? arr.reduce((sum, p) => sum + p.rating, 0) / arr.length : 80;
    
    const homeAtt = calcAvg(homeXI.filter(p => p.category === 'Forwards'));
    const homeMid = calcAvg(homeXI.filter(p => p.category === 'Midfielders'));
    const homeDef = calcAvg(homeXI.filter(p => p.category === 'Defenders'));
    const homeGK = homeXI.find(p => p.category === 'Goalkeepers') || { rating: 80, name: 'Goalkeeper' };

    const awayAtt = calcAvg(awayXI.filter(p => p.category === 'Forwards'));
    const awayMid = calcAvg(awayXI.filter(p => p.category === 'Midfielders'));
    const awayDef = calcAvg(awayXI.filter(p => p.category === 'Defenders'));
    const awayGK = awayXI.find(p => p.category === 'Goalkeepers') || { rating: 80, name: 'Goalkeeper' };

    // Possession % (Midfield battle + 3% home advantage)
    const midDiff = homeMid - awayMid;
    let homePossession = Math.round(50 + (midDiff * 1.5) + 3 + (Math.random() * 4 - 2));
    homePossession = Math.max(35, Math.min(65, homePossession));
    const awayPossession = 100 - homePossession;

    const events = [];
    let homeScore = 0;
    let awayScore = 0;
    let homeShots = 0;
    let awayShots = 0;
    let homeShotsOnTarget = 0;
    let awayShotsOnTarget = 0;
    let homeCorners = 0;
    let awayCorners = 0;
    let homeFouls = 0;
    let awayFouls = 0;
    let homeOffsides = 0;
    let awayOffsides = 0;
    let homeXG = 0.0;
    let awayXG = 0.0;

    // Player match stats tracker for MOTM
    const playerRatings = {};
    [...homeXI, ...awayXI].forEach(p => {
      playerRatings[p.id] = { player: p, score: 6.0, goals: 0, assists: 0, team: homeXI.includes(p) ? 'home' : 'away' };
    });

    // Helper to pick player by weight
    const pickPlayer = (list) => {
      if (!list || list.length === 0) return { name: 'Player', id: 'unknown' };
      const weights = list.map(p => Math.pow(p.rating / 10, 2));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let randomVal = Math.random() * totalWeight;
      for (let i = 0; i < list.length; i++) {
        randomVal -= weights[i];
        if (randomVal <= 0) return list[i];
      }
      return list[0];
    };

    // Simulate 90 minutes in chunks
    for (let minute = 1; minute <= 90; minute++) {
      const isHomeAction = Math.random() * 100 < homePossession;

      // Random event chance
      const eventChance = Math.random();

      if (eventChance < 0.18) { // Chance Creation
        if (isHomeAction) {
          homeShots++;
          const shotQuality = (homeAtt / (awayDef + 15)) * (0.6 + Math.random() * 0.8);
          const xgValue = Number((shotQuality * 0.35).toFixed(2));
          homeXG += xgValue;

          const shooter = pickPlayer(homeXI.filter(p => p.category === 'Forwards' || p.category === 'Midfielders'));

          if (Math.random() < 0.65) { // Shot on target
            homeShotsOnTarget++;
            const goalProb = (shooter.rating || 80) / ((awayGK.rating || 80) * 1.35) * shotQuality;

            if (Math.random() < goalProb * 0.45) { // GOAL!
              homeScore++;
              if (playerRatings[shooter.id]) {
                playerRatings[shooter.id].goals++;
                playerRatings[shooter.id].score += 1.8;
              }

              const assisters = homeXI.filter(p => p.id !== shooter.id && p.category !== 'Goalkeepers');
              const assister = Math.random() < 0.7 ? pickPlayer(assisters) : null;
              if (assister && playerRatings[assister.id]) {
                playerRatings[assister.id].assists++;
                playerRatings[assister.id].score += 1.0;
              }

              events.push({
                minute,
                type: 'goal',
                team: 'home',
                teamName: homeTeam.name,
                scorer: shooter.name,
                assister: assister ? assister.name : null,
                icon: '⚽',
                desc: `<strong>GOAL!</strong> ${shooter.name} scores for ${homeTeam.name}! ${assister ? `(Assist: ${assister.name})` : '(Solo effort)'}`,
                scoreState: `${homeScore} - ${awayScore}`
              });
            } else { // GK Save / Defense block
              events.push({
                minute,
                type: 'save',
                team: 'home',
                icon: '🧤',
                desc: `Chance for ${homeTeam.name}! ${shooter.name}'s effort is brilliantly saved by ${awayGK.name}.`
              });
            }
          } else {
            if (Math.random() < 0.15) {
              events.push({
                minute,
                type: 'woodwork',
                team: 'home',
                icon: '💥',
                desc: `Off the post! ${shooter.name} rattles the woodwork for ${homeTeam.name}!`
              });
            }
          }
        } else {
          // Away Action
          awayShots++;
          const shotQuality = (awayAtt / (homeDef + 15)) * (0.6 + Math.random() * 0.8);
          const xgValue = Number((shotQuality * 0.35).toFixed(2));
          awayXG += xgValue;

          const shooter = pickPlayer(awayXI.filter(p => p.category === 'Forwards' || p.category === 'Midfielders'));

          if (Math.random() < 0.65) {
            awayShotsOnTarget++;
            const goalProb = (shooter.rating || 80) / ((homeGK.rating || 80) * 1.35) * shotQuality;

            if (Math.random() < goalProb * 0.45) { // GOAL!
              awayScore++;
              if (playerRatings[shooter.id]) {
                playerRatings[shooter.id].goals++;
                playerRatings[shooter.id].score += 1.8;
              }

              const assisters = awayXI.filter(p => p.id !== shooter.id && p.category !== 'Goalkeepers');
              const assister = Math.random() < 0.7 ? pickPlayer(assisters) : null;
              if (assister && playerRatings[assister.id]) {
                playerRatings[assister.id].assists++;
                playerRatings[assister.id].score += 1.0;
              }

              events.push({
                minute,
                type: 'goal',
                team: 'away',
                teamName: awayTeam.name,
                scorer: shooter.name,
                assister: assister ? assister.name : null,
                icon: '⚽',
                desc: `<strong>GOAL!</strong> ${shooter.name} equalizes/scores for ${awayTeam.name}! ${assister ? `(Assist: ${assister.name})` : ''}`,
                scoreState: `${homeScore} - ${awayScore}`
              });
            } else {
              events.push({
                minute,
                type: 'save',
                team: 'away',
                icon: '🧤',
                desc: `Good save by ${homeGK.name} denying ${shooter.name}!`
              });
            }
          }
        }
      } else if (eventChance < 0.24) { // Fouls / Cards / Corners
        if (Math.random() < 0.5) {
          homeFouls++;
          if (Math.random() < 0.2) {
            const booked = pickPlayer(homeXI.filter(p => p.category === 'Defenders' || p.category === 'Midfielders'));
            events.push({
              minute,
              type: 'card',
              team: 'home',
              icon: '🟨',
              desc: `Yellow card shown to <strong>${booked.name}</strong> (${homeTeam.name}) for a late challenge.`
            });
            if (playerRatings[booked.id]) playerRatings[booked.id].score -= 0.5;
          }
        } else {
          awayFouls++;
          if (Math.random() < 0.2) {
            const booked = pickPlayer(awayXI.filter(p => p.category === 'Defenders' || p.category === 'Midfielders'));
            events.push({
              minute,
              type: 'card',
              team: 'away',
              icon: '🟨',
              desc: `Yellow card shown to <strong>${booked.name}</strong> (${awayTeam.name}) for a tactical foul.`
            });
            if (playerRatings[booked.id]) playerRatings[booked.id].score -= 0.5;
          }
        }
      } else if (minute === 65 || minute === 72) { // Substitutions
        const subTeam = minute === 65 ? homeTeam : awayTeam;
        const subXI = minute === 65 ? homeXI : awayXI;
        const subSquad = subTeam.squad || [];
        const bench = subSquad.filter(p => !subXI.some(x => x.id === p.id));
        if (bench.length) {
          const playerOut = subXI[subXI.length - 1];
          const playerIn = bench[0];
          events.push({
            minute,
            type: 'sub',
            team: minute === 65 ? 'home' : 'away',
            icon: '🔄',
            desc: `Substitution for ${subTeam.name}: <strong>${playerIn.name}</strong> replaces <strong>${playerOut.name}</strong>.`
          });
        }
      }

      // Occasional corner & offside counts
      if (Math.random() < 0.08) homeCorners++;
      if (Math.random() < 0.08) awayCorners++;
      if (Math.random() < 0.03) homeOffsides++;
      if (Math.random() < 0.03) awayOffsides++;
    }

    // Clean sheet bonus for defense and GK
    if (awayScore === 0) {
      homeXI.filter(p => p.category === 'Defenders' || p.category === 'Goalkeepers').forEach(p => {
        if (playerRatings[p.id]) playerRatings[p.id].score += 1.2;
      });
    }
    if (homeScore === 0) {
      awayXI.filter(p => p.category === 'Defenders' || p.category === 'Goalkeepers').forEach(p => {
        if (playerRatings[p.id]) playerRatings[p.id].score += 1.2;
      });
    }

    // Calculate MOTM
    let motm = null;
    let maxScore = -1;
    Object.values(playerRatings).forEach(pr => {
      // Add slight random performance variance
      pr.score = Number((pr.score + (Math.random() * 1.5)).toFixed(1));
      pr.score = Math.min(9.9, Math.max(6.0, pr.score));
      if (pr.score > maxScore) {
        maxScore = pr.score;
        motm = pr;
      }
    });

    return {
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      homePossession,
      awayPossession,
      homeShots: Math.max(homeScore, homeShots),
      awayShots: Math.max(awayScore, awayShots),
      homeShotsOnTarget: Math.max(homeScore, homeShotsOnTarget),
      awayShotsOnTarget: Math.max(awayScore, awayShotsOnTarget),
      homeCorners,
      awayCorners,
      homeFouls,
      awayFouls,
      homeOffsides,
      awayOffsides,
      homeXG: Number(homeXG.toFixed(2)),
      awayXG: Number(awayXG.toFixed(2)),
      events,
      motm,
      playerRatings
    };
  }

  startSimulation() {
    if (!this.homeTeam || !this.awayTeam) return;

    this.isSimulating = true;
    const btnSimulate = document.getElementById('btn-start-simulation');
    if (btnSimulate) {
      btnSimulate.disabled = true;
      btnSimulate.innerHTML = `<span>⏳ Simulating 90'...</span>`;
    }

    // Play whistle sound
    window.footballHubApp?.playWhistleSound();

    const matchData = this.generateMatchEvents(
      this.homeTeam,
      this.awayTeam,
      this.homeFormation,
      this.awayFormation
    );
    this.currentMatchData = matchData;

    // Show Live Scoreboard container
    const liveContainer = document.getElementById('live-sim-arena-container');
    if (liveContainer) liveContainer.style.display = 'block';

    this.setupScoreboardDisplay(matchData);

    if (this.simSpeed === 'instant') {
      this.completeSimulation(matchData);
    } else {
      this.animateLiveSimulation(matchData);
    }
  }

  setupScoreboardDisplay(matchData) {
    const homeName = document.getElementById('sim-scoreboard-home-name');
    const awayName = document.getElementById('sim-scoreboard-away-name');
    const homeCrest = document.getElementById('sim-scoreboard-home-crest');
    const awayCrest = document.getElementById('sim-scoreboard-away-crest');
    const homeScoreEl = document.getElementById('sim-score-home');
    const awayScoreEl = document.getElementById('sim-score-away');
    const clockEl = document.getElementById('sim-match-clock');
    const timelineList = document.getElementById('sim-timeline-events');
    const progressBar = document.getElementById('sim-match-progress');
    const postMatchCard = document.getElementById('sim-post-match-report');

    if (homeName) homeName.textContent = matchData.homeTeam.name;
    if (awayName) awayName.textContent = matchData.awayTeam.name;
    if (homeCrest) homeCrest.innerHTML = matchData.homeTeam.logo;
    if (awayCrest) awayCrest.innerHTML = matchData.awayTeam.logo;
    if (homeScoreEl) homeScoreEl.textContent = '0';
    if (awayScoreEl) awayScoreEl.textContent = '0';
    if (clockEl) clockEl.textContent = "00'";
    if (timelineList) timelineList.innerHTML = `<div class="timeline-event-item" style="color: var(--text-muted);">Match kick-off! Referee blows the whistle.</div>`;
    if (progressBar) progressBar.style.width = '0%';
    if (postMatchCard) postMatchCard.style.display = 'none';

    this.updateStatsDisplay({
      homePossession: 50, awayPossession: 50,
      homeShots: 0, awayShots: 0,
      homeShotsOnTarget: 0, awayShotsOnTarget: 0,
      homeXG: 0, awayXG: 0,
      homeCorners: 0, awayCorners: 0,
      homeFouls: 0, awayFouls: 0
    });
  }

  animateLiveSimulation(matchData) {
    let currentMinute = 1;
    const intervalMs = this.simSpeed === 'fast' ? 70 : 300; // ~6.3s or 27s total
    const homeScoreEl = document.getElementById('sim-score-home');
    const awayScoreEl = document.getElementById('sim-score-away');
    const clockEl = document.getElementById('sim-match-clock');
    const timelineList = document.getElementById('sim-timeline-events');
    const progressBar = document.getElementById('sim-match-progress');

    let currentHomeScore = 0;
    let currentAwayScore = 0;

    clearInterval(this.simInterval);

    this.simInterval = setInterval(() => {
      currentMinute++;
      if (clockEl) clockEl.textContent = `${currentMinute}'`;
      if (progressBar) progressBar.style.width = `${(currentMinute / 90) * 100}%`;

      // Check for events at this minute
      const minuteEvents = matchData.events.filter(e => e.minute === currentMinute);
      minuteEvents.forEach(evt => {
        const item = document.createElement('div');
        item.className = `timeline-event-item ${evt.type}`;
        item.innerHTML = `
          <span class="event-minute">${evt.minute}'</span>
          <span class="event-icon">${evt.icon}</span>
          <div class="event-desc">${evt.desc}</div>
        `;
        timelineList.prepend(item);

        if (evt.type === 'goal') {
          window.footballHubApp?.playGoalSound();
          if (evt.team === 'home') {
            currentHomeScore++;
            if (homeScoreEl) {
              homeScoreEl.textContent = currentHomeScore;
              homeScoreEl.classList.add('goal-flash');
              setTimeout(() => homeScoreEl.classList.remove('goal-flash'), 800);
            }
          } else {
            currentAwayScore++;
            if (awayScoreEl) {
              awayScoreEl.textContent = currentAwayScore;
              awayScoreEl.classList.add('goal-flash');
              setTimeout(() => awayScoreEl.classList.remove('goal-flash'), 800);
            }
          }
        }
      });

      // Update progressive stats
      const progressFraction = currentMinute / 90;
      this.updateStatsDisplay({
        homePossession: matchData.homePossession,
        awayPossession: matchData.awayPossession,
        homeShots: Math.round(matchData.homeShots * progressFraction),
        awayShots: Math.round(matchData.awayShots * progressFraction),
        homeShotsOnTarget: Math.round(matchData.homeShotsOnTarget * progressFraction),
        awayShotsOnTarget: Math.round(matchData.awayShotsOnTarget * progressFraction),
        homeXG: Number((matchData.homeXG * progressFraction).toFixed(2)),
        awayXG: Number((matchData.awayXG * progressFraction).toFixed(2)),
        homeCorners: Math.round(matchData.homeCorners * progressFraction),
        awayCorners: Math.round(matchData.awayCorners * progressFraction),
        homeFouls: Math.round(matchData.homeFouls * progressFraction),
        awayFouls: Math.round(matchData.awayFouls * progressFraction)
      });

      if (currentMinute >= 90) {
        clearInterval(this.simInterval);
        this.completeSimulation(matchData);
      }
    }, intervalMs);
  }

  completeSimulation(matchData) {
    this.isSimulating = false;
    const btnSimulate = document.getElementById('btn-start-simulation');
    if (btnSimulate) {
      btnSimulate.disabled = false;
      btnSimulate.innerHTML = `<span>⚽ Simulate Match</span>`;
    }

    const homeScoreEl = document.getElementById('sim-score-home');
    const awayScoreEl = document.getElementById('sim-score-away');
    const clockEl = document.getElementById('sim-match-clock');
    const progressBar = document.getElementById('sim-match-progress');
    const timelineList = document.getElementById('sim-timeline-events');

    if (homeScoreEl) homeScoreEl.textContent = matchData.homeScore;
    if (awayScoreEl) awayScoreEl.textContent = matchData.awayScore;
    if (clockEl) clockEl.textContent = 'FT';
    if (progressBar) progressBar.style.width = '100%';

    // Render full events if instant
    if (this.simSpeed === 'instant' && timelineList) {
      timelineList.innerHTML = matchData.events.map(evt => `
        <div class="timeline-event-item ${evt.type}">
          <span class="event-minute">${evt.minute}'</span>
          <span class="event-icon">${evt.icon}</span>
          <div class="event-desc">${evt.desc}</div>
        </div>
      `).join('') || `<div class="timeline-event-item">No major events recorded in the match.</div>`;
    }

    // Final whistle sound
    window.footballHubApp?.playWhistleSound();

    // Final Stats
    this.updateStatsDisplay(matchData);

    // Render Post-Match MOTM & Report
    this.renderPostMatchReport(matchData);

    // Save to storage history
    storage.addSimResult({
      homeTeamName: matchData.homeTeam.name,
      awayTeamName: matchData.awayTeam.name,
      homeScore: matchData.homeScore,
      awayScore: matchData.awayScore,
      motmName: matchData.motm ? matchData.motm.player.name : 'N/A'
    });
  }

  updateStatsDisplay(stats) {
    const setStat = (titleId, homeValId, awayValId, homeBarId, awayBarId, homeVal, awayVal, isPercent = false) => {
      const homeValEl = document.getElementById(homeValId);
      const awayValEl = document.getElementById(awayValId);
      const homeBarEl = document.getElementById(homeBarId);
      const awayBarEl = document.getElementById(awayBarId);

      if (homeValEl) homeValEl.textContent = isPercent ? `${homeVal}%` : homeVal;
      if (awayValEl) awayValEl.textContent = isPercent ? `${awayVal}%` : awayVal;

      const total = Number(homeVal) + Number(awayVal) || 1;
      const homePct = (Number(homeVal) / total) * 100;
      const awayPct = 100 - homePct;

      if (homeBarEl) homeBarEl.style.width = `${homePct}%`;
      if (awayBarEl) awayBarEl.style.width = `${awayPct}%`;
    };

    setStat('stat-possession', 'stat-home-possession', 'stat-away-possession', 'bar-home-possession', 'bar-away-possession', stats.homePossession, stats.awayPossession, true);
    setStat('stat-shots', 'stat-home-shots', 'stat-away-shots', 'bar-home-shots', 'bar-away-shots', stats.homeShots, stats.awayShots);
    setStat('stat-sot', 'stat-home-sot', 'stat-away-sot', 'bar-home-sot', 'bar-away-sot', stats.homeShotsOnTarget, stats.awayShotsOnTarget);
    setStat('stat-xg', 'stat-home-xg', 'stat-away-xg', 'bar-home-xg', 'bar-away-xg', stats.homeXG, stats.awayXG);
    setStat('stat-corners', 'stat-home-corners', 'stat-away-corners', 'bar-home-corners', 'bar-away-corners', stats.homeCorners, stats.awayCorners);
    setStat('stat-fouls', 'stat-home-fouls', 'stat-away-fouls', 'bar-home-fouls', 'bar-away-fouls', stats.homeFouls, stats.awayFouls);
  }

  renderPostMatchReport(matchData) {
    const postMatchCard = document.getElementById('sim-post-match-report');
    if (!postMatchCard) return;

    postMatchCard.style.display = 'grid';
    const motm = matchData.motm;

    postMatchCard.innerHTML = `
      <div class="motm-badge-card">
        <div class="motm-trophy-icon">🏆</div>
        <div class="motm-details">
          <div class="badge badge-gold" style="margin-bottom: 0.4rem;">Official Man of the Match</div>
          <h4>${motm ? motm.player.name : 'Match MVP'}</h4>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.2rem;">
            ${motm ? `${motm.player.position} • Rating: <strong style="color: var(--accent-gold); font-size: 1.1rem;">${motm.score}</strong>` : ''}
          </p>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem;">
            ${motm?.goals ? `⚽ ${motm.goals} Goal(s)` : ''} ${motm?.assists ? `👟 ${motm.assists} Assist(s)` : ''}
          </p>
        </div>
      </div>

      <div class="match-player-ratings-summary">
        <h4 style="font-size: 1.05rem; margin-bottom: 0.5rem;">🌟 Top Player Match Ratings</h4>
        ${Object.values(matchData.playerRatings)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map(pr => `
            <div class="player-rating-row">
              <span>${pr.player.name} (${pr.player.position})</span>
              <strong style="color: ${pr.score >= 8.5 ? 'var(--accent-gold)' : pr.score >= 7.5 ? 'var(--accent-green)' : 'var(--accent-cyan)'};">
                ${pr.score}
              </strong>
            </div>
          `).join('')}
      </div>
    `;
  }
}

export const simulatorModule = new SimulatorModule();
