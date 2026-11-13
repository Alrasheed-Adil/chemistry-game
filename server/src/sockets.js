/**
 * Socket.io wiring: translates client events into Room method calls and
 * pushes personalised state snapshots back to every player in the room.
 *
 * Every client → server event uses an acknowledgement callback:
 *   socket.emit('team:join', { teamId }, (res) => res.ok ? … : showError(res.error))
 */

import { GameError, Room, clean, generateCode } from './room.js';

const ROOM_IDLE_TTL_MS = 10 * 60_000; // drop rooms nobody has touched for 10 minutes

/** @type {Map<string, Room>} */
const rooms = new Map();

export function registerSockets(io) {
  /** Send each connected player their own view of the room. */
  const broadcast = (room) => {
    for (const p of room.players.values()) {
      if (p.socketId) io.to(p.socketId).emit('room:state', room.toView(p.id));
    }
  };

  // Housekeeping: remove empty / abandoned rooms.
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      const anyoneHere = [...room.players.values()].some((p) => p.connected);
      if (room.players.size === 0 || (!anyoneHere && now - room.lastActivity > ROOM_IDLE_TTL_MS)) {
        room.dispose();
        rooms.delete(code);
      }
    }
  }, 60_000).unref();

  io.on('connection', (socket) => {
    /** The room + player this socket is currently bound to. */
    let room = null;
    let pid = null;

    /** Registers a handler with uniform error handling + ack. */
    const on = (event, fn) =>
      socket.on(event, (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        try {
          const result = fn(payload && typeof payload === 'object' ? payload : {});
          reply({ ok: true, ...(result ?? {}) });
        } catch (err) {
          if (!(err instanceof GameError)) console.error(`[${event}]`, err);
          reply({ ok: false, error: err instanceof GameError ? err.message : 'Something went wrong.' });
        }
      });

    const current = () => {
      if (!room || !pid || !room.players.has(pid)) throw new GameError('You are not in a room.');
      return room;
    };

    const validPlayerId = (id) => {
      if (typeof id !== 'string' || id.length < 8 || id.length > 64) throw new GameError('Invalid session.');
      return id;
    };

    const attach = (target, playerId, name) => {
      if (room && room !== target && pid) room.disconnect(pid, socket.id);
      // If this player is already open in another tab, tell the old tab.
      const existing = target.players.get(playerId);
      if (existing?.socketId && existing.socketId !== socket.id) {
        io.to(existing.socketId).emit('session:replaced');
      }
      target.join(playerId, name, socket.id);
      room = target;
      pid = playerId;
      return { code: target.code, playerId };
    };

    /* ----------------------------- rooms ----------------------------- */

    on('room:create', ({ name, playerId }) => {
      validPlayerId(playerId);
      if (!clean(name, 16)) throw new GameError('Please enter your name first.');
      const code = generateCode(rooms);
      const created = new Room(code, broadcast);
      rooms.set(code, created);
      return attach(created, playerId, name);
    });

    on('room:join', ({ code, name, playerId }) => {
      const target = rooms.get(String(code ?? '').trim().toUpperCase());
      if (!target) throw new GameError("Couldn't find that room — double-check the code.");
      return attach(target, validPlayerId(playerId), name);
    });

    on('room:leave', () => {
      if (room && pid) room.leave(pid);
      room = null;
      pid = null;
    });

    /* ----------------------------- teams ----------------------------- */

    on('team:create', () => current().createTeam(pid));
    on('team:join', ({ teamId }) => current().joinTeam(pid, teamId));
    on('team:leave', () => current().leaveTeam(pid));
    on('team:rename', ({ teamId, name }) => current().renameTeam(pid, teamId, name));

    /* --------------------------- gameplay ---------------------------- */

    on('sync:submit', ({ answer, prediction }) => current().submitSync(pid, { answer, prediction }));
    on('telepathy:pick', ({ index }) => current().pickTile(pid, index));
    on('telepathy:lock', () => current().lockTile(pid));

    /* ----------------------------- host ------------------------------ */

    on('host:settings', ({ settings }) => current().updateSettings(pid, settings));
    on('host:autopair', () => current().autoPair(pid));
    on('host:assign', ({ playerId, teamId }) => current().assign(pid, playerId, teamId ?? null));
    on('host:kick', ({ playerId }) => {
      const r = current();
      const socketId = r.players.get(playerId)?.socketId;
      r.kick(pid, playerId);
      if (socketId) io.to(socketId).emit('room:kicked');
    });
    on('host:start', () => current().start(pid));
    on('host:reveal', () => current().reveal(pid));
    on('host:reroll', () => current().reroll(pid));
    on('host:verdict', ({ key, value }) => current().setVerdict(pid, key, value));
    on('host:next', () => current().next(pid));
    on('host:end', () => current().endGame(pid));
    on('host:lobby', () => current().backToLobby(pid));

    socket.on('disconnect', () => {
      if (room && pid) room.disconnect(pid, socket.id);
    });
  });
}
