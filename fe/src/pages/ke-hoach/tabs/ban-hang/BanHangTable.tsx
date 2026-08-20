import React, { useMemo } from "react";
import {
  Button,
  Empty,
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
import type { KeHoachBanHangDong } from "@/services/keHoachBanHangService";
import { sapXepTheoNhan } from "@/lib/sapXep";
import { dungCayBang, type HangBang, type MoTaHang } from "../lib/tongHop";
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
import { useBanHangHandler, useBanHangState } from "./BanHangHandlerContext";
import { DONG_MOI_KEY, type BanHangForm } from "./handler/sub-handler/init/init.state";

type Hang = HangBang<KeHoachBanHangDong> & { moi?: boolean };

/** Doanh thu năm = Lượng × Giá bình quân — đây là số khai báo của dòng. */
const doanhThu = (d: KeHoachBanHangDong) => d.luong * d.giaBinhQuan;

const doc = (d: KeHoachBanHangDong): MoTaHang => ({
  key: d.id,
  nhomKey: d.nhomSanPham.id,
  nhomNhan: `${d.nhomSanPham.ma} - ${d.nhomSanPham.ten}`,
  nhan: d.sanPham.ten,
  thang: d.thang,
  namKhaiBao: doanhThu(d),
});

export const BanHangTable: React.FC = () => {
  const handler = useBanHangHandler();
  const [data] = useBanHangState("data", []);
  const [loading] = useBanHangState("loading", false);
  const [nhomSanPhamList] = useBanHangState("nhomSanPhamList", []);
  const [sanPhamList] = useBanHangState("sanPhamList", []);
  const [editingKey] = useBanHangState("editingKey", null);
  const [formValues] = useBanHangState("formValues", null);
  const [saving] = useBanHangState("saving", false);

  const form = (formValues ?? null) as BanHangForm | null;
  const themMoi = editingKey === DONG_MOI_KEY;

  const rows = useMemo<Hang[]>(() => {
    const cay = dungCayBang(data, doc) as Hang[];
    if (!themMoi) return cay;
    // Dòng đang thêm nằm cuối bảng, chưa thuộc nhóm nào cho tới khi chọn xong.
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

  const dangSua = (row: Hang) => editingKey === row.key;

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

  // `SanPham.nhom` lưu MÃ nhóm, không lưu id — lọc theo mã.
  const sanPhamOptions = useMemo(
    () =>
      sapXepTheoNhan(
        sanPhamList
          .filter((sp) => !form?.nhomMa || sp.nhom === form.nhomMa)
          .map((sp) => ({ value: sp.id, label: `${sp.ma} - ${sp.ten}` })),
      ),
    [sanPhamList, form?.nhomMa],
  );

  const columns: ColumnsType<Hang> = [
    {
      title: "Mã",
      key: "ma",
      width: 170,
      onCell: onCellNhan,
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) {
          return <span className="font-semibold">{row.nhan}</span>;
        }
        if (row.moi) {
          return (
            <Select
              size="small"
              className="w-full"
              placeholder="Chọn nhóm"
              showSearch
              optionFilterProp="label"
              options={nhomOptions}
              value={form?.nhomMa}
              onChange={(v) =>
                handler.executeEvent("datForm", { patch: { nhomMa: v } })
              }
            />
          );
        }
        return <span>{row.dong?.sanPham.ma}</span>;
      },
    },
    {
      title: "Tên sản phẩm hàng hóa, vật tư",
      key: "ten",
      width: 240,
      onCell: onCellNhanPhu,
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        if (row.moi) {
          return (
            <Select
              size="small"
              className="w-full"
              placeholder="Chọn sản phẩm"
              showSearch
              optionFilterProp="label"
              options={sanPhamOptions}
              value={form?.sanPhamId}
              onChange={(v) =>
                handler.executeEvent("datForm", { patch: { sanPhamId: v } })
              }
            />
          );
        }
        return <span className="excel-cell-text">{row.dong?.sanPham.ten}</span>;
      },
    },
    {
      title: "Lượng",
      key: "luong",
      width: 120,
      align: "right",
      render: (_: unknown, row: Hang) => {
        // Cộng lượng của các sản phẩm khác đơn vị tính là vô nghĩa → hàng gộp để trống.
        if (laHangGop(row.loai)) return null;
        if (dangSua(row)) {
          return (
            <InputNumber
              {...numberInputProps}
              value={form?.luong ?? 0}
              onChange={(v) =>
                handler.executeEvent("datForm", {
                  patch: { luong: Number(v) || 0 },
                })
              }
            />
          );
        }
        return tien(row.dong?.luong);
      },
    },
    {
      title: "Giá bình quân",
      key: "giaBinhQuan",
      width: 150,
      align: "right",
      render: (_: unknown, row: Hang) => {
        if (laHangGop(row.loai)) return null;
        if (dangSua(row)) {
          return (
            <InputNumber
              {...numberInputProps}
              value={form?.giaBinhQuan ?? 0}
              onChange={(v) =>
                handler.executeEvent("datForm", {
                  patch: { giaBinhQuan: Number(v) || 0 },
                })
              }
            />
          );
        }
        return tien(row.dong?.giaBinhQuan);
      },
    },
    {
      title: "Doanh thu",
      key: "doanhThu",
      width: 170,
      align: "right",
      render: (_: unknown, row: Hang) => {
        // Đang sửa thì tính ngay theo số đang gõ để người dùng thấy kết quả.
        if (dangSua(row)) {
          return (
            <span className="text-gray-500">
              {tien((form?.luong ?? 0) * (form?.giaBinhQuan ?? 0))}
            </span>
          );
        }
        return oSoNam(row, "doanh thu");
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
              onConfirm={() =>
                handler.executeEvent("xoaDong", { id: row.key })
              }
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
          Thêm sản phẩm
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
          emptyText: <Empty description="Chưa có dòng kế hoạch bán hàng nào" />,
        }}
      />
    </div>
  );
};
