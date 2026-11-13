/**
 * Sync — `revealing`.
 * Answers and predictions side by side per pair. Auto-matching marks clear
 * hits; inconclusive calls (and anything else) can be overridden by the host.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Avatar, Bubbles, ElementTile, PromptCard, Screen, cx } from '../components/ui.jsx';
import { playerName, useGame } from '../game.jsx';
import { elementOf, pairName, useLang } from '../i18n.jsx';

export default function SyncReveal() {
  const { view, isHost, roundTeam } = useGame();
  const { t } = useLang();
  const { round } = view;
  const teams = [...round.teams].sort((a, b) => (b === roundTeam) - (a === roundTeam));
  const mine = roundTeam ? round.results?.[roundTeam.teamId] : null;
  const hasClose = Object.values(round.verdicts ?? {}).includes('close');

  return (
    <Screen className="space-y-5">
      {mine && mine.points >= 2 ? <Bubbles /> : null}
      <PromptCard round={round} total={view.totalRounds} />

      {isHost ? (
        <div className="flex items-start gap-3 rounded-[var(--radius-surface)] border border-amber/40 bg-amber/[0.07] px-4 py-3">
          <span className="mt-1 size-2.5 shrink-0 rounded-full bg-amber" />
          <p className="text-[15px]">
            <span className="font-semibold">{t('sync.judgeTitle')}</span> {t('sync.judgeBody')}
          </p>
        </div>
      ) : hasClose ? (
        <p className="text-sm text-graphite">{t('sync.reviewing')}</p>
      ) : null}

      <div className={cx('grid gap-4', teams.length > 1 && 'xl:grid-cols-2')}>
        {teams.map((rt, i) => (
          <PairResult key={rt.teamId} roundTeam={rt} index={i} highlight={rt === roundTeam} />
        ))}
      </div>
    </Screen>
  );
}

function PairResult({ roundTeam, index, highlight }) {
  const { view, teamsById, isHost } = useGame();
  const { t, L } = useLang();
  const reduce = useReducedMotion();
  const { round } = view;
  const team = teamsById[roundTeam.teamId];
  const el = elementOf(team);
  const result = round.results?.[roundTeam.teamId];
  const [a, b] = roundTeam.members;
  const jinxKey = `jinx:${roundTeam.teamId}`;
  const jinx = round.verdicts?.[jinxKey];
  const bothAnswered = round.submissions?.[a] && round.submissions?.[b];

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
        <SubjectColumn pid={a} partnerId={b} delay={0.25 + index * 0.1} />
        <SubjectColumn pid={b} partnerId={a} delay={0.4 + index * 0.1} />
      </div>

      {bothAnswered ? (
        <div
          className={cx(
            'mt-3 flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm',
            jinx === 'match' && 'border-react/40 bg-react/[0.07] text-react',
            jinx === 'close' && 'border-amber/40 bg-amber/[0.07]',
            jinx === 'miss' && 'border-line-soft text-graphite',
          )}
        >
          <span className="flex-1">
            {jinx === 'match' ? t('sync.jinxYes', { n: view.points.jinx }) : jinx === 'close' ? t('sync.jinxClose') : t('sync.jinxNo')}
          </span>
          {isHost ? <VerdictToggle verdictKey={jinxKey} /> : null}
        </div>
      ) : null}
    </motion.article>
  );
}

export function PointsBadge({ points }) {
  return (
    <motion.span
      key={points}
      initial={{ scale: 1.3 }}
      animate={{ scale: 1 }}
      dir="ltr"
      className={cx(
        'tabular rounded-full px-3 py-0.5 text-base font-semibold',
        points ? 'bg-react text-white' : 'bg-glass text-graphite',
      )}
    >
      +{points}
    </motion.span>
  );
}

function SubjectColumn({ pid, partnerId, delay }) {
  const { view, playersById, isHost } = useGame();
  const { t } = useLang();
  const reduce = useReducedMotion();
  const { round } = view;
  const sub = round.submissions?.[pid];
  const key = `pred:${pid}`;
  const verdict = round.verdicts?.[key];
  const overridden = round.autoVerdicts?.[key] !== verdict;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="flex min-w-0 flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <Avatar player={playersById[pid]} size="sm" />
        <span className="truncate text-sm font-medium">{playerName(playersById, pid)}</span>
      </div>

      <div className="rounded-[var(--radius-control)] bg-glass px-3 py-2.5">
        <div className="text-xs text-graphite">{t('sync.answer')}</div>
        <div className="text-lg leading-snug font-semibold break-words">
          {sub?.answer ?? <span className="font-normal text-graphite">{t('sync.noAnswer')}</span>}
        </div>
      </div>

      <div
        className={cx(
          'rounded-[var(--radius-control)] border px-3 py-2.5 transition-colors',
          verdict === 'match' && 'border-react/50 bg-react/[0.06]',
          verdict === 'close' && 'border-amber/50 bg-amber/[0.07]',
          verdict === 'miss' && 'border-line-soft',
        )}
      >
        <div className="text-xs text-graphite">{t('sync.prediction', { name: playerName(playersById, partnerId) })}</div>
        <div className="leading-snug break-words">{sub?.prediction ?? <span className="text-graphite">—</span>}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <OutcomeChip outcome={verdict} />
          {overridden ? <span className="text-[11px] text-graphite">{t('outcome.hostCall')}</span> : null}
        </div>
        {isHost && sub ? <VerdictToggle verdictKey={key} className="mt-2" /> : null}
      </div>
    </motion.div>
  );
}

export function OutcomeChip({ outcome }) {
  const { t } = useLang();
  const styles = {
    match: 'text-react',
    close: 'text-amber',
    miss: 'text-graphite',
  };
  const dot = { match: 'bg-react', close: 'bg-amber', miss: 'bg-line' };
  const o = outcome ?? 'miss';
  return (
    <motion.span key={o} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className={cx('inline-flex items-center gap-1.5 text-xs font-semibold', styles[o])}>
      <span className={cx('size-2 rounded-full', dot[o])} />
      {t(`outcome.${o}`)}
    </motion.span>
  );
}

/** Host-only ✓ / ✗ override buttons. */
function VerdictToggle({ verdictKey, className }) {
  const { view, actions } = useGame();
  const { t } = useLang();
  const current = view.round.verdicts?.[verdictKey];
  const btn = (value, label, aria, activeClass) => (
    <button
      onClick={() => actions.host.verdict(verdictKey, value)}
      aria-label={aria}
      aria-pressed={current === value}
      className={cx(
        'h-8 flex-1 rounded-[8px] border text-sm font-semibold transition',
        current === value ? activeClass : 'border-line bg-bench text-graphite hover:border-ink/40 hover:text-ink',
      )}
    >
      {label}
    </button>
  );
  return (
    <div className={cx('flex min-w-24 gap-1.5', className)}>
      {btn('match', '✓', t('sync.accept'), 'border-react bg-react text-white')}
      {btn('miss', '✗', t('sync.reject'), 'border-ink bg-ink text-white')}
    </div>
  );
}
