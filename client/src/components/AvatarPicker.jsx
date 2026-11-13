/**
 * Avatar picker — a sheet of parody avatars grouped by category.
 * Avatars someone else is wearing are shown but can't be picked.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AVATARS, AVATAR_BY_ID, AVATAR_GROUPS } from '../../../shared/avatars.js';
import { useGame } from '../game.jsx';
import { useLang } from '../i18n.jsx';
import { AVATAR_TINTS, AvatarBadge, Button, cx } from './ui.jsx';

export default function AvatarPicker({ open, onClose }) {
  return <AnimatePresence>{open ? <Sheet key="sheet" onClose={onClose} /> : null}</AnimatePresence>;
}

function Sheet({ onClose }) {
  const { view, me, actions } = useGame();
  const { t, L } = useLang();
  const [group, setGroup] = useState(() => AVATAR_BY_ID[me?.avatar]?.group ?? AVATAR_GROUPS[0]);
  const [pending, setPending] = useState(null);
  const panel = useRef(null);

  // Who is wearing what (other players only).
  const wornBy = useMemo(() => {
    const map = {};
    for (const p of view.players) if (p.id !== view.you) map[p.avatar] = p.name;
    return map;
  }, [view.players, view.you]);

  // Room updates re-render the lobby with a new onClose; keep the latest without re-running setup.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  const pick = async (id) => {
    if (id === me?.avatar) return onClose();
    setPending(id);
    const res = await actions.setAvatar(id);
    setPending(null);
    if (res?.ok) onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-title"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.3, 1] }}
        className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[var(--radius-surface)] border border-line bg-bench outline-none sm:rounded-[var(--radius-surface)]"
      >
        <header className="flex items-start gap-4 border-b border-line-soft px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="avatar-title" className="text-2xl font-semibold tracking-[-0.015em]">
              {t('avatars.title')}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{t('avatars.subtitle')}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('avatars.close')}
          </Button>
        </header>

        <div role="tablist" aria-label={t('avatars.title')} className="flex gap-1.5 overflow-x-auto border-b border-line-soft px-5 py-3 sm:px-6">
          {AVATAR_GROUPS.map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={group === g}
              onClick={() => setGroup(g)}
              className={cx(
                'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition',
                group === g ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:border-ink/40',
              )}
            >
              <span className="size-2.5 rounded-full border border-ink/15" style={{ backgroundColor: AVATAR_TINTS[g] }} />
              {t(`avatars.groups.${g}`)}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="overflow-y-auto px-5 py-5 sm:px-6">
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            {AVATARS.filter((a) => a.group === group).map((a) => {
              const mine = a.id === me?.avatar;
              const taker = wornBy[a.id];
              return (
                <li key={a.id}>
                  <button
                    disabled={Boolean(taker) || Boolean(pending)}
                    aria-pressed={mine}
                    onClick={() => pick(a.id)}
                    className={cx(
                      'flex h-full w-full flex-col items-center gap-2 rounded-[var(--radius-control)] border px-2 pt-4 pb-3 text-center transition',
                      mine ? 'border-ink shadow-[0_3px_0_0_var(--color-ink)]' : 'border-line-soft',
                      !mine && !taker && 'hover:border-ink/40 hover:bg-glass/60',
                      taker && 'cursor-not-allowed opacity-45',
                      pending === a.id && 'animate-pulse',
                    )}
                  >
                    <span
                      className="relative grid size-16 place-items-center rounded-full border border-line text-[34px] leading-none"
                      style={{ backgroundColor: AVATAR_TINTS[a.group] }}
                    >
                      {a.e}
                      {a.b ? <AvatarBadge emoji={a.b} size="lg" /> : null}
                    </span>
                    <span className="text-[13px] leading-tight font-medium text-balance">{L(a)}</span>
                    {mine || taker ? (
                      <span className={cx('text-[11px] leading-tight', mine ? 'font-semibold text-ink' : 'text-graphite')}>
                        {mine ? t('avatars.yours') : t('avatars.taken', { name: taker })}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}
