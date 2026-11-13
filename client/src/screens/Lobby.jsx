/**
 * Lobby (`waiting`): form pairs; the host sets the test protocol and starts.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Avatar, Button, ElementTile, Screen, TestTile, cx, useBusy } from '../components/ui.jsx';
import { useGame } from '../game.jsx';
import { elementOf, pairName, useLang } from '../i18n.jsx';

export default function Lobby() {
  const { view, isHost, me, myTeam, actions, playersById } = useGame();
  const { t } = useLang();
  const [busy, run] = useBusy();
  const unpaired = view.players.filter((p) => !p.teamId);
  const fullTeams = view.teams.filter((tm) => tm.members.length === 2);

  return (
    <Screen className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ------------------------------ Pairs ------------------------------ */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.025em]">{t('lobby.title')}</h1>
            <p className="mt-1 max-w-[36rem] text-ink-soft">{t('lobby.subtitle', { code: view.code })}</p>
          </div>
          {!myTeam ? (
            <Button busy={busy} onClick={() => run(actions.createTeam)}>
              {t('lobby.newPair')}
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => run(actions.leaveTeam)}>
              {t('lobby.leavePair')}
            </Button>
          )}
        </div>

        <motion.div layout className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {view.teams.map((team) => (
              <PairCard key={team.id} team={team} />
            ))}
          </AnimatePresence>
          {!view.teams.length ? (
            <div className="rounded-[var(--radius-surface)] border-2 border-dashed border-line p-8 text-center text-graphite sm:col-span-2">
              {t('lobby.empty')}
            </div>
          ) : null}
        </motion.div>

        {/* Players not yet in a pair */}
        <div className="bench p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-ink-soft">
              {t('lobby.unpaired')} <span className="tabular text-graphite">({unpaired.length})</span>
            </h3>
            {isHost && unpaired.some((p) => p.id !== view.hostId) ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(actions.host.autoPair)}>
                {t('lobby.autoPair')}
              </Button>
            ) : null}
          </div>
          {unpaired.length ? (
            <ul className="flex flex-wrap gap-2">
              <AnimatePresence>
                {unpaired.map((p) => (
                  <motion.li
                    layout
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 rounded-full border border-line bg-glass py-1 ps-1 pe-2"
                  >
                    <Avatar player={p} size="sm" />
                    <span className="text-sm font-medium">
                      {p.name}
                      {p.id === view.you ? <span className="text-graphite"> ({t('lobby.you')})</span> : null}
                    </span>
                    {p.id === view.hostId ? <HostMark /> : null}
                    {isHost ? <HostPlayerMenu player={p} /> : null}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="text-sm text-graphite">{t('lobby.allPaired')}</p>
          )}
          {isHost && !me?.teamId ? <p className="mt-3 max-w-[40rem] text-sm text-graphite">{t('lobby.hostTip')}</p> : null}
        </div>
      </section>

      {/* ---------------------------- Protocol ----------------------------- */}
      <aside className="space-y-4">
        <Protocol />
        {isHost ? (
          <div>
            <Button size="lg" className="w-full" busy={busy} disabled={!fullTeams.length} onClick={() => run(actions.host.start)}>
              {t('lobby.start')}
            </Button>
            <p className="mt-2 text-center text-sm text-graphite">
              {fullTeams.length
                ? `${t('lobby.readyCount', { n: fullTeams.length })}${
                    view.teams.length > fullTeams.length ? `. ${t('lobby.incomplete')}` : ''
                  }`
                : t('lobby.needPair')}
            </p>
          </div>
        ) : (
          <div className="bench flex items-center gap-3 px-4 py-3.5">
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cobalt opacity-50" />
              <span className="relative inline-flex size-2.5 rounded-full bg-cobalt" />
            </span>
            <p className="text-sm text-ink-soft">{t('lobby.waitingHost', { name: playersById[view.hostId]?.name ?? '…' })}</p>
          </div>
        )}
      </aside>
    </Screen>
  );
}

function HostMark() {
  const { t } = useLang();
  return <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">{t('header.host')}</span>;
}

/* ------------------------------ Pair card ------------------------------ */

function PairCard({ team }) {
  const { view, isHost, me, actions, playersById } = useGame();
  const { t, L } = useLang();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name ?? '');
  const el = elementOf(team);
  const isMine = team.members.includes(view.you);
  const canEdit = isMine || isHost;
  const seats = [team.members[0], team.members[1]];

  const save = async () => {
    setEditing(false);
    if ((name.trim() || null) !== team.name) await actions.renameTeam(team.id, name.trim());
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={cx('bench p-4', isMine && 'outline-2 outline-offset-[-1px] outline-ink')}
    >
      <div className="mb-3 flex items-center gap-3">
        <ElementTile symbol={el.symbol} number={el.number} color={el.color} size="sm" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              className="field h-9 py-1 text-base font-semibold"
              value={name}
              placeholder={L(el.name)}
              aria-label={t('lobby.rename')}
              title={t('lobby.renameHint')}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
          ) : (
            <button
              className={cx(
                'block max-w-full truncate text-start text-lg font-semibold',
                canEdit && 'decoration-line underline-offset-4 hover:underline',
              )}
              onClick={() => canEdit && (setName(team.name ?? ''), setEditing(true))}
              title={canEdit ? t('lobby.rename') : undefined}
              disabled={!canEdit}
            >
              {pairName(team, L)}
            </button>
          )}
        </div>
        {team.members.length === 2 ? (
          <span className="shrink-0 rounded-full bg-react/10 px-2.5 py-0.5 text-xs font-medium text-react">{t('lobby.ready')}</span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {seats.map((pid, i) =>
          pid ? (
            <div key={pid} className="flex flex-col items-center gap-1 rounded-[var(--radius-control)] bg-glass px-2 py-3">
              <Avatar player={playersById[pid]} size="md" ring={el.color} />
              <span className="max-w-full truncate text-sm font-medium">{playersById[pid]?.name}</span>
              <span className="flex h-5 items-center gap-1.5 text-xs text-graphite">
                {pid === view.you ? t('lobby.you') : null}
                {pid === view.hostId ? <HostMark /> : null}
              </span>
              {isHost && pid !== view.you ? <HostPlayerMenu player={playersById[pid]} /> : null}
            </div>
          ) : (
            <div
              key={`open-${i}`}
              className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border-2 border-dashed border-line px-2 py-3"
            >
              <span className="grid size-11 place-items-center rounded-full border border-dashed border-line text-graphite">+</span>
              {!isMine && me ? (
                <Button size="sm" variant="secondary" onClick={() => actions.joinTeam(team.id)}>
                  {t('lobby.joinSeat')}
                </Button>
              ) : (
                <span className="text-xs text-graphite">{t('lobby.openSeat')}</span>
              )}
            </div>
          ),
        )}
      </div>
    </motion.article>
  );
}

/* --------------------------- Host player menu -------------------------- */

function HostPlayerMenu({ player }) {
  const { view, actions } = useGame();
  const { t, L } = useLang();
  if (!player) return null;
  const openTeams = view.teams.filter((tm) => tm.members.length < 2 && tm.id !== player.teamId);

  const onChange = (e) => {
    const value = e.target.value;
    e.target.value = '';
    if (value === 'kick') {
      if (window.confirm(t('lobby.kickConfirm', { name: player.name }))) actions.host.kick(player.id);
    } else if (value === 'bench') actions.host.assign(player.id, null);
    else if (value) actions.host.assign(player.id, value);
  };

  return (
    <select
      aria-label={t('lobby.manage', { name: player.name })}
      defaultValue=""
      onChange={onChange}
      className="h-7 max-w-28 cursor-pointer rounded-md border border-line bg-bench px-1 text-xs text-ink-soft outline-none hover:border-ink/40"
    >
      <option value="" disabled>
        ⋯
      </option>
      {openTeams.map((tm) => (
        <option key={tm.id} value={tm.id}>
          {t('lobby.moveTo', { name: pairName(tm, L) })}
        </option>
      ))}
      <option value="new">{t('lobby.moveNew')}</option>
      {player.teamId ? <option value="bench">{t('lobby.unpair')}</option> : null}
      {player.id !== view.hostId ? <option value="kick">{t('lobby.kick')}</option> : null}
    </select>
  );
}

/* ------------------------------ Protocol ------------------------------- */

const TEST_KEYS = ['sync', 'telepathy', 'decision'];
const TIMER_FIELDS = {
  sync: { key: 'questionSeconds', values: [45, 60, 90, 120] },
  telepathy: { key: 'telepathySeconds', values: [10, 15, 20, 30] },
  decision: { key: 'decisionSeconds', values: [20, 30, 45, 60] },
};

function Protocol() {
  const { view, isHost, actions } = useGame();
  const { t } = useLang();
  const s = view.settings;
  const set = (patch) => actions.host.settings(patch);
  const toggleTest = (key) => {
    const next = s.tests.includes(key) ? s.tests.filter((x) => x !== key) : [...s.tests, key];
    set({ tests: next });
  };

  return (
    <section className="bench p-4">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('lobby.protocol')}</h2>
        {!isHost ? <span className="text-xs text-graphite">{t('lobby.protocolReadonly')}</span> : null}
      </div>

      <fieldset>
        <legend className="label">{t('lobby.tests')}</legend>
        <div className="space-y-1.5">
          {TEST_KEYS.map((key) => {
            const on = s.tests.includes(key);
            return (
              <label
                key={key}
                className={cx(
                  'flex items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2 transition',
                  on ? 'border-ink bg-bench' : 'border-line bg-glass/60 text-graphite',
                  isHost && 'cursor-pointer hover:border-ink/60',
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[#13233A]"
                  checked={on}
                  disabled={!isHost}
                  onChange={() => toggleTest(key)}
                />
                <span className={cx(!on && 'opacity-50')}>
                  <TestTile type={key} size="xs" />
                </span>
                <span className="flex-1 text-[15px] font-medium">{t(`tests.${key}.name`)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <div className="label">{t('lobby.rounds')}</div>
        <SegmentRow values={[4, 6, 8, 10]} value={s.rounds} disabled={!isHost} onPick={(v) => set({ rounds: v })} />
      </div>

      <div className="mt-4">
        <div className="label">{t('lobby.timers')}</div>
        <div className="space-y-2">
          {TEST_KEYS.filter((k) => s.tests.includes(k)).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-sm text-ink-soft">{t(`tests.${k}.name`)}</span>
              <SegmentRow
                values={TIMER_FIELDS[k].values}
                value={s[TIMER_FIELDS[k].key]}
                format={(v) => t('lobby.seconds', { n: v })}
                disabled={!isHost}
                onPick={(v) => set({ [TIMER_FIELDS[k].key]: v })}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 border-t border-line-soft pt-3 text-[13px] leading-relaxed text-graphite">{t('lobby.scoring')}</p>
    </section>
  );
}

function SegmentRow({ values, value, disabled, onPick, format = (v) => v }) {
  return (
    <div className="grid flex-1 grid-cols-4 gap-1 rounded-[var(--radius-control)] bg-glass p-1">
      {values.map((v) => (
        <button
          key={v}
          disabled={disabled}
          aria-pressed={value === v}
          onClick={() => onPick(v)}
          className={cx(
            'tabular h-8 rounded-[8px] text-sm transition',
            value === v
              ? 'bg-bench font-semibold text-ink shadow-[0_0_0_1px_var(--color-line),0_1px_0_1px_var(--color-line)]'
              : 'text-graphite enabled:hover:text-ink',
          )}
        >
          {format(v)}
        </button>
      ))}
    </div>
  );
}
