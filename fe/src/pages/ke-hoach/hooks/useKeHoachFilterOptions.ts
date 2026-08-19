import { useMemo } from "react";
import { useKeHoachState } from "../KeHoachHandlerContext";
import {
  KE_HOACH_FILTER_STATE_KEYS,
  type KeHoachFilterStateKey,
} from "../lib/keHoachFilters";
import type { MucDanhMuc } from "../lib/keHoachRow";

export type FilterOption = { value: string; label: string };

const byMa = (items: MucDanhMuc[] = []): FilterOption[] =>
  items
    .filter((x) => !!x?.ma)
    .map((x) => ({ value: x.ma, label: x.ten ? `${x.ma} - ${x.ten}` : x.ma }));

/**
 * Danh sách chọn của từng tiêu chí lọc, dựng từ các danh mục đã nạp — dùng chung cho
 * popover lọc ở header cột, đúng cách "Dữ liệu tổng hợp" đang làm.
 */
export function useKeHoachFilterOptions(): Record<
  KeHoachFilterStateKey,
  FilterOption[]
> {
  const [taiKhoanList] = useKeHoachState("taiKhoanList", []);
  const [doiTuongList] = useKeHoachState("doiTuongList", []);
  const [duAnList] = useKeHoachState("duAnList", []);
  const [boPhanList] = useKeHoachState("boPhanList", []);
  const [sanPhamList] = useKeHoachState("sanPhamList", []);
  const [dongTienList] = useKeHoachState("dongTienList", []);
  const [khoanMucList] = useKeHoachState("khoanMucList", []);
  const [nhomQuanLyList] = useKeHoachState("nhomQuanLyList", []);
  const [chuDauTuList] = useKeHoachState("chuDauTuList", []);
  const [quyChuanList] = useKeHoachState("quyChuanList", []);

  return useMemo(() => {
    // Nhân viên / Đội không có danh mục riêng — lấy từ đối tượng loại NHAN_VIEN và
    // bộ phận có tên chứa "đội", đúng như bên chứng từ.
    const nhanVien = (doiTuongList as MucDanhMuc[]).filter((d) =>
      String(d.loai ?? "").includes("NHAN_VIEN"),
    );
    const doi = (boPhanList as MucDanhMuc[]).filter((b) =>
      (b.ten ?? "").toLowerCase().includes("đội"),
    );
    const nghiepVu = Array.from(
      new Set(
        (quyChuanList as { nghiepVu: string }[]).map((q) => q.nghiepVu).filter(Boolean),
      ),
    ).map((nv) => ({ value: nv, label: nv }));

    const taiKhoan = byMa(taiKhoanList as MucDanhMuc[]);
    return {
      filterNghiepVu: nghiepVu,
      filterTaiKhoanNo: taiKhoan,
      filterTaiKhoanCo: taiKhoan,
      filterDoiTuong: byMa(doiTuongList as MucDanhMuc[]),
      filterChuDauTu: byMa(chuDauTuList as MucDanhMuc[]),
      filterDuAn: byMa(duAnList as MucDanhMuc[]),
      filterSanPham: byMa(sanPhamList as MucDanhMuc[]),
      filterBoPhan: byMa(boPhanList as MucDanhMuc[]),
      filterDoi: byMa(doi),
      filterNhanVien: byMa(nhanVien),
      filterDongTien: byMa(dongTienList as MucDanhMuc[]),
      filterKhoanMuc: byMa(khoanMucList as MucDanhMuc[]),
      filterNhomQuanLy: byMa(nhomQuanLyList as MucDanhMuc[]),
    };
  }, [
    taiKhoanList,
    doiTuongList,
    duAnList,
    boPhanList,
    sanPhamList,
    dongTienList,
    khoanMucList,
    nhomQuanLyList,
    chuDauTuList,
    quyChuanList,
  ]);
}

/** Giá trị đang lọc của từng tiêu chí — để hiện badge và đổi icon header cột. */
export function useKeHoachFilterValues(): Record<
  KeHoachFilterStateKey,
  string | undefined
> {
  const values = {} as Record<KeHoachFilterStateKey, string | undefined>;
  for (const key of KE_HOACH_FILTER_STATE_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- mảng key là hằng số, thứ tự hook không đổi
    const [value] = useKeHoachState(key, undefined);
    values[key] = value as string | undefined;
  }

  // Ngăn cách bằng ký tự điều khiển để "ab" + "" không trùng chữ ký với "a" + "b".
  const signature = KE_HOACH_FILTER_STATE_KEYS.map((k) => values[k] ?? "").join("\u0001");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` đại diện cho toàn bộ nội dung `values`
  return useMemo(() => values, [signature]);
}
