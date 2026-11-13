/**
 * Persistent chrome around game screens: header, the Readings scoreboard,
 * the host console (host-only controls) and lock-in progress.
 */

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useState } from 'react';
import { useGame } from '../game.jsx';
import { elementOf, pairName, useLang } from '../i18n.jsx';
import { Avatar, Button, ElementTile, LangToggle, Logo, cx, useBusy } from './ui.jsx';

/* ------------------------------- Header -------------------------------- */

export function Header() {
  const { view, connected, isHost, actions, notify } = useGame();
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/?room=${view.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      notify(t('header.copied'), 'info');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      notify(link, 'info');
    }
  };

  const leave = () => {
    if (window.confirm(t('header.leaveConfirm'))) actions.leaveRoom();
  };

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 sm:px-6">
      <Logo />

      <button
        onClick={copy}
        title={t('header.copy')}
        className="group ms-1 flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-bench ps-3 pe-2.5 transition hover:border-ink/40"
      >
        <span className="text-sm text-graphite">{t('header.session')}</span>
        <span dir="ltr" className="tabular text-[15px] font-semibold tracking-[0.12em]">
          {view.code}
        </span>
        <CopyIcon done={copied} />
      </button>

      <div className="ms-auto flex items-center gap-2">
        {isHost ? (
          <span className="hidden h-9 items-center rounded-[var(--radius-control)] bg-ink px-3 text-sm font-medium text-white sm:inline-flex">
            {t('header.host')}
          </span>
        ) : null}
        <span
          className={cx('size-2.5 rounded-full', connected ? 'bg-react' : 'animate-pulse bg-acid')}
          title={connected ? t('header.online') : t('header.offline')}
          role="status"
          aria-label={connected ? t('header.online') : t('header.offline')}
        />
        <LangToggle />
        <Button variant="ghost" size="sm" onClick={leave}>
          {t('header.leave')}
        </Button>
      </div>
    </header>
  );
}

function CopyIcon({ done }) {
  return done ? (
    <svg width="16" height="16" viewBox="0 0 16 16" className="text-react" aria-hidden>
      <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" className="text-graphite group-hover:text-ink" aria-hidden>
      <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10.5V3.5A1.5 1.5 0 0 1 4.5 2h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------ Scoreboard ----------------------------- */

/**
 * Pair standings ("Readings"). During a reveal it previews the points each
 * pair is about to earn before the host confirms.
 */
export function Scoreboard({ compact }) {
  const { view, playersById, myTeam } = useGame();
  const { t, L } = useLang();
  const pending = view.state === 'revealing' ? view.round?.results ?? {} : {};
  const total = (team) => team.score + (pending[team.id]?.points ?? 0);
  const teams = [...view.teams].filter((tm) => tm.members.length || tm.score).sort((a, b) => total(b) - total(a));

  if (!teams.length) return null;

  return (
    <section className={cx('bench', compact ? 'p-1.5' : 'p-4')} aria-label={t('board.title')}>
      {!compact ? <h3 className="mb-3 px-1 text-sm font-medium text-ink-soft">{t('board.title')}</h3> : null}
      <LayoutGroup>
        <ol className={cx(compact ? 'flex gap-1.5 overflow-x-auto' : 'space-y-1')}>
          {teams.map((team, i) => {
            const el = elementOf(team);
            const gain = pending[team.id]?.points;
            return (
              <motion.li
                layout
                key={team.id}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className={cx(
                  'flex items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-1.5',
                  compact && 'shrink-0 pe-3',
                  team.id === myTeam?.id && 'bg-glass',
                )}
              >
                {!compact ? <span className="tabular w-4 text-center text-xs text-graphite">{i + 1}</span> : null}
                <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="xs" />
                <span className={cx('min-w-0 truncate text-sm font-medium', compact ? 'max-w-28' : 'flex-1')}>
                  {pairName(team, L)}
                </span>
                {!compact ? (
                  <span className="flex -space-x-1.5 rtl:space-x-reverse">
                    {team.members.map((id) => (
                      <Avatar key={id} player={playersById[id]} size="xs" />
                    ))}
                  </span>
                ) : null}
                <AnimatePresence>
                  {gain ? (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      dir="ltr"
                      className="tabular text-xs font-semibold text-react"
                    >
                      +{gain}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                <span className="tabular min-w-5 text-end text-base font-semibold">{team.score}</span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
    </section>
  );
}

/* ----------------------------- Host console ---------------------------- */

const consoleBtn =
  'inline-flex h-9 items-center rounded-[var(--radius-control)] px-3.5 text-sm font-medium transition disabled:opacity-40';

/** Dark control strip pinned to the bottom of the host's screen. */
export function HostBar() {
  const { view, actions } = useGame();
  const { t } = useLang();
  const [busy, run] = useBusy();
  const { state, round } = view;
  if (state === 'waiting') return null;

  const active = state === 'question_active' || state === 'telepathy_active' || state === 'decision_active';
  const isLast = round && round.number >= view.totalRounds;

  let status = null;
  if (active && round) {
    const ids = round.teams.flatMap((tm) => tm.members);
    const doneMap = round.type === 'telepathy' ? round.locked : round.submitted;
    status = t('host.progress', { done: ids.filter((id) => doneMap?.[id]).length, total: ids.length });
  } else if (state === 'revealing') {
    status = round?.type === 'sync' ? t('host.review') : t('host.revealed');
  } else if (state === 'game_over') {
    status = t('host.over');
  }

  const end = () => {
    if (window.confirm(t('host.endConfirm'))) run(actions.host.end);
  };

  return (
    <motion.div
      initial={{ y: 70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-[var(--radius-surface)] bg-ink p-2 ps-4 text-white shadow-[0_12px_40px_-12px_rgba(19,35,58,.6)]">
        <div className="me-auto min-w-0 py-1 leading-tight">
          <div className="text-sm font-medium">{t('host.title')}</div>
          <div className="truncate text-[13px] text-white/65">{status}</div>
        </div>

        {active ? (
          <>
            <button className={cx(consoleBtn, 'text-white/80 hover:bg-white/10')} disabled={busy} onClick={() => run(actions.host.reroll)}>
              {t('host.swap')}
            </button>
            <button className={cx(consoleBtn, 'bg-white/12 hover:bg-white/20')} disabled={busy} onClick={() => run(actions.host.reveal)}>
              {t('host.reveal')}
            </button>
          </>
        ) : null}

        {state === 'revealing' ? (
          <button className={cx(consoleBtn, 'bg-white text-ink hover:bg-glass')} disabled={busy} onClick={() => run(actions.host.next)}>
            {isLast ? t('host.final') : t('host.next')}
          </button>
        ) : null}

        {state === 'game_over' ? (
          <button className={cx(consoleBtn, 'bg-white text-ink hover:bg-glass')} disabled={busy} onClick={() => run(actions.host.lobby)}>
            {t('host.lobby')}
          </button>
        ) : (
          <button className={cx(consoleBtn, 'text-[#ff9a9a] hover:bg-white/10')} disabled={busy} onClick={end}>
            {t('host.end')}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* --------------------------- Lock-in progress -------------------------- */

/** Which pairs have locked in — shown to the host and spectators. */
export function TeamProgress() {
  const { view, playersById, teamsById } = useGame();
  const { t, L } = useLang();
  const { round } = view;
  const doneMap = round.type === 'telepathy' ? round.locked : round.submitted;
  return (
    <section>
      <h3 className="label">{t('round.progress')}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {round.teams.map(({ teamId, members }) => {
          const team = teamsById[teamId];
          const el = elementOf(team);
          return (
            <div key={teamId} className="bench flex items-center gap-3 px-3 py-2.5">
              <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="xs" />
              <span className="flex-1 truncate text-sm font-medium">{pairName(team, L)}</span>
              {members.map((id) => (
                <Avatar key={id} player={playersById[id]} size="sm" dim={!doneMap?.[id]} ring={doneMap?.[id] ? '#23905a' : undefined} />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Note shown instead of the input area to the host / spectators. */
export function SpectatorNote() {
  const { isHost } = useGame();
  const { t } = useLang();
  return <p className="bench px-5 py-4 text-ink-soft">{isHost ? t('round.hosting') : t('round.spectating')}</p>;
}
