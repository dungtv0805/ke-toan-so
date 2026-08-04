import { useCallback } from "react";
import { ChungTu } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePhieuConfig, usePhieuState } from "../PhieuHandlerContext";
import { printPhieu } from "./printPhieu";
import { getDefaultTemplate } from "./printTemplates";
import { toPhieuLines, type PhieuLine } from "./phieuLines";

/**
 * Hook trả về hàm in/xuất PDF cho 1 phiếu. Ưu tiên mẫu in đã upload
 * (state `printTemplate`, do Part D nạp), không có thì dùng mẫu mặc định
 * theo loại phiếu. Tên công ty lấy từ tenant hiện tại.
 *
 * Một chứng từ có thể gồm nhiều dòng hạch toán cùng số phiếu, nên phải nạp đủ
 * các dòng trước khi in — bảng danh sách chỉ giữ dòng đang chọn.
 */
export function usePrintPhieu() {
  const config = usePhieuConfig();
  const { currentTenant } = useAuth();
  const [printTemplate] = usePhieuState("printTemplate", null);

  return useCallback(
    async (phieu: ChungTu) => {
      const template = printTemplate || getDefaultTemplate(config.loai);

      let dong: PhieuLine[] | undefined;
      try {
        const records = await config.service.getBySoPhieu(phieu.soPhieu);
        if (records.length > 0) dong = toPhieuLines(records);
      } catch (e) {
        // Nạp hỏng thì vẫn in dòng đang chọn — thiếu chi tiết hơn là không in được.
        console.error("Error loading voucher lines for print:", e);
      }

      printPhieu(
        phieu,
        template,
        {
          tenCongTy: currentTenant?.tenantName ?? "",
          diaChiCongTy: "",
        },
        dong
      );
    },
    [config.loai, config.service, printTemplate, currentTenant]
  );
}
