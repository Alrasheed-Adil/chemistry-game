/**
 * Shared UI primitives for the lab theme:
 * buttons, avatars, element tiles, the burette timer, indicator strip,
 * effervescence (bubbles), toasts, prompt card and the language toggle.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../game.jsx';
import { TEST_TILES, useLang } from '../i18n.jsx';

export const cx = (...c) => c.filter(Boolean).join(' ');

/* ------------------------------- Button -------------------------------- */

const VARIANTS = {
  // Ink with a hard lower edge: reads as a physical key you press down.
  primary:
    'bg-ink text-white shadow-[0_3px_0_0_#07111f] enabled:hover:bg-ink-soft enabled:active:translate-y-[2px] enabled:active:shadow-[0_1px_0_0_#07111f]',
  secondary:
    'bg-bench text-ink border border-line shadow-[0_2px_0_0_var(--color-line)] enabled:hover:border-ink/40 enabled:active:translate-y-[1px] enabled:active:shadow-none',
  ghost: 'text-ink-soft enabled:hover:bg-ink/[0.06] enabled:hover:text-ink',
  danger: 'text-acid border border-acid/35 bg-bench enabled:hover:bg-acid/[0.06]',
  positive: 'bg-react text-white shadow-[0_3px_0_0_#155c39] enabled:active:translate-y-[2px] enabled:active:shadow-none',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-14 px-7 text-[17px] gap-2',
};

export function Button({ variant = 'primary', size = 'md', className, busy, children, disabled, ...props }) {
  return (
    <button
      className={cx(
        'inline-flex select-none items-center justify-center rounded-[var(--radius-control)] font-medium transition-[background-color,transform,box-shadow,border-color] duration-100 disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : null}
      {children}
    </button>
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
  const sizes = { xs: 'size-6 text-[13px]', sm: 'size-8 text-lg', md: 'size-11 text-2xl', lg: 'size-16 text-[34px]' };
  return (
    <span
      className={cx(
        'relative inline-grid shrink-0 place-items-center rounded-full border bg-bench',
        ring ? 'border-2' : 'border-line',
        sizes[size],
        dim && 'opacity-35 grayscale',
        className,
      )}
      style={ring ? { borderColor: ring } : undefined}
      title={player?.name}
    >
      <span className="leading-none">{player?.avatar ?? '·'}</span>
      {player && !player.connected ? (
        <span className="absolute -end-0.5 -bottom-0.5 size-3 rounded-full border-2 border-bench bg-graphite/60" />
      ) : null}
    </span>
  );
}

/* ---------------------------- Element tile ----------------------------- */

/**
 * A periodic-table cell. Used for pairs (flame-test colors) and the three
 * experiments. `color` tints the fill; text stays ink for contrast.
 */
export function ElementTile({ symbol, number, color = '#13233A', name, size = 'md', className }) {
  const sizes = {
    xs: { box: 'size-7 rounded-[5px]', sym: 'text-[13px]', num: 'hidden' },
    sm: { box: 'size-10 rounded-[6px]', sym: 'text-base', num: 'text-[8px] top-0.5 start-1' },
    md: { box: 'size-14 rounded-[var(--radius-tile)]', sym: 'text-[22px]', num: 'text-[10px] top-1 start-1.5' },
    lg: { box: 'size-20 rounded-[9px]', sym: 'text-[32px]', num: 'text-xs top-1.5 start-2' },
  }[size];
  return (
    <span
      dir="ltr"
      className={cx('relative inline-grid shrink-0 place-items-center border-[1.5px] font-semibold text-ink', sizes.box, className)}
      style={{ borderColor: color, background: `color-mix(in srgb, ${color} 13%, white)` }}
      aria-hidden
    >
      <span className={cx('tabular absolute leading-none font-medium text-ink-soft', sizes.num)}>{number}</span>
      <span className={cx('leading-none', sizes.sym)}>{symbol}</span>
      {name && size === 'lg' ? (
        <span className="absolute inset-x-0 bottom-1 truncate px-1 text-center text-[9px] leading-none font-normal text-ink-soft">
          {name}
        </span>
      ) : null}
    </span>
  );
}

export function TestTile({ type, size = 'sm' }) {
  const tile = TEST_TILES[type];
  const color = { sync: '#1d7fc0', telepathy: '#5a48d6', decision: '#e8780c' }[type];
  return <ElementTile symbol={tile.symbol} number={tile.number} color={color} size={size} />;
}

export function Logo() {
  const { t } = useLang();
  return (
    <span className="flex items-center gap-2.5">
      <ElementTile symbol="Ch" number={2} color="#13233A" size="sm" />
      <span className="text-xl font-semibold tracking-[-0.02em]">{t('app.name')}</span>
    </span>
  );
}

/* ---------------------------- Burette timer ---------------------------- */

/** Countdown drawn as a graduated burette draining toward zero. Synced to server time. */
export function Burette({ deadline, total }) {
  const { serverNow } = useGame();
  const { t } = useLang();
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - serverNow()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - serverNow()));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [deadline, serverNow]);

  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.min(100, (remaining / (total * 1000)) * 100);
  const urgent = seconds <= 5;
  const readout = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div role="timer" aria-label={`${t('round.timeLeft')}: ${seconds} ${t('round.seconds')}`}>
      <div className="mb-1.5 flex items-baseline justify-between text-sm text-graphite">
        <span>{t('round.timeLeft')}</span>
        <span dir="ltr" className={cx('tabular text-lg font-semibold', urgent ? 'text-acid' : 'text-ink')}>
          {readout}
        </span>
      </div>
      <div className="relative h-3.5 overflow-hidden rounded-full border border-line bg-glass">
        <div
          className="absolute inset-y-0 start-0 rounded-full transition-[width] duration-200 ease-linear"
          style={{ width: `${pct}%`, background: urgent ? 'var(--color-acid)' : 'var(--color-ink)' }}
        />
        {/* graduation marks */}
        <div className="pointer-events-none absolute inset-0 flex justify-between px-[10%]">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={cx('w-px', i === 4 ? 'h-full' : 'h-1/2', 'bg-white/60 mix-blend-difference')} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Indicator strip --------------------------- */

const SPECTRUM = 'linear-gradient(90deg, #d93a3a 0%, #e8780c 25%, #d9b100 45%, #23905a 70%, #1d7fc0 100%)';

/** Universal-indicator strip with an optional marker at `value` (0–100). */
export function IndicatorStrip({ value, animate = true, className }) {
  const reduce = useReducedMotion();
  return (
    <div className={cx('relative', className)} dir="ltr">
      <div className="h-3 rounded-full" style={{ background: SPECTRUM }} />
      {value != null ? (
        <motion.div
          className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full border-2 border-bench bg-ink shadow-[0_1px_3px_rgba(19,35,58,.4)]"
          initial={animate && !reduce ? { left: '0%' } : false}
          animate={{ left: `${Math.max(1, Math.min(99, value))}%` }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.4 }}
        />
      ) : null}
    </div>
  );
}

/** Colour on the indicator spectrum for a 0–100 reading. */
export function indicatorColor(pct) {
  if (pct >= 85) return '#1d7fc0';
  if (pct >= 65) return '#23905a';
  if (pct >= 45) return '#b39300';
  if (pct >= 25) return '#e8780c';
  return '#d93a3a';
}

/* ---------------------------- Effervescence ---------------------------- */

/** Bubbles rising through the screen — the "positive reaction" celebration. */
export function Bubbles({ count = 26, color = '#23905a' }) {
  const reduce = useReducedMotion();
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: 8 + Math.random() * 26,
        delay: Math.random() * 0.9,
        duration: 1.8 + Math.random() * 1.6,
        drift: Math.random() * 40 - 20,
      })),
    [count],
  );
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {bubbles.map((b) => (
        <motion.span
          key={b.id}
          className="absolute bottom-0 block rounded-full border-2"
          style={{
            left: `${b.x}%`,
            width: b.size,
            height: b.size,
            borderColor: color,
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
          }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: '-105vh', x: [0, b.drift, -b.drift / 2, b.drift], opacity: [0, 1, 1, 0] }}
          transition={{ duration: b.duration, delay: b.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ------------------------------- Toasts -------------------------------- */

export function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cx(
              'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-[var(--radius-control)] bg-ink px-4 py-3 text-sm text-white shadow-lg',
            )}
          >
            <span className={cx('size-2 shrink-0 rounded-full', t.tone === 'error' ? 'bg-acid' : 'bg-cobalt')} />
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------- Screen wrapper --------------------------- */

export function Screen({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.7, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------- Prompt card ----------------------------- */

/** The experiment card: which test, which round, the prompt, and the timer. */
export function PromptCard({ round, total, timerTotal, active }) {
  const { t, L } = useLang();
  const category =
    round.type === 'telepathy' ? L(round.prompt.setName) : t(`round.categories.${round.prompt.category}`);
  return (
    <section className="bench overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line-soft px-5 py-3 sm:px-6">
        <TestTile type={round.type} size="sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-medium">{t(`tests.${round.type}.name`)}</div>
          <div className="truncate text-sm text-graphite">{category}</div>
        </div>
        <div className="tabular shrink-0 text-sm text-graphite">{t('round.count', { n: round.number, total })}</div>
      </div>
      <div className="px-5 pt-5 pb-6 sm:px-6 sm:pt-6">
        <h2 className="text-[26px] leading-[1.2] font-semibold tracking-[-0.015em] text-balance sm:text-[34px]">
          {L(round.prompt.text)}
        </h2>
        {active ? (
          <div className="mt-6">
            <Burette deadline={round.deadline} total={timerTotal} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* --------------------------- Language toggle --------------------------- */

export function LangToggle({ className }) {
  const { t, toggle, lang } = useLang();
  return (
    <button
      onClick={toggle}
      aria-label={t('lang.switchLabel')}
      lang={lang === 'ar' ? 'en' : 'ar'}
      className={cx(
        'h-9 rounded-[var(--radius-control)] border border-line bg-bench px-3 text-sm font-medium text-ink transition hover:border-ink/40',
        className,
      )}
    >
      {t('lang.switchTo')}
    </button>
  );
}
