import React, { useEffect, useRef, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import type { MenuLeaf } from '@/config/menuCatalog';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

export interface KetQuaTim {
  leaf: MenuLeaf;
  moduleLabel: string;
}

// Bỏ dấu tiếng Việt. Dùng escape [\u0300-\u036f] thay ký tự tổ hợp thật để tránh công cụ chuẩn hoá xoá mất chúng im lặng.
const boDau = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Tìm xuyên mọi mục đang hiện. Tối đa 8 kết quả cho vừa panel. */
export function timMuc(modules: VisibleModule[], tuKhoa: string): KetQuaTim[] {
  const q = boDau(tuKhoa.trim());
  if (!q) return [];
  const ra: KetQuaTim[] = [];
  for (const { module, leaves } of modules) {
    for (const leaf of leaves) {
      if (boDau(leaf.label).includes(q) || boDau(module.label).includes(q)) {
        ra.push({ leaf, moduleLabel: module.label });
        if (ra.length === 8) return ra;
      }
    }
  }
  return ra;
}

interface Props {
  modules: VisibleModule[];
  onSelect: (key: string) => void;
}

export const SidebarSearch: React.FC<Props> = ({ modules, onSelect }) => {
  const [tuKhoa, datTuKhoa] = useState('');
  const oRef = useRef<HTMLInputElement>(null);
  const ketQua = timMuc(modules, tuKhoa);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        oRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative">
      <div className="flex h-[24px] items-center gap-[6px] rounded-[7px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-[7px]">
        <SearchOutlined className="text-[11px] text-[hsl(var(--muted-foreground))]" />
        <input
          ref={oRef}
          value={tuKhoa}
          onChange={(e) => datTuKhoa(e.target.value)}
          placeholder="Tìm nhanh"
          aria-label="Tìm nhanh trong menu"
          className="w-full bg-transparent text-[11px] outline-none placeholder:text-[hsl(var(--muted-foreground))]"
        />
        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">⌘K</span>
      </div>

      {ketQua.length > 0 && (
        <div className="absolute left-0 right-0 top-[28px] z-50 rounded-[9px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-[4px] shadow-lg">
          {ketQua.map(({ leaf, moduleLabel }) => (
            <button
              key={leaf.key}
              type="button"
              onClick={() => {
                onSelect(leaf.key);
                datTuKhoa('');
              }}
              className="flex w-full flex-col items-start rounded-[6px] px-[7px] py-[3px] text-left hover:bg-[hsl(var(--muted))]"
            >
              <span className="text-[11.5px] leading-tight">{leaf.label}</span>
              <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{moduleLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarSearch;
