import { useEffect, useState } from 'react';
import { apiRateProduct, apiRateWebsite } from '@shared/lib/api';

/**
 * ⭐ ป๊อปอัพให้คะแนนสินค้า
 *
 * 🎯 กติกา (เจ้าของร้านกำหนด):
 *   • 5 ดาว ให้คะแนนได้ 0 – 5 เป็นขั้นละ 0.5
 *   • คลิกครึ่งซ้าย = ครึ่งดาว / คลิกครึ่งขวา = เต็มดาว
 *   • ช่องความคิดเห็น = ไม่บังคับ (ลืมไว้ก็ได้)
 *   • ✅ ให้คะแนนได้เลย ไม่ต้องเข้าสู่ระบบ
 */

interface Props {
  /** 'product' = ให้คะแนนสินค้า · 'website' = ให้คะแนนเว็บไซต์ */
  kind?: 'product' | 'website';
  productId: string;
  productTitle: string;
  onClose: () => void;
  onSaved: (rating: number) => void;
}

const STARS = [1, 2, 3, 4, 5];

export default function RatingModal({
  kind = 'product',
  productId,
  productTitle,
  onClose,
  onSaved,
}: Props) {
  const [value, setValue] = useState(0);
  const [comment, setComment] = useState('');
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // ปิดด้วย Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ดาวที่กด = ดาวเต็มก่อนหน้า + (ครึ่งดาวถ้าคลิกครึ่งซ้าย)
  // 🛡 ตั้ง hover ตามค่าที่เลือกด้วย → ตัวเลขที่เห็นตรงกับที่เลือกจริง
  const pick = (star: number, half: boolean) => {
    const v = half ? star - 0.5 : star;
    setValue(v);
    setHover(v);
  };

  const shown = hover || value;

  const submit = async () => {
    if (value <= 0) {
      setError('กดดาวก่อนนะครับ — เลือกได้ตั้งแต่ 0.5 ถึง 5 ดาว');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r =
        kind === 'website'
          ? await apiRateWebsite(value, comment.trim())
          : await apiRateProduct(productId, value, comment.trim());
      if (!r.ok) {
        setError(r.error || 'บันทึกคะแนนไม่สำเร็จ ลองใหม่อีกครั้ง');
        return;
      }
      onSaved(value);
      onClose();
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="ให้คะแนนสินค้า"
      >
        <button className="modal-x" onClick={onClose} aria-label="ปิด">
          ×
        </button>

        <h3>{kind === 'website' ? 'ให้คะแนนเว็บไซต์' : 'ให้คะแนนสินค้า'}</h3>
        <p className="muted small modal-sub">{productTitle}</p>

        <>
            {/* ⭐ ช่องเลือกดาว — คลิกครึ่งซ้าย = ครึ่งดาว */}
            <div className="star-row" onMouseLeave={() => setHover(0)}>
              {STARS.map((n) => {
                const full = shown >= n;
                const half = !full && shown >= n - 0.5;
                return (
                  <span key={n} className="star-pick">
                    <span
                      className={`star-shape${full ? ' is-full' : half ? ' is-half' : ''}`}
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

            {/* 📝 ความคิดเห็น (ไม่บังคับ) */}
            <label className="rate-comment">
              {kind === 'website' ? 'ความคิดเห็นเกี่ยวกับเว็บไซต์ (ไม่บังคับ)' : 'ความคิดเห็น (ไม่บังคับ)'}
              <textarea
                className="input"
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={kind === 'website' ? 'เช่น สั่งง่าย ตอบไว ขอบคุณค่ะ' : 'เช่น ข้อสอบชัด ตรงเลข ถูกใจมาก'}
              />
            </label>

            {error && <p className="rate-error">{error}</p>}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
                ยกเลิก
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={busy || value <= 0}>
                {busy ? 'กำลังบันทึก…' : 'ส่งคะแนน'}
              </button>
            </div>
          </>
      </div>
    </div>
  );
}
