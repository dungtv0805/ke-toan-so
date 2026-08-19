import React, { useMemo } from "react";
import {
  Table,
  Select,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import type { KeHoachDong } from "@/services/keHoachService";
import { useKeHoachHandler, useKeHoachState } from "../KeHoachHandlerContext";
import { DONG_MOI_ID } from "../handler/sub-handler/row-edit/row-edit.state";
import { nhomKhoanMucCua, type MucDanhMuc, type RowValues } from "../lib/keHoachRow";

const tien = (v?: number) => new Intl.NumberFormat("vi-VN").format(v ?? 0);

const trong = <span className="text-gray-400">-</span>;

const toOptions = (list: MucDanhMuc[] = []) =>
  list.map((m) => ({ value: m.ma, label: `${m.ma} - ${m.ten}` }));

/** Lưới 17 cột của Kế hoạch / Dự báo — cấu trúc bám đúng "Dữ liệu tổng hợp". */
export const KeHoachTable: React.FC = () => {
  const handler = useKeHoachHandler();
  const [data] = useKeHoachState("data", []);
  const [loading] = useKeHoachState("loading", false);
  const [pagination] = useKeHoachState("pagination");
  const [editingRowId] = useKeHoachState("editingRowId", null);
  const [editingValues] = useKeHoachState("editingValues", {});
  const [savingRow] = useKeHoachState("savingRow", false);
  const [selectedRowKeys] = useKeHoachState("selectedRowKeys", []);

  const [taiKhoanList] = useKeHoachState("taiKhoanList", []);
  const [doiTuongList] = useKeHoachState("doiTuongList", []);
  const [duAnList] = useKeHoachState("duAnList", []);
  const [boPhanList] = useKeHoachState("boPhanList", []);
  const [sanPhamList] = useKeHoachState("sanPhamList", []);
  const [dongTienList] = useKeHoachState("dongTienList", []);
  const [khoanMucList] = useKeHoachState("khoanMucList", []);
  const [nhomQuanLyList] = useKeHoachState("nhomQuanLyList", []);
  const [chuDauTuList] = useKeHoachState("chuDauTuList", []);
  const [nhomKhoanMucList] = useKeHoachState("nhomKhoanMucList", []);
  const [quyChuanList] = useKeHoachState("quyChuanList", []);

  const values = (editingValues ?? {}) as RowValues;
  const dangSua = (record: KeHoachDong) => record.id === editingRowId;
  const doi = (field: keyof RowValues, value: unknown) =>
    handler.executeEvent("doiGiaTri", { field, value });

  const opts = useMemo(
    () => ({
      taiKhoan: toOptions(taiKhoanList as MucDanhMuc[]),
      doiTuong: toOptions(doiTuongList as MucDanhMuc[]),
      // Nhân viên là đối tượng loại NHAN_VIEN; đội là bộ phận có chữ "đội".
      nhanVien: toOptions(
        (doiTuongList as MucDanhMuc[]).filter((d) =>
          String(d.loai ?? "").includes("NHAN_VIEN"),
        ),
      ),
      doi: toOptions(
        (boPhanList as MucDanhMuc[]).filter((b) =>
          b.ten?.toLowerCase().includes("đội"),
        ),
      ),
      boPhan: toOptions(boPhanList as MucDanhMuc[]),
      duAn: toOptions(duAnList as MucDanhMuc[]),
      sanPham: toOptions(sanPhamList as MucDanhMuc[]),
      dongTien: toOptions(dongTienList as MucDanhMuc[]),
      khoanMuc: toOptions(khoanMucList as MucDanhMuc[]),
      nhomQuanLy: toOptions(nhomQuanLyList as MucDanhMuc[]),
      chuDauTu: toOptions(chuDauTuList as MucDanhMuc[]),
      nghiepVu: [
        ...new Set(
          (quyChuanList as { nghiepVu: string }[]).map((q) => q.nghiepVu).filter(Boolean),
        ),
      ].map((n) => ({ value: n, label: n })),
    }),
    [
      taiKhoanList,
      doiTuongList,
      boPhanList,
      duAnList,
      sanPhamList,
      dongTienList,
      khoanMucList,
      nhomQuanLyList,
      chuDauTuList,
      quyChuanList,
    ],
  );

  /** Ô chọn danh mục: đang sửa thì thành Select, không thì hiện tên đã chốt. */
  const oChon = (
    record: KeHoachDong,
    field: keyof RowValues,
    options: { value: string; label: string }[],
    hienThi: React.ReactNode,
  ) =>
    dangSua(record) ? (
      <Select
        size="small"
        showSearch
        allowClear
        variant="borderless"
        className="w-full"
        optionFilterProp="label"
        placeholder="Chọn"
        popupMatchSelectWidth={280}
        value={(values[field] as string) ?? undefined}
        options={options}
        onChange={(v) => doi(field, v)}
      />
    ) : (
      hienThi
    );

  const ten = (v?: { ma?: string; ten?: string }) =>
    v?.ten ? <Tooltip title={v.ma}>{v.ten}</Tooltip> : trong;

  const columns: ColumnsType<KeHoachDong> = [
    {
      title: "Ngày phát sinh",
      key: "ngay",
      width: 130,
      fixed: "left",
      render: (_, record) =>
        dangSua(record) ? (
          <DatePicker
            size="small"
            variant="borderless"
            format="DD/MM/YYYY"
            allowClear={false}
            value={values.ngay ? dayjs(values.ngay) : undefined}
            onChange={(d) => doi("ngay", d?.toISOString())}
          />
        ) : (
          dayjs(record.ngay).format("DD/MM/YYYY")
        ),
    },
    {
      title: "Nghiệp vụ",
      key: "nghiepVu",
      width: 170,
      render: (_, record) =>
        oChon(record, "nghiepVu", opts.nghiepVu, record.danhMuc?.nghiepVu?.ten ?? trong),
    },
    {
      title: "Diễn giải",
      key: "noiDung",
      width: 220,
      render: (_, record) =>
        dangSua(record) ? (
          <Input
            size="small"
            variant="borderless"
            value={values.noiDung ?? ""}
            onChange={(e) => doi("noiDung", e.target.value)}
          />
        ) : (
          record.noiDung || trong
        ),
    },
    {
      title: "TK Nợ",
      key: "taiKhoanNo",
      width: 110,
      render: (_, record) =>
        oChon(
          record,
          "taiKhoanNo",
          opts.taiKhoan,
          record.danhMuc?.taiKhoanNo?.ma ? (
            <Tooltip title={record.danhMuc.taiKhoanNo.ten}>
              {record.danhMuc.taiKhoanNo.ma}
            </Tooltip>
          ) : (
            trong
          ),
        ),
    },
    {
      title: "TK Có",
      key: "taiKhoanCo",
      width: 110,
      render: (_, record) =>
        oChon(
          record,
          "taiKhoanCo",
          opts.taiKhoan,
          record.danhMuc?.taiKhoanCo?.ma ? (
            <Tooltip title={record.danhMuc.taiKhoanCo.ten}>
              {record.danhMuc.taiKhoanCo.ma}
            </Tooltip>
          ) : (
            trong
          ),
        ),
    },
    {
      title: "Số tiền",
      key: "soTien",
      width: 140,
      align: "right",
      render: (_, record) =>
        dangSua(record) ? (
          <InputNumber
            size="small"
            variant="borderless"
            className="w-full"
            min={0}
            formatter={(v) => tien(Number(v))}
            parser={(v) => Number((v ?? "").replace(/\D/g, ""))}
            value={values.soTien ?? 0}
            onChange={(v) => doi("soTien", v ?? 0)}
          />
        ) : (
          <span className="font-medium">{tien(record.soTien)}</span>
        ),
    },
    {
      title: "ĐT Nợ",
      key: "doiTuong",
      width: 160,
      render: (_, record) =>
        oChon(record, "doiTuong", opts.doiTuong, ten(record.danhMuc?.doiTuong)),
    },
    {
      title: "ĐT Có",
      key: "doiTuong2",
      width: 160,
      render: (_, record) =>
        oChon(record, "doiTuong2", opts.doiTuong, ten(record.danhMuc?.doiTuong2)),
    },
    {
      title: "Chủ đầu tư",
      key: "chuDauTu",
      width: 160,
      render: (_, record) =>
        oChon(
          record,
          "chuDauTu",
          opts.chuDauTu,
          // Chủ đầu tư có thể đi kèm dự án nếu không chọn riêng.
          ten(
            record.danhMuc?.chuDauTu ??
              (record.danhMuc?.duAn?.chuDauTuTen
                ? {
                    ma: record.danhMuc.duAn.chuDauTuMa,
                    ten: record.danhMuc.duAn.chuDauTuTen,
                  }
                : undefined),
          ),
        ),
    },
    {
      title: "Dự án",
      key: "duAn",
      width: 160,
      render: (_, record) => oChon(record, "duAn", opts.duAn, ten(record.danhMuc?.duAn)),
    },
    {
      title: "Sản phẩm",
      key: "sanPham",
      width: 160,
      render: (_, record) =>
        oChon(record, "sanPham", opts.sanPham, ten(record.danhMuc?.sanPham)),
    },
    {
      title: "Bộ phận",
      key: "boPhan",
      width: 150,
      render: (_, record) =>
        oChon(record, "boPhan", opts.boPhan, ten(record.danhMuc?.boPhan)),
    },
    {
      title: "Đội",
      key: "doi",
      width: 140,
      render: (_, record) => oChon(record, "doi", opts.doi, ten(record.danhMuc?.doi)),
    },
    {
      title: "Nhân viên",
      key: "nhanVien",
      width: 160,
      render: (_, record) =>
        oChon(record, "nhanVien", opts.nhanVien, ten(record.danhMuc?.nhanVien)),
    },
    {
      title: "Dòng tiền",
      key: "dongTien",
      width: 150,
      render: (_, record) =>
        oChon(record, "dongTien", opts.dongTien, ten(record.danhMuc?.dongTien)),
    },
    {
      title: "Khoản mục",
      key: "khoanMuc",
      width: 160,
      render: (_, record) =>
        oChon(record, "khoanMuc", opts.khoanMuc, ten(record.danhMuc?.khoanMuc)),
    },
    {
      // Nhóm khoản mục đi theo khoản mục (không nhập tay) — xem spec Kế hoạch & Dự báo.
      title: "Nhóm khoản mục",
      key: "nhomKhoanMuc",
      width: 160,
      render: (_, record) => {
        const nhom = dangSua(record)
          ? nhomKhoanMucCua(
              {
                khoanMuc: (khoanMucList as MucDanhMuc[]).find(
                  (k) => k.ma === values.khoanMuc,
                ) as never,
              },
              nhomKhoanMucList as MucDanhMuc[],
            )
          : nhomKhoanMucCua(record.danhMuc, nhomKhoanMucList as MucDanhMuc[]);
        return nhom ? <span className="text-gray-600">{nhom}</span> : trong;
      },
    },
    {
      title: "Nhóm quản lý",
      key: "nhomQuanLy",
      width: 160,
      render: (_, record) =>
        oChon(record, "nhomQuanLy", opts.nhomQuanLy, ten(record.danhMuc?.nhomQuanLy)),
    },
    {
      title: "",
      key: "action",
      width: 96,
      fixed: "right",
      align: "center",
      render: (_, record) =>
        dangSua(record) ? (
          <Space size={2}>
            <Button
              type="text"
              size="small"
              icon={<SaveOutlined />}
              loading={savingRow as boolean}
              onClick={() => handler.executeEvent("luuDong", {})}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handler.executeEvent("huySuaDong", {})}
            />
          </Space>
        ) : (
          <Space size={2}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handler.executeEvent("suaDong", { record })}
            />
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handler.executeEvent("nhanBanDong", { record })}
            />
            <Popconfirm
              title="Xóa dòng kế hoạch này?"
              okText="Xóa"
              cancelText="Hủy"
              onConfirm={() => handler.executeEvent("xoaDong", { id: record.id })}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
    },
  ];

  // Dòng đang thêm mới nằm trên đầu bảng, chưa có trong dữ liệu trả về từ BE.
  const dongMoi: KeHoachDong[] =
    editingRowId === DONG_MOI_ID
      ? [{ id: DONG_MOI_ID, ngay: values.ngay ?? "", soTien: 0, noiDung: "" } as KeHoachDong]
      : [];

  const meta = (pagination ?? { total: 0, page: 1, limit: 100 }) as {
    total: number;
    page: number;
    limit: number;
  };

  return (
    <Table<KeHoachDong>
      rowKey="id"
      size="small"
      bordered
      loading={loading as boolean}
      columns={columns}
      dataSource={[...dongMoi, ...((data ?? []) as KeHoachDong[])]}
      scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
      rowSelection={{
        selectedRowKeys: selectedRowKeys as string[],
        onChange: (keys) => handler.setState("selectedRowKeys", keys as string[]),
        getCheckboxProps: (record) => ({ disabled: record.id === DONG_MOI_ID }),
      }}
      pagination={{
        current: meta.page,
        pageSize: meta.limit,
        total: meta.total,
        showSizeChanger: true,
        pageSizeOptions: [50, 100, 200, 500],
        showTotal: (t) => `${t} dòng kế hoạch`,
        onChange: (page, limit) => handler.executeEvent("loadPage", { page, limit }),
      }}
    />
  );
};
