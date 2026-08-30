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
import type { KeHoachBanHangDong } from "@/services/keHoachBanHangService";
import { sapXepTheoNhan } from "@/lib/sapXep";
import { dungCayBang, type HangBang, type MoTaHang } from "../lib/tongHop";
import { demThayDoi, gopNhap, type DongHienThi } from "../lib/nhapBang";
import {
  CAP_CHINH,
  capCot,
  cotCaNamVaChenhLech,
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
import { useBanHangHandler, useBanHangState } from "./BanHangHandlerContext";
import {
  valTuDong,
  type BanHangVal,
} from "./handler/sub-handler/init/init.state";

/** Nhóm ảo gom các dòng mới chưa chọn nhóm. */
const CHUA_CHON = "";

type Dong = DongHienThi<BanHangVal>;
type Hang = HangBang<Dong> & { chuaLuu?: boolean };

export const BanHangTable: React.FC = () => {
  const handler = useBanHangHandler();
  const [data] = useBanHangState("data", []);
  const [loading] = useBanHangState("loading", false);
  const [nhomSanPhamList] = useBanHangState("nhomSanPhamList", []);
  const [sanPhamList] = useBanHangState("sanPhamList", []);
  const [nhap] = useBanHangState("nhap", {});
  const [dongMoi] = useBanHangState("dongMoi", []);
  const [saving] = useBanHangState("saving", false);
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();

  const daLuu = useMemo(
    () => data.map((d) => ({ id: d.id, val: valTuDong(d) })),
    [data],
  );

  const soThayDoi = useMemo(
    () => demThayDoi(daLuu, nhap, dongMoi),
    [daLuu, nhap, dongMoi],
  );

  const tenNhom = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nhomSanPhamList) m.set(n.ma, `${n.ma} - ${n.ten}`);
    return m;
  }, [nhomSanPhamList]);

  const tenSanPham = useMemo(() => {
    const m = new Map<string, { ma: string; ten: string }>();
    for (const s of sanPhamList) m.set(s.id, { ma: s.ma, ten: s.ten });
    return m;
  }, [sanPhamList]);

  const rows = useMemo<Hang[]>(() => {
    const hienThi = gopNhap(daLuu, nhap, dongMoi);
    const doc = (d: Dong): MoTaHang => ({
      key: d.id,
      nhomKey: d.val.nhomMa || CHUA_CHON,
      nhomNhan:
        tenNhom.get(d.val.nhomMa) ??
        (d.val.nhomMa || "(Chưa chọn nhóm)"),
      nhan: tenSanPham.get(d.val.sanPhamId)?.ten ?? "",
      ghiChu: d.val.ghiChu,
      thang: d.val.thang,
      // Thành tiền = Lượng × Giá bình quân — mục tiêu năm của dòng.
      namKhaiBao: d.val.luong * d.val.giaBinhQuan,
    });
    // Chưa có dòng nào thì trả rỗng để bảng hiện lời nhắc, thay vì một hàng
    // TỔNG CỘNG toàn số 0 chẳng nói lên điều gì.
    if (hienThi.length === 0) return [];
    return (dungCayBang(hienThi, doc) as Hang[]).map((r) => ({
      ...r,
      chuaLuu: r.dong ? r.dong.tam || r.dong.doi : false,
    }));
  }, [daLuu, nhap, dongMoi, tenNhom, tenSanPham]);

  const nhomOptions = useMemo(
    () =>
      sapXepTheoNhan(
        nhomSanPhamList.map((n) => ({
          value: n.ma,
          label: `${n.ma} - ${n.ten}`,
        })),
      ),
    [nhomSanPhamList],
  );

  /** `SanPham.nhom` lưu MÃ nhóm, không lưu id — lọc theo mã. */
  const sanPhamTheoNhom = (nhomMa: string) =>
    sapXepTheoNhan(
      sanPhamList
        .filter((sp) => !nhomMa || sp.nhom === nhomMa)
        .map((sp) => ({ value: sp.id, label: `${sp.ma} - ${sp.ten}` })),
    );

  const suaDuoc = (row: Hang) => !laHangGop(row.loai);

  const columns: ColumnsType<Hang> = [
    {
      title: "Mã",
      key: "ma",
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
                <Tooltip title="Thêm sản phẩm vào nhóm này">
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
        // Dòng đã lưu không đổi được sản phẩm → hiện mã dạng chữ.
        if (!row.dong?.tam) {
          return <span>{tenSanPham.get(row.dong!.val.sanPhamId)?.ma ?? "-"}</span>;
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
      title: "Tên sản phẩm hàng hóa, vật tư",
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
            placeholder="Chọn sản phẩm"
            showSearch
            optionFilterProp="label"
            options={sanPhamTheoNhom(row.dong.val.nhomMa)}
            value={row.dong.val.sanPhamId || undefined}
            onChange={(v) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { sanPhamId: v },
              })
            }
          />
        );
      },
    },
    {
      title: "Diễn giải",
      key: "ghiChu",
      width: 260,
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
      title: "Lượng",
      key: "luong",
      width: 110,
      align: "right",
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        // Cộng lượng của các sản phẩm khác đơn vị tính là vô nghĩa → hàng gộp để trống.
        if (laHangGop(row.loai)) return null;
        return (
          <InputNumber
            {...numberInputProps}
            value={row.dong!.val.luong}
            onChange={(v) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { luong: Number(v) || 0 },
              })
            }
          />
        );
      },
    },
    {
      title: "Giá bình quân",
      key: "giaBinhQuan",
      width: 140,
      align: "right",
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        return (
          <InputNumber
            {...numberInputProps}
            value={row.dong!.val.giaBinhQuan}
            onChange={(v) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { giaBinhQuan: Number(v) || 0 },
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
        // Dòng chưa lưu thì bỏ tại chỗ, khỏi hỏi lại.
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
            ? `${soThayDoi} dòng chưa lưu`
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
