import React, { useMemo } from "react";
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
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useTableBodyHeight } from "@/hooks/useTableBodyHeight";
import { CHIEU_OPTIONS } from "@/services/keHoachDongTienService";
import { sapXepTheoNhan } from "@/lib/sapXep";
import { dungCayBang, type HangBang, type MoTaHang } from "../lib/tongHop";
import {
  quyTuSoDuCuoi,
  quyTuSoDuDau,
  tinhTongHopDongTien,
} from "../lib/dongTienTongHop";
import { demThayDoi, gopNhap, type DongHienThi } from "../lib/nhapBang";
import {
  CAP_CHINH,
  capCot,
  cotCaNamVaChenhLech,
  cotQuyVaThang,
  laHangGop,
  numberInputProps,
  numberInputPropsCoAm,
  onCellNhan,
  onCellNhanPhu,
  rowClassName,
  tien,
} from "../lib/cotChung";
import { CanhBaoLechMucTieu } from "../lib/CanhBaoLechMucTieu";
import {
  useDongTienHandler,
  useDongTienState,
} from "./DongTienHandlerContext";
import { valTuDong, type DongTienVal } from "./handler/sub-handler/init/init.state";

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
        // Biến thể B: mục tiêu năm là ô "Giá trị/Mục tiêu" nhập tay.
        namKhaiBao: d.val.giaTriMucTieu,
      }),
    [tenNhom, tenDongTien],
  );

  const tongHop = useMemo(
    () =>
      tinhTongHopDongTien(
        hienThi.map((d) => ({ chieu: d.val.chieu, thang: d.val.thang })),
        tonDauHienThi,
      ),
    [hienThi, tonDauHienThi],
  );

  /**
   * Thứ tự đúng tài liệu mục 8.3: Tồn đầu → Thu trong kỳ (kèm các nhóm thu) →
   * Chi trong kỳ (kèm các nhóm chi) → Tồn cuối → Thặng dư.
   */
  const rows = useMemo<Hang[]>(() => {
    const chiTiet = (chieu: "THU" | "CHI") => {
      const cua = hienThi.filter((d) => d.val.chieu === chieu);
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
  }, [hienThi, doc, tongHop]);

  const nhomOptions = useMemo(
    () =>
      sapXepTheoNhan(
        nhomDongTienList.map((n) => ({
          value: n.ma,
          label: `${n.ma} - ${n.ten}`,
        })),
      ),
    [nhomDongTienList],
  );

  /** `DongTien.nhom` lưu MÃ nhóm, không lưu id — lọc theo mã. */
  const dongTienTheoNhom = (nhomMa: string) =>
    sapXepTheoNhan(
      dongTienList
        .filter((d) => !nhomMa || d.nhom === nhomMa)
        .map((d) => ({ value: d.id, label: `${d.ma} - ${d.ten}` })),
    );

  const suaDuoc = (row: Hang) => !laHangGop(row.loai);

  const columns: ColumnsType<Hang> = [
    {
      title: "Mã",
      key: "ma",
      width: 220,
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
              {row.nhomKey !== CHUA_CHON && (
                <Tooltip title="Thêm dòng tiền vào nhóm này">
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      handler.executeEvent("themDong", { nhomMa: row.nhomKey })
                    }
                  />
                </Tooltip>
              )}
            </div>
          );
        }
        // Dòng đã lưu không đổi được dòng tiền → hiện mã dạng chữ.
        if (!row.dong?.tam) {
          return (
            <span>{tenDongTien.get(row.dong!.val.dongTienId)?.ma ?? "-"}</span>
          );
        }
        return (
          <Select
            size="small"
            className="w-full"
            placeholder="Chọn nhóm"
            showSearch
            optionFilterProp="label"
            options={nhomOptions}
            value={row.dong.val.nhomMa || undefined}
            onChange={(v) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { nhomMa: v },
              })
            }
          />
        );
      },
    },
    {
      title: "Tên dòng tiền",
      key: "ten",
      width: 240,
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
            options={dongTienTheoNhom(row.dong.val.nhomMa)}
            value={row.dong.val.dongTienId || undefined}
            onChange={(v) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { dongTienId: v },
              })
            }
          />
        );
      },
    },
    {
      title: "Diễn giải",
      key: "ghiChu",
      width: 240,
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
    {
      title: "Thu/Chi",
      key: "chieu",
      width: 100,
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        return (
          <Select
            size="small"
            className="w-full"
            options={CHIEU_OPTIONS}
            value={row.dong!.val.chieu}
            onChange={(v) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { chieu: v },
              })
            }
          />
        );
      },
    },
    {
      title: "Giá trị/Mục tiêu",
      key: "giaTriMucTieu",
      width: 160,
      align: "right",
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        if (row.tongHop === "tonDau") {
          // Ô duy nhất nhập được trong nhóm dòng tổng hợp.
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
        if (laHangGop(row.loai)) return null;
        return (
          <InputNumber
            {...numberInputProps}
            value={row.dong!.val.giaTriMucTieu}
            onChange={(v) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { giaTriMucTieu: Number(v) || 0 },
              })
            }
          />
        );
      },
    },
    ...cotCaNamVaChenhLech<Hang>(),
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

      <CanhBaoLechMucTieu rows={rows} />

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
