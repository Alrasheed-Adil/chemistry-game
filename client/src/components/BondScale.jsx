/**
 * The indicator strip with bond classifications underneath.
 * Thresholds match `bondFor()` in i18n.jsx: 25 / 45 / 65 / 85.
 */

import { useLang } from '../i18n.jsx';
import { IndicatorStrip } from './ui.jsx';

const SEGMENTS = [
  { key: 'noble', fr: 25 },
  { key: 'vdw', fr: 20 },
  { key: 'hydrogen', fr: 20 },
  { key: 'ionic', fr: 20 },
  { key: 'covalent', fr: 15 },
];

export function BondScale({ value }) {
  const { t } = useLang();
  return (
    <div>
      <IndicatorStrip value={value} />
      <div
        dir="ltr"
        className="mt-2 grid text-[12px] leading-tight text-graphite"
        style={{ gridTemplateColumns: SEGMENTS.map((s) => `${s.fr}fr`).join(' ') }}
      >
        {SEGMENTS.map((s) => (
          <span key={s.key} className="border-s border-line ps-1.5 pe-1 first:border-s-0 first:ps-0">
            {t(`bonds.${s.key}.name`)}
          </span>
        ))}
      </div>
      <div dir="ltr" className="tabular mt-1 flex justify-between text-[11px] text-graphite/80">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
