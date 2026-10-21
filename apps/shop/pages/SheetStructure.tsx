import { useCallback, useEffect, useState } from 'react';
import { apiSheetStructure } from '@shared/lib/api';

interface Validation {
  column: string;
  type: string;
  values: unknown[];
}

interface FormulaCell {
  cell: string;
  column: string;
  formula: string;
}

interface SheetInfo {
  name: string;
  empty?: boolean;
  rowCount?: number;
  columnCount?: number;
  headers?: string[];
  validations?: Validation[];
  formulas?: FormulaCell[];
  sampleValues?: Record<string, unknown>[];
  hasPrivateData?: boolean;
}

/**
 * 📋 หน้า "โครงสร้างชีต"
 *
 * แสดงว่าเว็บอ่านชีตตรงช่องไหม
 * - ชื่อแท็บทั้งหมด
 * - ชื่อคอลัมน์ของแต่ละแท็บ
 * - 🔽 dropdown ที่ตั้งไว้
 * - 🧮 สูตรที่ใช้ (บอกตำแหน่งด้วย)
 * - 📋 ตัวอย่างข้อมูล 3 แถว
 *
 * 🛡 ไม่ต้องล็อกอิน — เปิดเผยแค่โครงสร้าง ไม่มีข้อมูลลูกค้า
 */
export default function SheetStructure() {
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [active, setActive] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await apiSheetStructure();
      if (!r.ok) {
        setError(r.error || 'ดึงข้อมูลไม่สำเร็จ');
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = sheets.find((s) => s.name === active);

  return (
    <div className="container page">
      <h1>โครงสร้างชีต</h1>
      <p className="muted">
        แสดงว่าเว็บอ่านข้อมูลจากชีตตรงช่องไหม — ชื่อแท็บ ชื่อคอลัมน์ dropdown และสูตร
        <br />
        🛡 ไม่แสดงข้อมูลลูกค้า (อีเมล/โทเคน) — เห็นแค่โครงสร้าง
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
                {current.hasPrivateData && ' · 🔒 แท็บนี้มีข้อมูลลูกค้า (ไม่แสดงค่า)'}
              </p>

              <h3>ชื่อคอลัมน์</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>ชื่อคอลัมน์</th></tr>
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

              {current.formulas && current.formulas.length > 0 && (
                <>
                  <h3>🧮 สูตรที่ใช้</h3>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>เซลล์</th><th>คอลัมน์</th><th>สูตร</th></tr>
                      </thead>
                      <tbody>
                        {current.formulas.map((f, i) => (
                          <tr key={i}>
                            <td><code>{f.cell}</code></td>
                            <td><code>{f.column}</code></td>
                            <td className="cell-formula"><code>{f.formula}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {current.sampleValues && current.sampleValues.length > 0 && (
                <>
                  <h3>📋 ตัวอย่างข้อมูล (3 แถวแรก)</h3>
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
                        {current.sampleValues.map((row, ri) => (
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
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
