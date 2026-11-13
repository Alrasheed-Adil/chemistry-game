/**
 * Priorities — rank four items from 1 (top priority) to 4.
 *  - PriorityActive (`priority_active`): tap items into a numbered rack.
 *  - PriorityReveal (`revealing`): both rankings side by side; each item at
 *    the same rank scores a point.
 *
 * Players start with nothing ranked, so two people who don't touch the list
 * can't "match" by leaving a default order in place.
 */

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SpectatorNote, TeamProgress } from '../components/shell.jsx';
import { Avatar, Bubbles, Button, ElementTile, PromptCard, Screen, cx, useBusy } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';
import { elementOf, pairName, useLang } from '../i18n.jsx';
import { LockedPanel } from './SyncQuestion.jsx';
import { PointsBadge } from './SyncReveal.jsx';

/* ------------------------------- Active -------------------------------- */

export function PriorityActive() {
  const { view, isPlaying } = useGame();
  const { round } = view;
  return (
    <Screen className="space-y-5">
      <PromptCard round={round} total={view.totalRounds} timerTotal={view.settings.prioritySeconds} active />
      {isPlaying ? <RankForm key={round.deadline} /> : <ItemsPreview />}
      <TeamProgress />
    </Screen>
  );
}

function RankForm() {
  const { view, actions, roundTeam, playersById } = useGame();
  const { t, L } = useLang();
  const reduce = useReducedMotion();
  const { round } = view;
  const count = round.items.length;
  const partnerId = roundTeam.members.find((m) => m !== view.you);
  const partnerName = playerName(playersById, partnerId);
  const submitted = Boolean(round.submitted?.[view.you]);
  const partnerDone = Boolean(round.submitted?.[partnerId]);

  const [order, setOrder] = useState(round.mine?.order ?? []);
  const [editing, setEditing] = useState(!submitted);
  const [busy, run] = useBusy();

  useEffect(() => {
    if (submitted) setEditing(false);
  }, [submitted]);

  const unplaced = round.items.map((_, i) => i).filter((i) => !order.includes(i));

  const place = (i) =>
    setOrder((o) => {
      const next = [...o, i];
      // Once only one item is left, it can only go last — place it for them.
      const rest = round.items.map((_, k) => k).filter((k) => !next.includes(k));
      return rest.length === 1 ? [...next, rest[0]] : next;
    });
  const remove = (i) => setOrder((o) => o.filter((x) => x !== i));

  const submit = () =>
    run(async () => {
      const res = await actions.submitPriority(order);
      if (res?.ok) setEditing(false);
    });

  return (
    <AnimatePresence mode="wait">
      {editing ? (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <p className="text-ink-soft">{t('priority.instruction')}</p>
          <LayoutGroup>
            <div className={cx('grid gap-4', unplaced.length > 0 && 'lg:grid-cols-2')}>
              {/* The rack: four numbered slots */}
              <section className="bench p-4 sm:p-5" aria-label={t('priority.rack')}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t('priority.rack')}</h3>
                  {order.length ? (
                    <button className="text-sm text-graphite underline underline-offset-2 hover:text-ink" onClick={() => setOrder([])}>
                      {t('priority.reset')}
                    </button>
                  ) : null}
                </div>
                <ol className="space-y-2">
                  {Array.from({ length: count }, (_, rank) => {
                    const item = order[rank];
                    const filled = item != null;
                    return (
                      <li key={rank} className="flex items-center gap-3">
                        <RankTube n={rank + 1} filled={filled} />
                        {filled ? (
                          <motion.button
                            layoutId={reduce ? undefined : `item-${item}`}
                            onClick={() => remove(item)}
                            aria-label={`${t('priority.slot', { n: rank + 1 })}: ${L(round.items[item])}`}
                            className="flex min-h-12 flex-1 items-center rounded-[var(--radius-control)] border border-ink bg-bench px-3 text-start font-medium shadow-[0_2px_0_0_var(--color-ink)]"
                          >
                            {L(round.items[item])}
                          </motion.button>
                        ) : (
                          <span className="flex min-h-12 flex-1 items-center rounded-[var(--radius-control)] border-2 border-dashed border-line px-3 text-sm text-graphite">
                            {rank === 0 ? t('priority.top') : rank === count - 1 ? t('priority.bottom') : t('priority.empty')}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>

              {/* The items still to place */}
              {unplaced.length ? (
                <section className="space-y-2">
                  {unplaced.map((i) => (
                    <motion.button
                      key={i}
                      layoutId={reduce ? undefined : `item-${i}`}
                      onClick={() => place(i)}
                      whileTap={{ scale: 0.97 }}
                      className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] border border-line bg-bench px-4 text-start text-[17px] font-medium transition-colors hover:border-ink/50"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full border border-dashed border-line text-sm text-graphite">
                        {order.length + 1}
                      </span>
                      {L(round.items[i])}
                    </motion.button>
                  ))}
                </section>
              ) : null}
            </div>
          </LayoutGroup>

          <Button size="lg" className="w-full" busy={busy} disabled={order.length !== count} onClick={submit}>
            {order.length === count ? t('priority.lock') : t('priority.rankLeft', { n: count - order.length })}
          </Button>
        </motion.div>
      ) : (
        <LockedPanel
          key="locked"
          title={t('priority.lockedTitle')}
          body={partnerDone ? t('sync.revealing') : t('sync.waitingFor', { name: partnerName })}
          action={
            !partnerDone ? (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                {t('sync.change')}
              </Button>
            ) : null
          }
        />
      )}
    </AnimatePresence>
  );
}

/** A small graduated tube with the rank number — fills when an item is placed. */
function RankTube({ n, filled }) {
  return (
    <span
      aria-hidden
      className={cx(
        'tabular relative grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded-b-[14px] rounded-t-[5px] border-2 text-base font-semibold transition-colors',
        filled ? 'border-ink text-white' : 'border-line text-graphite',
      )}
    >
      <span
        className={cx('absolute inset-x-0 bottom-0 transition-[height] duration-300', filled ? 'h-full bg-ink' : 'h-0')}
      />
      <span className="relative">{n}</span>
    </span>
  );
}

/** Host / spectators see the items without ranking them. */
function ItemsPreview() {
  const { view } = useGame();
  const { L } = useLang();
  return (
    <div className="space-y-4">
      <SpectatorNote />
      <ul className="bench divide-y divide-line-soft">
        {view.round.items.map((item, i) => (
          <li key={i} className="px-4 py-3">
            {L(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------- Reveal -------------------------------- */

export function PriorityReveal() {
  const { view, roundTeam } = useGame();
  const { round } = view;
  const teams = [...round.teams].sort((a, b) => (b === roundTeam) - (a === roundTeam));
  const mine = roundTeam ? round.results?.[roundTeam.teamId] : null;

  return (
    <Screen className="space-y-5">
      {mine && mine.sameRanks >= 3 ? <Bubbles /> : null}
      <PromptCard round={round} total={view.totalRounds} />
      <div className={cx('grid gap-4', teams.length > 1 && 'xl:grid-cols-2')}>
        {teams.map((rt, i) => (
          <PairRanking key={rt.teamId} roundTeam={rt} index={i} highlight={rt === roundTeam} />
        ))}
      </div>
    </Screen>
  );
}

function PairRanking({ roundTeam, index, highlight }) {
  const { view, teamsById, playersById } = useGame();
  const { t, L } = useLang();
  const reduce = useReducedMotion();
  const { round } = view;
  const team = teamsById[roundTeam.teamId];
  const el = elementOf(team);
  const result = round.results?.[roundTeam.teamId];
  const [a, b] = roundTeam.members;
  const oa = round.submissions?.[a]?.order;
  const ob = round.submissions?.[b]?.order;
  const count = round.items.length;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.35 }}
      className={cx('bench p-4 sm:p-5', highlight && 'outline-2 outline-offset-[-1px] outline-ink')}
    >
      <header className="mb-4 flex items-center gap-3">
        <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="sm" />
        <h3 className="flex-1 truncate text-lg font-semibold">{pairName(team, L)}</h3>
        <PointsBadge points={result?.points ?? 0} />
      </header>

      {/* Column heads */}
      <div className="mb-2 grid grid-cols-[2.25rem_1fr_1fr] items-center gap-2">
        <span />
        {[a, b].map((pid) => (
          <span key={pid} className="flex min-w-0 items-center gap-2">
            <Avatar player={playersById[pid]} size="xs" />
            <span className="truncate text-sm font-medium">{playerName(playersById, pid)}</span>
          </span>
        ))}
      </div>

      <ol className="space-y-1.5">
        {Array.from({ length: count }, (_, rank) => {
          const same = oa && ob && oa[rank] === ob[rank];
          return (
            <motion.li
              key={rank}
              initial={reduce ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 + rank * 0.12 }}
              className={cx(
                'grid grid-cols-[2.25rem_1fr_1fr] items-stretch gap-2 rounded-[var(--radius-control)] p-1',
                same ? 'bg-react/[0.09] ring-1 ring-react/40' : '',
              )}
            >
              <span
                className={cx(
                  'tabular grid place-items-center rounded-[8px] text-sm font-semibold',
                  same ? 'bg-react text-white' : 'bg-glass text-graphite',
                )}
              >
                {rank + 1}
              </span>
              {[oa, ob].map((o, k) => (
                <span
                  key={k}
                  className={cx(
                    'flex min-h-10 items-center rounded-[8px] px-2.5 text-[15px] leading-snug',
                    same ? 'font-semibold text-ink' : 'bg-glass/70 text-ink-soft',
                  )}
                >
                  {o ? L(round.items[o[rank]]) : <span className="text-graphite">—</span>}
                </span>
              ))}
            </motion.li>
          );
        })}
      </ol>

      <p className={cx('mt-3 text-sm', result?.sameRanks ? 'text-react' : 'text-graphite')}>
        {oa && ob ? t('priority.sameRanks', { n: result?.sameRanks ?? 0, total: count }) : t('priority.noRanking')}
      </p>
    </motion.article>
  );
}
