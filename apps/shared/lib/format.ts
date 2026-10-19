/** ฟอร์แมตราคาแบบไทย: 19900 -> "19,900 ฿" */
export function formatPrice(n: number): string {
  return Number(n || 0).toLocaleString('th-TH') + ' ฿';
}