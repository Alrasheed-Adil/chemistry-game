/**
 * Persistent chrome around game screens: top header, scoreboard, and the
 * host control bar (the "Host Dashboard" controls shown only to the host).
 */

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useState } from 'react';
import { useGame } from '../game.jsx';
import { Avatar, Button, Logo, cx, useBusy } from './ui.jsx';

/* ------------------------------- Header -------------------------------- */

export function Header() {
  const { view, connected, isHost, actions, notify } = useGame();
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/?room=${view.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      notify(`Share this link: ${link}`, 'info');
    }
  };

  const leave = () => {
    if (window.confirm('Leave this room?')) actions.leaveRoom();
  };

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-2">
        <Logo size={30} />
        <span className="hidden font-display text-xl font-extrabold tracking-tight sm:inline">chemistry</span>
      </div>

      <button
        onClick={copy}
        className="glass group ml-1 flex items-center gap-2 rounded-full py-1.5 pr-3 pl-4 transition hover:border-electric-400/40"
        title="Copy invite link"
      >
        <span className="font-display text-lg font-extrabold tracking-[0.2em]">{view.code}</span>
        <span className="text-xs font-bold text-white/50 group-hover:text-white/80">{copied ? 'Copied!' : 'Copy link'}</span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {isHost ? <span className="chip text-amber-300">👑 Host</span> : null}
        <span
          className={cx('size-2.5 rounded-full', connected ? 'bg-emerald-400' : 'animate-pulse bg-coral-500')}
          title={connected ? 'Connected' : 'Reconnecting…'}
        />
        <Button variant="ghost" size="sm" onClick={leave}>
          Leave
        </Button>
      </div>
    </header>
  );
}

/* ------------------------------ Scoreboard ----------------------------- */

/**
 * Team standings. During a reveal it previews the points each team is about
 * to earn this round (`+N`) before the host confirms.
 */
export function Scoreboard({ compact }) {
  const { view, playersById, myTeam } = useGame();
  const pending = view.state === 'revealing' ? view.round?.results ?? {} : {};
  const teams = [...view.teams]
    .filter((t) => t.members.length || t.score)
    .sort((a, b) => b.score + (pending[b.id]?.points ?? 0) - (a.score + (pending[a.id]?.points ?? 0)));

  if (!teams.length) return null;

  return (
    <div className={cx('glass rounded-3xl', compact ? 'p-2' : 'p-4')}>
      {!compact ? <h3 className="label mb-3 px-1">Scoreboard</h3> : null}
      <LayoutGroup>
        <ol className={cx(compact ? 'flex gap-2 overflow-x-auto' : 'space-y-2')}>
          {teams.map((team, i) => {
            const gain = pending[team.id]?.points;
            return (
              <motion.li
                layout
                key={team.id}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className={cx(
                  'flex items-center gap-2.5 rounded-2xl border px-3 py-2',
                  compact && 'shrink-0',
                  team.id === myTeam?.id ? 'border-white/20 bg-white/8' : 'border-transparent bg-white/[0.03]',
                )}
              >
                <span className="w-4 text-center text-xs font-bold text-white/40">{i + 1}</span>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: team.color, boxShadow: `0 0 10px ${team.color}` }} />
                <span className="flex -space-x-2">
                  {team.members.map((id) => (
                    <Avatar key={id} player={playersById[id]} size="xs" />
                  ))}
                </span>
                <span className={cx('min-w-0 truncate text-sm font-semibold', compact ? 'max-w-28' : 'flex-1')}>{team.name}</span>
                <AnimatePresence>
                  {gain ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-bold text-emerald-300"
                    >
                      +{gain}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                <motion.span
                  key={team.score}
                  initial={{ scale: 1.5, color: '#c084fc' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="font-display text-lg font-extrabold tabular-nums"
                >
                  {team.score}
                </motion.span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
    </div>
  );
}

/* ------------------------------ Host bar ------------------------------- */

/** Floating control bar for the host during a game. */
export function HostBar() {
  const { view, actions } = useGame();
  const [busy, run] = useBusy();
  const { state, round } = view;
  if (state === 'waiting') return null;

  const active = state === 'question_active' || state === 'telepathy_active';
  const isLast = round && round.number >= view.totalRounds;

  let status = null;
  if (active && round) {
    const ids = round.teams.flatMap((t) => t.members);
    const doneMap = round.type === 'sync' ? round.submitted : round.locked;
    const done = ids.filter((id) => doneMap?.[id]).length;
    status = `${done}/${ids.length} locked in`;
  } else if (state === 'revealing' && round?.type === 'sync') {
    status = 'Review matches, then confirm';
  } else if (state === 'revealing') {
    status = 'Grid revealed';
  } else if (state === 'game_over') {
    status = 'Game over';
  }

  const end = () => {
    if (window.confirm('End the game now and show final results?')) run(actions.host.end);
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-3xl border-amber-300/20 bg-ink-800/80 p-2 pl-4">
        <div className="mr-auto flex min-w-0 items-center gap-2 py-1">
          <span className="text-lg">👑</span>
          <div className="min-w-0 leading-tight">
            <div className="text-[11px] font-bold tracking-[0.14em] text-amber-300/80 uppercase">Host controls</div>
            <div className="truncate text-sm text-white/70">{status}</div>
          </div>
        </div>

        {active ? (
          <>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(actions.host.reroll)}>
              🔀 Swap
            </Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(actions.host.reveal)}>
              Reveal now
            </Button>
          </>
        ) : null}

        {state === 'revealing' ? (
          <Button size="sm" busy={busy} onClick={() => run(actions.host.next)}>
            {isLast ? 'Final results →' : 'Confirm & next →'}
          </Button>
        ) : null}

        {state === 'game_over' ? (
          <Button size="sm" busy={busy} onClick={() => run(actions.host.lobby)}>
            Back to lobby
          </Button>
        ) : (
          <Button variant="danger" size="sm" disabled={busy} onClick={end}>
            End
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* --------------------------- Team progress ----------------------------- */

/** Grid of teams showing who has locked in — used by host & spectators. */
export function TeamProgress() {
  const { view, playersById, teamsById } = useGame();
  const { round } = view;
  const doneMap = round.type === 'sync' ? round.submitted : round.locked;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {round.teams.map(({ teamId, members }) => {
        const team = teamsById[teamId];
        return (
          <div key={teamId} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="size-2.5 rounded-full" style={{ background: team?.color }} />
            <span className="flex-1 truncate font-semibold">{team?.name}</span>
            {members.map((id) => (
              <motion.span
                key={id}
                animate={{ scale: doneMap?.[id] ? [1, 1.25, 1] : 1 }}
                className="flex items-center"
              >
                <Avatar
                  player={playersById[id]}
                  size="sm"
                  dim={!doneMap?.[id]}
                  ring={doneMap?.[id] ? '#34d399' : undefined}
                />
              </motion.span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
