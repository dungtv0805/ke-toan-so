import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Bản dùng cho màn hình Kế hoạch / Dự báo — giống hệt ToolbarSlot của "Dữ liệu tổng
 * hợp": chỗ trống trên hàng lọc để bảng đẩy nhóm nút lệnh (Import / Xuất / Làm mới /
 * Chọn cột…) lên đứng cùng nút "Thêm mới". Phải đi qua portal vì hàng lọc và bảng là
 * hai nhánh anh em, còn nút "Chọn cột" chỉ dựng được bên trong bảng.
 */
interface ToolbarSlotValue {
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
}

const ToolbarSlotContext = createContext<ToolbarSlotValue>({
  slot: null,
  setSlot: () => {},
});

export function ToolbarSlotProvider({ children }: { children: ReactNode }) {
  // State (không phải ref) để khi FilterBar gắn xong DOM thì EntryListTab render lại
  // và portal có chỗ để bắn nút vào.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ slot, setSlot }), [slot]);

  return (
    <ToolbarSlotContext.Provider value={value}>
      {children}
    </ToolbarSlotContext.Provider>
  );
}

/** Ref callback cho thẻ div nhận nút — dùng ở `FilterBar`. */
export function useToolbarSlotRef() {
  return useContext(ToolbarSlotContext).setSlot;
}

/** Bọc nhóm nút của bảng để chúng hiện trên hàng lọc. */
export function ToolbarSlot({ children }: { children: ReactNode }) {
  const { slot } = useContext(ToolbarSlotContext);
  return slot ? createPortal(children, slot) : null;
}
