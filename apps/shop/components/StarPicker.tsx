import { useState } from 'react';

/**
 * ⭐ ช่องเลือกดาว 5 ดาว
 *
 * 🎯 กติกา: 0 – 5 ดาว ขั้นละ 0.5
 *   คลิกครึ่งซ้ายของดาว  = ครึ่งดาว
 *   คลิกครึ่งขวาของดาว  = เต็มดาว
 */
interface Props {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}

const STARS = [1, 2, 3, 4, 5];

export default function StarPicker({ value, onChange, size = 38 }: Props) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const pick = (star: number, half: boolean) => {
    const v = half ? star - 0.5 : star;
    onChange(v);
    setHover(v);
  };

  return (
    <div className="star-row" onMouseLeave={() => setHover(0)}>
      {STARS.map((n) => {
        const full = shown >= n;
        const half = !full && shown >= n - 0.5;
        return (
          <span key={n} className="star-pick" style={{ width: size + 4, height: size + 4 }}>
            <span
              className={`star-shape${full ? ' is-full' : half ? ' is-half' : ''}`}
              style={{ fontSize: size, lineHeight: size + 4 }}
              onMouseEnter={() => setHover(n)}
              onClick={() => pick(n, false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') pick(n, false);
              }}
              aria-label={`${n} ดาว`}
            >
              ★
            </span>
            <span
              className="star-half"
              onMouseEnter={() => setHover(n - 0.5)}
              onClick={(e) => {
                e.stopPropagation();
                pick(n, true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') pick(n, true);
              }}
              aria-label={`${n - 0.5} ดาว`}
            />
          </span>
        );
      })}
      <span className="star-num">{value > 0 ? value.toFixed(1) : '—'}</span>
    </div>
  );
}
