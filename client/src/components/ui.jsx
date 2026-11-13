/**
 * Small shared UI primitives: buttons, avatars, timer ring, backdrop, toasts, confetti.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../game.jsx';

export const cx = (...c) => c.filter(Boolean).join(' ');

/* ------------------------------- Button -------------------------------- */

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-coral-500 via-electric-500 to-indigo-500 text-white shadow-[0_10px_40px_-10px_rgba(168,85,247,0.8)] hover:brightness-110',
  secondary: 'bg-white/8 text-white border border-white/12 hover:bg-white/12',
  ghost: 'text-white/70 hover:text-white hover:bg-white/8',
  danger: 'bg-coral-500/15 text-coral-300 border border-coral-500/30 hover:bg-coral-500/25',
  success: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/25',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm rounded-xl',
  md: 'h-11 px-5 text-[15px] rounded-2xl',
  lg: 'h-14 px-7 text-lg rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', className, busy, children, disabled, ...props }) {
  return (
    <motion.button
      whileTap={disabled || busy ? undefined : { scale: 0.96 }}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 font-bold transition disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
      {children}
    </motion.button>
  );
}

/** Wraps an async action so the button shows a spinner and can't be double-clicked. */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };
  return [busy, run];
}

/* ------------------------------- Avatar -------------------------------- */

export function Avatar({ player, size = 'md', ring, dim, className }) {
  const sizes = { xs: 'size-6 text-sm', sm: 'size-8 text-lg', md: 'size-11 text-2xl', lg: 'size-16 text-4xl' };
  return (
    <span
      className={cx(
        'relative inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/15 to-white/5',
        sizes[size],
        dim && 'opacity-40 grayscale',
        className,
      )}
      style={ring ? { boxShadow: `0 0 0 2px ${ring}, 0 0 18px -2px ${ring}` } : undefined}
      title={player?.name}
    >
      <span className="leading-none">{player?.avatar ?? '👤'}</span>
      {player && !player.connected ? (
        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-ink-900 bg-white/30" title="Offline" />
      ) : null}
    </span>
  );
}

/* ----------------------------- Timer ring ------------------------------ */

/** Circular countdown, synced to server time. */
export function TimerRing({ deadline, total, size = 64 }) {
  const { serverNow } = useGame();
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - serverNow()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - serverNow()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [deadline, serverNow]);

  const seconds = Math.ceil(remaining / 1000);
  const fraction = Math.min(1, remaining / (total * 1000));
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const urgent = seconds <= 5;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(255 255 255 / 0.1)" strokeWidth="5" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={urgent ? 'var(--color-coral-500)' : 'url(#timer-grad)'}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
        <defs>
          <linearGradient id="timer-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
      <motion.span
        key={urgent ? seconds : 'calm'}
        initial={urgent ? { scale: 1.4 } : false}
        animate={{ scale: 1 }}
        className={cx('absolute font-display text-xl font-extrabold tabular-nums', urgent && 'text-coral-400')}
      >
        {seconds}
      </motion.span>
    </div>
  );
}

/* ------------------------------ Backdrop ------------------------------- */

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-900">
      <div className="absolute -top-40 -left-40 size-[34rem] animate-float rounded-full bg-electric-600/25 blur-[120px]" />
      <div
        className="absolute top-1/3 -right-48 size-[30rem] animate-float rounded-full bg-coral-500/20 blur-[120px]"
        style={{ animationDelay: '-3s' }}
      />
      <div
        className="absolute -bottom-48 left-1/4 size-[32rem] animate-float rounded-full bg-indigo-500/20 blur-[130px]"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(rgb(255 255 255) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
    </div>
  );
}

/* -------------------------------- Logo --------------------------------- */

export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="24" cy="32" r="16" fill="#ff6b5b" fillOpacity=".9" />
      <circle cx="40" cy="32" r="16" fill="#818cf8" fillOpacity=".85" />
      <path d="M32 18.2a16 16 0 0 1 0 27.6 16 16 0 0 1 0-27.6z" fill="#c084fc" />
    </svg>
  );
}

/* ------------------------------- Toasts -------------------------------- */

export function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={cx(
              'glass pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold',
              t.tone === 'error' ? 'text-coral-300' : 'text-white',
            )}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Confetti ------------------------------- */

export function Confetti({ count = 70 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.6,
        rotate: Math.random() * 720 - 360,
        color: ['#ff6b5b', '#c084fc', '#818cf8', '#fbbf24', '#2dd4bf', '#f472b6'][i % 6],
        w: 6 + Math.random() * 6,
        drift: Math.random() * 30 - 15,
      })),
    [count],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block rounded-[2px]"
          style={{ left: `${p.x}%`, width: p.w, height: p.w * 0.45, background: p.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', x: `${p.drift}vw`, rotate: p.rotate, opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

/* ---------------------------- Screen wrapper --------------------------- */

export function Screen({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Big prompt card used by both game modes. */
export function PromptCard({ round, total, right }) {
  const isSync = round.type === 'sync';
  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5 sm:p-7">
      <div
        className={cx(
          'absolute -top-20 -right-16 size-56 rounded-full blur-3xl',
          isSync ? 'bg-coral-500/25' : 'bg-indigo-500/30',
        )}
      />
      <div className="relative flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={cx('chip', isSync ? 'text-coral-300' : 'text-indigo-300')}>
              {isSync ? '💬 Sync' : '🔮 Telepathy'}
            </span>
            <span className="chip">{round.prompt.category}</span>
            <span className="chip">
              Round {round.number}/{total}
            </span>
          </div>
          <h2 className="font-display text-2xl leading-tight font-extrabold text-balance sm:text-4xl">
            {round.prompt.text}
          </h2>
        </div>
        {right}
      </div>
    </div>
  );
}
