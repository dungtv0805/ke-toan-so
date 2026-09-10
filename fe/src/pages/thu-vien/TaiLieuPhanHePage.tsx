import DocumentLibraryPage from "./DocumentLibraryPage";
import { leafByKey, MENU_MODULES } from "@/config/menuCatalog";

/**
 * Thư viện tài liệu RIÊNG của một phân hệ (Quy trình / Hướng dẫn của Tổng hợp,
 * Kho, Thuế…). Category lưu ở BE = route bỏ '/' đầu (vd `kho/quy-trinh`), nên
 * DocumentLibraryPage xin quyền `/kho/quy-trinh` và BE (DocPermService) kiểm
 * đúng khoá `/kho/quy-trinh:<action>` — không cần bảng ánh xạ nào.
 */
export default function TaiLieuPhanHePage({ duongDan }: { duongDan: string }) {
  const muc = leafByKey(duongDan);
  const phanHe = MENU_MODULES.find((m) => m.id === muc?.module)?.label;
  return (
    <DocumentLibraryPage
      category={duongDan.slice(1)}
      label={[muc?.label, phanHe].filter(Boolean).join(" · ")}
    />
  );
}
