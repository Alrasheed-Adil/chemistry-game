/**
 * Would you rather — two hard options.
 *  - RatherActive (`rather_active`): choose one for yourself, then predict your partner.
 *  - RatherReveal (`revealing`): each option shows who chose it; predictions are scored.
 *
 * Shares the server's Decision pipeline (`decision:submit`), with two choices.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SpectatorNote, TeamProgress } from '../components/shell.jsx';
import { Avatar, Bubbles, Button, ElementTile, PromptCard, Screen, cx, useBusy } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';
import { elementOf, pairName, useLang } from '../i18n.jsx';
import { LockedPanel } from './SyncQuestion.jsx';
import { OutcomeChip, PointsBadge } from './SyncReveal.jsx';

const LETTERS = { en: ['A', 'B'], ar: ['أ', 'ب'] };

/* ------------------------------- Active -------------------------------- */

export function RatherActive() {
  const { view, isPlaying } = useGame();
  const { round } = view;
  return (
    <Screen className="space-y-5">
      <PromptCard round={round} total={view.totalRounds} timerTotal={view.settings.ratherSeconds} active />
      {isPlaying ? (
        <RatherForm key={round.deadline} />
      ) : (
        <div className="space-y-4">
          <SpectatorNote />
          <Versus choices={round.choices} />
        </div>
      )}
      <TeamProgress />
    </Screen>
  );
}

function RatherForm() {
  const { view, actions, roundTeam, playersById } = useGame();
  const { t, L, lang } = useLang();
  const { round } = view;
  const letters = LETTERS[lang] ?? LETTERS.en;
  const partnerId = roundTeam.members.find((m) => m !== view.you);
  const partnerName = playerName(playersById, partnerId);
  const submitted = Boolean(round.submitted?.[view.you]);
  const partnerDone = Boolean(round.submitted?.[partnerId]);

  const [choice, setChoice] = useState(round.mine?.choice ?? null);
  const [prediction, setPrediction] = useState(round.mine?.prediction ?? null);
  const [editing, setEditing] = useState(!submitted);
  const [busy, run] = useBusy();

  useEffect(() => {
    if (submitted) setEditing(false);
  }, [submitted]);

  const submit = () =>
    run(async () => {
      const res = await actions.submitDecision(choice, prediction);
      if (res?.ok) setEditing(false);
    });

  return (
    <AnimatePresence mode="wait">
      {editing ? (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
          <section>
            <h3 className="mb-3 text-lg font-semibold">{t('rather.you')}</h3>
            <Versus choices={round.choices} value={choice} onChange={setChoice} name="self" />
          </section>

          <section className="bench p-4 sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Avatar player={playersById[partnerId]} size="sm" />
              {t('rather.partner', { name: partnerName })}
            </h3>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('rather.partner', { name: partnerName })}>
              {round.choices.map((c, i) => (
                <label
                  key={i}
                  className={cx(
                    'relative flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border px-3 py-2.5 transition',
                    prediction === i ? 'border-ink shadow-[0_2px_0_0_var(--color-ink)]' : 'border-line hover:border-ink/40',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="partner"
                    value={i}
                    aria-label={`${letters[i]}: ${L(c)}`}
                    checked={prediction === i}
                    onChange={() => setPrediction(i)}
                  />
                  <Letter letter={letters[i]} on={prediction === i} />
                  <span className="text-[15px] leading-snug">{L(c)}</span>
                </label>
              ))}
            </div>
          </section>

          <Button size="lg" className="w-full" busy={busy} disabled={choice == null || prediction == null} onClick={submit}>
            {t('decision.lock')}
          </Button>
        </motion.div>
      ) : (
        <LockedPanel
          key="locked"
          title={t('rather.lockedTitle')}
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

function Letter({ letter, on }) {
  return (
    <span
      className={cx(
        'grid size-7 shrink-0 place-items-center rounded-[6px] border text-sm font-semibold',
        on ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft',
      )}
    >
      {letter}
    </span>
  );
}

/**
 * The two options facing each other with "or" between them. Interactive when
 * `onChange` is given; `footer(i)` renders extra content under each option
 * (used by the reveal to show who chose it).
 */
function Versus({ choices, value, onChange, name, footer, highlight }) {
  const { t, L, lang } = useLang();
  const letters = LETTERS[lang] ?? LETTERS.en;
  const interactive = Boolean(onChange);

  return (
    <div className="relative grid gap-3 sm:grid-cols-2 sm:gap-4" role={interactive ? 'radiogroup' : undefined}>
      {choices.map((c, i) => {
        const on = value === i;
        const Tag = interactive ? 'label' : 'div';
        return (
          <Tag
            key={i}
            className={cx(
              'relative flex min-h-36 flex-col rounded-[var(--radius-surface)] border-2 bg-bench p-5 transition sm:min-h-48 sm:p-6',
              interactive && 'cursor-pointer',
              on
                ? 'border-ink shadow-[0_4px_0_0_var(--color-ink)]'
                : highlight?.(i)
                  ? 'border-react'
                  : 'border-line',
              interactive && !on && 'hover:border-ink/40',
            )}
          >
            {interactive ? (
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={i}
                aria-label={`${letters[i]}: ${L(c)}`}
                checked={on}
                onChange={() => onChange(i)}
              />
            ) : null}
            <Letter letter={letters[i]} on={on} />
            <span className="mt-auto pt-4 text-[22px] leading-tight font-semibold text-balance sm:text-[26px]">{L(c)}</span>
            {footer ? <div className="mt-4">{footer(i)}</div> : null}
          </Tag>
        );
      })}
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink bg-glass text-sm font-semibold"
      >
        {t('rather.or')}
      </span>
    </div>
  );
}

/* ------------------------------- Reveal -------------------------------- */

export function RatherReveal() {
  const { view, roundTeam, playersById, teamsById } = useGame();
  const reduce = useReducedMotion();
  const { round } = view;
  const teams = [...round.teams].sort((a, b) => (b === roundTeam) - (a === roundTeam));
  const mine = roundTeam ? round.results?.[roundTeam.teamId] : null;

  // Everyone who chose each option, with their pair's flame color.
  const choosers = round.choices.map(() => []);
  for (const { teamId, members } of round.teams) {
    for (const pid of members) {
      const sub = round.submissions?.[pid];
      if (sub) choosers[sub.choice].push({ pid, color: elementOf(teamsById[teamId]).color });
    }
  }
  const sameSide = (i) => roundTeam && roundTeam.members.every((pid) => round.submissions?.[pid]?.choice === i);

  return (
    <Screen className="space-y-5">
      {mine && mine.points >= 2 ? <Bubbles /> : null}
      <PromptCard round={round} total={view.totalRounds} />

      <Versus
        choices={round.choices}
        highlight={sameSide}
        footer={(i) => (
          <div className="flex min-h-8 flex-wrap gap-1.5">
            {choosers[i].map(({ pid, color }, k) => (
              <motion.span
                key={pid}
                initial={reduce ? false : { y: -16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 + k * 0.08 }}
                className="flex items-center gap-1.5 rounded-full border border-line bg-glass py-0.5 ps-0.5 pe-2.5 text-sm"
              >
                <Avatar player={playersById[pid]} size="xs" ring={color} />
                {playerName(playersById, pid)}
              </motion.span>
            ))}
          </div>
        )}
      />

      <div className={cx('grid gap-3', teams.length > 1 && 'xl:grid-cols-2')}>
        {teams.map((rt) => (
          <PairPredictions key={rt.teamId} roundTeam={rt} highlight={rt === roundTeam} />
        ))}
      </div>
    </Screen>
  );
}

function PairPredictions({ roundTeam, highlight }) {
  const { view, teamsById, playersById } = useGame();
  const { t, L, lang } = useLang();
  const letters = LETTERS[lang] ?? LETTERS.en;
  const { round } = view;
  const team = teamsById[roundTeam.teamId];
  const el = elementOf(team);
  const result = round.results?.[roundTeam.teamId];
  const [a, b] = roundTeam.members;
  const both = round.submissions?.[a] && round.submissions?.[b];

  return (
    <article className={cx('bench p-4', highlight && 'outline-2 outline-offset-[-1px] outline-ink')}>
      <header className="mb-3 flex items-center gap-3">
        <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="xs" />
        <h3 className="flex-1 truncate font-semibold">{pairName(team, L)}</h3>
        <PointsBadge points={result?.points ?? 0} />
      </header>
      <ul className="space-y-2">
        {[
          [a, b],
          [b, a],
        ].map(([pid, other]) => {
          const sub = round.submissions?.[pid];
          const correct = sub && round.submissions?.[other] && sub.prediction === round.submissions[other].choice;
          return (
            <li key={pid} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Avatar player={playersById[pid]} size="xs" />
              <span className="text-ink-soft">{t('sync.prediction', { name: playerName(playersById, other) })}:</span>
              {sub ? (
                <span className="font-medium">
                  {letters[sub.prediction]} · {L(round.choices[sub.prediction])}
                </span>
              ) : (
                <span className="text-graphite">—</span>
              )}
              <OutcomeChip outcome={correct ? 'match' : 'miss'} />
            </li>
          );
        })}
      </ul>
      {both ? (
        <p className={cx('mt-3 text-sm', result?.same ? 'text-react' : 'text-graphite')}>
          {result?.same ? t('decision.same', { n: view.points.sameChoice }) : t('decision.different')}
        </p>
      ) : null}
    </article>
  );
}
