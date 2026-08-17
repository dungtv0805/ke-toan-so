import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Chỗ trống trên hàng lọc để bảng bút toán đẩy nhóm nút lệnh (Import / Xuất / In /
 * Làm mới / Chọn cột…) lên đứng cùng nút "Thêm mới".
 *
 * Phải đi đường vòng qua portal vì `FilterBar` là anh em của `DataTabs` ở
 * `NhatKyChungPage`, trong khi nút "Chọn cột" chỉ dựng được bên trong `EntryListTab`
 * (nó sinh ra từ danh sách cột của đúng bảng đó). Nhờ vậy hàng ngay dưới hàng lọc
 * chỉ còn đúng 8 thẻ số liệu.
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
