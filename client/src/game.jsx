/**
 * Client-side game store.
 *
 * - Owns the single Socket.io connection.
 * - Keeps the latest room snapshot pushed by the server (`room:state`).
 * - Remembers the player's identity + room per browser tab (sessionStorage),
 *   so refreshing the page drops you right back into the game.
 * - Exposes typed-ish action helpers that return the server's ack.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useIsPresent } from 'framer-motion';
import { io } from 'socket.io-client';
import { useLang } from './i18n.jsx';

const socket = io({ transports: ['websocket', 'polling'] });

const store = {
  get: (k) => {
    try {
      return sessionStorage.getItem(`chem:${k}`);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      if (v == null) sessionStorage.removeItem(`chem:${k}`);
      else sessionStorage.setItem(`chem:${k}`, v);
    } catch {
      /* storage blocked — the game still works, just no refresh-resume */
    }
  },
};

/** Per-tab player id. crypto.randomUUID needs a secure context, which LAN IPs aren't. */
function getPlayerId() {
  let id = store.get('pid');
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    store.set('pid', id);
  }
  return id;
}

const playerId = getPlayerId();
const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [view, setView] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [toasts, setToasts] = useState([]);
  const { t } = useLang();
  const tRef = useRef(t);
  tRef.current = t;
  const offset = useRef(0); // serverTime - clientTime, for accurate countdowns

  const notify = useCallback((message, tone = 'error') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  /** Emit an event and resolve with the server's ack. Errors surface as toasts. */
  const call = useCallback(
    (event, payload = {}, { silent = false } = {}) =>
      new Promise((resolve) => {
        socket.timeout(8000).emit(event, payload, (err, res) => {
          const result = err ? { ok: false, code: 'timeout' } : res;
          if (!result?.ok && !silent) notify(tRef.current(`errors.${result?.code ?? 'generic'}`));
          resolve(result);
        });
      }),
    [notify],
  );

  const resetLocal = useCallback(() => {
    store.set('room', null);
    setView(null);
  }, []);

  useEffect(() => {
    const onState = (v) => {
      offset.current = v.serverNow - Date.now();
      store.set('room', v.code);
      setView(v);
    };
    const onConnect = () => {
      setConnected(true);
      // Resume a game after refresh / reconnect.
      const code = store.get('room');
      if (code) {
        call('room:join', { code, name: store.get('name'), playerId }, { silent: true }).then((res) => {
          if (!res?.ok) resetLocal();
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onKicked = () => {
      resetLocal();
      notify(tRef.current('errors.kicked'));
    };
    const onReplaced = () => {
      setView(null);
      notify(tRef.current('errors.replaced'), 'info');
    };

    socket.on('room:state', onState);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:kicked', onKicked);
    socket.on('session:replaced', onReplaced);
    if (socket.connected) onConnect();
    return () => {
      socket.off('room:state', onState);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:kicked', onKicked);
      socket.off('session:replaced', onReplaced);
    };
  }, [call, notify, resetLocal]);

  const actions = useMemo(
    () => ({
      createRoom: (name) => {
        store.set('name', name);
        return call('room:create', { name, playerId });
      },
      joinRoom: (code, name) => {
        store.set('name', name);
        return call('room:join', { code, name, playerId });
      },
      leaveRoom: async () => {
        await call('room:leave', {}, { silent: true });
        resetLocal();
      },
      createTeam: () => call('team:create'),
      joinTeam: (teamId) => call('team:join', { teamId }),
      leaveTeam: () => call('team:leave'),
      renameTeam: (teamId, name) => call('team:rename', { teamId, name }),
      submitSync: (answer, prediction) => call('sync:submit', { answer, prediction }),
      submitDecision: (choice, prediction) => call('decision:submit', { choice, prediction }),
      submitPriority: (order) => call('priority:submit', { order }),
      pickTile: (index) => call('telepathy:pick', { index }),
      lockTile: () => call('telepathy:lock'),
      host: {
        settings: (settings) => call('host:settings', { settings }),
        autoPair: () => call('host:autopair'),
        assign: (targetId, teamId) => call('host:assign', { playerId: targetId, teamId }),
        kick: (targetId) => call('host:kick', { playerId: targetId }),
        start: () => call('host:start'),
        reveal: () => call('host:reveal'),
        reroll: () => call('host:reroll'),
        verdict: (key, value) => call('host:verdict', { key, value }),
        next: () => call('host:next'),
        end: () => call('host:end'),
        lobby: () => call('host:lobby'),
      },
    }),
    [call, resetLocal],
  );

  // Handy derived values so screens don't each recompute them.
  const derived = useMemo(() => {
    if (!view) return {};
    const playersById = Object.fromEntries(view.players.map((p) => [p.id, p]));
    const teamsById = Object.fromEntries(view.teams.map((t) => [t.id, t]));
    const me = playersById[view.you];
    const myTeam = me?.teamId ? teamsById[me.teamId] : null;
    const partnerId = myTeam?.members.find((m) => m !== view.you) ?? null;
    const roundTeam = view.round?.teams.find((t) => t.members.includes(view.you)) ?? null;
    return {
      playersById,
      teamsById,
      me,
      myTeam,
      partner: partnerId ? playersById[partnerId] : null,
      isHost: view.hostId === view.you,
      isPlaying: Boolean(roundTeam),
      roundTeam,
    };
  }, [view]);

  const serverNow = useCallback(() => Date.now() + offset.current, []);

  const value = { view, connected, toasts, notify, actions, serverNow, playerId, ...derived };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

/**
 * Freezes the game state for a subtree while it animates out.
 * Inside <AnimatePresence>, an exiting screen keeps re-rendering; without this
 * it would read the *next* round's data (e.g. a sync screen seeing a grid round).
 */
export function FrozenWhenExiting({ children }) {
  const ctx = useContext(GameContext);
  const isPresent = useIsPresent();
  const last = useRef(ctx);
  if (isPresent && ctx.view) last.current = ctx;
  return <GameContext.Provider value={last.current}>{children}</GameContext.Provider>;
}

/** Name lookup that copes with players who left mid-game. */
export function playerName(playersById, id) {
  return playersById?.[id]?.name ?? 'Someone';
}
