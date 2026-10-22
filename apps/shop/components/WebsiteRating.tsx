import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@shared/store/auth';
import { apiRateWebsite, apiWebsiteRating, apiWebsiteRatingMine } from '@shared/lib/api';
import StarPicker from './StarPicker';

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
export default function WebsiteRating() {
  const { user, token } = useAuth();
  const [value, setValue] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState<{ avg: number; count: number } | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);

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

  // ⭐ คะแนนเดิมของผู้ใช้ (ถ้าล็อกอิน)
  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    apiWebsiteRatingMine(user.email, token)
      .then((r) => {
        if (cancelled || !r.ok) return;
        setMyRating(Number(r.rating || 0));
        if (r.comment) setComment(String(r.comment));
        setValue(Number(r.rating || 0));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  const submit = async () => {
    if (!user || !token) return;
    if (value <= 0) {
      setError('กดดาวก่อนนะครับ — เลือกได้ตั้งแต่ 0.5 ถึง 5 ดาว');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await apiRateWebsite(user.email, token, value, comment.trim());
      if (!r.ok) {
        setError(r.error || 'บันทึกคะแนนไม่สำเร็จ ลองใหม่อีกครั้ง');
        return;
      }
      setDone(true);
      setMyRating(value);
      const s = await apiWebsiteRating();
      if (s.ok) setStats({ avg: Number(s.avg || 0), count: Number(s.count || 0) });
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
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
        ) : done ? (
          <div className="notice ok-box">
            ✅ ขอบคุณสำหรับคะแนน {value.toFixed(1)} ดาว!
            {myRating !== null && myRating > 0 && myRating !== value && ' (แก้ไขคะแนนเดิม)'}
          </div>
        ) : (
          <>
            <StarPicker value={value} onChange={setValue} />
            <p className="muted small center">คลิกครึ่งซ้าย = ครึ่งดาว · คลิกครึ่งขวา = เต็มดาว</p>

            <label className="rate-comment">
              ความคิดเห็นเกี่ยวกับเว็บไซต์ (ไม่บังคับ)
              <textarea
                className="input"
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="เช่น สั่งง่าย ตอบไว ขอบคุณค่ะ"
              />
            </label>

            {myRating !== null && myRating > 0 && (
              <p className="muted small">
                คุณให้คะแนนเว็บนี้ไว้ {myRating.toFixed(1)} ดาวแล้ว (บันทึกใหม่จะทับของเดิม)
              </p>
            )}

            {error && <p className="rate-error">{error}</p>}

            <div className="web-rate-actions">
              <button className="btn btn-primary" onClick={submit} disabled={busy || value <= 0}>
                {busy ? 'กำลังบันทึก…' : 'ส่งคะแนน'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
