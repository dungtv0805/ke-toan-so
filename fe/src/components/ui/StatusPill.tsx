import React from 'react';

export type PillTone = 'ok' | 'cho' | 'tu-choi' | 'nhap' | 'dang' | 'trung-tinh';

const TONE: Record<PillTone, string> = {
  ok: 'bg-[hsl(var(--green)/0.12)] text-[hsl(var(--green))]',
  cho: 'bg-[hsl(var(--amber)/0.12)] text-[hsl(var(--amber))]',
  'tu-choi': 'bg-[hsl(var(--red)/0.12)] text-[hsl(var(--red))]',
  nhap: 'bg-[hsl(var(--muted))] text-[hsl(var(--ink-2))]',
  dang: 'bg-[hsl(var(--blue-soft))] text-[hsl(var(--blue))]',
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
