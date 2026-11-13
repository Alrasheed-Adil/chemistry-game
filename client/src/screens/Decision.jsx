/**
 * Decision — a situation with four options.
 *  - DecisionActive (`decision_active`): choose what you'd do + predict your partner.
 *  - DecisionReveal (`revealing`): choices and predictions side by side per pair.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SpectatorNote, TeamProgress } from '../components/shell.jsx';
import { Avatar, Bubbles, Button, ElementTile, PromptCard, Screen, cx, useBusy } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';
import { elementOf, pairName, useLang } from '../i18n.jsx';
import { LockedPanel } from './SyncQuestion.jsx';
import { OutcomeChip, PointsBadge } from './SyncReveal.jsx';

const LETTERS = { en: ['A', 'B', 'C', 'D'], ar: ['أ', 'ب', 'ج', 'د'] };

function useLetters() {
  const { lang } = useLang();
  return LETTERS[lang] ?? LETTERS.en;
}

/* ------------------------------- Active -------------------------------- */

export function DecisionActive() {
  const { view, isPlaying } = useGame();
  const { round } = view;
  return (
    <Screen className="space-y-5">
      <PromptCard round={round} total={view.totalRounds} timerTotal={view.settings.decisionSeconds} active />
      {isPlaying ? <DecisionForm key={round.deadline} /> : <ChoicesPreview />}
      <TeamProgress />
    </Screen>
  );
}

function DecisionForm() {
  const { view, actions, roundTeam, playersById } = useGame();
  const { t } = useLang();
  const { round } = view;
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
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <OptionGroup
              title={t('decision.you')}
              choices={round.choices}
              value={choice}
              onChange={setChoice}
              name="self"
            />
            <OptionGroup
              title={t('decision.partner', { name: partnerName })}
              titleAvatar={playersById[partnerId]}
              choices={round.choices}
              value={prediction}
              onChange={setPrediction}
              name="partner"
            />
          </div>
          <Button size="lg" className="w-full" busy={busy} disabled={choice == null || prediction == null} onClick={submit}>
            {t('decision.lock')}
          </Button>
        </motion.div>
      ) : (
        <LockedPanel
          key="locked"
          title={t('decision.lockedTitle')}
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

/** A radio group of the four options, styled as answer rows on a test sheet. */
function OptionGroup({ title, titleAvatar, choices, value, onChange, name }) {
  const { L } = useLang();
  const letters = useLetters();
  return (
    <fieldset className="bench p-4 sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden className="mb-3 flex items-center gap-2 text-lg font-semibold">
        {titleAvatar ? <Avatar player={titleAvatar} size="sm" /> : null}
        {title}
      </div>
      <div className="space-y-2" role="radiogroup" aria-label={title}>
        {choices.map((c, i) => {
          const on = value === i;
          return (
            <label
              key={i}
              className={cx(
                'relative flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2.5 transition',
                on ? 'border-ink bg-bench shadow-[0_2px_0_0_var(--color-ink)]' : 'border-line hover:border-ink/40',
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={i}
                aria-label={`${letters[i]}: ${L(c)}`}
                checked={on}
                onChange={() => onChange(i)}
              />
              <LetterBadge letter={letters[i]} on={on} />
              <span className="flex-1 leading-snug">{L(c)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function LetterBadge({ letter, on, tone = 'ink' }) {
  return (
    <span
      className={cx(
        'grid size-7 shrink-0 place-items-center rounded-[6px] border text-sm font-semibold',
        on
          ? tone === 'react'
            ? 'border-react bg-react text-white'
            : 'border-ink bg-ink text-white'
          : 'border-line text-ink-soft',
      )}
    >
      {letter}
    </span>
  );
}

/** Spectators / host see the options without being able to pick. */
function ChoicesPreview() {
  const { view } = useGame();
  const { L } = useLang();
  const letters = useLetters();
  return (
    <div className="space-y-4">
      <SpectatorNote />
      <ol className="bench divide-y divide-line-soft">
        {view.round.choices.map((c, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <LetterBadge letter={letters[i]} />
            <span>{L(c)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------- Reveal -------------------------------- */

export function DecisionReveal() {
  const { view, roundTeam } = useGame();
  const { round } = view;
  const teams = [...round.teams].sort((a, b) => (b === roundTeam) - (a === roundTeam));
  const mine = roundTeam ? round.results?.[roundTeam.teamId] : null;

  return (
    <Screen className="space-y-5">
      {mine && mine.points >= 2 ? <Bubbles /> : null}
      <PromptCard round={round} total={view.totalRounds} />
      <div className={cx('grid gap-4', teams.length > 1 && 'xl:grid-cols-2')}>
        {teams.map((rt, i) => (
          <PairDecision key={rt.teamId} roundTeam={rt} index={i} highlight={rt === roundTeam} />
        ))}
      </div>
    </Screen>
  );
}

function PairDecision({ roundTeam, index, highlight }) {
  const { view, teamsById } = useGame();
  const { t, L } = useLang();
  const reduce = useReducedMotion();
  const { round } = view;
  const team = teamsById[roundTeam.teamId];
  const el = elementOf(team);
  const result = round.results?.[roundTeam.teamId];
  const [a, b] = roundTeam.members;
  const both = round.submissions?.[a] && round.submissions?.[b];

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

      <div className="grid grid-cols-2 gap-3">
        <SubjectDecision pid={a} partnerId={b} />
        <SubjectDecision pid={b} partnerId={a} />
      </div>

      {both ? (
        <div
          className={cx(
            'mt-3 rounded-[var(--radius-control)] border px-3 py-2 text-sm',
            result?.same ? 'border-react/40 bg-react/[0.07] text-react' : 'border-line-soft text-graphite',
          )}
        >
          {result?.same ? t('decision.same', { n: view.points.sameChoice }) : t('decision.different')}
        </div>
      ) : null}
    </motion.article>
  );
}

function SubjectDecision({ pid, partnerId }) {
  const { view, playersById } = useGame();
  const { t, L } = useLang();
  const letters = useLetters();
  const { round } = view;
  const sub = round.submissions?.[pid];
  const partnerSub = round.submissions?.[partnerId];
  const correct = sub && partnerSub && sub.prediction === partnerSub.choice;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <Avatar player={playersById[pid]} size="sm" />
        <span className="truncate text-sm font-medium">{playerName(playersById, pid)}</span>
      </div>

      <div className="rounded-[var(--radius-control)] bg-glass px-3 py-2.5">
        <div className="text-xs text-graphite">{t('decision.chose')}</div>
        {sub ? (
          <div className="mt-1 flex items-start gap-2">
            <LetterBadge letter={letters[sub.choice]} on />
            <span className="leading-snug font-semibold">{L(round.choices[sub.choice])}</span>
          </div>
        ) : (
          <div className="text-graphite">{t('sync.noAnswer')}</div>
        )}
      </div>

      <div
        className={cx(
          'rounded-[var(--radius-control)] border px-3 py-2.5',
          correct ? 'border-react/50 bg-react/[0.06]' : 'border-line-soft',
        )}
      >
        <div className="text-xs text-graphite">{t('sync.prediction', { name: playerName(playersById, partnerId) })}</div>
        {sub ? (
          <div className="mt-1 flex items-start gap-2">
            <LetterBadge letter={letters[sub.prediction]} on={correct} tone="react" />
            <span className="leading-snug">{L(round.choices[sub.prediction])}</span>
          </div>
        ) : (
          <div className="text-graphite">—</div>
        )}
        <div className="mt-2">
          <OutcomeChip outcome={correct ? 'match' : 'miss'} />
        </div>
      </div>
    </div>
  );
}
