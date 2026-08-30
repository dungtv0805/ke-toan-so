import React, { useCallback, useMemo, useState } from "react";
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
  ReloadOutlined,
  FileExcelOutlined,
  LockOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnType, ColumnsType } from "antd/es/table";
import { useColumnVisibility } from "@/components/table/useColumnVisibility";
import { useTableColumnResize } from "@/hooks/useTableColumnResize";
import { useTableBodyHeight } from "@/hooks/useTableBodyHeight";
import { usePagePermission } from "@/hooks/usePagePermission";
import {
  NHAN_BANG_NGUON,
  type KeHoachDong,
  type LoaiKeHoach,
} from "@/services/keHoachService";
import { useKeHoachHandler, useKeHoachState } from "../KeHoachHandlerContext";
import { useKeHoachColumnFilters } from "../hooks/useKeHoachColumnFilters";
import { DONG_MOI_ID } from "../handler/sub-handler/row-edit/row-edit.state";
import { ngayLuu, nhomKhoanMucCua, type MucDanhMuc, type RowValues } from "../lib/keHoachRow";
import { ToolbarSlot } from "./toolbar-slot/ToolbarSlot";
import { ImportKeHoachModal } from "../import/ImportKeHoachModal";
import { sapXepTheoNhan } from "@/lib/sapXep";

const WIDTH_STORAGE_KEY = "table-col-widths-ke-hoach-v1";

const tien = (v?: number) => new Intl.NumberFormat("vi-VN").format(v ?? 0);

/** Chữ trong ô: hiện đủ, dài thì xuống dòng — cùng cách render với bảng bút toán. */
const renderEllipsisText = (text: string | undefined | null) => {
  if (!text) return <span className="text-gray-400">-</span>;
  return <span className="excel-cell-text">{text}</span>;
};

const toOptions = (list: MucDanhMuc[] = []) =>
  sapXepTheoNhan(list.map((m) => ({ value: m.ma, label: `${m.ma} - ${m.ten}` })));

/** Bề rộng mặc định từng cột (người dùng kéo tay được, lưu ở localStorage). */
const DEFAULT_WIDTHS: Record<string, number> = {
  ngay: 120,
  nghiepVu: 150,
  noiDung: 200,
  taiKhoanNo: 80,
  taiKhoanCo: 80,
  soTien: 120,
  doiTuong: 130,
  doiTuong2: 130,
  chuDauTu: 130,
  duAn: 130,
  sanPham: 130,
  boPhan: 120,
  doi: 110,
  nhanVien: 120,
  dongTien: 110,
  khoanMuc: 120,
  nhomKhoanMuc: 130,
  nhomQuanLy: 120,
  action: 96,
};

const TOTAL_WIDTH = Object.values(DEFAULT_WIDTHS).reduce((s, w) => s + w, 0);

/** Lưới 17 cột của Kế hoạch / Dự báo — giao diện bám đúng bảng bút toán. */
export const KeHoachTable: React.FC = () => {
  const handler = useKeHoachHandler();
  const [data] = useKeHoachState("data", []);
  const [loading] = useKeHoachState("loading", false);
  const [pagination] = useKeHoachState("pagination");
  const [editingRowId] = useKeHoachState("editingRowId", null);
  const [editingValues] = useKeHoachState("editingValues", {});
  const [savingRow] = useKeHoachState("savingRow", false);
  const [selectedRowKeys] = useKeHoachState("selectedRowKeys", []);
  const [loaiKeHoach] = useKeHoachState("loaiKeHoach", "KE_HOACH");

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

  const [importOpen, setImportOpen] = useState(false);
  const { withColumnFilter } = useKeHoachColumnFilters();
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();
  useTableColumnResize("resizable-table", WIDTH_STORAGE_KEY);

  const duongDan =
    (loaiKeHoach as LoaiKeHoach) === "DU_BAO"
      ? "/trung-tam-du-lieu/du-bao"
      : "/trung-tam-du-lieu/ke-hoach";
  const { canCreate, canDelete } = usePagePermission(duongDan);

  const values = (editingValues ?? {}) as RowValues;
  const dangSua = (record: KeHoachDong) => record.id === editingRowId;
  const doi = (field: keyof RowValues, value: unknown) =>
    handler.executeEvent("doiGiaTri", { field, value });
  const lamMoi = useCallback(
    () => handler.executeEvent("refresh", {}),
    [handler],
  );

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
        (boPhanList as MucDanhMuc[]).filter((b) => b.ten?.toLowerCase().includes("đội")),
      ),
      boPhan: toOptions(boPhanList as MucDanhMuc[]),
      duAn: toOptions(duAnList as MucDanhMuc[]),
      sanPham: toOptions(sanPhamList as MucDanhMuc[]),
      dongTien: toOptions(dongTienList as MucDanhMuc[]),
      khoanMuc: toOptions(khoanMucList as MucDanhMuc[]),
      nhomQuanLy: toOptions(nhomQuanLyList as MucDanhMuc[]),
      chuDauTu: toOptions(chuDauTuList as MucDanhMuc[]),
      nghiepVu: sapXepTheoNhan(
        [
          ...new Set(
            (quyChuanList as { nghiepVu: string }[]).map((q) => q.nghiepVu).filter(Boolean),
          ),
        ].map((n) => ({ value: n, label: n })),
      ),
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

  /** Ô danh mục: đang sửa dòng thì thành Select, không thì hiện tên đã chốt. */
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
        className="w-full excel-cell-input"
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
    v?.ten ? <Tooltip title={v.ma}>{renderEllipsisText(v.ten)}</Tooltip> : renderEllipsisText(null);

  const baseColumns: ColumnsType<KeHoachDong> = useMemo(
    () => [
      {
        // KHÔNG ghim trái cột nào: bảng này có ô tick chọn dòng + cột "Chức năng" ghim
        // phải, thêm cột ghim trái là hàng tiêu đề lệch hẳn một ô trên trình duyệt thật
        // (đúng vết xe đổ đã ghi ở EntryListTab; jsdom không tái hiện được).
        title: "Ngày phát sinh",
        key: "ngay",
        render: (_, record) =>
          dangSua(record) ? (
            <DatePicker
              size="small"
              variant="borderless"
              format="DD/MM/YYYY"
              allowClear={false}
              className="excel-cell-input"
              value={values.ngay ? dayjs(values.ngay) : undefined}
              onChange={(d) => doi("ngay", d ? ngayLuu(d) : undefined)}
            />
          ) : (
            dayjs(record.ngay).format("DD/MM/YY")
          ),
      },
      {
        title: "Nghiệp vụ",
        key: "nghiepVu",
        render: (_, record) =>
          oChon(
            record,
            "nghiepVu",
            opts.nghiepVu,
            renderEllipsisText(record.danhMuc?.nghiepVu?.ten),
          ),
      },
      {
        title: "Diễn giải",
        key: "noiDung",
        render: (_, record) =>
          dangSua(record) ? (
            <Input
              size="small"
              variant="borderless"
              className="excel-cell-input"
              value={values.noiDung ?? ""}
              onChange={(e) => doi("noiDung", e.target.value)}
            />
          ) : (
            renderEllipsisText(record.noiDung)
          ),
      },
      {
        title: "TK Nợ",
        key: "taiKhoanNo",
        render: (_, record) =>
          oChon(
            record,
            "taiKhoanNo",
            opts.taiKhoan,
            record.danhMuc?.taiKhoanNo?.ma ? (
              <Tooltip title={record.danhMuc.taiKhoanNo.ten}>
                <span className="text-blue-600">{record.danhMuc.taiKhoanNo.ma}</span>
              </Tooltip>
            ) : (
              renderEllipsisText(null)
            ),
          ),
      },
      {
        title: "TK Có",
        key: "taiKhoanCo",
        render: (_, record) =>
          oChon(
            record,
            "taiKhoanCo",
            opts.taiKhoan,
            record.danhMuc?.taiKhoanCo?.ma ? (
              <Tooltip title={record.danhMuc.taiKhoanCo.ten}>
                <span className="text-blue-600">{record.danhMuc.taiKhoanCo.ma}</span>
              </Tooltip>
            ) : (
              renderEllipsisText(null)
            ),
          ),
      },
      {
        title: "Số tiền",
        key: "soTien",
        align: "right",
        render: (_, record) =>
          dangSua(record) ? (
            <InputNumber
              size="small"
              variant="borderless"
              className="w-full excel-cell-input"
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
        render: (_, r) => oChon(r, "doiTuong", opts.doiTuong, ten(r.danhMuc?.doiTuong)),
      },
      {
        title: "ĐT Có",
        key: "doiTuong2",
        render: (_, r) => oChon(r, "doiTuong2", opts.doiTuong, ten(r.danhMuc?.doiTuong2)),
      },
      {
        title: "Chủ đầu tư",
        key: "chuDauTu",
        render: (_, r) =>
          oChon(
            r,
            "chuDauTu",
            opts.chuDauTu,
            // Chủ đầu tư có thể đi kèm dự án nếu không chọn riêng.
            ten(
              r.danhMuc?.chuDauTu ??
                (r.danhMuc?.duAn?.chuDauTuTen
                  ? { ma: r.danhMuc.duAn.chuDauTuMa, ten: r.danhMuc.duAn.chuDauTuTen }
                  : undefined),
            ),
          ),
      },
      { title: "Dự án", key: "duAn", render: (_, r) => oChon(r, "duAn", opts.duAn, ten(r.danhMuc?.duAn)) },
      { title: "Sản phẩm", key: "sanPham", render: (_, r) => oChon(r, "sanPham", opts.sanPham, ten(r.danhMuc?.sanPham)) },
      { title: "Bộ phận", key: "boPhan", render: (_, r) => oChon(r, "boPhan", opts.boPhan, ten(r.danhMuc?.boPhan)) },
      { title: "Đội", key: "doi", render: (_, r) => oChon(r, "doi", opts.doi, ten(r.danhMuc?.doi)) },
      { title: "Nhân viên", key: "nhanVien", render: (_, r) => oChon(r, "nhanVien", opts.nhanVien, ten(r.danhMuc?.nhanVien)) },
      { title: "Dòng tiền", key: "dongTien", render: (_, r) => oChon(r, "dongTien", opts.dongTien, ten(r.danhMuc?.dongTien)) },
      { title: "Khoản mục", key: "khoanMuc", render: (_, r) => oChon(r, "khoanMuc", opts.khoanMuc, ten(r.danhMuc?.khoanMuc)) },
      {
        // Nhóm khoản mục đi theo khoản mục đã chọn — không nhập tay, giống chứng từ.
        title: "Nhóm khoản mục",
        key: "nhomKhoanMuc",
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
          return renderEllipsisText(nhom);
        },
      },
      {
        title: "Nhóm quản lý",
        key: "nhomQuanLy",
        render: (_, r) => oChon(r, "nhomQuanLy", opts.nhomQuanLy, ten(r.danhMuc?.nhomQuanLy)),
      },
      {
        title: <span>Chức năng</span>,
        key: "action",
        fixed: "right",
        align: "center",
        render: (_, record) =>
          dangSua(record) ? (
            <Space size={2}>
              <Tooltip title="Lưu dòng">
                <Button
                  type="text"
                  size="small"
                  icon={<SaveOutlined />}
                  loading={savingRow as boolean}
                  onClick={() => handler.executeEvent("luuDong", {})}
                />
              </Tooltip>
              <Tooltip title="Hủy">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handler.executeEvent("huySuaDong", {})}
                />
              </Tooltip>
            </Space>
          ) : record.nguonId ? (
            // Dòng do bảng chi tiết sinh ra: sửa tay ở đây sẽ bị ghi đè ở lần
            // lưu bảng nguồn kế tiếp, nên chặn từ đầu thay vì để mất dữ liệu.
            <Tooltip
              title={`Sinh tự động từ bảng ${
                NHAN_BANG_NGUON[record.nguonLoai ?? ""] ?? "chi tiết"
              } — sửa ở bảng đó`}
            >
              <LockOutlined className="text-gray-400" />
            </Tooltip>
          ) : (
            <Space size={2}>
              <Tooltip title="Sửa dòng">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handler.executeEvent("suaDong", { record })}
                />
              </Tooltip>
              <Tooltip title="Nhân bản dòng">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handler.executeEvent("nhanBanDong", { record })}
                />
              </Tooltip>
              {canDelete && (
                <Popconfirm
                  title="Xóa dòng kế hoạch này?"
                  okText="Xóa"
                  okButtonProps={{ danger: true }}
                  cancelText="Hủy"
                  onConfirm={() => handler.executeEvent("xoaDong", { id: record.id })}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </Space>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opts, values, editingRowId, savingRow, khoanMucList, nhomKhoanMucList, canDelete],
  );

  // Gắn nút lọc (kính lúp / phễu) vào header cột + bề rộng mặc định.
  const columns = useMemo(
    () =>
      baseColumns.map((col) =>
        withColumnFilter({
          ...col,
          width: DEFAULT_WIDTHS[col.key as string] || 120,
        } as ColumnType<KeHoachDong>),
      ),
    [baseColumns, withColumnFilter],
  );

  const labelOf = useCallback((col: ColumnType<KeHoachDong>): string | null => {
    const title = col.title as unknown;
    return typeof title === "string" ? title.trim() || null : null;
  }, []);

  const { columns: visibleColumns, chooserButton } = useColumnVisibility(
    "keHoach.list.v1",
    columns,
    labelOf,
    {
      // Width resize lưu theo CHỈ SỐ cột → ẩn/hiện làm lệch. Xoá để cột về mặc định.
      onChange: () => {
        try {
          localStorage.removeItem(WIDTH_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      },
    },
  );

  // Dòng đang thêm mới (từ nhân bản) nằm trên đầu bảng, chưa có ở dữ liệu từ BE.
  const dongMoi: KeHoachDong[] =
    editingRowId === DONG_MOI_ID
      ? [{ id: DONG_MOI_ID, ngay: values.ngay ?? "", soTien: 0, noiDung: "" } as KeHoachDong]
      : [];

  const meta = (pagination ?? { total: 0, page: 1, limit: 100 }) as {
    total: number;
    page: number;
    limit: number;
  };
  const dsChon = (selectedRowKeys ?? []) as string[];

  return (
    <div className="excel-tab-content">
      <ToolbarSlot>
        <Space size="small">
          {canDelete && dsChon.length > 0 && (
            <Popconfirm
              title={`Xóa ${dsChon.length} dòng kế hoạch đã chọn?`}
              okText="Xóa"
              okButtonProps={{ danger: true }}
              cancelText="Hủy"
              onConfirm={() => handler.executeEvent("xoaNhieuDong", {})}
            >
              <Button danger size="small" icon={<DeleteOutlined />}>
                Xóa đã chọn ({dsChon.length})
              </Button>
            </Popconfirm>
          )}
          {canCreate && (
            <Button
              size="small"
              icon={<FileExcelOutlined />}
              onClick={() => setImportOpen(true)}
            >
              Import Excel
            </Button>
          )}
          <Button
            size="small"
            icon={<FileExcelOutlined />}
            onClick={() => handler.executeEvent("xuatExcel", {})}
          >
            Xuất Excel
          </Button>

          <span className="xl-cmd-sep" />

          <Button
            size="small"
            icon={<ReloadOutlined />}
            title="Làm mới dữ liệu"
            onClick={lamMoi}
          />
          {chooserButton}
        </Space>
      </ToolbarSlot>

      <div ref={tableWrapRef} className="flex flex-col flex-1 min-h-0">
        <Table<KeHoachDong>
          rowKey="id"
          size="small"
          bordered
          className="excel-table resizable-table"
          loading={loading as boolean}
          columns={visibleColumns}
          dataSource={[...dongMoi, ...((data ?? []) as KeHoachDong[])]}
          rowClassName={(record) => (record.id === editingRowId ? "editing-row" : "")}
          rowSelection={{
            selectedRowKeys: dsChon,
            onChange: (keys) => handler.setState("selectedRowKeys", keys as string[]),
            getCheckboxProps: (record) => ({ disabled: record.id === DONG_MOI_ID }),
          }}
          pagination={{
            current: meta.page,
            pageSize: meta.limit,
            total: meta.total,
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            size: "small",
            onChange: (page) => handler.executeEvent("loadPage", { page }),
          }}
          scroll={{
            x:
              visibleColumns.reduce(
                (sum, c) => sum + (typeof c.width === "number" ? c.width : 120),
                0,
              ) || TOTAL_WIDTH,
            y: tableBodyHeight,
          }}
        />
      </div>

      <ImportKeHoachModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};
