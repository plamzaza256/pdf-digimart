import { useEffect, useState } from 'react';
import { apiWebsiteRating } from '@shared/lib/api';
import RatingModal from './RatingModal';

/**
 * ⭐ ให้คะแนนเว็บไซต์ (ให้คะแนนร้านทั้งร้าน)
 *
 * 🎯 กติกาเหมือนคะแนนสินค้า
 *   • 5 ดาว ขั้นละ 0.5
 *   • ความคิดเห็นไม่บังคับ
 *   • ✅ ให้คะแนนได้เลย ไม่ต้องเข้าสู่ระบบ
 *   • เก็บลงแท็บ Rating เดิม โดยใช้ product_id = "WEBSITE"
 *     (สูตรเฉลี่ยรายสินค้าของเจ้าของร้านไม่กระทบ เพราะนับเฉพาะรหัสสินค้าจริง)
 */
const WEBSITE_ID = 'WEBSITE';

export default function WebsiteRating() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<{ avg: number; count: number } | null>(null);

  // 📊 คะแนนเฉลี่ยของเว็บ (อ่านอย่างเดียว)
  useEffect(() => {
    let cancelled = false;
    apiWebsiteRating()
      .then((r) => {
        if (cancelled || !r.ok) return;
        setStats({ avg: Number(r.avg || 0), count: Number(r.count || 0) });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const onSaved = () => {
    apiWebsiteRating()
      .then((r) => {
        if (!r.ok) return;
        setStats({ avg: Number(r.avg || 0), count: Number(r.count || 0) });
      })
      .catch(() => undefined);
  };

  return (
    <section className="container" id="rate-website">
      <div className="web-rate-box">
        <div className="web-rate-head">
          <h2 className="sec-title">⭐ ให้คะแนนเว็บไซต์</h2>
          {stats && stats.count > 0 && (
            <span className="web-rate-stat">
              {stats.avg.toFixed(2)} ดาว · จาก {stats.count} คน
            </span>
          )}
        </div>

        <div className="web-rate-actions">
          <button className="btn btn-primary btn-lg" onClick={() => setOpen(true)}>
            ⭐ ให้คะแนนเว็บไซต์
          </button>
        </div>
      </div>

      {open && (
        <RatingModal
          kind="website"
          productId={WEBSITE_ID}
          productTitle="เว็บไซต์ PDF ให้แม่มึงทำ"
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      )}
    </section>
  );
}
