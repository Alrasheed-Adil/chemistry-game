/**
 * Room — the authoritative game state machine for one lab session.
 *
 * The Room knows nothing about sockets. Every mutation ends with `this.emit()`,
 * which calls the `onChange` callback supplied by the socket layer; that layer
 * then sends each player a personalised snapshot via `toView(playerId)`.
 *
 * Room states:
 *   waiting           — lobby: players join, form pairs, host picks the tests
 *   question_active   — Sync trial: type an answer + predict your partner's
 *   telepathy_active  — Telepathy trial: silently pick a well on the plate
 *   decision_active   — Decision trial: pick A–D for a situation + predict partner
 *   priority_active   — Priorities trial: rank four items 1–4
 *   rather_active     — Would you rather: pick one of two hard options + predict partner
 *   treatment_active  — Bare minimum or princess treatment (couples or friends edition):
 *                       call each statement "bare minimum" or "princess treatment"
 *   revealing         — results of the current trial (any type); in Sync the
 *                       host can override matches here
 *   game_over         — final lab report
 *
 * Errors are thrown as GameError(code). Codes are translated on the client
 * (see client/src/i18n.jsx → errors.*), so the server stays language-neutral.
 */

import { AVATARS, AVATAR_BY_ID } from '../../shared/avatars.js';
import {
  ELEMENT_COUNT,
  THEMES,
  buildTelepathyGrid,
  drawDecision,
  drawPriority,
  drawRather,
  drawSyncPrompt,
  drawTreatment,
  shuffle,
} from './content.js';
import { judge } from './matching.js';

export class GameError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export const STATES = Object.freeze({
  WAITING: 'waiting',
  QUESTION_ACTIVE: 'question_active',
  TELEPATHY_ACTIVE: 'telepathy_active',
  DECISION_ACTIVE: 'decision_active',
  PRIORITY_ACTIVE: 'priority_active',
  RATHER_ACTIVE: 'rather_active',
  TREATMENT_ACTIVE: 'treatment_active',
  REVEALING: 'revealing',
  GAME_OVER: 'game_over',
});

const ACTIVE_STATES = new Set([
  STATES.QUESTION_ACTIVE,
  STATES.TELEPATHY_ACTIVE,
  STATES.DECISION_ACTIVE,
  STATES.PRIORITY_ACTIVE,
  STATES.RATHER_ACTIVE,
  STATES.TREATMENT_ACTIVE,
]);
const STATE_FOR_TYPE = {
  sync: STATES.QUESTION_ACTIVE,
  telepathy: STATES.TELEPATHY_ACTIVE,
  decision: STATES.DECISION_ACTIVE,
  priority: STATES.PRIORITY_ACTIVE,
  rather: STATES.RATHER_ACTIVE,
  princess: STATES.TREATMENT_ACTIVE,
  bestie: STATES.TREATMENT_ACTIVE,
};

/** Experiments where each player picks an option for themselves + predicts their partner. */
const CHOICE_TYPES = new Set(['decision', 'rather']);

/** Bare minimum or princess treatment: couples (princess) and friends (bestie) editions. */
const TREATMENT_TYPES = new Set(['princess', 'bestie']);

export const TESTS = Object.freeze(['sync', 'telepathy', 'decision', 'priority', 'rather', 'princess', 'bestie']);

export const POINTS = Object.freeze({
  prediction: 1, // Sync, Decision, Would you rather: each correct prediction of your partner
  jinx: 1, // Sync: both partners gave the same answer
  sameChoice: 1, // Decision, Would you rather: both partners chose the same option
  telepathy: 2, // Telepathy: both picked the same well
  sameRank: 1, // Priorities: each item both partners put at the same rank
  sameCall: 1, // Princess treatment: each statement both partners called the same way
});

const SETTING_OPTIONS = {
  rounds: [3, 4, 5, 6, 8, 10, 12],
  questionSeconds: [30, 45, 60, 90, 120],
  telepathySeconds: [8, 10, 15, 20, 30],
  decisionSeconds: [15, 20, 30, 45, 60],
  prioritySeconds: [30, 45, 60, 90],
  ratherSeconds: [15, 20, 30, 45],
  princessSeconds: [30, 45, 60, 90],
  bestieSeconds: [30, 45, 60, 90],
};

const LIMITS = { name: 16, teamName: 24, answer: 60, players: 24 };
const HOST_GRACE_MS = 20_000; // how long a disconnected host keeps the role
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
    /** @type {Map<string, {id,element,name:string|null,members:string[],score:number}>} */
    this.teams = new Map();
    this.state = STATES.WAITING;
    this.settings = {
      tests: [...TESTS],
      themes: [...THEMES], // question themes: light | deep | bonds
      rounds: 6,
      questionSeconds: 60,
      telepathySeconds: 15,
      decisionSeconds: 30,
      prioritySeconds: 45,
      ratherSeconds: 20,
      princessSeconds: 45,
      bestieSeconds: 45,
    };
    this.plan = [];
    this.roundIndex = 0;
    this.round = null;
    this.history = [];
    this.used = { sync: new Set(), telepathy: new Set(), decision: new Set(), priority: new Set(), rather: new Set(), princess: new Set(), bestie: new Set() };
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
    if (pid !== this.hostId) throw new GameError('host_only');
  }

  requireLobby() {
    if (this.state !== STATES.WAITING) throw new GameError('game_running');
  }

  requirePlayer(pid) {
    const p = this.players.get(pid);
    if (!p) throw new GameError('not_in_room');
    return p;
  }

  requireActive(type) {
    if (this.state !== STATE_FOR_TYPE[type]) throw new GameError('answers_closed');
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

  requireActivePlayer(pid) {
    if (!this.activePlayerIds().includes(pid)) throw new GameError('spectating');
  }

  /** Active players who are still in the room (people who left can't block a trial). */
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
      if (!n) throw new GameError('name_required');
      if (this.players.size >= LIMITS.players) throw new GameError('room_full');
      const used = new Set([...this.players.values()].map((x) => x.avatar));
      const avatar = (shuffle(AVATARS).find((a) => !used.has(a.id)) ?? AVATARS[0]).id;
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

  /** Choose a profile avatar from the shared catalog. Two players can't wear the same one. */
  setAvatar(pid, avatarId) {
    const p = this.requirePlayer(pid);
    if (!AVATAR_BY_ID[avatarId]) throw new GameError('invalid_avatar');
    if (p.avatar === avatarId) return;
    if ([...this.players.values()].some((x) => x.id !== pid && x.avatar === avatarId)) {
      throw new GameError('avatar_taken');
    }
    p.avatar = avatarId;
    this.emit();
  }

  kick(hostPid, targetPid) {
    this.requireHost(hostPid);
    if (targetPid === hostPid) throw new GameError('cannot_kick_self');
    this.requirePlayer(targetPid);
    this.leave(targetPid);
  }

  /* ------------------------------- pairs ------------------------------- */

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
    const usedElements = new Set([...this.teams.values()].map((t) => t.element));
    const free = shuffle([...Array(ELEMENT_COUNT).keys()]).find((i) => !usedElements.has(i));
    const id = `t${++this.teamCounter}`;
    const team = {
      id,
      element: free ?? this.teamCounter % ELEMENT_COUNT,
      name: null, // null → client shows the element's localized name
      members: [],
      score: 0,
    };
    this.teams.set(id, team);
    if (firstMember) this.putOnTeam(firstMember, id);
    return team;
  }

  putOnTeam(pid, teamId) {
    const team = this.teams.get(teamId);
    if (!team) throw new GameError('team_gone');
    if (team.members.includes(pid)) return;
    if (team.members.length >= 2) throw new GameError('team_full');
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
    if (!team) throw new GameError('team_gone');
    if (!team.members.includes(pid) && pid !== this.hostId) throw new GameError('rename_forbidden');
    const n = clean(name, LIMITS.teamName);
    team.name = n || null; // empty → back to the element name
    this.emit();
  }

  /** Host: move any player to a pair (`teamId`), a brand-new pair (`'new'`), or off pairs (`null`). */
  assign(hostPid, targetPid, teamId) {
    this.requireHost(hostPid);
    this.requireLobby();
    this.requirePlayer(targetPid);
    if (teamId === null) this.detachFromTeam(targetPid);
    else if (teamId === 'new') this.newTeam(targetPid);
    else this.putOnTeam(targetPid, teamId);
    this.emit();
  }

  /** Host: pair up everyone without a pair (host excluded — they join manually if playing). */
  autoPair(hostPid) {
    this.requireHost(hostPid);
    this.requireLobby();
    const free = shuffle(
      [...this.players.values()].filter((p) => !p.teamId && p.id !== this.hostId).map((p) => p.id),
    );
    for (const team of this.teams.values()) {
      if (team.members.length === 1 && free.length) this.putOnTeam(free.shift(), team.id);
    }
    while (free.length) {
      const team = this.newTeam(free.shift());
      if (free.length) this.putOnTeam(free.shift(), team.id);
    }
    this.emit();
  }

  updateSettings(hostPid, patch = {}) {
    this.requireHost(hostPid);
    this.requireLobby();
    if ('tests' in patch) {
      const tests = Array.isArray(patch.tests) ? TESTS.filter((t) => patch.tests.includes(t)) : [];
      if (!tests.length) throw new GameError('need_one_test');
      this.settings.tests = tests;
    }
    if ('themes' in patch) {
      const themes = Array.isArray(patch.themes) ? THEMES.filter((t) => patch.themes.includes(t)) : [];
      if (!themes.length) throw new GameError('need_one_theme');
      this.settings.themes = themes;
    }
    for (const [key, options] of Object.entries(SETTING_OPTIONS)) {
      if (key in patch) {
        if (!options.includes(patch[key])) throw new GameError('invalid_setting');
        this.settings[key] = patch[key];
      }
    }
    this.emit();
  }

  /* ------------------------------ game flow ----------------------------- */

  start(hostPid) {
    this.requireHost(hostPid);
    this.requireLobby();
    if (!this.fullTeams().length) throw new GameError('need_full_team');
    for (const team of this.teams.values()) team.score = 0;
    this.history = [];
    this.roundIndex = 0;
    const { tests, rounds } = this.settings;
    this.plan = Array.from({ length: rounds }, (_, i) => tests[i % tests.length]);
    this.startRound();
  }

  startRound() {
    const teams = this.fullTeams().map((t) => ({ teamId: t.id, members: [...t.members] }));
    if (!teams.length) return this.finish();

    const type = this.plan[this.roundIndex];
    const seconds = {
      sync: this.settings.questionSeconds,
      telepathy: this.settings.telepathySeconds,
      decision: this.settings.decisionSeconds,
      priority: this.settings.prioritySeconds,
      rather: this.settings.ratherSeconds,
      princess: this.settings.princessSeconds,
      bestie: this.settings.bestieSeconds,
    }[type];
    const round = {
      number: this.roundIndex + 1,
      type,
      teams,
      startedAt: Date.now(),
      deadline: Date.now() + seconds * 1000,
    };

    const { themes } = this.settings;
    if (type === 'sync') {
      Object.assign(round, { prompt: drawSyncPrompt(this.used.sync, themes), submissions: {}, verdicts: null, autoVerdicts: null });
    } else if (type === 'telepathy') {
      Object.assign(round, buildTelepathyGrid(this.used.telepathy, themes), { picks: {}, locked: {} });
    } else if (TREATMENT_TYPES.has(type)) {
      Object.assign(round, drawTreatment(type, this.used[type]), { submissions: {} });
    } else if (type === 'priority') {
      const priority = drawPriority(this.used.priority, themes);
      Object.assign(round, {
        prompt: { category: priority.category, theme: priority.theme, text: priority.text },
        items: priority.items,
        submissions: {},
      });
    } else {
      const decision =
        type === 'rather' ? drawRather(this.used.rather, themes) : drawDecision(this.used.decision, themes);
      Object.assign(round, {
        prompt: { category: decision.category, theme: decision.theme, text: decision.text },
        choices: decision.choices,
        submissions: {},
      });
    }

    this.round = round;
    this.state = STATE_FOR_TYPE[type];
    this.setTimer(seconds, () => this.reveal());
    this.emit();
  }

  /** Host: swap the current prompt/grid/situation for a fresh one and restart the clock. */
  reroll(hostPid) {
    this.requireHost(hostPid);
    if (!ACTIVE_STATES.has(this.state)) throw new GameError('nothing_to_swap');
    this.startRound();
  }

  /* Sync ------------------------------------------------------------------ */

  submitSync(pid, { answer, prediction } = {}) {
    this.requireActive('sync');
    this.requireActivePlayer(pid);
    const a = clean(answer, LIMITS.answer);
    const p = clean(prediction, LIMITS.answer);
    if (!a || !p) throw new GameError('fill_both');
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

  /** Host override: mark any Sync prediction / jinx as a match or a miss. */
  setVerdict(hostPid, key, value) {
    this.requireHost(hostPid);
    if (this.state !== STATES.REVEALING || this.round?.type !== 'sync') throw new GameError('nothing_to_verify');
    if (!(key in this.round.verdicts)) throw new GameError('unknown_answer');
    if (value !== 'match' && value !== 'miss') throw new GameError('invalid_verdict');
    this.round.verdicts[key] = value;
    this.emit();
  }

  /* Decision + Would you rather -------------------------------------------- */

  /** Shared by Decision (4 options) and Would you rather (2 options). */
  submitDecision(pid, { choice, prediction } = {}) {
    if (!CHOICE_TYPES.has(this.round?.type)) throw new GameError('answers_closed');
    this.requireActive(this.round.type);
    this.requireActivePlayer(pid);
    const n = this.round.choices.length;
    const valid = (v) => Number.isInteger(v) && v >= 0 && v < n;
    if (!valid(choice) || !valid(prediction)) throw new GameError('pick_both');
    this.round.submissions[pid] = { choice, prediction };
    if (!this.checkRoundComplete()) this.emit();
  }

  /* Priorities ------------------------------------------------------------ */

  /**
   * `order` lists item indices from rank 1 (top priority) to rank 4,
   * e.g. [2, 0, 3, 1] means item 2 is #1, item 0 is #2, and so on.
   */
  submitPriority(pid, { order } = {}) {
    this.requireActive('priority');
    this.requireActivePlayer(pid);
    const n = this.round.items.length;
    const valid =
      Array.isArray(order) &&
      order.length === n &&
      order.every((i) => Number.isInteger(i) && i >= 0 && i < n) &&
      new Set(order).size === n;
    if (!valid) throw new GameError('rank_all');
    this.round.submissions[pid] = { order: [...order] };
    if (!this.checkRoundComplete()) this.emit();
  }

  /* Bare minimum or princess treatment ------------------------------------ */

  /** `calls` has one entry per statement: 0 = bare minimum, 1 = princess treatment. */
  submitTreatment(pid, { calls } = {}) {
    if (!TREATMENT_TYPES.has(this.round?.type)) throw new GameError('answers_closed');
    this.requireActive(this.round.type);
    this.requireActivePlayer(pid);
    const n = this.round.items.length;
    const valid = Array.isArray(calls) && calls.length === n && calls.every((c) => c === 0 || c === 1);
    if (!valid) throw new GameError('call_all');
    this.round.submissions[pid] = { calls: [...calls] };
    if (!this.checkRoundComplete()) this.emit();
  }

  /* Telepathy ------------------------------------------------------------- */

  pickTile(pid, index) {
    if (this.state !== STATES.TELEPATHY_ACTIVE) throw new GameError('grid_closed');
    this.requireActivePlayer(pid);
    if (this.round.locked[pid]) throw new GameError('already_locked');
    if (!Number.isInteger(index) || index < 0 || index >= this.round.grid.items.length) {
      throw new GameError('invalid_tile');
    }
    this.round.picks[pid] = index;
    this.emit();
  }

  lockTile(pid) {
    if (this.state !== STATES.TELEPATHY_ACTIVE) throw new GameError('grid_closed');
    this.requireActivePlayer(pid);
    if (this.round.picks[pid] == null) throw new GameError('pick_first');
    this.round.locked[pid] = true;
    if (!this.checkRoundComplete()) this.emit();
  }

  /* Shared trial lifecycle ------------------------------------------------ */

  /** Has this player finished the current trial? */
  isDone(pid) {
    const r = this.round;
    if (!r) return false;
    return r.type === 'telepathy' ? Boolean(r.locked[pid]) : Boolean(r.submissions[pid]);
  }

  /** Auto-reveal once every active player has submitted/locked. Returns true if it revealed. */
  checkRoundComplete() {
    if (!ACTIVE_STATES.has(this.state)) return false;
    const pending = this.pendingPlayerIds();
    if (pending.length && pending.every((pid) => this.isDone(pid))) {
      this.reveal();
      return true;
    }
    return false;
  }

  /** Move from an active trial to `revealing`. Called by timer, auto-complete or host. */
  reveal(hostPid) {
    if (hostPid !== undefined) this.requireHost(hostPid);
    if (!ACTIVE_STATES.has(this.state)) return;
    if (this.round.type === 'sync') this.revealSync();
    this.clearTimer();
    this.state = STATES.REVEALING;
    this.round.revealedAt = Date.now();
    this.emit();
  }

  /** Per-pair results of the current trial (live, so host overrides update instantly). */
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
      } else if (CHOICE_TYPES.has(r.type)) {
        const sa = r.submissions[a];
        const sb = r.submissions[b];
        const predictionsCorrect = (sa && sb ? [sa.prediction === sb.choice, sb.prediction === sa.choice] : []).filter(Boolean).length;
        const same = Boolean(sa && sb && sa.choice === sb.choice);
        results[teamId] = {
          points: predictionsCorrect * POINTS.prediction + (same ? POINTS.sameChoice : 0),
          max: 2 * POINTS.prediction + POINTS.sameChoice,
          predictionsCorrect,
          same,
        };
      } else if (TREATMENT_TYPES.has(r.type)) {
        const ca = r.submissions[a]?.calls;
        const cb = r.submissions[b]?.calls;
        const sameCalls = ca && cb ? ca.filter((c, i) => cb[i] === c).length : 0;
        results[teamId] = {
          points: sameCalls * POINTS.sameCall,
          max: r.items.length * POINTS.sameCall,
          sameCalls,
        };
      } else if (r.type === 'priority') {
        const oa = r.submissions[a]?.order;
        const ob = r.submissions[b]?.order;
        // Same item at the same rank position → +1 each.
        const sameRanks = oa && ob ? oa.filter((item, rank) => ob[rank] === item).length : 0;
        results[teamId] = {
          points: sameRanks * POINTS.sameRank,
          max: r.items.length * POINTS.sameRank,
          sameRanks,
        };
      } else {
        const match = r.picks[a] != null && r.picks[a] === r.picks[b];
        results[teamId] = { points: match ? POINTS.telepathy : 0, max: POINTS.telepathy, match };
      }
    }
    return results;
  }

  /** Host: lock in the current trial's points and move on. */
  next(hostPid) {
    this.requireHost(hostPid);
    if (this.state !== STATES.REVEALING) throw new GameError('reveal_first');
    const results = this.roundResults();
    for (const [teamId, res] of Object.entries(results)) {
      const team = this.teams.get(teamId);
      if (team) team.score += res.points;
    }
    this.history.push({ number: this.round.number, type: this.round.type, results });
    this.roundIndex += 1;
    if (this.roundIndex >= this.plan.length) this.finish();
    else this.startRound();
  }

  finish() {
    this.clearTimer();
    this.state = STATES.GAME_OVER;
    this.endedAt = Date.now();
    this.emit();
  }

  endGame(hostPid) {
    this.requireHost(hostPid);
    if (this.state === STATES.WAITING) throw new GameError('not_started');
    if (this.state === STATES.GAME_OVER) return;
    this.round = null; // discard an unfinished trial
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
   * Snapshot sent to one specific player. Other players' answers/picks are
   * hidden until the reveal so nobody can peek at their partner in devtools.
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
      const active = ACTIVE_STATES.has(this.state);
      if (r.type === 'telepathy') {
        round.grid = r.grid;
        if (active) {
          round.picked = Object.fromEntries(Object.keys(r.picks).map((pid) => [pid, true]));
          round.locked = { ...r.locked };
          round.mine = r.picks[forPid] ?? null;
        } else {
          round.picks = r.picks;
          round.results = this.roundResults();
        }
      } else {
        if (CHOICE_TYPES.has(r.type)) round.choices = r.choices;
        if (r.type === 'priority' || TREATMENT_TYPES.has(r.type)) round.items = r.items;
        if (active) {
          round.submitted = Object.fromEntries(Object.keys(r.submissions).map((pid) => [pid, true]));
          round.mine = r.submissions[forPid] ?? null;
        } else {
          round.submissions = r.submissions;
          if (r.type === 'sync') {
            round.verdicts = r.verdicts;
            round.autoVerdicts = r.autoVerdicts;
          }
          round.results = this.roundResults();
        }
      }
    }

    return {
      code: this.code,
      you: forPid,
      hostId: this.hostId,
      state: this.state,
      settings: { ...this.settings, tests: [...this.settings.tests], themes: [...this.settings.themes] },
      points: POINTS,
      serverNow: Date.now(),
      endedAt: this.endedAt ?? null,
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
