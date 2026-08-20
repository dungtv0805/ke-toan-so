import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented } from "antd";
import { ApartmentOutlined, UnorderedListOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gomTheoNhom, type HangCay, type MucNhom } from "./gomNhom";
import { dungCotCay } from "./cotCay";
import { docCheDoXem, luuCheDoXem, type CheDoXem } from "./cheDoXem";

interface TuyChon<T> {
  /** Khoá localStorage nhớ chế độ của riêng trang này, vd "sanPham.cheDoXem". */
  khoaLuu: string;
  danhSach: readonly T[];
  danhMuc: readonly MucNhom[];
  layMa: (item: T) => string | undefined | null;
  cot: ColumnsType<T>;
  /** Đơn vị đếm trên dòng nhóm, vd "sản phẩm". */
  donVi: string;
  cotChoXuongDong?: readonly string[];
  nhanTrong?: string;
  /** Chạy khi đổi chế độ — thường để bỏ chọn dòng / bỏ bộ lọc. */
  onDoiCheDo?: (v: CheDoXem) => void;
}

/**
 * Gom sẵn mọi thứ một bảng cây 2 cấp cần: dữ liệu đã gom, cột đã dựng, trạng
 * thái mở/đóng nhóm và nút chuyển Cây / Danh sách (nhớ theo trang).
 *
 * Trang chỉ việc: đổ `cotCay` + `duLieuCay` + `expandable` vào Table khi `laCay`,
 * còn không thì vẽ bảng phẳng như cũ.
 */
export function useBangCay<T>({
  khoaLuu,
  danhSach,
  danhMuc,
  layMa,
  cot,
  donVi,
  cotChoXuongDong,
  nhanTrong,
  onDoiCheDo,
}: TuyChon<T>) {
  const [cheDo, setCheDo] = useState<CheDoXem>(() => docCheDoXem(khoaLuu));

  const doiCheDo = useCallback(
    (v: CheDoXem) => {
      setCheDo(v);
      luuCheDoXem(khoaLuu, v);
      onDoiCheDo?.(v);
    },
    [khoaLuu, onDoiCheDo]
  );

  const duLieuCay = useMemo<HangCay<T>[]>(
    () => gomTheoNhom(danhSach, { layMa, danhMuc, nhanTrong }),
    [danhSach, danhMuc, layMa, nhanTrong]
  );

  const cotCay = useMemo(
    () => dungCotCay(cot, { donVi, cotChoXuongDong }),
    [cot, donVi, cotChoXuongDong]
  );

  const nhomKeys = useMemo(() => duLieuCay.map((r) => (r as { id: string }).id), [duLieuCay]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  // Mở sẵn mọi nhóm sau mỗi lần dữ liệu đổi — mặc định đóng thì người dùng mở
  // bảng ra chỉ thấy vài dòng tiêu đề, tưởng mất dữ liệu.
  useEffect(() => {
    setExpandedKeys(nhomKeys);
  }, [nhomKeys]);

  const chuyenCheDo = (
    <Segmented
      size="small"
      value={cheDo}
      onChange={(v) => doiCheDo(v as CheDoXem)}
      options={[
        { value: "cay", label: "Cây", icon: <ApartmentOutlined /> },
        { value: "danhSach", label: "Danh sách", icon: <UnorderedListOutlined /> },
      ]}
    />
  );

  return {
    cheDo,
    laCay: cheDo === "cay",
    doiCheDo,
    /** Nút chuyển Cây / Danh sách — trang tự đặt vào chỗ hợp lý. */
    chuyenCheDo,
    duLieuCay,
    cotCay,
    expandable: {
      expandedRowKeys: expandedKeys,
      onExpandedRowsChange: (k: readonly React.Key[]) => setExpandedKeys([...k]),
    },
  };
}
