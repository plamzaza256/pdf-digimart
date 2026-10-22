import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@shared/store/auth';
import { apiWebsiteRating } from '@shared/lib/api';
import RatingModal from './RatingModal';

/**
 * ⭐ ให้คะแนนเว็บไซต์ (ให้คะแนนร้านทั้งร้าน)
 *
 * 🎯 กติกาเหมือนคะแนนสินค้า
 *   • 5 ดาว ขั้นละ 0.5
 *   • ความคิดเห็นไม่บังคับ
 *   • 🔒 ต้องเข้าสู่ระบบก่อน (กันสแปม)
 *   • เก็บลงแท็บ Rating เดิม โดยใช้ product_id = "WEBSITE"
 *     (สูตรเฉลี่ยรายสินค้าของเจ้าของร้านไม่กระทบ เพราะนับเฉพาะรหัสสินค้าจริง)
 */
const WEBSITE_ID = 'WEBSITE';

export default function WebsiteRating() {
  const { user, token } = useAuth();
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
              {stats.avg.toFixed(1)} ดาว · จาก {stats.count} คน
            </span>
          )}
        </div>

        {!user || !token ? (
          <div className="notice warn-box">
            🔒 <b>ต้องเข้าสู่ระบบก่อน</b> จึงจะให้คะแนนได้ (กันการให้คะแนนปลอม)
            <br />
            <Link to="/login" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
              เข้าสู่ระบบด้วย Google
            </Link>
          </div>
        ) : (
          <div className="web-rate-actions">
            <button className="btn btn-primary btn-lg" onClick={() => setOpen(true)}>
              ⭐ ให้คะแนนเว็บไซต์
            </button>
          </div>
        )}
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
