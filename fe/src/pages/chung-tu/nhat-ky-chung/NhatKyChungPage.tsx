import { useEffect } from "react";
import { NhatKyChungHandlerProvider, useNhatKyChungHandler } from "./NhatKyChungHandlerContext";
import { DataTabs } from "./components/data-tabs/DataTabs";
import { FilterBar } from "./components/filter-bar/FilterBar";
import { EntryFormModal } from "./components/entry-form-modal/EntryFormModal";
import { EntryViewModal } from "./components/entry-view-modal/EntryViewModal";
import { ToolbarSlotProvider } from "./components/toolbar-slot/ToolbarSlot";

function NhatKyChungPageInner() {
  const handler = useNhatKyChungHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="nkc-page">
      {/* Thanh ngang Phiếu thu / Phiếu chi / Phiếu kế toán đã gỡ khỏi trang này để
          nhường chỗ cho bảng. Các trang phiếu vẫn giữ thanh này (PhieuListPage). */}
      {/* Hàng lọc gom luôn các nút lệnh của bảng (đẩy lên qua ToolbarSlot), nên hàng
          ngay dưới nó chỉ còn 8 thẻ số liệu. */}
      <ToolbarSlotProvider>
        <FilterBar />
        <DataTabs />
      </ToolbarSlotProvider>
      <EntryFormModal />
      <EntryViewModal />
    </div>
  );
}

const NhatKyChungPage: React.FC = () => {
  return (
    <NhatKyChungHandlerProvider>
      <NhatKyChungPageInner />
    </NhatKyChungHandlerProvider>
  );
};

export default NhatKyChungPage;
