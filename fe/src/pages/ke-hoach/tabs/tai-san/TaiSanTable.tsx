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
import { useCotCoGian } from "@/hooks/useCotCoGian";
import { sapXepTheoNhan } from "@/lib/sapXep";
import { dungCayBang, type HangBang, type MoTaHang } from "../lib/tongHop";
import { demThayDoi, gopNhap, type DongHienThi } from "../lib/nhapBang";
import {
  CAP_CHINH,
  capCot,
  cotCaNam,
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
import { useTaiSanHandler, useTaiSanState } from "./TaiSanHandlerContext";
import {
  valTuDong,
  type TaiSanVal,
} from "./handler/sub-handler/init/init.state";

/** Nhóm ảo gom các dòng mới chưa chọn nơi sử dụng. */
const CHUA_CHON = "";

type Dong = DongHienThi<TaiSanVal>;
type Hang = HangBang<Dong> & { chuaLuu?: boolean };

/** Bề rộng cột người dùng tự kéo — lưu theo KEY cột, xem `useCotCoGian`. */
const KHOA_RONG_COT = "kh-rong-cot-tai-san";

export const TaiSanTable: React.FC = () => {
  const handler = useTaiSanHandler();
  const [data] = useTaiSanState("data", []);
  const [loading] = useTaiSanState("loading", false);
  const [boPhanList] = useTaiSanState("boPhanList", []);
  const [nhap] = useTaiSanState("nhap", {});
  const [dongMoi] = useTaiSanState("dongMoi", []);
  const [saving] = useTaiSanState("saving", false);
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

  const rows = useMemo<Hang[]>(() => {
    const hienThi = gopNhap(daLuu, nhap, dongMoi);
    const doc = (d: Dong): MoTaHang => ({
      key: d.id,
      nhomKey: d.val.boPhanId || CHUA_CHON,
      nhomNhan: tenBoPhan.get(d.val.boPhanId) ?? "(Chưa chọn nơi sử dụng)",
      nhan: d.val.tenTaiSan || d.val.maTaiSan,
      ghiChu: d.val.ghiChu,
      thang: d.val.thang,
      // Thành tiền = Số lượng × Giá bình quân — mục tiêu năm của dòng.
      namKhaiBao: d.val.soLuong * d.val.giaBinhQuan,
    });
    if (hienThi.length === 0) return [];
    return (dungCayBang(hienThi, doc) as Hang[]).map((r) => ({
      ...r,
      chuaLuu: r.dong ? r.dong.tam || r.dong.doi : false,
    }));
  }, [daLuu, nhap, dongMoi, tenBoPhan]);

  const boPhanOptions = useMemo(
    () =>
      sapXepTheoNhan(
        boPhanList.map((b) => ({ value: b.id, label: `${b.ma} - ${b.ten}` })),
      ),
    [boPhanList],
  );

  const suaDuoc = (row: Hang) => !laHangGop(row.loai);

  // Vùng GHIM = các cột nhãn + CẢ NĂM; từ nhóm Quý trở đi thì cuộn ngang.
  const cotGoc: ColumnsType<Hang> = [
    ...ghimTrai<Hang>([
      {
        // Nhãn cột là "Nơi sử dụng" theo tài liệu; giá trị chọn là Bộ phận.
        title: "Mã / Nơi sử dụng",
        key: "ma",
        width: 170,
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
                  <Tooltip title="Thêm tài sản vào nơi sử dụng này">
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
                style={{ width: "62%" }}
                placeholder="Nơi sử dụng"
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
                style={{ width: "38%" }}
                placeholder="Mã tài sản"
                value={row.dong!.val.maTaiSan}
                onChange={(e) =>
                  handler.executeEvent("suaO", {
                    id: row.dong!.id,
                    patch: { maTaiSan: e.target.value },
                  })
                }
              />
            </Space.Compact>
          );
        },
      },
      {
        title: "Tên tài sản",
        key: "tenTaiSan",
        width: 200,
        onCell: onCellNhanPhu,
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => {
          if (laHangGop(row.loai)) return null;
          return (
            <Input
              size="small"
              variant="borderless"
              className="excel-cell-input"
              placeholder="Tên tài sản"
              value={row.dong!.val.tenTaiSan}
              onChange={(e) =>
                handler.executeEvent("suaO", {
                  id: row.dong!.id,
                  patch: { tenTaiSan: e.target.value },
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
        title: "Số lượng",
        key: "soLuong",
        width: 110,
        align: "right",
        ...capCot(CAP_CHINH),
        render: (_: unknown, row: Hang) => {
          // Cộng số lượng của các tài sản khác đơn vị là vô nghĩa → hàng gộp để trống.
          if (laHangGop(row.loai)) return null;
          return (
            <InputNumber
              {...numberInputProps}
              value={row.dong!.val.soLuong}
              onChange={(v) =>
                handler.executeEvent("suaO", {
                  id: row.dong!.id,
                  patch: { soLuong: Number(v) || 0 },
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
      ...cotCaNam<Hang>(),
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
