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
import { useCotCoGian } from "../../hooks/useCotCoGian";
import {
  CHI_PHI_NHAN_SU_COLS,
  chiPhiRong,
  tongChiPhi,
  type ChiPhiNhanSu,
} from "@/services/keHoachNhanSuService";
import { sapXepTheoNhan } from "@/lib/sapXep";
import {
  KEY_TONG,
  dungCayBang,
  type HangBang,
  type MoTaHang,
} from "../lib/tongHop";
import { demThayDoi, gopNhap, type DongHienThi } from "../lib/nhapBang";
import {
  CAP_CHINH,
  capCot,
  cotCaNam,
  cotChenhLech,
  ghimTrai,
  cotQuyVaThang,
  laHangGop,
  numberInputProps,
  onCellNhan,
  onCellNhanPhu,
  phanTramText,
  rowClassName,
  tien,
} from "../lib/cotChung";
import { CanhBaoLechMucTieu } from "../lib/CanhBaoLechMucTieu";
import { useNhanSuHandler, useNhanSuState } from "./NhanSuHandlerContext";
import {
  valTuDong,
  type NhanSuVal,
} from "./handler/sub-handler/init/init.state";

/** Nhóm ảo gom các dòng mới chưa chọn bộ phận. */
const CHUA_CHON = "";

type Dong = DongHienThi<NhanSuVal>;
type Hang = HangBang<Dong> & { chuaLuu?: boolean };

const congChiPhi = (a: ChiPhiNhanSu, b: ChiPhiNhanSu): ChiPhiNhanSu => {
  const kq = chiPhiRong();
  for (const { key } of CHI_PHI_NHAN_SU_COLS) kq[key] = a[key] + b[key];
  return kq;
};

/** Bề rộng cột người dùng tự kéo — lưu theo KEY cột, xem `useCotCoGian`. */
const KHOA_RONG_COT = "kh-rong-cot-nhan-su";

export const NhanSuTable: React.FC = () => {
  const handler = useNhanSuHandler();
  const [data] = useNhanSuState("data", []);
  const [loading] = useNhanSuState("loading", false);
  const [boPhanList] = useNhanSuState("boPhanList", []);
  const [nhap] = useNhanSuState("nhap", {});
  const [dongMoi] = useNhanSuState("dongMoi", []);
  const [saving] = useNhanSuState("saving", false);
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();

  const daLuu = useMemo(
    () => data.map((d) => ({ id: d.id, val: valTuDong(d) })),
    [data],
  );

  const soThayDoi = useMemo(
    () => demThayDoi(daLuu, nhap, dongMoi),
    [daLuu, nhap, dongMoi],
  );

  const tenBoPhan = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of boPhanList) m.set(b.id, `${b.ma} - ${b.ten}`);
    return m;
  }, [boPhanList]);

  const hienThi = useMemo(
    () => gopNhap(daLuu, nhap, dongMoi),
    [daLuu, nhap, dongMoi],
  );

  const rows = useMemo<Hang[]>(() => {
    const doc = (d: Dong): MoTaHang => ({
      key: d.id,
      nhomKey: d.val.boPhanId || CHUA_CHON,
      nhomNhan: tenBoPhan.get(d.val.boPhanId) ?? "(Chưa chọn bộ phận)",
      nhan: d.val.maViTri,
      ghiChu: d.val.ghiChu,
      thang: d.val.thang,
      // CỘNG của một dòng = tổng 6 loại chi phí.
      namKhaiBao: tongChiPhi(d.val.chiPhi),
    });
    // Chưa có dòng nào thì trả rỗng để bảng hiện lời nhắc, thay vì một hàng
    // TỔNG CỘNG toàn số 0 chẳng nói lên điều gì.
    if (hienThi.length === 0) return [];
    return (dungCayBang(hienThi, doc) as Hang[]).map((r) => ({
      ...r,
      chuaLuu: r.dong ? r.dong.tam || r.dong.doi : false,
    }));
  }, [hienThi, tenBoPhan]);

  /**
   * Khác bảng Bán hàng: sáu cột chi phí cộng được nên hàng bộ phận và hàng tổng
   * phải có số. Cộng trên dữ liệu ĐÃ TRỘN NHÁP để tổng nhảy ngay khi gõ.
   */
  const chiPhiGop = useMemo(() => {
    const map = new Map<string, ChiPhiNhanSu>();
    let tong = chiPhiRong();
    for (const d of hienThi) {
      const khoa = d.val.boPhanId || CHUA_CHON;
      map.set(khoa, congChiPhi(map.get(khoa) ?? chiPhiRong(), d.val.chiPhi));
      tong = congChiPhi(tong, d.val.chiPhi);
    }
    map.set(KEY_TONG, tong);
    return map;
  }, [hienThi]);

  const chiPhiCuaHang = (row: Hang): ChiPhiNhanSu => {
    if (row.loai === "tong") return chiPhiGop.get(KEY_TONG) ?? chiPhiRong();
    if (row.loai === "nhom") {
      return chiPhiGop.get(row.nhomKey ?? CHUA_CHON) ?? chiPhiRong();
    }
    return row.dong!.val.chiPhi;
  };

  const boPhanOptions = useMemo(
    () =>
      sapXepTheoNhan(
        boPhanList.map((b) => ({ value: b.id, label: `${b.ma} - ${b.ten}` })),
      ),
    [boPhanList],
  );

  const suaDuoc = (row: Hang) => !laHangGop(row.loai);

  const cotChiPhi: ColumnsType<Hang> = CHI_PHI_NHAN_SU_COLS.map((col) => ({
    title: col.nhan,
    key: col.key,
    width: 140,
    align: "right" as const,
    ...capCot(CAP_CHINH),
    render: (_: unknown, row: Hang) => {
      if (laHangGop(row.loai)) {
        return (
          <span className="font-semibold">
            {tien(chiPhiCuaHang(row)[col.key])}
          </span>
        );
      }
      return (
        <InputNumber
          {...numberInputProps}
          value={row.dong!.val.chiPhi[col.key]}
          onChange={(v) =>
            handler.executeEvent("suaChiPhi", {
              id: row.dong!.id,
              khoa: col.key,
              giaTri: Number(v) || 0,
            })
          }
        />
      );
    },
  }));

  // Vùng GHIM = các cột nhãn + CẢ NĂM; CHÊNH LỆCH trở đi thì cuộn ngang.
  const cotGoc: ColumnsType<Hang> = [
    ...ghimTrai<Hang>([
      {
        title: "Mã vị trí",
        // Rộng 300: tên bộ phận đầy đủ ("DV - Phòng dịch vụ") không bị cắt còn
        // "DV - Ph...", vì đọc mỗi mã không đủ để biết đang xếp dòng vào đâu.
        key: "maViTri",
        width: 200,
        onCell: onCellNhan,
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => {
          if (row.loai === "tong") {
            return <span className="font-semibold">{row.nhan}</span>;
          }
          if (row.loai === "nhom") {
            return (
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{row.nhan}</span>
                {row.nhomKey !== CHUA_CHON && (
                  <Tooltip title="Thêm chức vụ vào bộ phận này">
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() =>
                        handler.executeEvent("themDong", {
                          boPhanId: row.nhomKey,
                        })
                      }
                    />
                  </Tooltip>
                )}
              </div>
            );
          }
          return (
            <Space.Compact className="w-full">
              <Select
                size="small"
                style={{ width: "65%" }}
                placeholder="Bộ phận"
                showSearch
                optionFilterProp="label"
                options={boPhanOptions}
                value={row.dong!.val.boPhanId || undefined}
                onChange={(v) =>
                  handler.executeEvent("suaO", {
                    id: row.dong!.id,
                    patch: { boPhanId: v },
                  })
                }
              />
              <Input
                size="small"
                style={{ width: "35%" }}
                placeholder="Mã vị trí"
                value={row.dong!.val.maViTri}
                onChange={(e) =>
                  handler.executeEvent("suaO", {
                    id: row.dong!.id,
                    patch: { maViTri: e.target.value },
                  })
                }
              />
            </Space.Compact>
          );
        },
      },
      {
        title: "Tên chức vụ",
        key: "tenChucVu",
        width: 160,
        onCell: onCellNhanPhu,
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => {
          if (laHangGop(row.loai)) return null;
          return (
            <Input
              size="small"
              variant="borderless"
              className="excel-cell-input"
              placeholder="Tên chức vụ"
              value={row.dong!.val.tenChucVu}
              onChange={(e) =>
                handler.executeEvent("suaO", {
                  id: row.dong!.id,
                  patch: { tenChucVu: e.target.value },
                })
              }
            />
          );
        },
      },
      {
        title: "Diễn giải",
        key: "ghiChu",
        width: 170,
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
        title: "Thành tiền",
        key: "thanhTien",
        width: 160,
        align: "right",
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => (
          <span className={laHangGop(row.loai) ? "font-semibold" : undefined}>
            {tien(row.namKhaiBao)}
          </span>
        ),
      },
      {
        title: "%",
        key: "phanTram",
        width: 80,
        align: "right",
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => (
          <span className={laHangGop(row.loai) ? "font-semibold" : undefined}>
            {phanTramText(row.phanTram)}
          </span>
        ),
      },
      ...cotChiPhi,
      ...cotCaNam<Hang>(),
    ]),
    ...cotChenhLech<Hang>(),
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
          {soThayDoi > 0 ? `${soThayDoi} dòng chưa lưu` : "Đã lưu mọi thay đổi"}
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
          rowClassName={rowClassName}
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
