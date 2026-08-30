import React, { useMemo } from "react";
import {
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
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
import {
  NHOM_NGUON_VON_OPTIONS,
  nhanNhomNguonVon,
  type NhomNguonVon,
} from "@/services/keHoachNguonVonService";
import { dungCayBang, type HangBang, type MoTaHang } from "../lib/tongHop";
import { quyTuSoDuCuoi } from "../lib/dongTienTongHop";
import { soDuLuyKe } from "../lib/nguonVonSoDu";
import { demThayDoi, gopNhap, type DongHienThi } from "../lib/nhapBang";
import {
  CAP_CHINH,
  capCot,
  cotCaNamVaChenhLech,
  cotQuyVaThang,
  laHangGop,
  numberInputPropsCoAm,
  onCellNhan,
  onCellNhanPhu,
  rowClassName,
  tien,
} from "../lib/cotChung";
import { CanhBaoLechMucTieu } from "../lib/CanhBaoLechMucTieu";
import { useNguonVonHandler, useNguonVonState } from "./NguonVonHandlerContext";
import { valTuDong, type NguonVonVal } from "./handler/sub-handler/init/init.state";

type Dong = DongHienThi<NguonVonVal>;
/** `soDu` là dòng PHỤ suy ra, không phải bản ghi — không sửa, không cảnh báo. */
type Hang = HangBang<Dong> & { chuaLuu?: boolean; soDu?: boolean };

export const NguonVonTable: React.FC = () => {
  const handler = useNguonVonHandler();
  const [data] = useNguonVonState("data", []);
  const [loading] = useNguonVonState("loading", false);
  const [nhap] = useNguonVonState("nhap", {});
  const [dongMoi] = useNguonVonState("dongMoi", []);
  const [saving] = useNguonVonState("saving", false);
  const [hienSoDu] = useNguonVonState("hienSoDu", true);
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();

  const daLuu = useMemo(
    () => data.map((d) => ({ id: d.id, val: valTuDong(d) })),
    [data],
  );

  const soThayDoi = useMemo(
    () => demThayDoi(daLuu, nhap, dongMoi),
    [daLuu, nhap, dongMoi],
  );

  const rows = useMemo<Hang[]>(() => {
    const hienThi = gopNhap(daLuu, nhap, dongMoi);
    const doc = (d: Dong): MoTaHang => ({
      key: d.id,
      nhomKey: d.val.nhom,
      nhomNhan: nhanNhomNguonVon(d.val.nhom),
      nhan: d.val.tenChiTieu || d.val.maChiTieu,
      ghiChu: d.val.ghiChu,
      thang: d.val.thang,
      // Biến thể B: mục tiêu năm là ô "Giá trị/Mục tiêu" nhập tay.
      namKhaiBao: d.val.giaTriMucTieu,
    });
    if (hienThi.length === 0) return [];

    const cay = (dungCayBang(hienThi, doc) as Hang[]).map((r) => ({
      ...r,
      chuaLuu: r.dong ? r.dong.tam || r.dong.doi : false,
    }));

    if (!hienSoDu) return cay;

    // Dòng phụ Số dư nằm ngay dưới dòng chi tiết sinh ra nó.
    return cay.flatMap((r) => {
      if (r.loai !== "chiTiet" || !r.dong) return [r];
      const soDu = soDuLuyKe(r.dong.val.soDuDauNam, r.dong.val.thang);
      const cuoiNam = soDu[soDu.length - 1];
      return [
        r,
        {
          ...r,
          key: `${r.key}__sodu`,
          // Dùng 'nhom' để mọi ô nhập tự tắt — số dư là số suy ra, không gõ được.
          loai: "nhom" as const,
          soDu: true,
          chuaLuu: false,
          nhan: "↳ Số dư",
          thang: soDu,
          quy: quyTuSoDuCuoi(soDu),
          namTheoThang: cuoiNam,
          namKhaiBao: cuoiNam,
          chenhLech: 0,
          lech: false,
          dong: undefined,
        },
      ];
    });
  }, [daLuu, nhap, dongMoi, hienSoDu]);

  const suaDuoc = (row: Hang) => !laHangGop(row.loai) && !row.soDu;

  const columns: ColumnsType<Hang> = [
    {
      title: "Mã / Nhóm nguồn vốn",
      key: "ma",
      width: 300,
      onCell: onCellNhan,
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        if (row.soDu) {
          return <span className="text-xs text-gray-500">{row.nhan}</span>;
        }
        if (row.loai === "tong") {
          return <span className="font-semibold">{row.nhan}</span>;
        }
        if (row.loai === "nhom") {
          return (
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{row.nhan}</span>
              <Tooltip title="Thêm chỉ tiêu vào nhóm này">
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    handler.executeEvent("themDong", {
                      nhom: row.nhomKey as NhomNguonVon,
                    })
                  }
                />
              </Tooltip>
            </div>
          );
        }
        return (
          <Space.Compact className="w-full">
            <Select
              size="small"
              style={{ width: "62%" }}
              options={NHOM_NGUON_VON_OPTIONS}
              value={row.dong!.val.nhom}
              onChange={(v) =>
                handler.executeEvent("suaO", {
                  id: row.dong!.id,
                  patch: { nhom: v },
                })
              }
            />
            <Input
              size="small"
              style={{ width: "38%" }}
              placeholder="Mã chỉ tiêu"
              value={row.dong!.val.maChiTieu}
              onChange={(e) =>
                handler.executeEvent("suaO", {
                  id: row.dong!.id,
                  patch: { maChiTieu: e.target.value },
                })
              }
            />
          </Space.Compact>
        );
      },
    },
    {
      title: "Tên chỉ tiêu",
      key: "tenChiTieu",
      width: 220,
      onCell: onCellNhanPhu,
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        return (
          <Input
            size="small"
            variant="borderless"
            className="excel-cell-input"
            placeholder="Tên chỉ tiêu"
            value={row.dong!.val.tenChiTieu}
            onChange={(e) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { tenChiTieu: e.target.value },
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
      title: "Số dư đầu năm",
      key: "soDuDauNam",
      width: 150,
      align: "right",
      ...capCot(CAP_CHINH),
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        return (
          <InputNumber
            {...numberInputPropsCoAm}
            value={row.dong!.val.soDuDauNam}
            onChange={(v) =>
              handler.executeEvent("suaO", {
                id: row.dong!.id,
                patch: { soDuDauNam: Number(v) || 0 },
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
        if (row.soDu) return null;
        if (laHangGop(row.loai)) {
          return (
            <span className="font-semibold">{tien(row.namKhaiBao)}</span>
          );
        }
        return (
          <InputNumber
            {...numberInputPropsCoAm}
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

          <Space size={4}>
            <Switch
              size="small"
              checked={hienSoDu}
              onChange={() => handler.executeEvent("doiHienSoDu", {})}
            />
            <span className="text-xs text-gray-500">Hiện số dư</span>
          </Space>

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
          rowClassName={(row) =>
            row.soDu ? "kh-hang-so-du" : rowClassName(row)
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
