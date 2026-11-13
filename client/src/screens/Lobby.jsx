/**
 * Lobby (`waiting` state): form teams of 2, host configures and starts the game.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Avatar, Button, Screen, cx, useBusy } from '../components/ui.jsx';
import { useGame } from '../game.jsx';

export default function Lobby() {
  const { view, isHost, me, myTeam, actions, playersById } = useGame();
  const [busy, run] = useBusy();
  const freeAgents = view.players.filter((p) => !p.teamId);
  const fullTeams = view.teams.filter((t) => t.members.length === 2);

  return (
    <Screen className="grid gap-5 lg:grid-cols-[1fr_340px]">
      {/* ------------------------------ Teams ------------------------------ */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">Pick your partner</h1>
            <p className="mt-1 text-white/60">
              Teams of two. Share the code <b className="text-white tracking-widest">{view.code}</b> to invite friends.
            </p>
          </div>
          {!myTeam ? (
            <Button busy={busy} onClick={() => run(actions.createTeam)}>
              + Start a team
            </Button>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => run(actions.leaveTeam)}>
              Leave team
            </Button>
          )}
        </div>

        <motion.div layout className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {view.teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </AnimatePresence>
          {!view.teams.length ? (
            <div className="rounded-3xl border-2 border-dashed border-white/10 p-8 text-center text-white/50 sm:col-span-2">
              No teams yet. Start one and grab a partner!
            </div>
          ) : null}
        </motion.div>

        {/* Free agents */}
        <div className="glass rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="label mb-0">Free agents · {freeAgents.length}</h3>
            {isHost && freeAgents.some((p) => p.id !== view.hostId) ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(actions.host.autoPair)}>
                🎲 Auto-pair
              </Button>
            ) : null}
          </div>
          {freeAgents.length ? (
            <ul className="flex flex-wrap gap-2">
              <AnimatePresence>
                {freeAgents.map((p) => (
                  <motion.li
                    layout
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-2 pl-1"
                  >
                    <Avatar player={p} size="sm" />
                    <span className="text-sm font-semibold">
                      {p.name}
                      {p.id === view.you ? <span className="text-white/40"> (you)</span> : null}
                      {p.id === view.hostId ? ' 👑' : null}
                    </span>
                    {isHost ? <HostPlayerMenu player={p} /> : null}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="text-sm text-white/40">Everyone's on a team. 🎉</p>
          )}
          {isHost && !me?.teamId ? (
            <p className="mt-3 text-xs text-white/40">
              Tip: as host you can play too — join a team — or stay off teams and run the show from a big screen.
            </p>
          ) : null}
        </div>
      </section>

      {/* ----------------------------- Settings ---------------------------- */}
      <aside className="space-y-4">
        <Settings />
        {isHost ? (
          <div className="glass rounded-3xl p-4">
            <Button
              size="lg"
              className="w-full"
              busy={busy}
              disabled={!fullTeams.length}
              onClick={() => run(actions.host.start)}
            >
              Start game ✨
            </Button>
            <p className="mt-2 text-center text-xs text-white/50">
              {fullTeams.length
                ? `${fullTeams.length} team${fullTeams.length > 1 ? 's' : ''} ready${
                    view.teams.length > fullTeams.length ? ' · incomplete teams will spectate' : ''
                  }`
                : 'Need at least one full team of 2'}
            </p>
          </div>
        ) : (
          <div className="glass flex items-center gap-3 rounded-3xl p-4">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-electric-400 opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-electric-400" />
            </span>
            <p className="text-sm text-white/70">
              Waiting for <b className="text-white">{playersById[view.hostId]?.name ?? 'the host'}</b> to start the game…
            </p>
          </div>
        )}
      </aside>
    </Screen>
  );
}

/* ------------------------------ Team card ------------------------------ */

function TeamCard({ team }) {
  const { view, isHost, me, actions, playersById } = useGame();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const isMine = team.members.includes(view.you);
  const canEdit = isMine || isHost;
  const seats = [team.members[0], team.members[1]];

  const save = async () => {
    setEditing(false);
    if (name.trim() && name.trim() !== team.name) await actions.renameTeam(team.id, name.trim());
    else setName(team.name);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cx('glass relative overflow-hidden rounded-3xl p-4', isMine && 'ring-2 ring-white/25')}
    >
      <div className="absolute -top-16 -right-10 size-40 rounded-full opacity-30 blur-3xl" style={{ background: team.color }} />
      <div className="relative mb-3 flex items-center gap-2">
        <span className="size-3 shrink-0 rounded-full" style={{ background: team.color, boxShadow: `0 0 12px ${team.color}` }} />
        {editing ? (
          <input
            autoFocus
            className="field h-9 py-1 font-display text-lg font-bold"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        ) : (
          <button
            className={cx('truncate text-left font-display text-lg font-bold', canEdit && 'hover:text-electric-300')}
            onClick={() => canEdit && (setName(team.name), setEditing(true))}
            title={canEdit ? 'Rename team' : undefined}
          >
            {team.name} {canEdit ? <span className="text-sm text-white/30">✎</span> : null}
          </button>
        )}
        {team.members.length === 2 ? <span className="chip ml-auto shrink-0 text-emerald-300">Ready</span> : null}
      </div>

      <div className="relative grid grid-cols-2 gap-2">
        {seats.map((pid, i) =>
          pid ? (
            <div key={pid} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/5 px-2 py-3">
              <Avatar player={playersById[pid]} size="md" ring={team.color} />
              <span className="max-w-full truncate text-sm font-semibold">
                {playersById[pid]?.name}
                {pid === view.hostId ? ' 👑' : ''}
              </span>
              {pid === view.you ? <span className="text-[11px] text-white/40">you</span> : null}
              {isHost && pid !== view.you ? <HostPlayerMenu player={playersById[pid]} /> : null}
            </div>
          ) : (
            <div
              key={`open-${i}`}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 px-2 py-3"
            >
              <span className="grid size-11 place-items-center rounded-full bg-white/5 text-xl text-white/30">?</span>
              {!isMine && me ? (
                <Button size="sm" variant="secondary" onClick={() => actions.joinTeam(team.id)}>
                  Join
                </Button>
              ) : (
                <span className="text-xs text-white/40">Open seat</span>
              )}
            </div>
          ),
        )}
      </div>
    </motion.div>
  );
}

/* --------------------------- Host player menu -------------------------- */

/** Compact select letting the host move or kick a player. */
function HostPlayerMenu({ player }) {
  const { view, actions } = useGame();
  if (!player) return null;
  const openTeams = view.teams.filter((t) => t.members.length < 2 && t.id !== player.teamId);

  const onChange = (e) => {
    const value = e.target.value;
    e.target.value = '';
    if (value === 'kick') {
      if (window.confirm(`Remove ${player.name} from the room?`)) actions.host.kick(player.id);
    } else if (value === 'bench') actions.host.assign(player.id, null);
    else if (value) actions.host.assign(player.id, value);
  };

  return (
    <select
      aria-label={`Manage ${player.name}`}
      defaultValue=""
      onChange={onChange}
      className="h-6 cursor-pointer rounded-lg border border-white/10 bg-ink-800 px-1 text-[11px] text-white/60 outline-none hover:text-white"
    >
      <option value="" disabled>
        ⋯
      </option>
      {openTeams.map((t) => (
        <option key={t.id} value={t.id}>
          Move to {t.name}
        </option>
      ))}
      <option value="new">Move to new team</option>
      {player.teamId ? <option value="bench">Bench (no team)</option> : null}
      {player.id !== view.hostId ? <option value="kick">Kick from room</option> : null}
    </select>
  );
}

/* ------------------------------ Settings ------------------------------- */

const MODE_LABELS = {
  mixed: { label: 'Mixed', hint: 'Alternate Sync & Telepathy' },
  sync: { label: 'Sync', hint: 'Answer + predict only' },
  telepathy: { label: 'Telepathy', hint: 'Grid mind-reading only' },
};

function Settings() {
  const { view, isHost, actions } = useGame();
  const s = view.settings;
  const set = (patch) => actions.host.settings(patch);

  return (
    <div className="glass space-y-4 rounded-3xl p-4">
      <h3 className="label mb-0">Game settings {isHost ? null : <span className="normal-case tracking-normal">(host only)</span>}</h3>

      <div>
        <div className="mb-2 text-sm font-semibold text-white/80">Mode</div>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(MODE_LABELS).map(([key, m]) => (
            <Segment key={key} group="mode" active={s.mode === key} disabled={!isHost} onClick={() => set({ mode: key })}>
              {m.label}
            </Segment>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-white/45">{MODE_LABELS[s.mode].hint}</p>
      </div>

      <Option label="Rounds" values={[4, 6, 8, 10]} value={s.rounds} disabled={!isHost} onPick={(v) => set({ rounds: v })} />
      {s.mode !== 'telepathy' ? (
        <Option
          label="Sync timer"
          values={[45, 60, 90, 120]}
          suffix="s"
          value={s.questionSeconds}
          disabled={!isHost}
          onPick={(v) => set({ questionSeconds: v })}
        />
      ) : null}
      {s.mode !== 'sync' ? (
        <Option
          label="Telepathy timer"
          values={[10, 15, 20, 30]}
          suffix="s"
          value={s.telepathySeconds}
          disabled={!isHost}
          onPick={(v) => set({ telepathySeconds: v })}
        />
      ) : null}

      <div className="rounded-2xl bg-white/[0.04] p-3 text-xs leading-relaxed text-white/55">
        <b className="text-white/80">Scoring</b> · +{view.points.prediction} per correct prediction · +{view.points.jinx} jinx bonus
        when you both give the same answer · +{view.points.telepathy} for a telepathy match
      </div>
    </div>
  );
}

function Option({ label, values, value, suffix = '', disabled, onPick }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-white/80">{label}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {values.map((v) => (
          <Segment key={v} group={label} active={value === v} disabled={disabled} onClick={() => onPick(v)}>
            {v}
            {suffix}
          </Segment>
        ))}
      </div>
    </div>
  );
}

function Segment({ group, active, disabled, children, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'relative h-9 rounded-xl text-sm font-bold transition',
        active ? 'text-white' : 'text-white/50 enabled:hover:bg-white/5 enabled:hover:text-white',
        disabled && !active && 'opacity-50',
      )}
    >
      {active ? (
        <motion.span
          layoutId={`seg-${group}`}
          className="absolute inset-0 rounded-xl border border-electric-400/40 bg-gradient-to-br from-electric-500/40 to-indigo-500/30"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      ) : null}
      <span className="relative">{children}</span>
    </button>
  );
}
