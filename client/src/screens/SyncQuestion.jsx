/**
 * Sync — `question_active`.
 * Players type their own answer and a prediction of their partner's.
 * The host (if not playing) and spectators see lock-in progress.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SpectatorNote, TeamProgress } from '../components/shell.jsx';
import { Avatar, Button, PromptCard, Screen, useBusy } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';
import { useLang } from '../i18n.jsx';

export default function SyncQuestion() {
  const { view, isPlaying } = useGame();
  const { round } = view;
  return (
    <Screen className="space-y-5">
      <PromptCard round={round} total={view.totalRounds} timerTotal={view.settings.questionSeconds} active />
      {isPlaying ? <AnswerForm key={round.deadline} /> : <SpectatorNote />}
      <TeamProgress />
    </Screen>
  );
}

function AnswerForm() {
  const { view, actions, roundTeam, playersById } = useGame();
  const { t } = useLang();
  const { round } = view;
  const partnerId = roundTeam.members.find((m) => m !== view.you);
  const partner = playersById[partnerId];
  const partnerName = playerName(playersById, partnerId);
  const submitted = Boolean(round.submitted?.[view.you]);
  const partnerDone = Boolean(round.submitted?.[partnerId]);

  const [answer, setAnswer] = useState(round.mine?.answer ?? '');
  const [prediction, setPrediction] = useState(round.mine?.prediction ?? '');
  const [editing, setEditing] = useState(!submitted);
  const [busy, run] = useBusy();

  useEffect(() => {
    if (submitted) setEditing(false);
  }, [submitted]);

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      const res = await actions.submitSync(answer, prediction);
      if (res?.ok) setEditing(false);
    });
  };

  return (
    <AnimatePresence mode="wait">
      {editing ? (
        <motion.form
          key="form"
          onSubmit={submit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="bench grid gap-5 p-5 sm:grid-cols-2 sm:p-6"
        >
          <div>
            <label className="label" htmlFor="answer">
              {t('sync.yourAnswer')}
            </label>
            <input
              id="answer"
              className="field text-lg"
              placeholder={t('sync.answerPlaceholder')}
              maxLength={60}
              autoComplete="off"
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
          <div>
            <label className="label flex items-center gap-2" htmlFor="prediction">
              <Avatar player={partner} size="xs" />
              {t('sync.predict', { name: partnerName })}
            </label>
            <input
              id="prediction"
              className="field text-lg"
              placeholder={t('sync.predictPlaceholder')}
              maxLength={60}
              autoComplete="off"
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="sm:col-span-2" busy={busy} disabled={!answer.trim() || !prediction.trim()}>
            {t('sync.lock')}
          </Button>
        </motion.form>
      ) : (
        <LockedPanel
          key="locked"
          title={t('sync.lockedTitle')}
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

/** "Sealed sample" panel shown after locking in. */
export function LockedPanel({ title, body, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="bench flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
    >
      <SealIcon />
      <div className="flex-1">
        <div className="text-xl font-semibold">{title}</div>
        <p className="text-ink-soft">{body}</p>
      </div>
      {action}
    </motion.div>
  );
}

/** A stoppered vial — the answer is sealed. */
function SealIcon() {
  return (
    <svg width="40" height="48" viewBox="0 0 40 48" aria-hidden className="shrink-0">
      <rect x="12" y="2" width="16" height="9" rx="2" fill="#13233A" />
      <path d="M14 11h12v8l7 20a5 5 0 0 1-4.7 7H11.7A5 5 0 0 1 7 39l7-20z" fill="#fff" stroke="#13233A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10.3 31h19.4l3.1 8.5a3 3 0 0 1-2.8 4.5H10a3 3 0 0 1-2.8-4.5z" fill="#23905a" opacity=".85" />
    </svg>
  );
}
