/**
 * `game_over` — the lab report.
 * A certificate for the viewer's pair (or the top pair for spectators):
 * compatibility index on the indicator strip, bond classification, per-test
 * stats and a stamp. Below it, every pair's readings.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { BondScale } from '../components/BondScale.jsx';
import { Avatar, Bubbles, Button, ElementTile, Screen, cx, indicatorColor } from '../components/ui.jsx';
import { useGame } from '../game.jsx';
import { bondFor, elementOf, pairName, useLang } from '../i18n.jsx';

function teamStats(history, teamId) {
  const s = { points: 0, max: 0, sync: [0, 0], jinx: 0, telepathy: [0, 0], decision: [0, 0], priority: [0, 0], rather: [0, 0], princess: [0, 0], bestie: [0, 0] };
  for (const round of history) {
    const r = round.results?.[teamId];
    if (!r) continue;
    s.points += r.points;
    s.max += r.max;
    if (round.type === 'sync') {
      s.sync[0] += r.predictionsCorrect;
      s.sync[1] += 2;
      s.jinx += r.jinx ? 1 : 0;
    } else if (round.type === 'decision') {
      s.decision[0] += r.predictionsCorrect;
      s.decision[1] += 2;
    } else if (round.type === 'rather') {
      s.rather[0] += r.predictionsCorrect;
      s.rather[1] += 2;
    } else if (round.type === 'princess' || round.type === 'bestie') {
      s[round.type][0] += r.sameCalls;
      s[round.type][1] += r.max;
    } else if (round.type === 'priority') {
      s.priority[0] += r.sameRanks;
      s.priority[1] += r.max;
    } else {
      s.telepathy[0] += r.match ? 1 : 0;
      s.telepathy[1] += 1;
    }
  }
  s.pct = s.max ? Math.round((s.points / s.max) * 100) : 0;
  s.bond = bondFor(s.pct);
  return s;
}

export default function GameOver() {
  const { view, playersById, isHost, myTeam, actions } = useGame();
  const { t } = useLang();
  const ranked = view.teams
    .filter((tm) => view.history.some((h) => h.results?.[tm.id]))
    .map((team) => ({ team, stats: teamStats(view.history, team.id) }))
    .sort((a, b) => b.team.score - a.team.score || b.stats.pct - a.stats.pct);

  if (!ranked.length) {
    return (
      <Screen className="bench mx-auto max-w-xl p-8 text-center">
        <h1 className="text-3xl font-semibold">{t('report.title')}</h1>
        <p className="mt-3 text-ink-soft">{t('report.noRounds')}</p>
        {!isHost ? (
          <Button variant="secondary" className="mt-6" onClick={actions.leaveRoom}>
            {t('report.leave')}
          </Button>
        ) : null}
      </Screen>
    );
  }

  const featured = ranked.find((r) => r.team.id === myTeam?.id) ?? ranked[0];
  const host = playersById[view.hostId];

  return (
    <Screen className="mx-auto max-w-4xl space-y-8">
      {featured.stats.pct >= 65 ? <Bubbles count={30} color={indicatorColor(featured.stats.pct)} /> : null}
      <Certificate entry={featured} hostName={host?.name} isMine={featured.team.id === myTeam?.id} />

      {ranked.length > 1 ? <Ranking ranked={ranked} /> : null}

      {!isHost ? (
        <div className="text-center">
          <p className="mb-3 text-sm text-graphite">{t('report.rematch')}</p>
          <Button variant="secondary" onClick={actions.leaveRoom}>
            {t('report.leave')}
          </Button>
        </div>
      ) : null}
    </Screen>
  );
}

/* ----------------------------- Certificate ----------------------------- */

function Certificate({ entry, hostName, isMine }) {
  const { view, playersById } = useGame();
  const { t, L, lang } = useLang();
  const reduce = useReducedMotion();
  const { team, stats } = entry;
  const el = elementOf(team);
  const names = team.members.map((id) => playersById[id]?.name ?? '…');
  const date = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(view.endedAt ?? Date.now());
  const color = indicatorColor(stats.pct);

  const statLines = [
    stats.sync[1] ? t('report.syncStat', { a: stats.sync[0], b: stats.sync[1] }) : null,
    stats.sync[1] ? t('report.jinxStat', { n: stats.jinx }) : null,
    stats.telepathy[1] ? t('report.telepathyStat', { a: stats.telepathy[0], b: stats.telepathy[1] }) : null,
    stats.decision[1] ? t('report.decisionStat', { a: stats.decision[0], b: stats.decision[1] }) : null,
    stats.priority[1] ? t('report.priorityStat', { a: stats.priority[0], b: stats.priority[1] }) : null,
    stats.rather[1] ? t('report.ratherStat', { a: stats.rather[0], b: stats.rather[1] }) : null,
    stats.princess[1] ? t('report.princessStat', { a: stats.princess[0], b: stats.princess[1] }) : null,
    stats.bestie[1] ? t('report.bestieStat', { a: stats.bestie[0], b: stats.bestie[1] }) : null,
  ].filter(Boolean);

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative overflow-hidden rounded-[20px] border border-line bg-bench p-2 shadow-[0_24px_60px_-30px_rgba(19,35,58,.45)]"
    >
      {/* inner rule: the certificate frame */}
      <div className="relative rounded-[14px] border border-ink/15 px-5 py-6 sm:px-10 sm:py-9">
        <header className="flex flex-wrap items-start justify-between gap-3 text-sm text-graphite">
          <span>{t('app.lab')}</span>
          <span className="text-end">
            <span className="block" dir="auto">{t('report.session', { code: view.code })}</span>
            <span className="block">{date}</span>
          </span>
        </header>

        <h1 className="mt-6 text-[30px] leading-tight font-semibold tracking-[-0.02em] sm:text-[40px]">{t('report.cert')}</h1>

        <div className="mt-6 flex items-center gap-4">
          <ElementTile symbol={el.symbol} number={el.number} color={el.color} name={L(el.name)} size="lg" />
          <div className="min-w-0">
            <div className="text-2xl leading-tight font-semibold sm:text-3xl">
              {/* <bdi> keeps Latin names in Arabic text (and vice versa) in the right order */}
              <bdi>{names[0]}</bdi>
              {lang === 'ar' ? ' و' : ' & '}
              <bdi>{names[1]}</bdi>
            </div>
            <div className="mt-1 text-ink-soft">
              {pairName(team, L)}
              {isMine ? <span className="text-graphite"> · {t('report.yourPair')}</span> : null}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 border-t border-line-soft pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="text-sm text-graphite">{t('report.bond')}</div>
            <div className="mt-1 text-[28px] leading-tight font-semibold" style={{ color }}>
              {t(`bonds.${stats.bond}.name`)}
            </div>
            <p className="mt-1 max-w-[30rem] text-ink-soft">{t(`bonds.${stats.bond}.desc`)}</p>
          </div>
          <div className="sm:text-end">
            <div className="text-sm text-graphite">{t('report.index')}</div>
            <div dir="ltr" className="tabular text-[64px] leading-none font-semibold tracking-[-0.04em]" style={{ color }}>
              {stats.pct}
              <span className="text-[32px]">%</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <BondScale value={stats.pct} />
        </div>

        <ul className="mt-6 grid gap-x-6 gap-y-1 text-[15px] text-ink-soft sm:grid-cols-2">
          {statLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li className="font-medium text-ink">{t('report.points', { n: team.score })}</li>
        </ul>

        <footer className="mt-10 flex items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="h-px w-48 bg-ink/40" />
            <div className="mt-2 text-sm text-graphite">{t('report.supervised', { name: hostName ?? '…' })}</div>
          </div>
          <Stamp label={t('report.certified')} color={color} />
        </footer>
      </div>
    </motion.article>
  );
}

/** The rubber stamp — the report's single orchestrated moment. */
function Stamp({ label, color }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      initial={reduce ? false : { scale: 2.2, opacity: 0, rotate: -30 }}
      animate={{ scale: 1, opacity: 0.92, rotate: -12 }}
      transition={{ delay: 1.6, type: 'spring', stiffness: 260, damping: 15 }}
      className="grid size-28 shrink-0 place-items-center rounded-full border-[3px] text-center"
      style={{ borderColor: color, color }}
    >
      <div className="grid size-[92px] place-items-center rounded-full border border-dashed" style={{ borderColor: color }}>
        <span className="px-1 text-[17px] leading-none font-semibold">{label}</span>
      </div>
    </motion.div>
  );
}

/* ------------------------------- Ranking ------------------------------- */

function Ranking({ ranked }) {
  const { playersById, myTeam } = useGame();
  const { t, L } = useLang();
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{t('report.ranking')}</h2>
      <ol className="bench divide-y divide-line-soft">
        {ranked.map(({ team, stats }, i) => {
          const el = elementOf(team);
          const tie = i > 0 && ranked[i - 1].team.score === team.score;
          return (
            <li
              key={team.id}
              className={cx('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3', team.id === myTeam?.id && 'bg-glass')}
            >
              <span className="tabular w-6 text-center text-graphite">{tie ? '=' : i + 1}</span>
              <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{pairName(team, L)}</div>
                <div className="flex items-center gap-1.5 text-sm text-graphite">
                  <span className="flex -space-x-1.5 rtl:space-x-reverse">
                    {team.members.map((id) => (
                      <Avatar key={id} player={playersById[id]} size="xs" />
                    ))}
                  </span>
                  <span className="truncate">{t(`bonds.${stats.bond}.name`)}</span>
                </div>
              </div>
              <div className="w-28 sm:w-40">
                <div className="h-2 overflow-hidden rounded-full bg-glass">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: indicatorColor(stats.pct) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.pct}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.9 }}
                  />
                </div>
                <div dir="ltr" className="tabular mt-1 text-end text-xs text-graphite">
                  {stats.pct}%
                </div>
              </div>
              <span className="tabular w-10 text-end text-xl font-semibold">{team.score}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
