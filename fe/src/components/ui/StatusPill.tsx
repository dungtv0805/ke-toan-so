import React from 'react';

export type PillTone = 'ok' | 'cho' | 'tu-choi' | 'nhap' | 'dang' | 'trung-tinh';

/**
 * NỀN dùng màu gốc pha loãng, CHỮ dùng bản "mực" (--*-ink) tối hơn.
 *
 * Chữ pill chỉ 10.5px — theo WCAG đây là chữ thường, ngưỡng tương phản 4.5:1
 * chứ không phải 3:1 của chữ lớn. Dùng chính màu gốc làm màu chữ thì bốn tông
 * ok / cho / tu-choi / dang chỉ đạt 3.4–4.0:1. Hạ alpha KHÔNG cứu được (alpha
 * chỉ làm chữ nhạt thêm), nên phải dùng biến thể tối hơn khai ở `index.css`
 * (--green-ink / --amber-ink / --red-ink / --blue-ink, có cả bản `.dark`).
 * Sau khi đổi: ok 4.91 · cho 4.93 · tu-choi 4.87 · dang 4.91 (nền card trắng);
 * trên nền trang #F5F5F7 vẫn ≥ 4.50. Tông xám nhap/trung-tinh vốn đã 4.63.
 */
const TONE: Record<PillTone, string> = {
  ok: 'bg-[hsl(var(--green)/0.12)] text-[hsl(var(--green-ink))]',
  cho: 'bg-[hsl(var(--amber)/0.12)] text-[hsl(var(--amber-ink))]',
  'tu-choi': 'bg-[hsl(var(--red)/0.12)] text-[hsl(var(--red-ink))]',
  nhap: 'bg-[hsl(var(--muted))] text-[hsl(var(--ink-2))]',
  dang: 'bg-[hsl(var(--blue-soft))] text-[hsl(var(--blue-ink))]',
  'trung-tinh': 'bg-[hsl(var(--muted))] text-[hsl(var(--ink-2))]',
};

/** Nhãn trạng thái dạng viên thuốc — một kiểu duy nhất cho cả dự án. */
export const StatusPill: React.FC<{
  tone: PillTone;
  children: React.ReactNode;
}> = ({ tone, children }) => (
  <span
    className={`inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-medium leading-none ${
      TONE[tone] ?? TONE['trung-tinh']
    }`}
  >
    {children}
  </span>
);

export default StatusPill;
