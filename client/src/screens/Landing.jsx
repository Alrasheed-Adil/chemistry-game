/**
 * Landing: what the lab tests, how results are read, and the intake form
 * (name → start a session, or join one by code). `/?room=ABCD` pre-fills the code.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { BondScale } from '../components/BondScale.jsx';
import { Button, ElementTile, LangToggle, Logo, Screen, TestTile, useBusy } from '../components/ui.jsx';
import { useGame } from '../game.jsx';
import { useLang } from '../i18n.jsx';

const inviteCode = new URLSearchParams(window.location.search).get('room')?.toUpperCase().slice(0, 4) ?? '';
const TESTS = ['sync', 'telepathy', 'decision'];

export default function Landing() {
  const { actions, notify } = useGame();
  const { t } = useLang();
  const reduce = useReducedMotion();
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
    notify(t('landing.needName'), 'info');
    document.getElementById('name')?.focus();
    return true;
  };

  const create = () => !needName() && run(() => actions.createRoom(name.trim()));
  const join = (e) => {
    e?.preventDefault();
    if (needName()) return;
    if (code.trim().length !== 4) return notify(t('landing.codeLength'), 'info');
    run(async () => {
      const res = await actions.joinRoom(code.trim(), name.trim());
      if (res?.ok) window.history.replaceState(null, '', '/');
    });
  };

  return (
    <Screen className="mx-auto min-h-dvh max-w-6xl px-4 pt-5 pb-14 sm:px-6">
      <div className="flex items-center justify-between">
        <Logo />
        <LangToggle />
      </div>

      {/* Mobile order: headline → intake form → details. Desktop: form in a sticky right column. */}
      <div className="mt-10 grid items-start gap-x-16 gap-y-10 lg:mt-16 lg:grid-cols-[1fr_400px]">
        {/* ------------------------------ Hero ------------------------------ */}
        <div className="max-w-[38rem] lg:col-start-1 lg:row-start-1">
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <ElementTile symbol="Ch" number={2} color="#13233A" size="lg" />
          </motion.div>
          <h1 className="mt-6 text-[40px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-[56px]">
            {t('landing.title')}
          </h1>
          <p className="mt-4 max-w-[34rem] text-lg leading-relaxed text-ink-soft">{t('landing.lead')}</p>
        </div>

        <div className="max-w-[38rem] lg:col-start-1 lg:row-start-2">
          <h2 className="mb-4 text-sm font-medium text-ink-soft">{t('landing.experiments')}</h2>
          <ul className="space-y-4">
            {TESTS.map((type) => (
              <li key={type} className="flex items-start gap-4">
                <TestTile type={type} size="md" />
                <div className="pt-1">
                  <div className="text-lg font-semibold">{t(`tests.${type}.name`)}</div>
                  <p className="max-w-[30rem] text-ink-soft">{t(`tests.${type}.desc`)}</p>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 mb-4 text-sm font-medium text-ink-soft">{t('landing.scale')}</h2>
          <BondScale />
        </div>

        {/* ----------------------------- Intake ----------------------------- */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="bench p-6 sm:p-7 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <label className="label" htmlFor="name">
            {t('landing.nameLabel')}
          </label>
          <input
            id="name"
            className="field text-lg"
            placeholder={t('landing.namePlaceholder')}
            maxLength={16}
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (code.length === 4 ? join() : create())}
            autoFocus={!inviteCode}
          />

          {inviteCode ? null : (
            <>
              <Button size="lg" className="mt-4 w-full" busy={busy} onClick={create}>
                {t('landing.create')}
              </Button>
              <div className="my-6 flex items-center gap-3 text-sm text-graphite">
                <span className="h-px flex-1 bg-line" />
                {t('landing.or')}
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}

          <form onSubmit={join} className={inviteCode ? 'mt-5' : ''}>
            <label className="label" htmlFor="code">
              {t('landing.codeLabel')}
            </label>
            <div className="flex gap-2">
              <input
                id="code"
                dir="ltr"
                className="field tabular text-center text-2xl font-semibold tracking-[0.35em] uppercase"
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
                {t('landing.join')}
              </Button>
            </div>
            {inviteCode ? (
              <p className="mt-3 text-sm text-graphite">
                {t('landing.invited', { code: inviteCode })}{' '}
                <button
                  type="button"
                  className="text-ink underline underline-offset-2"
                  onClick={() => {
                    window.history.replaceState(null, '', '/');
                    window.location.reload();
                  }}
                >
                  {t('landing.createOwn')}
                </button>
              </p>
            ) : null}
          </form>
        </motion.div>
      </div>
    </Screen>
  );
}
