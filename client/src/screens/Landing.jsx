/**
 * Landing screen: enter a name, then create a room or join one by code.
 * A shared link (`/?room=ABCD`) pre-fills the code.
 */

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button, Logo, Screen, useBusy } from '../components/ui.jsx';
import { useGame } from '../game.jsx';

const inviteCode = new URLSearchParams(window.location.search).get('room')?.toUpperCase().slice(0, 4) ?? '';

export default function Landing() {
  const { actions, notify } = useGame();
  const [name, setName] = useState(() => {
    try {
      return sessionStorage.getItem('chem:name') ?? '';
    } catch {
      return '';
    }
  });
  const [code, setCode] = useState(inviteCode);
  const [busy, run] = useBusy();

  const needName = () => {
    if (name.trim()) return false;
    notify('Pick a name first ✨', 'info');
    document.getElementById('name')?.focus();
    return true;
  };

  const create = () => !needName() && run(() => actions.createRoom(name.trim()));
  const join = (e) => {
    e?.preventDefault();
    if (needName()) return;
    if (code.trim().length !== 4) return notify('Room codes are 4 characters.', 'info');
    run(async () => {
      const res = await actions.joinRoom(code.trim(), name.trim());
      if (res?.ok) window.history.replaceState(null, '', '/');
    });
  };

  return (
    <Screen className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-10 px-4 py-12 lg:flex-row lg:gap-16">
      {/* Hero */}
      <div className="max-w-md text-center lg:text-left">
        <motion.div
          initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="mb-5 inline-block"
        >
          <Logo size={72} />
        </motion.div>
        <h1 className="font-display text-6xl leading-[0.9] font-extrabold tracking-tight sm:text-7xl">
          <span className="text-gradient">chemistry</span>
        </h1>
        <p className="mt-4 text-lg text-white/70 text-balance">
          The party game for pairs. Predict each other's answers, read each other's minds, and find out who's
          <em className="font-semibold text-white not-italic"> actually</em> in sync.
        </p>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          <ModeCard emoji="💬" title="Sync" color="from-coral-500/25">
            Answer a prompt <b>and</b> guess what your partner said. The host judges close calls.
          </ModeCard>
          <ModeCard emoji="🔮" title="Telepathy" color="from-indigo-500/30">
            A grid appears. No talking. Pick the same tile as your partner before time runs out.
          </ModeCard>
        </div>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass w-full max-w-sm rounded-[2rem] p-6 sm:p-7"
      >
        <label className="label" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          className="field text-lg font-semibold"
          placeholder="e.g. Sam"
          maxLength={16}
          autoComplete="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (code.length === 4 ? join() : create())}
          autoFocus={!inviteCode}
        />

        {inviteCode ? null : (
          <>
            <Button size="lg" className="mt-5 w-full" busy={busy} onClick={create}>
              Create a room
            </Button>
            <div className="my-6 flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-white/30 uppercase">
              <span className="h-px flex-1 bg-white/10" />
              or join
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}

        <form onSubmit={join} className={inviteCode ? 'mt-5' : ''}>
          <label className="label" htmlFor="code">
            Room code
          </label>
          <div className="flex gap-2">
            <input
              id="code"
              className="field text-center font-display text-2xl font-extrabold tracking-[0.4em] uppercase"
              placeholder="ABCD"
              maxLength={4}
              autoComplete="off"
              autoCapitalize="characters"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <Button
              type="submit"
              variant={inviteCode ? 'primary' : 'secondary'}
              size="lg"
              className="shrink-0"
              busy={busy && Boolean(inviteCode)}
              disabled={busy}
            >
              Join
            </Button>
          </div>
          {inviteCode ? (
            <p className="mt-3 text-sm text-white/50">
              You've been invited to room <b className="text-white">{inviteCode}</b>.{' '}
              <button
                type="button"
                className="underline hover:text-white"
                onClick={() => {
                  window.history.replaceState(null, '', '/');
                  window.location.reload();
                }}
              >
                Create your own instead
              </button>
            </p>
          ) : null}
        </form>
      </motion.div>
    </Screen>
  );
}

function ModeCard({ emoji, title, color, children }) {
  return (
    <div className={`glass rounded-2xl bg-gradient-to-br ${color} to-transparent p-4`}>
      <div className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
        <span>{emoji}</span>
        {title}
      </div>
      <p className="text-sm leading-snug text-white/65">{children}</p>
    </div>
  );
}
