/**
 * Sync mode — `revealing`.
 * Answers & predictions are shown side by side per team. Auto-matching marks
 * clear hits; "close" calls (and anything else) can be overridden by the host.
 */

import { motion } from 'framer-motion';
import { Avatar, Confetti, PromptCard, Screen, cx } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';

export default function SyncReveal() {
  const { view, isHost, roundTeam } = useGame();
  const { round } = view;
  // Show the viewer's own team first.
  const teams = [...round.teams].sort((a, b) => (b === roundTeam) - (a === roundTeam));
  const mine = roundTeam ? round.results?.[roundTeam.teamId] : null;
  const hasClose = Object.values(round.verdicts ?? {}).includes('close');

  return (
    <Screen className="space-y-5">
      {mine && mine.points >= 2 ? <Confetti /> : null}
      <PromptCard round={round} total={view.totalRounds} />

      {isHost ? (
        <div className="glass flex items-start gap-3 rounded-2xl border-amber-300/25 p-4 text-sm text-amber-100/90">
          <span className="text-xl">⚖️</span>
          <p>
            <b>You're the judge.</b> Tap ✓ or ✗ on any guess to override the auto-match.
            {hasClose ? ' Amber “close” calls score nothing until you approve them.' : ''}
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-white/50">The host is reviewing close calls…</p>
      )}

      <div className={cx('grid gap-4', teams.length > 1 && 'xl:grid-cols-2')}>
        {teams.map((t, i) => (
          <TeamReveal key={t.teamId} roundTeam={t} index={i} highlight={t === roundTeam} />
        ))}
      </div>
    </Screen>
  );
}

function TeamReveal({ roundTeam, index, highlight }) {
  const { view, teamsById, isHost } = useGame();
  const { round } = view;
  const team = teamsById[roundTeam.teamId];
  const result = round.results?.[roundTeam.teamId];
  const [a, b] = roundTeam.members;
  const jinxKey = `jinx:${roundTeam.teamId}`;
  const jinx = round.verdicts?.[jinxKey];
  const sa = round.submissions?.[a];
  const sb = round.submissions?.[b];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.15 + index * 0.12, type: 'spring', stiffness: 180, damping: 20 }}
      className={cx('glass relative overflow-hidden rounded-3xl p-4 sm:p-5', highlight && 'ring-2 ring-white/20')}
    >
      <div className="absolute -top-20 -left-10 size-48 rounded-full opacity-25 blur-3xl" style={{ background: team?.color }} />

      <div className="relative mb-4 flex items-center gap-2">
        <span className="size-3 rounded-full" style={{ background: team?.color }} />
        <h3 className="flex-1 truncate font-display text-xl font-bold">{team?.name}</h3>
        <motion.span
          key={result?.points}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          className={cx(
            'rounded-full px-3 py-1 font-display text-lg font-extrabold',
            result?.points ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-white/40',
          )}
        >
          +{result?.points ?? 0}
        </motion.span>
      </div>

      <div className="relative grid grid-cols-2 gap-3">
        <PlayerColumn pid={a} partnerId={b} delay={0.3 + index * 0.12} />
        <PlayerColumn pid={b} partnerId={a} delay={0.45 + index * 0.12} />
      </div>

      {/* Jinx bonus: both partners gave the same answer */}
      {sa && sb ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 + index * 0.12 }}
          className={cx(
            'relative mt-3 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm',
            jinx === 'match' ? 'bg-electric-500/15 text-electric-200' : 'bg-white/[0.03] text-white/45',
          )}
        >
          <span>{jinx === 'match' ? '⚡' : '·'}</span>
          <span className="flex-1">
            {jinx === 'match'
              ? `Jinx! Same answer · +${view.points.jinx}`
              : jinx === 'close'
                ? 'Similar answers — jinx bonus?'
                : 'Different answers'}
          </span>
          {isHost ? <VerdictToggle verdictKey={jinxKey} /> : null}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

function PlayerColumn({ pid, partnerId, delay }) {
  const { view, playersById, isHost } = useGame();
  const { round } = view;
  const sub = round.submissions?.[pid];
  const key = `pred:${pid}`;
  const verdict = round.verdicts?.[key];
  const overridden = round.autoVerdicts?.[key] !== verdict;

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.2, 0.7, 0.3, 1] }}
      className="flex min-w-0 flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <Avatar player={playersById[pid]} size="sm" />
        <span className="truncate text-sm font-bold">{playerName(playersById, pid)}</span>
      </div>

      <div className="rounded-2xl bg-white/[0.06] p-3">
        <div className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">Answered</div>
        <div className="font-display text-lg leading-tight font-bold break-words">
          {sub?.answer ?? <span className="text-white/30 italic">no answer</span>}
        </div>
      </div>

      <div
        className={cx(
          'rounded-2xl border p-3 transition-colors',
          verdict === 'match' && 'border-emerald-400/40 bg-emerald-400/10',
          verdict === 'close' && 'border-amber-300/40 bg-amber-300/10',
          verdict === 'miss' && 'border-white/5 bg-white/[0.03]',
        )}
      >
        <div className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
          Guessed {playerName(playersById, partnerId)}
        </div>
        <div className="leading-tight break-words">{sub?.prediction ?? <span className="text-white/30 italic">—</span>}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <VerdictBadge verdict={verdict} />
          {overridden ? <span className="text-[10px] font-bold text-amber-300/80 uppercase">host call</span> : null}
        </div>
        {isHost && sub ? <VerdictToggle verdictKey={key} className="mt-2" /> : null}
      </div>
    </motion.div>
  );
}

function VerdictBadge({ verdict }) {
  const map = {
    match: ['✓ Nailed it', 'text-emerald-300'],
    close: ['≈ Close call', 'text-amber-300'],
    miss: ['✗ Nope', 'text-white/40'],
  };
  const [text, color] = map[verdict] ?? map.miss;
  return (
    <motion.span key={verdict} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className={cx('text-xs font-bold', color)}>
      {text}
    </motion.span>
  );
}

/** Host-only ✓ / ✗ override buttons. */
function VerdictToggle({ verdictKey, className }) {
  const { view, actions } = useGame();
  const current = view.round.verdicts?.[verdictKey];
  const btn = (value, label, activeClass) => (
    <button
      onClick={() => actions.host.verdict(verdictKey, value)}
      className={cx(
        'h-8 flex-1 rounded-xl border text-sm font-bold transition',
        current === value ? activeClass : 'border-white/10 text-white/50 hover:bg-white/10 hover:text-white',
      )}
      aria-pressed={current === value}
    >
      {label}
    </button>
  );
  return (
    <div className={cx('flex min-w-24 gap-1.5', className)}>
      {btn('match', '✓', 'border-emerald-400/60 bg-emerald-400/20 text-emerald-200')}
      {btn('miss', '✗', 'border-coral-500/60 bg-coral-500/20 text-coral-200')}
    </div>
  );
}
