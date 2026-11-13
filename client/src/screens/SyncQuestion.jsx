/**
 * Sync mode — `question_active`.
 * Players type their own answer + a prediction of their partner's answer.
 * Host-only / spectators see live lock-in progress for every team.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TeamProgress } from '../components/shell.jsx';
import { Avatar, Button, PromptCard, Screen, TimerRing, useBusy } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';

export default function SyncQuestion() {
  const { view, isPlaying } = useGame();
  const { round } = view;

  return (
    <Screen className="space-y-5">
      <PromptCard
        round={round}
        total={view.totalRounds}
        right={<TimerRing deadline={round.deadline} total={view.settings.questionSeconds} size={72} />}
      />
      {isPlaying ? <AnswerForm key={round.deadline} /> : <SpectatorNote />}
      <div>
        <h3 className="label">Who's locked in</h3>
        <TeamProgress />
      </div>
    </Screen>
  );
}

function AnswerForm() {
  const { view, actions, roundTeam, playersById } = useGame();
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

  // Server state is the source of truth (e.g. after a refresh).
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="glass rounded-3xl p-4 sm:p-5">
            <label className="label" htmlFor="answer">
              Your answer
            </label>
            <input
              id="answer"
              className="field text-lg"
              placeholder="Be honest…"
              maxLength={60}
              autoComplete="off"
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
          <div className="glass rounded-3xl bg-gradient-to-br from-electric-500/15 to-transparent p-4 sm:p-5">
            <label className="label flex items-center gap-2" htmlFor="prediction">
              <Avatar player={partner} size="xs" /> What will {partnerName} say?
            </label>
            <input
              id="prediction"
              className="field text-lg"
              placeholder="Read their mind…"
              maxLength={60}
              autoComplete="off"
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="sm:col-span-2"
            busy={busy}
            disabled={!answer.trim() || !prediction.trim()}
          >
            Lock it in 🔒
          </Button>
        </motion.form>
      ) : (
        <motion.div
          key="locked"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass flex flex-col items-center gap-3 rounded-3xl p-6 text-center sm:flex-row sm:text-left"
        >
          <motion.span
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.6 }}
            className="text-5xl"
          >
            🔒
          </motion.span>
          <div className="flex-1">
            <div className="font-display text-2xl font-extrabold">Locked in!</div>
            <p className="text-white/60">
              {partnerDone ? 'Revealing…' : `Waiting for ${partnerName} — no peeking, no hints.`}
            </p>
          </div>
          {!partnerDone ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Change answer
            </Button>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SpectatorNote() {
  const { isHost } = useGame();
  return (
    <div className="glass rounded-3xl p-5 text-white/70">
      {isHost
        ? "You're hosting this round. Answers appear here once every team locks in — or hit “Reveal now”."
        : "You're spectating this round. Watch the teams lock in!"}
    </div>
  );
}
