import React, { useMemo } from "react";
import { Table, Select, InputNumber, Input, DatePicker, Button, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, CopyOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { ngayLuu, nhomKhoanMucCua, type MucDanhMuc } from "../../lib/keHoachRow";
import { useKeHoachFormHandler, useKeHoachFormState } from "../KeHoachFormHandlerContext";
import type { DongKeHoach, QuyChuanGoiY } from "../lib/keHoachFormRows";

const toOptions = (list: MucDanhMuc[] = []) =>
  list.map((m) => ({ value: m.ma, label: `${m.ma} - ${m.ten}` }));

/**
 * Bảng chi tiết của form Kế hoạch — cùng kiểu nhập với "Chi tiết hạch toán" của
 * chứng từ: ô nhập nằm thẳng trong bảng, thêm/nhân bản/xóa từng dòng.
 */
export const DongTable: React.FC = () => {
  const handler = useKeHoachFormHandler();
  const [dongList] = useKeHoachFormState("dongList", []);
  const [taiKhoanList] = useKeHoachFormState("taiKhoanList", []);
  const [doiTuongList] = useKeHoachFormState("doiTuongList", []);
  const [duAnList] = useKeHoachFormState("duAnList", []);
  const [boPhanList] = useKeHoachFormState("boPhanList", []);
  const [sanPhamList] = useKeHoachFormState("sanPhamList", []);
  const [dongTienList] = useKeHoachFormState("dongTienList", []);
  const [khoanMucList] = useKeHoachFormState("khoanMucList", []);
  const [nhomQuanLyList] = useKeHoachFormState("nhomQuanLyList", []);
  const [chuDauTuList] = useKeHoachFormState("chuDauTuList", []);
  const [nhomKhoanMucList] = useKeHoachFormState("nhomKhoanMucList", []);
  const [quyChuanList] = useKeHoachFormState("quyChuanList", []);

  const sua = (key: string, field: keyof DongKeHoach, value: unknown) =>
    handler.executeEvent("suaDong", { key, field, value });

  const opts = useMemo(
    () => ({
      taiKhoan: toOptions(taiKhoanList as MucDanhMuc[]),
      doiTuong: toOptions(doiTuongList as MucDanhMuc[]),
      nhanVien: toOptions(
        (doiTuongList as MucDanhMuc[]).filter((d) =>
          String(d.loai ?? "").includes("NHAN_VIEN"),
        ),
      ),
      doi: toOptions(
        (boPhanList as MucDanhMuc[]).filter((b) => b.ten?.toLowerCase().includes("đội")),
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
          (quyChuanList as QuyChuanGoiY[]).map((q) => q.nghiepVu).filter(Boolean),
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

  /** Ô chọn danh mục dùng chung cho mọi cột chiều. */
  const oChon = (
    record: DongKeHoach,
    field: keyof DongKeHoach,
    options: { value: string; label: string }[],
    rong = 250,
  ) => (
    <Select
      size="small"
      showSearch
      allowClear
      placeholder="Chọn"
      optionFilterProp="label"
      value={(record[field] as string) || undefined}
      onChange={(v) => sua(record.key, field, v)}
      options={options}
      className="w-full excel-cell-input"
      variant="borderless"
      popupMatchSelectWidth={rong}
    />
  );

  const columns: ColumnsType<DongKeHoach> = [
    {
      title: "STT",
      key: "stt",
      width: 50,
      fixed: "left",
      render: (_, __, index) => (
        <span className="font-medium text-gray-500">{index + 1}</span>
      ),
    },
    {
      title: (
        <span>
          Ngày <span className="text-red-500">*</span>
        </span>
      ),
      key: "ngay",
      width: 130,
      fixed: "left",
      render: (_, record) => (
        <DatePicker
          size="small"
          variant="borderless"
          format="DD/MM/YYYY"
          allowClear={false}
          className="w-full"
          value={record.ngay ? dayjs(record.ngay) : undefined}
          onChange={(d) => sua(record.key, "ngay", d ? ngayLuu(d) : undefined)}
        />
      ),
    },
    {
      title: "Nghiệp vụ",
      key: "nghiepVu",
      width: 170,
      render: (_, record) => oChon(record, "nghiepVu", opts.nghiepVu, 280),
    },
    {
      title: "Diễn giải",
      key: "noiDung",
      width: 220,
      render: (_, record) => (
        <Input
          size="small"
          variant="borderless"
          className="excel-cell-input"
          value={record.noiDung ?? ""}
          onChange={(e) => sua(record.key, "noiDung", e.target.value)}
        />
      ),
    },
    {
      title: (
        <span>
          TK Nợ <span className="text-red-500">*</span>
        </span>
      ),
      key: "taiKhoanNo",
      width: 120,
      render: (_, record) => oChon(record, "taiKhoanNo", opts.taiKhoan),
    },
    {
      title: (
        <span>
          TK Có <span className="text-red-500">*</span>
        </span>
      ),
      key: "taiKhoanCo",
      width: 120,
      render: (_, record) => oChon(record, "taiKhoanCo", opts.taiKhoan),
    },
    {
      title: (
        <span>
          Số tiền <span className="text-red-500">*</span>
        </span>
      ),
      key: "soTien",
      width: 140,
      align: "right",
      render: (_, record) => (
        <InputNumber
          size="small"
          variant="borderless"
          className="w-full excel-cell-input"
          min={0}
          formatter={(v) => new Intl.NumberFormat("vi-VN").format(Number(v) || 0)}
          parser={(v) => Number((v ?? "").replace(/\D/g, ""))}
          value={record.soTien ?? 0}
          onChange={(v) => sua(record.key, "soTien", v ?? 0)}
        />
      ),
    },
    { title: "ĐT Nợ", key: "doiTuong", width: 160, render: (_, r) => oChon(r, "doiTuong", opts.doiTuong) },
    { title: "ĐT Có", key: "doiTuong2", width: 160, render: (_, r) => oChon(r, "doiTuong2", opts.doiTuong) },
    { title: "Chủ đầu tư", key: "chuDauTu", width: 160, render: (_, r) => oChon(r, "chuDauTu", opts.chuDauTu) },
    { title: "Dự án", key: "duAn", width: 160, render: (_, r) => oChon(r, "duAn", opts.duAn) },
    { title: "Sản phẩm", key: "sanPham", width: 160, render: (_, r) => oChon(r, "sanPham", opts.sanPham) },
    { title: "Bộ phận", key: "boPhan", width: 150, render: (_, r) => oChon(r, "boPhan", opts.boPhan) },
    { title: "Đội", key: "doi", width: 140, render: (_, r) => oChon(r, "doi", opts.doi) },
    { title: "Nhân viên", key: "nhanVien", width: 160, render: (_, r) => oChon(r, "nhanVien", opts.nhanVien) },
    { title: "Dòng tiền", key: "dongTien", width: 150, render: (_, r) => oChon(r, "dongTien", opts.dongTien) },
    { title: "Khoản mục", key: "khoanMuc", width: 160, render: (_, r) => oChon(r, "khoanMuc", opts.khoanMuc) },
    {
      // Nhóm khoản mục đi theo khoản mục đã chọn — không nhập tay (giống chứng từ).
      title: "Nhóm khoản mục",
      key: "nhomKhoanMuc",
      width: 150,
      render: (_, record) => {
        const khoanMuc = (khoanMucList as MucDanhMuc[]).find(
          (k) => k.ma === record.khoanMuc,
        );
        const nhom = nhomKhoanMucCua(
          { khoanMuc: khoanMuc as never },
          nhomKhoanMucList as MucDanhMuc[],
        );
        return nhom ? (
          <span className="text-gray-600 text-xs">{nhom}</span>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        );
      },
    },
    { title: "Nhóm QL", key: "nhomQuanLy", width: 150, render: (_, r) => oChon(r, "nhomQuanLy", opts.nhomQuanLy) },
    {
      title: "",
      key: "action",
      width: 80,
      fixed: "right",
      align: "center",
      render: (_, record) => (
        <div className="flex justify-center gap-1">
          <Tooltip title="Nhân bản dòng">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handler.executeEvent("nhanBanDong", { key: record.key })}
            />
          </Tooltip>
          <Tooltip title="Xóa dòng">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handler.executeEvent("xoaDong", { key: record.key })}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Table<DongKeHoach>
        rowKey="key"
        size="small"
        bordered
        columns={columns}
        dataSource={(dongList ?? []) as DongKeHoach[]}
        pagination={false}
        scroll={{ x: "max-content", y: "calc(100vh - 380px)" }}
      />
      <div className="p-2 flex gap-2">
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handler.executeEvent("themDong", {})}
        >
          Thêm dòng
        </Button>
        <Button
          type="dashed"
          size="small"
          onClick={() => handler.executeEvent("themDong", { soLuong: 10 })}
        >
          Thêm 10 dòng
        </Button>
      </div>
    </div>
  );
};
