import type { PhieuKho } from '@/types';
import type { CongTyInfo } from './khoPrintTemplates';
import { template01VT, template02VT, template03XKNB3 } from './khoPrintTemplates';

/** Chọn template HTML theo loaiPhieu và in qua iframe ẩn.
 *  Sao chép cơ chế iframe từ printPhieu.ts (onload + setTimeout fallback + cleanup).
 */
export function printKhoPhieu(phieu: PhieuKho, congTy: CongTyInfo): void {
  let html: string;
  switch (phieu.loaiPhieu) {
    case 'NHAP':
      html = template01VT(phieu, congTy);
      break;
    case 'XUAT':
      html = template02VT(phieu, congTy);
      break;
    case 'CHUYEN':
      html = template03XKNB3(phieu, congTy);
      break;
    default:
      html = template01VT(phieu, congTy);
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }

  let done = false;
  const trigger = () => {
    if (done) return;
    done = true;
    win.focus();
    win.print();
    // Để trình duyệt vẽ xong hộp thoại in trước khi gỡ iframe.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  // Chờ tài nguyên (font) tải xong; fallback nếu onload không bắn.
  win.onload = trigger;
  setTimeout(trigger, 400);
}
