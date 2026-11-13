/**
 * Room — the authoritative game state machine for one lobby.
 *
 * The Room knows nothing about sockets. Every mutation ends with `this.emit()`,
 * which calls the `onChange` callback supplied by the socket layer; that layer
 * then sends each player a personalised snapshot via `toView(playerId)`.
 *
 * Room states:
 *   waiting           — lobby: players join, form teams of 2, host tweaks settings
 *   question_active   — Sync round: everyone types an answer + a prediction
 *   telepathy_active  — Telepathy round: everyone silently picks a grid tile
 *   revealing         — results of the current round (sync or telepathy) are shown;
 *                       in sync rounds the host can override matches here
 *   game_over         — final scoreboard
 */

import { AVATARS, TEAM_COLORS, TEAM_NAMES, buildTelepathyGrid, drawSyncPrompt, shuffle } from './content.js';
import { judge } from './matching.js';

export class GameError extends Error {}

export const STATES = Object.freeze({
  WAITING: 'waiting',
  QUESTION_ACTIVE: 'question_active',
  TELEPATHY_ACTIVE: 'telepathy_active',
  REVEALING: 'revealing',
  GAME_OVER: 'game_over',
});

export const POINTS = Object.freeze({
  prediction: 1, // each correct prediction of your partner's answer
  jinx: 1, // bonus when both partners gave the same answer themselves
  telepathy: 2, // both partners picked the same tile
});

const SETTING_OPTIONS = {
  mode: ['mixed', 'sync', 'telepathy'],
  rounds: [3, 4, 5, 6, 8, 10, 12],
  questionSeconds: [30, 45, 60, 90, 120],
  telepathySeconds: [8, 10, 15, 20, 30],
};

const LIMITS = { name: 16, teamName: 24, answer: 60, players: 24 };
const HOST_GRACE_MS = 20_000; // how long a disconnected host keeps the crown
const TIMER_GRACE_MS = 600; // small buffer so late keystrokes still count

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/L/O/0/1 confusion

export function generateCode(existing) {
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!existing.has(code)) return code;
  }
}

export const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export class Room {
  constructor(code, onChange = () => {}) {
    this.code = code;
    this.onChange = onChange;
    this.hostId = null;
    /** @type {Map<string, {id,name,avatar,teamId,connected,socketId,joinedAt}>} */
    this.players = new Map();
    /** @type {Map<string, {id,name,color,members:string[],score:number}>} */
    this.teams = new Map();
    this.state = STATES.WAITING;
    this.settings = { mode: 'mixed', rounds: 6, questionSeconds: 60, telepathySeconds: 15 };
    this.plan = [];
    this.roundIndex = 0;
    this.round = null;
    this.history = [];
    this.usedSync = new Set();
    this.usedTelepathy = new Set();
    this.teamCounter = 0;
    this.timer = null;
    this.hostTimer = null;
    this.lastActivity = Date.now();
  }

  /* ------------------------------ helpers ------------------------------ */

  emit() {
    this.lastActivity = Date.now();
    this.onChange(this);
  }

  requireHost(pid) {
    if (pid !== this.hostId) throw new GameError('Only the host can do that.');
  }

  requireLobby() {
    if (this.state !== STATES.WAITING) throw new GameError('Teams are locked while a game is running.');
  }

  requirePlayer(pid) {
    const p = this.players.get(pid);
    if (!p) throw new GameError('You are not in this room.');
    return p;
  }

  teamOf(pid) {
    const p = this.players.get(pid);
    return p?.teamId ? this.teams.get(p.teamId) ?? null : null;
  }

  fullTeams() {
    return [...this.teams.values()].filter((t) => t.members.length === 2);
  }

  activePlayerIds() {
    return this.round ? this.round.teams.flatMap((t) => t.members) : [];
  }

  isActivePlayer(pid) {
    return this.activePlayerIds().includes(pid);
  }

  /** Active players who are still in the room (left players can't block a round). */
  pendingPlayerIds() {
    return this.activePlayerIds().filter((pid) => this.players.has(pid));
  }

  setTimer(seconds, fn) {
    this.clearTimer();
    this.timer = setTimeout(fn, seconds * 1000 + TIMER_GRACE_MS);
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  dispose() {
    this.clearTimer();
    if (this.hostTimer) clearTimeout(this.hostTimer);
  }

  /* ----------------------------- membership ---------------------------- */

  join(pid, name, socketId) {
    let p = this.players.get(pid);
    if (p) {
      // Reconnect (page refresh, flaky wifi, etc.)
      p.socketId = socketId;
      p.connected = true;
      const newName = clean(name, LIMITS.name);
      if (newName) p.name = newName;
    } else {
      const n = clean(name, LIMITS.name);
      if (!n) throw new GameError('Please enter your name first.');
      if (this.players.size >= LIMITS.players) throw new GameError('This room is full.');
      const used = new Set([...this.players.values()].map((x) => x.avatar));
      const avatar = shuffle(AVATARS).find((a) => !used.has(a)) ?? AVATARS[0];
      p = { id: pid, name: n, avatar, teamId: null, connected: true, socketId, joinedAt: Date.now() };
      this.players.set(pid, p);
    }
    if (!this.hostId || !this.players.has(this.hostId)) this.hostId = pid;
    if (pid === this.hostId && this.hostTimer) {
      clearTimeout(this.hostTimer);
      this.hostTimer = null;
    }
    this.emit();
    return p;
  }

  disconnect(pid, socketId) {
    const p = this.players.get(pid);
    if (!p || p.socketId !== socketId) return; // already replaced by a newer socket
    p.connected = false;
    p.socketId = null;
    if (pid === this.hostId) {
      if (this.hostTimer) clearTimeout(this.hostTimer);
      this.hostTimer = setTimeout(() => {
        this.hostTimer = null;
        if (!this.players.get(this.hostId)?.connected) this.transferHost();
      }, HOST_GRACE_MS);
    }
    this.emit();
  }

  transferHost() {
    const next = [...this.players.values()]
      .filter((p) => p.connected && p.id !== this.hostId)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (next) {
      this.hostId = next.id;
      this.emit();
    }
  }

  leave(pid) {
    if (!this.players.has(pid)) return;
    this.detachFromTeam(pid);
    this.players.delete(pid);
    if (pid === this.hostId) {
      this.hostId = null;
      const next = [...this.players.values()].sort(
        (a, b) => Number(b.connected) - Number(a.connected) || a.joinedAt - b.joinedAt,
      )[0];
      if (next) this.hostId = next.id;
    }
    this.checkRoundComplete();
    this.emit();
  }

  kick(hostPid, targetPid) {
    this.requireHost(hostPid);
    if (targetPid === hostPid) throw new GameError("You can't kick yourself.");
    this.requirePlayer(targetPid);
    this.leave(targetPid);
  }

  /* ------------------------------- teams ------------------------------- */

  detachFromTeam(pid) {
    const p = this.players.get(pid);
    const team = this.teamOf(pid);
    if (team) {
      team.members = team.members.filter((m) => m !== pid);
      if (team.members.length === 0 && this.state === STATES.WAITING) this.teams.delete(team.id);
    }
    if (p) p.teamId = null;
  }

  newTeam(firstMember) {
    const usedNames = new Set([...this.teams.values()].map((t) => t.name));
    const usedColors = new Set([...this.teams.values()].map((t) => t.color));
    const id = `t${++this.teamCounter}`;
    const team = {
      id,
      name: shuffle(TEAM_NAMES).find((n) => !usedNames.has(n)) ?? `Team ${this.teamCounter}`,
      color: TEAM_COLORS.find((c) => !usedColors.has(c)) ?? TEAM_COLORS[this.teamCounter % TEAM_COLORS.length],
      members: [],
      score: 0,
    };
    this.teams.set(id, team);
    if (firstMember) this.putOnTeam(firstMember, id);
    return team;
  }

  putOnTeam(pid, teamId) {
    const team = this.teams.get(teamId);
    if (!team) throw new GameError('That team no longer exists.');
    if (team.members.includes(pid)) return;
    if (team.members.length >= 2) throw new GameError('That team is already full.');
    this.detachFromTeam(pid);
    team.members.push(pid);
    this.players.get(pid).teamId = teamId;
  }

  createTeam(pid) {
    this.requireLobby();
    this.requirePlayer(pid);
    this.newTeam(pid);
    this.emit();
  }

  joinTeam(pid, teamId) {
    this.requireLobby();
    this.requirePlayer(pid);
    this.putOnTeam(pid, teamId);
    this.emit();
  }

  leaveTeam(pid) {
    this.requireLobby();
    this.requirePlayer(pid);
    this.detachFromTeam(pid);
    this.emit();
  }

  renameTeam(pid, teamId, name) {
    const team = this.teams.get(teamId);
    if (!team) throw new GameError('That team no longer exists.');
    if (!team.members.includes(pid) && pid !== this.hostId) throw new GameError('Only team members can rename it.');
    const n = clean(name, LIMITS.teamName);
    if (!n) throw new GameError('Team name cannot be empty.');
    team.name = n;
    this.emit();
  }

  /** Host: move any player to a team (`teamId`), a brand-new team (`'new'`), or the bench (`null`). */
  assign(hostPid, targetPid, teamId) {
    this.requireHost(hostPid);
    this.requireLobby();
    this.requirePlayer(targetPid);
    if (teamId === null) this.detachFromTeam(targetPid);
    else if (teamId === 'new') this.newTeam(targetPid);
    else this.putOnTeam(targetPid, teamId);
    this.emit();
  }

  /** Host: pair up everyone without a team (host excluded — they join manually if playing). */
  autoPair(hostPid) {
    this.requireHost(hostPid);
    this.requireLobby();
    const free = shuffle(
      [...this.players.values()].filter((p) => !p.teamId && p.id !== this.hostId).map((p) => p.id),
    );
    // Fill half-empty teams first…
    for (const team of this.teams.values()) {
      if (team.members.length === 1 && free.length) this.putOnTeam(free.shift(), team.id);
    }
    // …then pair the rest. An odd player out gets a solo team waiting for a partner.
    while (free.length) {
      const team = this.newTeam(free.shift());
      if (free.length) this.putOnTeam(free.shift(), team.id);
    }
    this.emit();
  }

  updateSettings(hostPid, patch = {}) {
    this.requireHost(hostPid);
    this.requireLobby();
    for (const [key, options] of Object.entries(SETTING_OPTIONS)) {
      if (key in patch) {
        if (!options.includes(patch[key])) throw new GameError(`Invalid value for ${key}.`);
        this.settings[key] = patch[key];
      }
    }
    this.emit();
  }

  /* ------------------------------ game flow ----------------------------- */

  start(hostPid) {
    this.requireHost(hostPid);
    this.requireLobby();
    if (!this.fullTeams().length) throw new GameError('You need at least one full team of 2 to start.');
    for (const team of this.teams.values()) team.score = 0;
    this.history = [];
    this.roundIndex = 0;
    const { mode, rounds } = this.settings;
    this.plan = Array.from({ length: rounds }, (_, i) =>
      mode === 'mixed' ? (i % 2 === 0 ? 'sync' : 'telepathy') : mode,
    );
    this.startRound();
  }

  startRound() {
    const teams = this.fullTeams().map((t) => ({ teamId: t.id, members: [...t.members] }));
    if (!teams.length) return this.finish();

    const type = this.plan[this.roundIndex];
    const base = { number: this.roundIndex + 1, type, teams, startedAt: Date.now() };

    if (type === 'sync') {
      const seconds = this.settings.questionSeconds;
      this.round = {
        ...base,
        prompt: drawSyncPrompt(this.usedSync),
        deadline: Date.now() + seconds * 1000,
        submissions: {},
        verdicts: null,
        autoVerdicts: null,
      };
      this.state = STATES.QUESTION_ACTIVE;
      this.setTimer(seconds, () => this.reveal());
    } else {
      const seconds = this.settings.telepathySeconds;
      const { prompt, grid } = buildTelepathyGrid(this.usedTelepathy);
      this.round = {
        ...base,
        prompt,
        grid,
        deadline: Date.now() + seconds * 1000,
        picks: {},
        locked: {},
      };
      this.state = STATES.TELEPATHY_ACTIVE;
      this.setTimer(seconds, () => this.reveal());
    }
    this.emit();
  }

  /** Host: swap the current prompt/grid for a fresh one and restart the clock. */
  reroll(hostPid) {
    this.requireHost(hostPid);
    if (this.state !== STATES.QUESTION_ACTIVE && this.state !== STATES.TELEPATHY_ACTIVE) {
      throw new GameError('Nothing to swap right now.');
    }
    this.startRound();
  }

  /* Sync mode ----------------------------------------------------------- */

  submitSync(pid, { answer, prediction } = {}) {
    if (this.state !== STATES.QUESTION_ACTIVE) throw new GameError('Answers are closed for this round.');
    if (!this.isActivePlayer(pid)) throw new GameError("You're spectating this round.");
    const a = clean(answer, LIMITS.answer);
    const p = clean(prediction, LIMITS.answer);
    if (!a || !p) throw new GameError('Fill in both your answer and your prediction.');
    this.round.submissions[pid] = { answer: a, prediction: p };
    if (!this.checkRoundComplete()) this.emit();
  }

  revealSync() {
    const { teams, submissions } = this.round;
    const verdicts = {};
    for (const { teamId, members } of teams) {
      const [a, b] = members;
      const sa = submissions[a];
      const sb = submissions[b];
      verdicts[`pred:${a}`] = sa && sb ? judge(sa.prediction, sb.answer) : 'miss';
      verdicts[`pred:${b}`] = sa && sb ? judge(sb.prediction, sa.answer) : 'miss';
      verdicts[`jinx:${teamId}`] = sa && sb ? judge(sa.answer, sb.answer) : 'miss';
    }
    this.round.verdicts = verdicts;
    this.round.autoVerdicts = { ...verdicts };
  }

  /** Host override: mark any prediction / jinx as a match or a miss. */
  setVerdict(hostPid, key, value) {
    this.requireHost(hostPid);
    if (this.state !== STATES.REVEALING || this.round?.type !== 'sync') throw new GameError('Nothing to verify right now.');
    if (!(key in this.round.verdicts)) throw new GameError('Unknown answer.');
    if (value !== 'match' && value !== 'miss') throw new GameError('Invalid verdict.');
    this.round.verdicts[key] = value;
    this.emit();
  }

  /* Telepathy mode ------------------------------------------------------- */

  pickTile(pid, index) {
    if (this.state !== STATES.TELEPATHY_ACTIVE) throw new GameError('The grid is closed.');
    if (!this.isActivePlayer(pid)) throw new GameError("You're spectating this round.");
    if (this.round.locked[pid]) throw new GameError("You've already locked in.");
    if (!Number.isInteger(index) || index < 0 || index >= this.round.grid.items.length) {
      throw new GameError('Invalid tile.');
    }
    this.round.picks[pid] = index;
    this.emit();
  }

  lockTile(pid) {
    if (this.state !== STATES.TELEPATHY_ACTIVE) throw new GameError('The grid is closed.');
    if (!this.isActivePlayer(pid)) throw new GameError("You're spectating this round.");
    if (this.round.picks[pid] == null) throw new GameError('Pick a tile first.');
    this.round.locked[pid] = true;
    if (!this.checkRoundComplete()) this.emit();
  }

  /* Shared round lifecycle ---------------------------------------------- */

  /** Auto-reveal once every active player has submitted/locked. Returns true if it revealed. */
  checkRoundComplete() {
    const pending = this.pendingPlayerIds();
    if (this.state === STATES.QUESTION_ACTIVE) {
      if (pending.length && pending.every((pid) => this.round.submissions[pid])) return this.reveal(), true;
    } else if (this.state === STATES.TELEPATHY_ACTIVE) {
      if (pending.length && pending.every((pid) => this.round.locked[pid])) return this.reveal(), true;
    }
    return false;
  }

  /** Move from an active round to `revealing`. Called by timer, auto-complete or host. */
  reveal(hostPid) {
    if (hostPid !== undefined) this.requireHost(hostPid);
    if (this.state === STATES.QUESTION_ACTIVE) this.revealSync();
    else if (this.state !== STATES.TELEPATHY_ACTIVE) return;
    this.clearTimer();
    this.state = STATES.REVEALING;
    this.round.revealedAt = Date.now();
    this.emit();
  }

  /** Per-team results of the current round (computed live so host overrides update instantly). */
  roundResults() {
    const r = this.round;
    if (!r || (this.state !== STATES.REVEALING && this.state !== STATES.GAME_OVER)) return null;
    const results = {};
    for (const { teamId, members } of r.teams) {
      const [a, b] = members;
      if (r.type === 'sync') {
        const v = r.verdicts ?? {};
        const predictionsCorrect = [a, b].filter((pid) => v[`pred:${pid}`] === 'match').length;
        const jinx = v[`jinx:${teamId}`] === 'match';
        results[teamId] = {
          points: predictionsCorrect * POINTS.prediction + (jinx ? POINTS.jinx : 0),
          max: 2 * POINTS.prediction + POINTS.jinx,
          predictionsCorrect,
          jinx,
        };
      } else {
        const match = r.picks[a] != null && r.picks[a] === r.picks[b];
        results[teamId] = { points: match ? POINTS.telepathy : 0, max: POINTS.telepathy, match };
      }
    }
    return results;
  }

  /** Host: lock in the current round's points and move on. */
  next(hostPid) {
    this.requireHost(hostPid);
    if (this.state !== STATES.REVEALING) throw new GameError('Reveal the round first.');
    const results = this.roundResults();
    for (const [teamId, res] of Object.entries(results)) {
      const team = this.teams.get(teamId);
      if (team) team.score += res.points;
    }
    this.history.push({ number: this.round.number, type: this.round.type, prompt: this.round.prompt, results });
    this.roundIndex += 1;
    if (this.roundIndex >= this.plan.length) this.finish();
    else this.startRound();
  }

  finish() {
    this.clearTimer();
    this.state = STATES.GAME_OVER;
    this.emit();
  }

  endGame(hostPid) {
    this.requireHost(hostPid);
    if (this.state === STATES.WAITING) throw new GameError('The game has not started.');
    if (this.state === STATES.GAME_OVER) return;
    this.round = null; // discard an unfinished round
    this.finish();
  }

  backToLobby(hostPid) {
    this.requireHost(hostPid);
    this.clearTimer();
    this.state = STATES.WAITING;
    this.round = null;
    this.history = [];
    this.roundIndex = 0;
    for (const [id, team] of this.teams) {
      team.score = 0;
      if (!team.members.length) this.teams.delete(id);
    }
    this.emit();
  }

  /* ----------------------------- serialisation -------------------------- */

  /**
   * Snapshot sent to one specific player. Answers/picks of other players are
   * hidden until the reveal so nobody can peek at their partner's devtools.
   */
  toView(forPid) {
    const r = this.round;
    let round = null;
    if (r) {
      round = {
        number: r.number,
        type: r.type,
        prompt: r.prompt,
        teams: r.teams,
        deadline: r.deadline,
        revealedAt: r.revealedAt ?? null,
      };
      const active = this.state === STATES.QUESTION_ACTIVE || this.state === STATES.TELEPATHY_ACTIVE;
      if (r.type === 'sync') {
        if (active) {
          round.submitted = Object.fromEntries(Object.keys(r.submissions).map((pid) => [pid, true]));
          round.mine = r.submissions[forPid] ?? null;
        } else {
          round.submissions = r.submissions;
          round.verdicts = r.verdicts;
          round.autoVerdicts = r.autoVerdicts;
          round.results = this.roundResults();
        }
      } else {
        round.grid = r.grid;
        if (active) {
          round.picked = Object.fromEntries(Object.keys(r.picks).map((pid) => [pid, true]));
          round.locked = { ...r.locked };
          round.mine = r.picks[forPid] ?? null;
        } else {
          round.picks = r.picks;
          round.results = this.roundResults();
        }
      }
    }

    return {
      code: this.code,
      you: forPid,
      hostId: this.hostId,
      state: this.state,
      settings: { ...this.settings },
      points: POINTS,
      serverNow: Date.now(),
      totalRounds: this.plan.length || this.settings.rounds,
      players: [...this.players.values()].map(({ id, name, avatar, teamId, connected }) => ({
        id,
        name,
        avatar,
        teamId,
        connected,
      })),
      teams: [...this.teams.values()].map((t) => ({ ...t, members: [...t.members] })),
      round,
      history: this.history,
    };
  }
}
