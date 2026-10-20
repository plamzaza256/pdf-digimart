import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@shared/store/auth';
import { apiSheetInspect } from '@shared/lib/api';

interface Validation {
  column: string;
  type: string;
  values: unknown[];
}

interface SheetInfo {
  name: string;
  empty?: boolean;
  rowCount?: number;
  columnCount?: number;
  headers?: string[];
  validations?: Validation[];
  sampleRows?: Record<string, unknown>[];
}

/**
 * 🧪 หน้า "ดูชีต"
 *
 * ดูโครงสร้างชีตสด: ชื่อแท็บ ชื่อคอลัมน์ สูตร dropdown และข้อมูลตัวอย่าง
 * กดรีเฟรชเพื่อดูการแก้ไขล่าสุด
 */
export default function SheetView() {
  const { user, token } = useAuth();
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [active, setActive] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    setError('');
    try {
      const r = await apiSheetInspect(user.email, token);
      if (!r.ok) {
        setError(r.error || 'ดูชีตไม่สำเร็จ');
        return;
      }
      const list = (r.sheets || []) as SheetInfo[];
      setSheets(list);
      if (list.length > 0) {
        setActive((prev) => (list.some((s) => s.name === prev) ? prev : list[0].name));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    load();
  }, [load]);

  const current = sheets.find((s) => s.name === active);

  return (
    <div className="container page">
      <h1>ดูชีต</h1>
      <p className="muted">
        โครงสร้างชีตสด — ชื่อคอลัมน์ สูตร และ dropdown
        กดรีเฟรชหลังแก้ชีตเพื่อดูค่าล่าสุด
      </p>

      <div className="form-row">
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          {loading ? 'กำลังโหลด…' : 'รีเฟรช'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {sheets.length > 0 && (
        <>
          <div className="toolbar" style={{ marginTop: 14 }}>
            {sheets.map((s) => (
              <button
                key={s.name}
                className={`btn ${s.name === active ? 'btn-primary' : 'btn-outline'} btn-sm`}
                onClick={() => setActive(s.name)}
              >
                {s.name}
                {s.rowCount !== undefined && s.rowCount > 0 && ` (${s.rowCount})`}
              </button>
            ))}
          </div>

          {current && !current.empty && (
            <div className="sheet-view">
              <h2 className="sec-title">{current.name}</h2>
              <p className="muted small">
                {current.rowCount} แถว × {current.columnCount} คอลัมน์
              </p>

              <h3>ชื่อคอลัมน์</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>ชื่อคอลัมน์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(current.headers || []).map((h, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><code>{h}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {current.validations && current.validations.length > 0 && (
                <>
                  <h3>🔽 Dropdown (Data Validation)</h3>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>คอลัมน์</th><th>ประเภท</th><th>ค่าที่เลือกได้</th></tr>
                      </thead>
                      <tbody>
                        {current.validations.map((v, i) => (
                          <tr key={i}>
                            <td><code>{v.column}</code></td>
                            <td>{v.type}</td>
                            <td>
                              {(v.values || []).map((x, j) => (
                                <span key={j} className="tag">{String(x)}</span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <h3>ตัวอย่างข้อมูล (3 แถวแรก)</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {(current.headers || []).map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(current.sampleRows || []).map((row, ri) => (
                      <tr key={ri}>
                        {(current.headers || []).map((h, ci) => {
                          const v = row[h];
                          const isFormula = typeof v === 'string' && v.charAt(0) === '=';
                          return (
                            <td key={ci} className={isFormula ? 'cell-formula' : ''}>
                              {isFormula ? <code>{String(v)}</code> : String(v ?? '')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
