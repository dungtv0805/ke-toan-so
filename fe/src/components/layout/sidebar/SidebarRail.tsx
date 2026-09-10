import React from 'react';
import type { ModuleId } from '@/config/menuCatalog';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

interface Props {
  modules: VisibleModule[];
  activeModule?: ModuleId;
  onPick: (id: ModuleId) => void;
  onHover?: (id: ModuleId | undefined) => void;
  /** Ô cố định ở ĐÁY rail. */
  footer?: React.ReactNode;
}

/** Cột 62px bên trái. 15 ô cao 40px ≈ 650px — màn laptop thấp thì cuộn dọc
 *  (ẩn thanh cuộn) chứ không cắt mất phân hệ cuối (Thư viện, Danh mục). */
export const SidebarRail: React.FC<Props> = ({
  modules, activeModule, onPick, onHover, footer,
}) => (
  <nav
    aria-label="Phân hệ"
    className="flex w-[62px] shrink-0 flex-col gap-[2px] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] px-[6px] py-[8px]"
  >
    {modules.map(({ module, leaves }) => {
      const dangMo = module.id === activeModule;
      return (
        <button
          key={module.id}
          type="button"
          title={`${module.label} — ${leaves.length} mục`}
          aria-label={module.label}
          aria-current={dangMo ? 'true' : undefined}
          onClick={() => onPick(module.id)}
          onMouseEnter={() => onHover?.(module.id)}
          onMouseLeave={() => onHover?.(undefined)}
          className={[
            'flex h-[40px] w-[50px] flex-col items-center justify-center gap-[2px] rounded-[8px] transition-colors',
            dangMo
              ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]'
              : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]',
          ].join(' ')}
        >
          <span className="text-[17px] leading-none">{module.icon}</span>
          <span className="w-full truncate px-[2px] text-center text-[8.5px] leading-none">
            {module.railLabel}
          </span>
        </button>
      );
    })}
    {footer && <div className="mt-auto pt-[4px]">{footer}</div>}
  </nav>
);

export default SidebarRail;
