/**
 * Telepathy — a 3×3 well plate.
 *  - TelepathyActive (`telepathy_active`): pick a well silently, lock it in.
 *  - TelepathyReveal (`revealing`): everyone's picks land in the wells.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SpectatorNote, TeamProgress } from '../components/shell.jsx';
import { Avatar, Bubbles, Button, ElementTile, PromptCard, Screen, cx, useBusy } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';
import { elementOf, pairName, useLang } from '../i18n.jsx';
import { PointsBadge } from './SyncReveal.jsx';

const ROWS = ['A', 'B', 'C'];
const wellId = (i) => `${ROWS[Math.floor(i / 3)]}${(i % 3) + 1}`;

/* ------------------------------ Well content ---------------------------- */

function WellFace({ item, kind }) {
  const { L } = useLang();
  switch (kind) {
    case 'color':
      return (
        <>
          <span className="absolute inset-[14%] rounded-full" style={{ background: item.color, boxShadow: 'inset 0 -6px 12px rgba(0,0,0,.18)' }} />
          <span className="sr-only">{L(item.label)}</span>
        </>
      );
    case 'shape':
      return (
        <span className="text-4xl sm:text-5xl" style={{ color: item.color }}>
          {item.display}
        </span>
      );
    case 'number':
      return <span className="tabular text-3xl font-semibold sm:text-4xl">{item.display}</span>;
    case 'word':
      return <span className="px-2 text-center text-[15px] leading-tight font-semibold sm:text-lg">{L(item.display)}</span>;
    default:
      return <span className="text-4xl sm:text-5xl">{item.display}</span>;
  }
}

const wellLabel = (item, L) => (item.label ? L(item.label) : L(item.display));

/** The plate: column numbers on top, row letters at the side, 3×3 wells. */
function Plate({ children }) {
  return (
    <div className="bench mx-auto w-full max-w-[460px] rounded-[28px] p-3 sm:p-5" dir="ltr">
      <div className="grid grid-cols-[18px_repeat(3,1fr)] gap-2.5 sm:gap-3.5">
        <span />
        {[1, 2, 3].map((n) => (
          <span key={n} className="tabular text-center text-xs text-graphite">
            {n}
          </span>
        ))}
        {children.map((well, i) => (
          <PlateCell key={i} index={i}>
            {well}
          </PlateCell>
        ))}
      </div>
    </div>
  );
}

function PlateCell({ index, children }) {
  return (
    <>
      {index % 3 === 0 ? <span className="grid place-items-center text-xs text-graphite">{ROWS[index / 3]}</span> : null}
      {children}
    </>
  );
}

const wellBase =
  'relative grid aspect-square place-items-center rounded-full border bg-glass shadow-[inset_0_3px_8px_rgba(19,35,58,0.14)] transition';

/* ------------------------------- Active -------------------------------- */

export function TelepathyActive() {
  const { view, isPlaying, actions, roundTeam, playersById } = useGame();
  const { t, L } = useLang();
  const reduce = useReducedMotion();
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
      <PromptCard round={round} total={view.totalRounds} timerTotal={view.settings.telepathySeconds} active />

      {isPlaying ? <p className="text-ink-soft">{t('telepathy.instruction')}</p> : <SpectatorNote />}

      <Plate>
        {round.grid.items.map((item, i) => {
          const isSel = selected === i;
          return (
            <motion.button
              key={`${round.deadline}-${i}`}
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: locked && !isSel ? 0.35 : 1, scale: 1 }}
              transition={{ delay: reduce ? 0 : i * 0.03, duration: 0.25 }}
              whileTap={isPlaying && !locked ? { scale: 0.93 } : undefined}
              disabled={!isPlaying || locked}
              onClick={() => choose(i)}
              aria-label={`${wellId(i)}: ${wellLabel(item, L)}`}
              aria-pressed={isSel}
              className={cx(
                wellBase,
                isSel ? 'border-[3px] border-ink bg-bench' : 'border-line',
                isPlaying && !locked && 'cursor-pointer hover:border-ink/50',
              )}
            >
              <WellFace item={item} kind={round.grid.kind} />
              {isSel ? (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-white">
                  {locked ? t('telepathy.locked') : t('telepathy.you')}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </Plate>

      {isPlaying ? (
        <div className="mx-auto max-w-[460px]">
          <AnimatePresence mode="wait">
            {locked ? (
              <motion.p key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-ink-soft">
                {partnerLocked ? t('sync.revealing') : t('telepathy.lockedWaiting', { name: playerName(playersById, partnerId) })}
              </motion.p>
            ) : (
              <motion.div key="lock" exit={{ opacity: 0 }}>
                <Button size="lg" className="w-full" busy={busy} disabled={selected == null} onClick={() => run(actions.lockTile)}>
                  {selected == null ? t('telepathy.pickWell') : (
                    <>
                      {t('telepathy.lock')} <span dir="ltr" className="tabular opacity-70">{wellId(selected)}</span>
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <TeamProgress />
      )}
    </Screen>
  );
}

/* ------------------------------- Reveal -------------------------------- */

export function TelepathyReveal() {
  const { view, roundTeam, playersById, teamsById } = useGame();
  const { t, L } = useLang();
  const reduce = useReducedMotion();
  const { round } = view;
  const mine = roundTeam ? round.results?.[roundTeam.teamId] : null;

  const pickers = round.grid.items.map(() => []);
  for (const { teamId, members } of round.teams) {
    for (const pid of members) {
      const idx = round.picks?.[pid];
      if (idx != null) pickers[idx].push({ pid, color: elementOf(teamsById[teamId]).color });
    }
  }
  const matchedWells = new Set(
    round.teams.filter((tm) => round.results?.[tm.teamId]?.match).map((tm) => round.picks[tm.members[0]]),
  );

  return (
    <Screen className="space-y-5">
      {mine?.match ? <Bubbles count={34} /> : null}
      <PromptCard round={round} total={view.totalRounds} />

      {mine ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={cx(
            'flex items-center gap-4 rounded-[var(--radius-surface)] border px-5 py-4',
            mine.match ? 'border-react/50 bg-react/[0.07]' : 'border-line bg-bench',
          )}
        >
          <span className={cx('size-3 shrink-0 rounded-full', mine.match ? 'bg-react' : 'bg-line')} />
          <div>
            <div className="text-xl font-semibold">{mine.match ? t('telepathy.matchTitle') : t('telepathy.missTitle')}</div>
            <p className="text-ink-soft">{mine.match ? t('telepathy.matchBody', { n: mine.points }) : t('telepathy.missBody')}</p>
          </div>
        </motion.div>
      ) : null}

      <Plate>
        {round.grid.items.map((item, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{ opacity: pickers[i].length ? 1 : 0.35 }}
            transition={{ delay: 0.2 }}
            className={cx(wellBase, matchedWells.has(i) ? 'border-[3px] border-react bg-bench' : 'border-line')}
            role="img"
            aria-label={`${wellId(i)}: ${wellLabel(item, L)}`}
          >
            <WellFace item={item} kind={round.grid.kind} />
            <div className="absolute inset-x-0 -bottom-2 flex justify-center -space-x-1.5">
              {pickers[i].map(({ pid, color }, k) => (
                <motion.span
                  key={pid}
                  initial={reduce ? false : { y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + k * 0.08 + i * 0.03, type: 'spring', stiffness: 320, damping: 20 }}
                >
                  <Avatar player={playersById[pid]} size="xs" ring={color} />
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </Plate>

      <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-2">
        {round.teams.map(({ teamId, members }) => {
          const team = teamsById[teamId];
          const el = elementOf(team);
          const res = round.results?.[teamId];
          return (
            <div key={teamId} className="bench flex items-center gap-3 px-3 py-2.5">
              <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="xs" />
              <span className="flex-1 truncate text-sm font-medium">{pairName(team, L)}</span>
              {members.map((pid) => {
                const idx = round.picks?.[pid];
                return (
                  <span key={pid} className="flex items-center gap-1 text-sm" title={playerName(playersById, pid)}>
                    <Avatar player={playersById[pid]} size="xs" />
                    <span dir="ltr" className="tabular text-graphite">
                      {idx != null ? wellId(idx) : '—'}
                    </span>
                  </span>
                );
              })}
              <PointsBadge points={res?.points ?? 0} />
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
