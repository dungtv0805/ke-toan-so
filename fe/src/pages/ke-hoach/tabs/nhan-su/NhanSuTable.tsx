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
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  CHI_PHI_NHAN_SU_COLS,
  chiPhiRong,
  tongChiPhi,
  type ChiPhiNhanSu,
  type KeHoachNhanSuDong,
} from "@/services/keHoachNhanSuService";
import { sapXepTheoNhan } from "@/lib/sapXep";
import { KEY_TONG, dungCayBang, type HangBang, type MoTaHang } from "../lib/tongHop";
import {
  cotQuyVaThang,
  laHangGop,
  numberInputProps,
  onCellNhan,
  onCellNhanPhu,
  oSoNam,
  phanTramText,
  rowClassName,
  tien,
} from "../lib/cotChung";
import { useNhanSuHandler, useNhanSuState } from "./NhanSuHandlerContext";
import { DONG_MOI_KEY, type NhanSuForm } from "./handler/sub-handler/init/init.state";

type Hang = HangBang<KeHoachNhanSuDong> & { moi?: boolean };

const doc = (d: KeHoachNhanSuDong): MoTaHang => ({
  key: d.id,
  nhomKey: d.boPhan.id,
  nhomNhan: `${d.boPhan.ma} - ${d.boPhan.ten}`,
  nhan: d.maViTri,
  thang: d.thang,
  namKhaiBao: tongChiPhi(d.chiPhi),
});

const congChiPhi = (a: ChiPhiNhanSu, b: ChiPhiNhanSu): ChiPhiNhanSu => {
  const kq = chiPhiRong();
  for (const { key } of CHI_PHI_NHAN_SU_COLS) kq[key] = a[key] + b[key];
  return kq;
};

export const NhanSuTable: React.FC = () => {
  const handler = useNhanSuHandler();
  const [data] = useNhanSuState("data", []);
  const [loading] = useNhanSuState("loading", false);
  const [boPhanList] = useNhanSuState("boPhanList", []);
  const [editingKey] = useNhanSuState("editingKey", null);
  const [formValues] = useNhanSuState("formValues", null);
  const [saving] = useNhanSuState("saving", false);

  const form = (formValues ?? null) as NhanSuForm | null;
  const themMoi = editingKey === DONG_MOI_KEY;

  const rows = useMemo<Hang[]>(() => {
    const cay = dungCayBang(data, doc) as Hang[];
    if (!themMoi) return cay;
    return [
      ...cay,
      {
        key: DONG_MOI_KEY,
        loai: "chiTiet",
        nhan: "",
        thang: Array(12).fill(0),
        quy: [0, 0, 0, 0],
        namTheoThang: 0,
        namKhaiBao: 0,
        phanTram: 0,
        lech: false,
        moi: true,
      },
    ];
  }, [data, themMoi]);

  /**
   * Khác bảng Bán hàng: sáu cột chi phí cộng được nên hàng bộ phận và hàng tổng
   * phải có số. Cộng sẵn ở đây rồi tra theo khoá hàng khi render.
   */
  const chiPhiGop = useMemo(() => {
    const map = new Map<string, ChiPhiNhanSu>();
    let tong = chiPhiRong();
    for (const d of data) {
      const cu = map.get(d.boPhan.id) ?? chiPhiRong();
      map.set(d.boPhan.id, congChiPhi(cu, d.chiPhi));
      tong = congChiPhi(tong, d.chiPhi);
    }
    map.set(KEY_TONG, tong);
    return map;
  }, [data]);

  const chiPhiCuaHang = (row: Hang): ChiPhiNhanSu | undefined => {
    if (row.loai === "tong") return chiPhiGop.get(KEY_TONG);
    if (row.loai === "nhom") return chiPhiGop.get(row.nhomKey ?? "");
    return row.dong?.chiPhi;
  };

  const dangSua = (row: Hang) => editingKey === row.key;

  const boPhanOptions = useMemo(
    () =>
      sapXepTheoNhan(
        boPhanList.map((b) => ({ value: b.id, label: `${b.ma} - ${b.ten}` })),
      ),
    [boPhanList],
  );

  const cotChiPhi: ColumnsType<Hang> = CHI_PHI_NHAN_SU_COLS.map((col) => ({
    title: col.nhan,
    key: col.key,
    width: 150,
    align: "right" as const,
    render: (_: unknown, row: Hang) => {
      if (dangSua(row)) {
        return (
          <InputNumber
            {...numberInputProps}
            value={form?.chiPhi[col.key] ?? 0}
            onChange={(v) =>
              handler.executeEvent("datChiPhi", {
                khoa: col.key,
                giaTri: Number(v) || 0,
              })
            }
          />
        );
      }
      const giaTri = chiPhiCuaHang(row)?.[col.key] ?? 0;
      return (
        <span className={laHangGop(row.loai) ? "font-semibold" : undefined}>
          {tien(giaTri)}
        </span>
      );
    },
  }));

  const columns: ColumnsType<Hang> = [
    {
      title: "Mã vị trí",
      key: "maViTri",
      width: 170,
      onCell: onCellNhan,
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) {
          return <span className="font-semibold">{row.nhan}</span>;
        }
        if (dangSua(row)) {
          return (
            <Space.Compact className="w-full">
              <Select
                size="small"
                style={{ width: "50%" }}
                placeholder="Bộ phận"
                showSearch
                optionFilterProp="label"
                options={boPhanOptions}
                value={form?.boPhanId}
                onChange={(v) =>
                  handler.executeEvent("datForm", { patch: { boPhanId: v } })
                }
              />
              <Input
                size="small"
                style={{ width: "50%" }}
                placeholder="Mã vị trí"
                value={form?.maViTri ?? ""}
                onChange={(e) =>
                  handler.executeEvent("datForm", {
                    patch: { maViTri: e.target.value },
                  })
                }
              />
            </Space.Compact>
          );
        }
        return <span>{row.dong?.maViTri}</span>;
      },
    },
    {
      title: "Tên chức vụ",
      key: "tenChucVu",
      width: 200,
      onCell: onCellNhanPhu,
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        if (dangSua(row)) {
          return (
            <Input
              size="small"
              placeholder="Tên chức vụ"
              value={form?.tenChucVu ?? ""}
              onChange={(e) =>
                handler.executeEvent("datForm", {
                  patch: { tenChucVu: e.target.value },
                })
              }
            />
          );
        }
        return (
          <span className="excel-cell-text">{row.dong?.tenChucVu || "-"}</span>
        );
      },
    },
    {
      title: "CỘNG",
      key: "cong",
      width: 170,
      align: "right",
      render: (_: unknown, row: Hang) => {
        // Đang sửa thì cộng ngay theo số đang gõ để người dùng thấy kết quả.
        if (dangSua(row)) {
          return (
            <span className="text-gray-500">
              {tien(tongChiPhi(form?.chiPhi ?? chiPhiRong()))}
            </span>
          );
        }
        return oSoNam(row, "CỘNG");
      },
    },
    {
      title: "%",
      key: "phanTram",
      width: 90,
      align: "right",
      render: (_: unknown, row: Hang) =>
        row.moi ? null : (
          <span className={laHangGop(row.loai) ? "font-semibold" : undefined}>
            {phanTramText(row.phanTram)}
          </span>
        ),
    },
    ...cotChiPhi,
    ...cotQuyVaThang<Hang>({
      dangSua,
      thangDangGo: () => form?.thang ?? [],
      doiThang: (chiSo, giaTri) =>
        handler.executeEvent("datThang", { chiSo, giaTri }),
    }),
    {
      title: "Thao tác",
      key: "thaoTac",
      width: 110,
      align: "center",
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        if (dangSua(row)) {
          return (
            <Space size={4}>
              <Tooltip title="Lưu">
                <Button
                  type="text"
                  size="small"
                  loading={saving}
                  icon={<SaveOutlined className="text-green-600" />}
                  onClick={() => handler.executeEvent("luuDong", {})}
                />
              </Tooltip>
              <Tooltip title="Huỷ">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handler.executeEvent("huySua", {})}
                />
              </Tooltip>
            </Space>
          );
        }
        return (
          <Space size={4}>
            <Tooltip title="Sửa">
              <Button
                type="text"
                size="small"
                disabled={!!editingKey}
                icon={<EditOutlined />}
                onClick={() =>
                  handler.executeEvent("batDauSua", { key: row.key })
                }
              />
            </Tooltip>
            <Popconfirm
              title="Xoá dòng kế hoạch này?"
              okText="Xoá"
              cancelText="Huỷ"
              onConfirm={() => handler.executeEvent("xoaDong", { id: row.key })}
            >
              <Button
                type="text"
                size="small"
                danger
                disabled={!!editingKey}
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-2">
      <Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!!editingKey}
          onClick={() => handler.executeEvent("themDong", {})}
        >
          Thêm chức vụ
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => handler.executeEvent("refresh", {})}
        >
          Tải lại
        </Button>
      </Space>

      <Table<Hang>
        rowKey="key"
        size="small"
        bordered
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        rowClassName={rowClassName}
        scroll={{ x: "max-content" }}
        locale={{
          emptyText: <Empty description="Chưa có dòng kế hoạch nhân sự nào" />,
        }}
      />
    </div>
  );
};
