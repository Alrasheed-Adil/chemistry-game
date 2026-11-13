/**
 * Bare minimum or princess treatment — couples (`princess`) and friends
 * (`bestie`) editions share this screen.
 *  - TreatmentActive (`treatment_active`): call each statement bare minimum
 *    or princess treatment.
 *  - TreatmentReveal (`revealing`): both partners' calls side by side, the
 *    whole room's split per statement, and a point for every shared call.
 *
 * Calls are 0 (bare minimum) or 1 (princess treatment).
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SpectatorNote, TeamProgress } from '../components/shell.jsx';
import { Avatar, Bubbles, Button, ElementTile, PromptCard, Screen, cx, useBusy } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';
import { elementOf, pairName, useLang } from '../i18n.jsx';
import { LockedPanel } from './SyncQuestion.jsx';
import { PointsBadge } from './SyncReveal.jsx';

const BARE = 0;
const PRINCESS = 1;
const ICON = { [BARE]: '😐', [PRINCESS]: '👑' };
const GOLD = '#c9a227';

const timerKey = (type) => (type === 'bestie' ? 'bestieSeconds' : 'princessSeconds');

/* ------------------------------- Active -------------------------------- */

export function TreatmentActive() {
  const { view, isPlaying } = useGame();
  const { round } = view;
  return (
    <Screen className="space-y-5">
      <PromptCard round={round} total={view.totalRounds} timerTotal={view.settings[timerKey(round.type)]} active />
      {isPlaying ? <CallForm key={round.deadline} /> : <StatementsPreview />}
      <TeamProgress />
    </Screen>
  );
}

function CallForm() {
  const { view, actions, roundTeam, playersById } = useGame();
  const { t } = useLang();
  const { round } = view;
  const total = round.items.length;
  const partnerId = roundTeam.members.find((m) => m !== view.you);
  const partnerName = playerName(playersById, partnerId);
  const submitted = Boolean(round.submitted?.[view.you]);
  const partnerDone = Boolean(round.submitted?.[partnerId]);

  const [calls, setCalls] = useState(() => round.mine?.calls ?? Array(total).fill(null));
  const [editing, setEditing] = useState(!submitted);
  const [busy, run] = useBusy();

  useEffect(() => {
    if (submitted) setEditing(false);
  }, [submitted]);

  const called = calls.filter((c) => c != null).length;
  const setCall = (i, value) => setCalls((cs) => cs.map((c, k) => (k === i ? value : c)));
  const submit = () =>
    run(async () => {
      const res = await actions.submitTreatment(calls);
      if (res?.ok) setEditing(false);
    });

  return (
    <AnimatePresence mode="wait">
      {editing ? (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <p className="text-ink-soft">{t('treatment.instruction')}</p>
          <ul className="space-y-2.5">
            {round.items.map((item, i) => (
              <CallRow key={i} index={i} item={item} value={calls[i]} onChange={(v) => setCall(i, v)} />
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <span className="tabular text-sm text-graphite">{t('treatment.called', { n: called, total })}</span>
            <Button size="lg" className="flex-1" busy={busy} disabled={called < total} onClick={submit}>
              {t('treatment.lock')}
            </Button>
          </div>
        </motion.div>
      ) : (
        <LockedPanel
          key="locked"
          title={t('treatment.lockedTitle')}
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

/** One statement with a two-way verdict switch underneath (inline on wide screens). */
function CallRow({ index, item, value, onChange }) {
  const { t, L } = useLang();
  const text = L(item);
  return (
    <li
      className={cx(
        'bench flex flex-col gap-3 p-3.5 transition sm:p-4 xl:flex-row xl:items-center xl:gap-4',
        value === PRINCESS && 'border-[#c9a227]',
      )}
    >
      <span className="flex-1 text-[17px] leading-snug font-medium">{text}</span>
      <div className="grid shrink-0 grid-cols-2 gap-1.5 xl:w-[21rem]" role="radiogroup" aria-label={text}>
        {[BARE, PRINCESS].map((v) => {
          const on = value === v;
          const label = t(v === BARE ? 'treatment.bare' : 'treatment.princess');
          return (
            <label
              key={v}
              className={cx(
                'relative flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-control)] border px-2 py-2.5 text-sm font-medium whitespace-nowrap transition',
                on && v === BARE && 'border-ink bg-glass shadow-[0_2px_0_0_var(--color-ink)]',
                on && v === PRINCESS && 'border-[#a8861a] bg-[#F7E9B5] text-ink shadow-[0_2px_0_0_#a8861a]',
                !on && 'border-line text-ink-soft hover:border-ink/40',
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={`call-${index}`}
                value={v}
                aria-label={label}
                checked={on}
                onChange={() => onChange(v)}
              />
              <span aria-hidden className="text-base leading-none">
                {ICON[v]}
              </span>
              {label}
            </label>
          );
        })}
      </div>
    </li>
  );
}

/** Spectators / host see the statements without voting. */
function StatementsPreview() {
  const { view } = useGame();
  const { L } = useLang();
  return (
    <div className="space-y-4">
      <SpectatorNote />
      <ul className="bench divide-y divide-line-soft">
        {view.round.items.map((item, i) => (
          <li key={i} className="px-4 py-3 text-[17px]">
            {L(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------- Reveal -------------------------------- */

export function TreatmentReveal() {
  const { view, roundTeam } = useGame();
  const { round } = view;
  const mine = roundTeam ? round.results?.[roundTeam.teamId] : null;
  // Pairs whose calls are shown in full: yours, or the first pair if you're watching.
  const featured = roundTeam ?? round.teams[0];
  const others = round.teams.filter((rt) => rt.teamId !== featured?.teamId);

  // Whole-room split per statement.
  const tally = round.items.map((_, i) => {
    const counts = [0, 0];
    for (const sub of Object.values(round.submissions ?? {})) counts[sub.calls[i]] += 1;
    return counts;
  });

  return (
    <Screen className="space-y-5">
      {mine && mine.points >= 4 ? <Bubbles color={GOLD} /> : null}
      <PromptCard round={round} total={view.totalRounds} />
      {featured ? <PairCalls roundTeam={featured} tally={tally} highlight={featured === roundTeam} /> : null}
      {others.length ? (
        <div className={cx('grid gap-3', others.length > 1 && 'sm:grid-cols-2')}>
          {others.map((rt) => (
            <PairSummary key={rt.teamId} roundTeam={rt} />
          ))}
        </div>
      ) : null}
    </Screen>
  );
}

function PairCalls({ roundTeam, tally, highlight }) {
  const { view, teamsById, playersById } = useGame();
  const { t, L } = useLang();
  const reduce = useReducedMotion();
  const { round } = view;
  const team = teamsById[roundTeam.teamId];
  const el = elementOf(team);
  const result = round.results?.[roundTeam.teamId];
  const [a, b] = roundTeam.members;
  const ca = round.submissions?.[a]?.calls;
  const cb = round.submissions?.[b]?.calls;
  const roomSize = Object.keys(round.submissions ?? {}).length;

  return (
    <article className={cx('bench p-4 sm:p-5', highlight && 'outline-2 outline-offset-[-1px] outline-ink')}>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold">{pairName(team, L)}</h3>
          <p className="text-sm text-graphite">{t('treatment.sameCalls', { n: result?.sameCalls ?? 0, total: round.items.length })}</p>
        </div>
        <PointsBadge points={result?.points ?? 0} />
      </header>

      <ul className="space-y-2">
        {round.items.map((item, i) => {
          const same = ca && cb && ca[i] === cb[i];
          const [bare, princess] = tally[i];
          return (
            <motion.li
              key={i}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12 }}
              className={cx(
                'rounded-[var(--radius-control)] border px-3 py-3',
                same ? 'border-react/50 bg-react/[0.06]' : 'border-line-soft',
              )}
            >
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-4">
                <span className="flex-1 leading-snug font-medium">{L(item)}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <CallChip player={playersById[a]} call={ca?.[i]} />
                  <CallChip player={playersById[b]} call={cb?.[i]} />
                  <span
                    aria-hidden
                    className={cx('w-7 text-center text-sm font-semibold', same ? 'text-react' : 'text-graphite/60')}
                  >
                    {same ? `+${view.points.sameCall}` : '·'}
                  </span>
                </div>
              </div>
              {roomSize > 2 ? <RoomSplit bare={bare} princess={princess} /> : null}
            </motion.li>
          );
        })}
      </ul>
    </article>
  );
}

/** A player's avatar with their verdict for one statement. */
function CallChip({ player, call }) {
  const { t } = useLang();
  const label =
    call == null ? t('treatment.noCall') : t(call === PRINCESS ? 'treatment.princess' : 'treatment.bare');
  return (
    <span
      className={cx(
        'flex items-center gap-1.5 rounded-full border py-0.5 ps-0.5 pe-2.5 text-sm',
        call === PRINCESS ? 'border-[#a8861a] bg-[#F7E9B5]' : 'border-line bg-glass',
      )}
      title={player ? `${player.name}: ${label}` : label}
    >
      <Avatar player={player} size="xs" />
      <span aria-hidden className="leading-none">
        {call == null ? '—' : ICON[call]}
      </span>
      <span className="sr-only">{label}</span>
      <span aria-hidden className="hidden text-[13px] whitespace-nowrap text-ink-soft sm:inline">
        {call == null ? '' : label}
      </span>
    </span>
  );
}

/** The whole room's split on one statement, drawn as a thin two-tone bar. */
function RoomSplit({ bare, princess }) {
  const { t } = useLang();
  const total = bare + princess || 1;
  return (
    <div className="mt-2.5 flex items-center gap-2.5">
      <span className="shrink-0 text-xs text-graphite">{t('treatment.room')}</span>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
        <span className="h-full bg-graphite/45" style={{ width: `${(bare / total) * 100}%` }} />
        <span className="h-full" style={{ width: `${(princess / total) * 100}%`, backgroundColor: GOLD }} />
      </div>
      <span className="tabular shrink-0 text-xs text-graphite">{t('treatment.split', { a: bare, b: princess })}</span>
    </div>
  );
}

/** Compact card for the other pairs: one dot per statement, filled when they agreed. */
function PairSummary({ roundTeam }) {
  const { view, teamsById } = useGame();
  const { t, L } = useLang();
  const { round } = view;
  const team = teamsById[roundTeam.teamId];
  const el = elementOf(team);
  const result = round.results?.[roundTeam.teamId];
  const [a, b] = roundTeam.members;
  const ca = round.submissions?.[a]?.calls;
  const cb = round.submissions?.[b]?.calls;

  return (
    <article className="bench flex items-center gap-3 p-3.5">
      <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="xs" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{pairName(team, L)}</h3>
        <div className="mt-1 flex gap-1" aria-label={t('treatment.sameCalls', { n: result?.sameCalls ?? 0, total: round.items.length })}>
          {round.items.map((_, i) => (
            <span
              key={i}
              className={cx('size-2.5 rounded-full', ca && cb && ca[i] === cb[i] ? 'bg-react' : 'bg-line')}
            />
          ))}
        </div>
      </div>
      <PointsBadge points={result?.points ?? 0} />
    </article>
  );
}
