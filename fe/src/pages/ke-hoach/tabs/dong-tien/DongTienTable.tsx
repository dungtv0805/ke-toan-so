import React, { useCallback, useMemo } from "react";
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTableBodyHeight } from "@/hooks/useTableBodyHeight";
import { useCotCoGian } from "@/hooks/useCotCoGian";
import {
  mucOptionsTheoNhom,
  nhomCuaMuc,
} from "../lib/nhomTuDanhMuc";
import { dungCayBang, type HangBang, type MoTaHang } from "../lib/tongHop";
import {
  chieuCuaNhom,
  nhomDaKhaiChieu,
  quyTuSoDuCuoi,
  quyTuSoDuDau,
  tinhTongHopDongTien,
} from "../lib/dongTienTongHop";
import { demThayDoi, gopNhap, type DongHienThi } from "../lib/nhapBang";
import {
  CAP_CHINH,
  capCot,
  cotCaNam,
  ghimTrai,
  cotQuyVaThang,
  laHangGop,
  numberInputPropsCoAm,
  onCellNhan,
  onCellNhanPhu,
  rowClassName,
  tien,
} from "../lib/cotChung";

import { useDongTienHandler, useDongTienState } from "./DongTienHandlerContext";
import {
  valTuDong,
  type DongTienVal,
} from "./handler/sub-handler/init/init.state";

/** Nhóm ảo gom các dòng mới chưa chọn nhóm. */
const CHUA_CHON = "";

/** Năm dòng tổng hợp không nhập tay, xen giữa các nhóm chi tiết. */
type LoaiTongHop = "tonDau" | "thu" | "chi" | "tonCuoi" | "thangDu";

type Dong = DongHienThi<DongTienVal>;
type Hang = HangBang<Dong> & { chuaLuu?: boolean; tongHop?: LoaiTongHop };

const cong = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const quyTuThang = (t: number[]) =>
  [0, 1, 2, 3].map((q) => t[q * 3] + t[q * 3 + 1] + t[q * 3 + 2]);

/** Hàng tổng hợp: không có mục tiêu nên chênh lệch luôn 0, không cảnh báo. */
const hangTongHop = (
  tongHop: LoaiTongHop,
  nhan: string,
  thang: number[],
  quy: number[],
  nam: number,
): Hang => ({
  key: `__th_${tongHop}`,
  loai: "nhom",
  tongHop,
  nhan,
  thang,
  quy,
  namTheoThang: nam,
  namKhaiBao: nam,
  chenhLech: 0,
  phanTram: 0,
  lech: false,
});

/** Bề rộng cột người dùng tự kéo — lưu theo KEY cột, xem `useCotCoGian`. */
const KHOA_RONG_COT = "kh-rong-cot-dong-tien";

export const DongTienTable: React.FC = () => {
  const handler = useDongTienHandler();
  const [data] = useDongTienState("data", []);
  const [loading] = useDongTienState("loading", false);
  const [nhomDongTienList] = useDongTienState("nhomDongTienList", []);
  const [dongTienList] = useDongTienState("dongTienList", []);
  const [nhap] = useDongTienState("nhap", {});
  const [dongMoi] = useDongTienState("dongMoi", []);
  const [saving] = useDongTienState("saving", false);
  const [tonDauNam] = useDongTienState("tonDauNam", 0);
  const [tonDauNhap] = useDongTienState("tonDauNhap", null);
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();

  const tonDauHienThi = tonDauNhap ?? tonDauNam;

  const daLuu = useMemo(
    () => data.map((d) => ({ id: d.id, val: valTuDong(d) })),
    [data],
  );

  const soThayDoi = useMemo(
    () => demThayDoi(daLuu, nhap, dongMoi) + (tonDauNhap === null ? 0 : 1),
    [daLuu, nhap, dongMoi, tonDauNhap],
  );

  const tenNhom = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nhomDongTienList) m.set(n.ma, `${n.ma} - ${n.ten}`);
    return m;
  }, [nhomDongTienList]);

  const tenDongTien = useMemo(() => {
    const m = new Map<string, { ma: string; ten: string }>();
    for (const d of dongTienList) m.set(d.id, { ma: d.ma, ten: d.ten });
    return m;
  }, [dongTienList]);

  const hienThi = useMemo(
    () => gopNhap(daLuu, nhap, dongMoi),
    [daLuu, nhap, dongMoi],
  );

  const doc = useMemo(
    () =>
      (d: Dong): MoTaHang => ({
        key: d.id,
        nhomKey: d.val.nhomMa || CHUA_CHON,
        nhomNhan:
          tenNhom.get(d.val.nhomMa) ?? (d.val.nhomMa || "(Chưa chọn nhóm)"),
        nhan: tenDongTien.get(d.val.dongTienId)?.ten ?? "",
        ghiChu: d.val.ghiChu,
        thang: d.val.thang,
        // Bảng Dòng tiền KHÔNG có mục tiêu năm (cột "Giá trị/Mục tiêu" đã bỏ
        // 02/09/2026 theo yêu cầu nghiệp vụ). Lấy chính tổng 12 tháng làm mục
        // tiêu để chênh lệch luôn bằng 0 — nếu để 0 thì mọi dòng hoá ra "lệch"
        // và banner đỏ nổi vĩnh viễn dù người dùng không làm gì sai.
        namKhaiBao: (d.val.thang ?? []).reduce((t, x) => t + (Number(x) || 0), 0),
      }),
    [tenNhom, tenDongTien],
  );

  /**
   * Chiều Thu/Chi của từng dòng — suy từ NHÓM dòng tiền, không còn cột nhập.
   * Xem `chieuCuaNhom`: nhóm chưa khai chiều thì giữ chiều đã lưu trên dòng cũ.
   */
  const chieuCua = useCallback(
    (d: Dong) => chieuCuaNhom(nhomDongTienList, d.val.nhomMa, d.val.chieu),
    [nhomDongTienList],
  );

  const tongHop = useMemo(
    () =>
      tinhTongHopDongTien(
        hienThi.map((d) => ({ chieu: chieuCua(d), thang: d.val.thang })),
        tonDauHienThi,
      ),
    [hienThi, tonDauHienThi, chieuCua],
  );

  /**
   * Thứ tự đúng tài liệu mục 8.3: Tồn đầu → Thu trong kỳ (kèm các nhóm thu) →
   * Chi trong kỳ (kèm các nhóm chi) → Tồn cuối → Thặng dư.
   */
  const rows = useMemo<Hang[]>(() => {
    const chiTiet = (chieu: "THU" | "CHI") => {
      const cua = hienThi.filter((d) => chieuCua(d) === chieu);
      if (cua.length === 0) return [];
      // Bỏ hàng TỔNG CỘNG của cây con — dòng tổng hợp phía trên đã là tổng rồi.
      return (dungCayBang(cua, doc) as Hang[])
        .filter((r) => r.loai !== "tong")
        .map((r) => ({
          ...r,
          chuaLuu: r.dong ? r.dong.tam || r.dong.doi : false,
        }));
    };

    return [
      hangTongHop(
        "tonDau",
        "TỒN ĐẦU KỲ",
        tongHop.tonDau,
        quyTuSoDuDau(tongHop.tonDau),
        tongHop.tonDau[0],
      ),
      hangTongHop(
        "thu",
        "THU TRONG KỲ",
        tongHop.thu,
        quyTuThang(tongHop.thu),
        cong(tongHop.thu),
      ),
      ...chiTiet("THU"),
      hangTongHop(
        "chi",
        "CHI TRONG KỲ",
        tongHop.chi,
        quyTuThang(tongHop.chi),
        cong(tongHop.chi),
      ),
      ...chiTiet("CHI"),
      hangTongHop(
        "tonCuoi",
        "TỒN CUỐI KỲ",
        tongHop.tonCuoi,
        quyTuSoDuCuoi(tongHop.tonCuoi),
        tongHop.tonCuoi[11],
      ),
      hangTongHop(
        "thangDu",
        "THẶNG DƯ/THÂM HỤT TRONG KỲ",
        tongHop.thangDu,
        quyTuThang(tongHop.thangDu),
        cong(tongHop.thangDu),
      ),
    ];
  }, [hienThi, doc, tongHop, chieuCua]);

  /**
   * Một ô chọn duy nhất cho cả nhóm lẫn dòng tiền (nghiệp vụ 03/09/2026).
   *
   * Trước đây phải chọn nhóm rồi mới chọn dòng tiền — thừa hẳn một bước, vì
   * danh mục Dòng tiền đã gắn sẵn nhóm cho từng dòng và nhóm đã khai Thu/Chi.
   * Nay đổ hết dòng tiền vào một ô, gom theo optgroup nhóm: vẫn nhìn ra cây
   * nhóm, gõ tìm được, mà chỉ chọn một lần.
   */
  const dongTienOptions = useMemo(
    () => mucOptionsTheoNhom(nhomDongTienList, dongTienList),
    [nhomDongTienList, dongTienList],
  );

  const suaDuoc = (row: Hang) => !laHangGop(row.loai);

  /**
   * Cột CẢ NĂM của bảng Dòng tiền, kiêm luôn ô nhập TỒN ĐẦU KỲ.
   *
   * Tồn đầu năm là con số CẢ NĂM của dòng TỒN ĐẦU KỲ, nên đặt ở đây đúng nghĩa
   * hơn chỗ cũ (nó từng nằm nhờ trong cột "Giá trị/Mục tiêu" đã gỡ). Đây vẫn là
   * ô duy nhất gõ được trong khối dòng tổng hợp.
   */
  const cotTonDauVaCaNam: ColumnsType<Hang> = cotCaNam<Hang>().map((c) => ({
    ...c,
    render: (giaTri: unknown, row: Hang, chiSo: number) => {
      if (row.tongHop === "tonDau") {
        return (
          <InputNumber
            {...numberInputPropsCoAm}
            value={tonDauHienThi}
            onChange={(v) =>
              handler.executeEvent("suaTonDau", { giaTri: Number(v) || 0 })
            }
          />
        );
      }
      return (c.render as NonNullable<typeof c.render>)(giaTri, row, chiSo);
    },
  }));

  // Vùng GHIM = các cột nhãn + CẢ NĂM; từ nhóm Quý trở đi thì cuộn ngang.
  const cotGoc: ColumnsType<Hang> = [
    ...ghimTrai<Hang>([
      {
        title: "Mã",
        key: "ma",
        width: 140,
        onCell: onCellNhan,
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => {
          if (row.tongHop) {
            return <span className="font-semibold">{row.nhan}</span>;
          }
          if (row.loai === "nhom") {
            return (
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{row.nhan}</span>
                {row.nhomKey !== CHUA_CHON &&
                  !nhomDaKhaiChieu(nhomDongTienList, row.nhomKey) && (
                    <Tooltip title="Nhóm này chưa khai Thu/Chi ở Danh mục ▸ Nhóm dòng tiền — bảng đang tạm xếp theo chiều cũ của từng dòng.">
                      <ExclamationCircleOutlined className="text-amber-500" />
                    </Tooltip>
                  )}
                {row.nhomKey !== CHUA_CHON && (
                  <Tooltip title="Thêm dòng tiền vào nhóm này">
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() =>
                        handler.executeEvent("themDong", {
                          nhomMa: row.nhomKey,
                        })
                      }
                    />
                  </Tooltip>
                )}
              </div>
            );
          }
          // Không còn ô "Chọn nhóm" ở đây: mã hiện ra theo dòng tiền đã chọn ở
          // cột bên cạnh, dòng mới chưa chọn thì để trống.
          return (
            <span>{tenDongTien.get(row.dong!.val.dongTienId)?.ma ?? "—"}</span>
          );
        },
      },
      {
        title: "Tên dòng tiền",
        key: "ten",
        width: 180,
        onCell: onCellNhanPhu,
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => {
          if (laHangGop(row.loai)) return null;
          if (!row.dong?.tam) {
            return <span className="excel-cell-text">{row.nhan || "-"}</span>;
          }
          return (
            <Select
              size="small"
              className="w-full"
              placeholder="Chọn dòng tiền"
              showSearch
              optionFilterProp="label"
              options={dongTienOptions}
              value={row.dong.val.dongTienId || undefined}
              onChange={(v) =>
                handler.executeEvent("suaO", {
                  id: row.dong!.id,
                  // Nhóm điền theo dòng tiền vừa chọn — dòng tự nhảy đúng nhóm
                  // và `chieuCuaNhom` suy tiếp ra Thu/Chi, không hỏi lại gì nữa.
                  patch: { dongTienId: v, nhomMa: nhomCuaMuc(dongTienList, v) },
                })
              }
            />
          );
        },
      },
      {
        title: "Diễn giải",
        key: "ghiChu",
        width: 180,
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => {
          if (laHangGop(row.loai)) return null;
          return (
            <Input
              size="small"
              variant="borderless"
              className="excel-cell-input"
              placeholder="Cơ sở hình thành dòng kế hoạch"
              value={row.dong!.val.ghiChu}
              onChange={(e) =>
                handler.executeEvent("suaO", {
                  id: row.dong!.id,
                  patch: { ghiChu: e.target.value },
                })
              }
            />
          );
        },
      },
      // ĐÃ GỠ hai cột "Thu/Chi" và "Giá trị/Mục tiêu" (nghiệp vụ 02/09/2026):
      // - Thu/Chi: chiều nay khai ở danh mục Nhóm dòng tiền, xem `chieuCuaNhom`.
      // - Giá trị/Mục tiêu: bảng Dòng tiền không lập mục tiêu năm, người dùng
      //   phân bổ thẳng theo tháng. Ô nhập TỒN ĐẦU KỲ từng nằm nhờ trong cột này
      //   nên chuyển sang cột CẢ NĂM ngay dưới đây.
      ...cotTonDauVaCaNam,
    ]),
    ...cotQuyVaThang<Hang>({
      suaDuoc,
      doiThang: (row, chiSo, giaTri) =>
        handler.executeEvent("suaThang", { id: row.dong!.id, chiSo, giaTri }),
    }),
    {
      title: "",
      key: "thaoTac",
      width: 50,
      align: "center",
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        if (row.dong!.tam) {
          return (
            <Tooltip title="Bỏ dòng này">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  handler.executeEvent("boDong", { id: row.dong!.id })
                }
              />
            </Tooltip>
          );
        }
        return (
          <Popconfirm
            title="Xoá dòng kế hoạch này?"
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() =>
              handler.executeEvent("boDong", { id: row.dong!.id })
            }
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        );
      },
    },
  ];

  /**
   * Bề rộng nằm trong state React (không sửa thẳng DOM) — nhờ vậy antd
   * tính lại được offset của các cột ghim mỗi lần kéo giãn.
   */
  const columns = useCotCoGian(KHOA_RONG_COT, cotGoc);

  return (
    <div className="excel-container">
      <div className="excel-toolbar">
        <Space size={4}>
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={soThayDoi === 0}
            onClick={() => handler.executeEvent("luuTatCa", {})}
          >
            {soThayDoi > 0 ? `Lưu (${soThayDoi})` : "Lưu"}
          </Button>
          <Button
            size="small"
            icon={<UndoOutlined />}
            disabled={soThayDoi === 0}
            onClick={() => handler.executeEvent("huyThayDoi", {})}
          >
            Huỷ thay đổi
          </Button>

          <span className="xl-cmd-sep" />

          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handler.executeEvent("themDong", {})}
          >
            Thêm dòng
          </Button>

          <span className="xl-cmd-sep" />

          <Button
            size="small"
            icon={<ReloadOutlined />}
            title="Tải lại"
            onClick={() => handler.executeEvent("refresh", {})}
          />
        </Space>
        <span className="text-xs text-gray-500">
          {soThayDoi > 0
            ? `${soThayDoi} thay đổi chưa lưu`
            : "Đã lưu mọi thay đổi"}
        </span>
      </div>

      {/* KHÔNG có cảnh báo lệch mục tiêu ở bảng này: Dòng tiền không khai mục
          tiêu năm nên chẳng có gì để so. Bốn bảng kế hoạch kia vẫn giữ. */}

      <div ref={tableWrapRef} className="flex flex-col flex-1 min-h-0">
        <Table<Hang>
          rowKey="key"
          size="small"
          bordered
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          className="excel-table kh-bang"
          rowClassName={(row) =>
            row.tongHop ? "kh-hang-tong-hop" : rowClassName(row)
          }
          scroll={{ x: "max-content", y: tableBodyHeight }}
          locale={{
            emptyText: (
              <Empty description="Chưa có dòng nào — bấm Thêm dòng để bắt đầu" />
            ),
          }}
        />
      </div>
    </div>
  );
};
