/**
 * `game_over`: winner reveal, chemistry %, and per-team round stats.
 */

import { motion } from 'framer-motion';
import { Avatar, Button, Confetti, Screen, cx } from '../components/ui.jsx';
import { useGame } from '../game.jsx';

function teamStats(history, teamId) {
  const s = { points: 0, max: 0, predictions: 0, predictionTotal: 0, jinx: 0, tele: 0, teleTotal: 0 };
  for (const round of history) {
    const r = round.results?.[teamId];
    if (!r) continue;
    s.points += r.points;
    s.max += r.max;
    if (round.type === 'sync') {
      s.predictions += r.predictionsCorrect;
      s.predictionTotal += 2;
      s.jinx += r.jinx ? 1 : 0;
    } else {
      s.tele += r.match ? 1 : 0;
      s.teleTotal += 1;
    }
  }
  s.chemistry = s.max ? Math.round((s.points / s.max) * 100) : 0;
  return s;
}

function chemistryLabel(pct) {
  if (pct >= 85) return 'Soulmates 💞';
  if (pct >= 65) return 'Totally in sync ⚡';
  if (pct >= 45) return 'Good vibes ✨';
  if (pct >= 25) return 'Getting there 🌱';
  return 'Opposites attract? 🧲';
}

export default function GameOver() {
  const { view, playersById, isHost, myTeam, actions } = useGame();
  const ranked = view.teams
    .filter((t) => view.history.some((h) => h.results?.[t.id]))
    .map((t) => ({ team: t, stats: teamStats(view.history, t.id) }))
    .sort((a, b) => b.team.score - a.team.score || b.stats.chemistry - a.stats.chemistry);

  const top = ranked[0];
  const tie = ranked.length > 1 && ranked[1].team.score === top.team.score;

  if (!top) {
    return (
      <Screen className="py-16 text-center">
        <h1 className="font-display text-5xl font-extrabold">Game over</h1>
        <p className="mt-3 text-white/60">No rounds were completed.</p>
        {!isHost ? (
          <Button variant="secondary" className="mt-6" onClick={actions.leaveRoom}>
            Leave room
          </Button>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen className="space-y-8">
      <Confetti count={120} />

      {/* Winner hero */}
      <div className="pt-4 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 12 }}
          className="text-7xl"
        >
          {tie ? '🤝' : '🏆'}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 font-display text-5xl leading-none font-extrabold tracking-tight sm:text-7xl"
        >
          {tie ? (
            "It's a tie!"
          ) : (
            <>
              <span className="text-gradient">{top.team.name}</span> win!
            </>
          )}
        </motion.h1>
        {!tie ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5 flex items-center justify-center gap-3"
          >
            {top.team.members.map((id) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <Avatar player={playersById[id]} size="lg" ring={top.team.color} />
                <span className="font-semibold">{playersById[id]?.name ?? 'Someone'}</span>
              </div>
            ))}
          </motion.div>
        ) : null}
      </div>

      {/* Standings */}
      <div className="mx-auto grid max-w-4xl gap-3">
        {ranked.map(({ team, stats }, i) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.12 }}
            className={cx(
              'glass relative overflow-hidden rounded-3xl p-4 sm:p-5',
              team.id === myTeam?.id && 'ring-2 ring-white/25',
            )}
          >
            <div className="absolute -top-16 -left-10 size-44 rounded-full opacity-25 blur-3xl" style={{ background: team.color }} />
            <div className="relative flex flex-wrap items-center gap-4">
              <span className="w-8 font-display text-3xl font-extrabold text-white/30">{i + 1}</span>
              <div className="flex -space-x-2">
                {team.members.map((id) => (
                  <Avatar key={id} player={playersById[id]} size="md" ring={team.color} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-xl font-bold">{team.name}</div>
                <div className="text-sm text-white/55">{chemistryLabel(stats.chemistry)}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl font-extrabold tabular-nums">{team.score}</div>
                <div className="text-xs text-white/40">points</div>
              </div>
            </div>

            {/* Chemistry meter */}
            <div className="relative mt-4">
              <div className="mb-1 flex justify-between text-xs font-bold text-white/50">
                <span>Chemistry</span>
                <span>{stats.chemistry}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.chemistry}%` }}
                  transition={{ delay: 1 + i * 0.12, duration: 1.1, ease: [0.2, 0.7, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-coral-500 via-electric-500 to-indigo-400"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {stats.predictionTotal ? (
                  <span className="chip">
                    💬 {stats.predictions}/{stats.predictionTotal} predictions
                  </span>
                ) : null}
                {stats.predictionTotal ? <span className="chip">⚡ {stats.jinx} jinx</span> : null}
                {stats.teleTotal ? (
                  <span className="chip">
                    🔮 {stats.tele}/{stats.teleTotal} telepathy
                  </span>
                ) : null}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {!isHost ? (
        <div className="text-center">
          <p className="mb-3 text-sm text-white/50">The host can start a rematch from the lobby.</p>
          <Button variant="secondary" onClick={actions.leaveRoom}>
            Leave room
          </Button>
        </div>
      ) : null}
    </Screen>
  );
}
