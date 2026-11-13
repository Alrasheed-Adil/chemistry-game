/**
 * Telepathy Grid mode.
 *  - TelepathyActive (`telepathy_active`): pick a tile silently, lock it in.
 *  - TelepathyReveal (`revealing`): everyone's picks land on the grid; matching pairs score.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TeamProgress } from '../components/shell.jsx';
import { Avatar, Button, Confetti, PromptCard, Screen, TimerRing, cx, useBusy } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';

/* ------------------------------- Tile ---------------------------------- */

function TileFace({ item, kind }) {
  switch (kind) {
    case 'color':
      return (
        <>
          <span className="absolute inset-1.5 rounded-[1.1rem]" style={{ background: item.color }} />
          <span className="relative mt-auto mb-2 rounded-full bg-black/35 px-2 py-0.5 text-xs font-bold backdrop-blur">
            {item.label}
          </span>
        </>
      );
    case 'shape':
      return (
        <span className="text-5xl sm:text-6xl" style={{ color: item.color, textShadow: `0 0 24px ${item.color}` }}>
          {item.display}
        </span>
      );
    case 'number':
      return <span className="font-display text-4xl font-extrabold sm:text-5xl">{item.display}</span>;
    case 'word':
      return <span className="px-1 font-display text-lg font-bold sm:text-2xl">{item.display}</span>;
    default:
      return <span className="text-5xl sm:text-6xl">{item.display}</span>;
  }
}

function Grid({ children }) {
  return <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2.5 sm:gap-3.5">{children}</div>;
}

/* ------------------------------ Active --------------------------------- */

export function TelepathyActive() {
  const { view, isPlaying, isHost, actions, roundTeam, playersById } = useGame();
  const { round } = view;
  const locked = Boolean(round.locked?.[view.you]);
  const [selected, setSelected] = useState(round.mine);
  const [busy, run] = useBusy();

  useEffect(() => setSelected(round.mine), [round.mine, round.deadline]);

  const partnerId = roundTeam?.members.find((m) => m !== view.you);
  const partnerLocked = partnerId && round.locked?.[partnerId];

  const choose = (index) => {
    if (!isPlaying || locked) return;
    setSelected(index); // optimistic
    actions.pickTile(index);
  };

  return (
    <Screen className="space-y-5">
      <PromptCard
        round={round}
        total={view.totalRounds}
        right={<TimerRing deadline={round.deadline} total={view.settings.telepathySeconds} size={72} />}
      />

      <p className="text-center text-sm text-white/55">
        {isPlaying
          ? '🤫 No talking. No gestures. Pick the tile you think your partner will pick.'
          : isHost
            ? 'You are hosting — players are choosing silently.'
            : 'You are spectating this round.'}
      </p>

      <Grid>
        {round.grid.items.map((item, i) => {
          const isSel = selected === i;
          return (
            <motion.button
              key={`${round.deadline}-${i}`}
              initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
              animate={{ opacity: locked && !isSel ? 0.35 : 1, scale: isSel ? 1.04 : 1, rotate: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 260, damping: 18 }}
              whileHover={isPlaying && !locked ? { y: -4 } : undefined}
              whileTap={isPlaying && !locked ? { scale: 0.94 } : undefined}
              disabled={!isPlaying || locked}
              onClick={() => choose(i)}
              aria-label={item.label ?? item.display}
              aria-pressed={isSel}
              className={cx(
                'glass relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-3xl transition-shadow',
                isSel && 'border-electric-400/80 shadow-[0_0_0_3px_rgba(192,132,252,0.55),0_0_50px_-5px_rgba(168,85,247,0.7)]',
                isPlaying && !locked && 'cursor-pointer',
              )}
            >
              <TileFace item={item} kind={round.grid.kind} />
              {isSel ? (
                <motion.span
                  layoutId="my-pick"
                  className="absolute top-2 right-2 rounded-full bg-electric-500 px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase"
                >
                  {locked ? 'Locked' : 'You'}
                </motion.span>
              ) : null}
            </motion.button>
          );
        })}
      </Grid>

      {isPlaying ? (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-2">
          <AnimatePresence mode="wait">
            {locked ? (
              <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/60">
                {partnerLocked ? 'Revealing…' : `Locked. Waiting on ${playerName(playersById, partnerId)}…`}
              </motion.p>
            ) : (
              <motion.div key="lock" className="w-full" exit={{ opacity: 0 }}>
                <Button size="lg" className="w-full" busy={busy} disabled={selected == null} onClick={() => run(actions.lockTile)}>
                  {selected == null ? 'Tap a tile' : 'Lock it in 🔒'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div>
          <h3 className="label">Who's locked in</h3>
          <TeamProgress />
        </div>
      )}
    </Screen>
  );
}

/* ------------------------------ Reveal --------------------------------- */

export function TelepathyReveal() {
  const { view, roundTeam, playersById, teamsById } = useGame();
  const { round } = view;
  const mine = roundTeam ? round.results?.[roundTeam.teamId] : null;

  // Who picked each tile, with team color for the ring.
  const pickers = round.grid.items.map(() => []);
  for (const { teamId, members } of round.teams) {
    for (const pid of members) {
      const idx = round.picks?.[pid];
      if (idx != null) pickers[idx].push({ pid, color: teamsById[teamId]?.color });
    }
  }
  const matchedTiles = new Set(
    round.teams.filter((t) => round.results?.[t.teamId]?.match).map((t) => round.picks[t.members[0]]),
  );

  return (
    <Screen className="space-y-5">
      {mine?.match ? <Confetti count={90} /> : null}
      <PromptCard round={round} total={view.totalRounds} />

      {mine ? (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.5 }}
          className="text-center"
        >
          <div className={cx('font-display text-5xl font-extrabold sm:text-6xl', mine.match ? 'text-gradient' : 'text-white/80')}>
            {mine.match ? 'TELEPATHY! 🔮' : 'Not this time…'}
          </div>
          <p className="mt-1 text-white/55">
            {mine.match ? `Same tile. +${mine.points} points.` : 'Your minds wandered in different directions.'}
          </p>
        </motion.div>
      ) : null}

      <Grid>
        {round.grid.items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: pickers[i].length ? 1 : 0.3 }}
            transition={{ delay: 0.2 }}
            className={cx(
              'glass relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-3xl',
              matchedTiles.has(i) && 'shadow-[0_0_0_3px_rgba(52,211,153,0.6),0_0_50px_-5px_rgba(52,211,153,0.6)]',
            )}
          >
            <TileFace item={item} kind={round.grid.kind} />
            <div className="absolute inset-x-1 bottom-1.5 flex flex-wrap justify-center -space-x-1.5">
              {pickers[i].map(({ pid, color }, k) => (
                <motion.span
                  key={pid}
                  initial={{ y: -60, opacity: 0, scale: 0.4 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + k * 0.08 + i * 0.03, type: 'spring', stiffness: 300, damping: 16 }}
                >
                  <Avatar player={playersById[pid]} size="xs" ring={color} />
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </Grid>

      <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
        {round.teams.map(({ teamId, members }, i) => {
          const team = teamsById[teamId];
          const res = round.results?.[teamId];
          return (
            <motion.div
              key={teamId}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.08 }}
              className={cx(
                'glass flex items-center gap-3 rounded-2xl px-4 py-3',
                res?.match && 'border-emerald-400/40 bg-emerald-400/[0.07]',
              )}
            >
              <span className="size-2.5 rounded-full" style={{ background: team?.color }} />
              <span className="flex-1 truncate font-semibold">{team?.name}</span>
              {members.map((pid) => {
                const idx = round.picks?.[pid];
                const item = idx != null ? round.grid.items[idx] : null;
                return (
                  <span key={pid} className="flex items-center gap-1 text-sm" title={playerName(playersById, pid)}>
                    <Avatar player={playersById[pid]} size="xs" />
                    <MiniItem item={item} kind={round.grid.kind} />
                  </span>
                );
              })}
              <span className={cx('font-display font-extrabold', res?.match ? 'text-emerald-300' : 'text-white/30')}>
                +{res?.points ?? 0}
              </span>
            </motion.div>
          );
        })}
      </div>
    </Screen>
  );
}

function MiniItem({ item, kind }) {
  if (!item) return <span className="text-white/30">—</span>;
  if (kind === 'color') return <span className="inline-block size-4 rounded-md" style={{ background: item.color }} />;
  if (kind === 'shape') return <span style={{ color: item.color }}>{item.display}</span>;
  return <span className="max-w-16 truncate font-semibold">{item.display}</span>;
}
