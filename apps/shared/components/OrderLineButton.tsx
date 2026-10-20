import LineLogo from './LineLogo';
import { useStoreConfig } from '../store/config';

interface Props {
  /** ข้อความบนปุ่ม */
  label?: string;
  /** ขนาดปุ่ม */
  size?: 'sm' | 'lg';
  /** ข้อความเสริมที่จะแนบไปกับข้อความใน LINE */
  productTitle?: string;
}

/**
 * ปุ่มสั่งซื้อ (สีเขียว + โลโก้ LINE)
 *
 * พาลูกค้าไปที่ LINE OA ของร้าน พร้อมแนบชื่อสินค้าไว้ในข้อความ
 * เพื่อให้แอดมินรู้ว่าลูกค้าสนใจสินค้าไหน
 */
export default function OrderLineButton({
  label = 'สั่งซื้อ',
  size = 'lg',
  productTitle,
}: Props) {
  const { lineOaLink } = useStoreConfig();

  const openLine = () => {
    // ยังไม่ได้ตั้งลิงก์ LINE OA → เตือนแอดมิน/เจ้าของร้าน
    if (!lineOaLink) {
      alert(
        'ยังไม่ได้ตั้งลิงก์ LINE OA ของร้าน\n\n' +
          'เจ้าของร้าน: เข้าเว็บแอดมิน → ตั้งค่าร้าน → ใส่ลิงก์ LINE OA',
      );
      return;
    }

    // 🔗 ลิงก์แบบ "line.me/R/ti/p/@xxxx" หรือ "line.me/ti/p/~xxxx" เท่านั้นที่รับพารามิเตอร์ text
    //    ถ้าเป็น short link แบบ lin.ee/xxxx การเติม ?text= จะทำให้ลิงก์พัง
    //    → ถ้าเป็น short link ให้เปิดลิงก์เปล่า แล้วแสดงชื่อสินค้าให้ลูกค้าเห็นบนหน้าเว็บแทน
    const isShortLink = /(^|\/\/)lin\.ee\//i.test(lineOaLink);
    const supportsText = !isShortLink;

    let url = lineOaLink;
    if (productTitle && supportsText) {
      url += (url.includes('?') ? '&' : '?') +
        'text=' + encodeURIComponent(`สนใจสินค้า: ${productTitle}`);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      className={`btn btn-line${size === 'lg' ? ' btn-lg' : ''}`}
      onClick={openLine}
    >
      <LineLogo size={size === 'lg' ? 22 : 18} />
      {label}
    </button>
  );
}
