import { nhatKyChungService } from "@/services/nhatKyChungService";
import { bangKeMuaVaoService, bangKeBanRaService } from "@/services/taxService";

/**
 * Gỡ liên kết hóa đơn của MỘT số phiếu — CHỈ khi bút toán cuối cùng của số phiếu
 * đó đã bị xóa. Hóa đơn đã kê khai KHÔNG bao giờ bị xóa theo chứng từ, dòng bảng
 * kê vẫn còn, chỉ mất `soChungTu`.
 *
 * Dùng chung cho xóa một bút toán và xóa hàng loạt — xóa nhóm là thao tác thường
 * hơn, bỏ bước này thì phần lớn chứng từ bị xóa để lại liên kết treo.
 */
export async function goLienKetNeuHetButToan(soPhieu: string): Promise<void> {
  const conLai = await nhatKyChungService.getBySoPhieu(soPhieu);
  if (conLai.length > 0) return;

  const [mua, ban] = await Promise.all([
    bangKeMuaVaoService.layTheoSoChungTu([soPhieu]),
    bangKeBanRaService.layTheoSoChungTu([soPhieu]),
  ]);
  await Promise.all([
    ...(mua[soPhieu] || []).map((i) => bangKeMuaVaoService.goLienKet(i.id)),
    ...(ban[soPhieu] || []).map((i) => bangKeBanRaService.goLienKet(i.id)),
  ]);
}

/**
 * Chạy `goLienKetNeuHetButToan` cho từng số phiếu khác nhau. KHÔNG ném lỗi: xóa
 * đã xong rồi, hỏng bước gỡ không được làm hỏng luồng xóa — trả về danh sách số
 * phiếu gỡ hụt để nơi gọi báo cho người dùng gỡ tay ở Bảng kê.
 */
export async function goLienKetChoCacSoPhieu(soPhieuList: string[]): Promise<string[]> {
  const dsSoPhieu = [...new Set((soPhieuList || []).map((s) => (s || "").trim()).filter(Boolean))];
  if (!dsSoPhieu.length) return [];

  const ketQua = await Promise.allSettled(dsSoPhieu.map((sp) => goLienKetNeuHetButToan(sp)));
  return ketQua
    .map((k, i) => {
      if (k.status !== "rejected") return null;
      console.error("go lien ket hoa don that bai", dsSoPhieu[i], k.reason);
      return dsSoPhieu[i];
    })
    .filter((s): s is string => s !== null);
}

/** Câu báo khi có số phiếu gỡ hụt. Rỗng nghĩa là không cần báo gì. */
export function loiGoLienKetMessage(hong: string[]): string {
  if (!hong.length) return "";
  return `Đã xóa bút toán nhưng chưa gỡ được liên kết hóa đơn của chứng từ ${hong.join(
    ", ",
  )}. Vào Bảng kê gỡ tay.`;
}
