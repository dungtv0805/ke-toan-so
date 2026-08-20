import { useMemo } from "react";
import { useNhatKyChungState } from "../NhatKyChungHandlerContext";
import { sapXepTheoNhan } from "@/lib/sapXep";
import {
  KIEM_SOAT_OPTIONS,
  NKC_FILTER_STATE_KEYS,
  type NkcFilterStateKey,
} from "../handler/lib/nkcFilters";

export type FilterOption = { value: string; label: string };

const byMa = (items: { ma?: string; ten?: string }[] = []): FilterOption[] =>
  // Sắp theo nhãn hiển thị — danh mục ra A-Z, tài khoản ra đúng thứ tự mã.
  sapXepTheoNhan(
    items
      .filter((x): x is { ma: string; ten?: string } => !!x?.ma)
      .map((x) => ({ value: x.ma, label: x.ten ? `${x.ma} - ${x.ten}` : x.ma })),
  );

/**
 * Danh sách chọn của từng tiêu chí lọc, dựng từ các danh mục đã nạp.
 * Dùng chung cho hàng lọc trên cùng (`FilterBar`) và popover lọc ở header cột
 * (`useNkcColumnFilters`) để hai chỗ không lệch nhau.
 */
export function useNkcFilterOptions(): Record<NkcFilterStateKey, FilterOption[]> {
  const [taiKhoanList] = useNhatKyChungState("taiKhoanList", []);
  const [khoanMucList] = useNhatKyChungState("khoanMucList", []);
  const [doiTuongList] = useNhatKyChungState("doiTuongList", []);
  const [duAnList] = useNhatKyChungState("duAnList", []);
  const [boPhanList] = useNhatKyChungState("boPhanList", []);
  const [sanPhamList] = useNhatKyChungState("sanPhamList", []);
  const [hopDongList] = useNhatKyChungState("hopDongList", []);
  const [nhomKhuyenMaiList] = useNhatKyChungState("nhomKhuyenMaiList", []);
  const [loaiGiaoDichList] = useNhatKyChungState("loaiGiaoDichList", []);
  const [quyChaunList] = useNhatKyChungState("quyChaunList", []);
  const [nguoiGiaoDichList] = useNhatKyChungState("nguoiGiaoDichList", []);

  return useMemo(() => {
    // Nhân viên / Đội không có danh mục riêng — lấy từ đối tượng loại NHAN_VIEN và
    // bộ phận có tên chứa "đội" (giống cách form bút toán dựng options).
    const nhanVien = (doiTuongList ?? []).filter((d) =>
      (d.loai ?? []).includes("NHAN_VIEN"),
    );
    const doi = (boPhanList ?? []).filter((bp) =>
      (bp.ten ?? "").toLowerCase().includes("đội"),
    );
    const nghiepVu = Array.from(
      new Set((quyChaunList ?? []).map((qc) => qc.nghiepVu).filter(Boolean)),
    ).map((nv) => ({ value: nv, label: nv }));
    const nghiepVuSapXep = sapXepTheoNhan(nghiepVu);

    return {
      filterKiemSoat: KIEM_SOAT_OPTIONS,
      filterLoaiChungTu: byMa(loaiGiaoDichList),
      filterNghiepVu: nghiepVuSapXep,
      filterTaiKhoan: byMa(taiKhoanList),
      filterDoiTuong: byMa(doiTuongList),
      filterKhoanMuc: byMa(khoanMucList),
      filterNhanVien: byMa(nhanVien),
      filterDuAn: byMa(duAnList),
      filterSanPham: byMa(sanPhamList),
      filterHopDong: sapXepTheoNhan(
        (hopDongList ?? [])
          .filter((hd) => !!hd.soHopDong)
          .map((hd) => ({
            value: hd.soHopDong,
            label: hd.tenCongTrinh
              ? `${hd.soHopDong} - ${hd.tenCongTrinh}`
              : hd.soHopDong,
          })),
      ),
      filterNguoiGiaoDich: sapXepTheoNhan(
        (nguoiGiaoDichList ?? []).map((v) => ({ value: v, label: v })),
      ),
      filterDoi: byMa(doi),
      filterBoPhan: byMa(boPhanList),
      filterNhomKhuyenMai: byMa(nhomKhuyenMaiList),
      filterAccount: byMa(taiKhoanList),
      filterTaiKhoanCo: byMa(taiKhoanList),
    };
  }, [
    boPhanList,
    doiTuongList,
    duAnList,
    hopDongList,
    khoanMucList,
    loaiGiaoDichList,
    nguoiGiaoDichList,
    nhomKhuyenMaiList,
    quyChaunList,
    sanPhamList,
    taiKhoanList,
  ]);
}

/**
 * Giá trị đang chọn của TẤT CẢ tiêu chí lọc (đọc phản ứng theo state handler).
 * Lặp trên hằng số `NKC_FILTER_STATE_KEYS` nên số lượng hook luôn cố định.
 *
 * Kết quả được giữ nguyên tham chiếu khi giá trị không đổi — bảng bút toán memo hoá
 * ~40 cột theo hàm lọc, trả object mới mỗi lần render là dựng lại cột liên tục.
 */
export function useNkcFilterValues(): Record<NkcFilterStateKey, string | undefined> {
  const values = {} as Record<NkcFilterStateKey, string | undefined>;
  for (const key of NKC_FILTER_STATE_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- mảng key là hằng số, thứ tự hook không đổi
    const [value] = useNhatKyChungState(key, undefined);
    values[key] = value as string | undefined;
  }

  // Ngăn cách bằng ký tự điều khiển để "ab" + "" không trùng chữ ký với "a" + "b".
  const signature = NKC_FILTER_STATE_KEYS.map((k) => values[k] ?? "").join("\u0001");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` đại diện cho toàn bộ nội dung `values`
  return useMemo(() => values, [signature]);
}
