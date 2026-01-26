import { useEffect, useCallback, useRef } from "react";
import { Table, Select, InputNumber, Input, Button, Tooltip, Popconfirm } from "antd";
import { PlusOutlined, DeleteOutlined, CopyOutlined } from "@ant-design/icons";
import {
  useNhatKyChungFormState,
  useNhatKyChungFormHandler,
} from "../../NhatKyChungFormHandlerContext";
import {
  ChungTuChiTiet,
  TaiKhoanItem,
  ChungTuHeader,
} from "../../form-handler/sub-handler/init/init.state";
import { DoiTuong, DuAn, BoPhan, SanPham, DongTien, QuyChuan } from "@/types";
import {
  buildDoiTuongSnapshot,
  buildDuAnSnapshot,
  buildBoPhanSnapshot,
  buildSanPhamSnapshot,
  buildDongTienSnapshot,
} from "@/utils/snapshotBuilder";
import { useTableColumnResize } from "@/hooks/useTableColumnResize";

export function ChiTietTable() {
  const handler = useNhatKyChungFormHandler();
  const [chiTietList] = useNhatKyChungFormState("chiTietList", []);
  const [taiKhoanList] = useNhatKyChungFormState("taiKhoanList", []);
  const [doiTuongList] = useNhatKyChungFormState("doiTuongList", []);
  const [duAnList] = useNhatKyChungFormState("duAnList", []);
  const [boPhanList] = useNhatKyChungFormState("boPhanList", []);
  const [sanPhamList] = useNhatKyChungFormState("sanPhamList", []);
  const [dongTienList] = useNhatKyChungFormState("dongTienList", []);
  const [quyChaunList] = useNhatKyChungFormState("quyChaunList", []);
  const [header] = useNhatKyChungFormState("header", null);

  // Lọc nghiệp vụ theo loại giao dịch từ header
  const typedHeader = header as ChungTuHeader | null;
  const nghiepVuOptions = (quyChaunList as QuyChuan[])
    .filter((qc) => !typedHeader?.loaiGiaoDich || qc.loaiGiaoDich === typedHeader.loaiGiaoDich)
    .map((qc) => ({
      value: qc.nghiepVu,
      label: qc.nghiepVu,
    }));

  // Enable column resize
  useTableColumnResize("chi-tiet-excel-table");

  // Track active row for keyboard navigation
  const tableRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<number>(0);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+N or Alt+N: Add new row
    if ((e.ctrlKey || e.altKey) && e.key === "n") {
      e.preventDefault();
      handler.executeEvent("addChiTiet", {});
    }
    // Ctrl+D: Duplicate current row
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault();
      const list = chiTietList as ChungTuChiTiet[];
      if (list.length > 0 && activeRowRef.current < list.length) {
        handler.executeEvent("duplicateChiTiet", { key: list[activeRowRef.current].key });
      }
    }
  }, [handler, chiTietList]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleUpdateField = (
    key: string,
    field: keyof ChungTuChiTiet,
    value: unknown
  ) => {
    handler.executeEvent("updateChiTiet", { key, field, value });
  };

  const handleDoiTuongChange = (key: string, doiTuongId: string | undefined) => {
    handleUpdateField(key, "doiTuongId", doiTuongId);
    if (doiTuongId) {
      const doiTuong = (doiTuongList as DoiTuong[]).find((d) => d.id === doiTuongId);
      if (doiTuong) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "doiTuongSnapshot",
          snapshot: buildDoiTuongSnapshot(doiTuong),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "doiTuongSnapshot",
        snapshot: {},
      });
    }
  };

  const handleDuAnChange = (key: string, duAnId: string | undefined) => {
    handleUpdateField(key, "duAnId", duAnId);
    if (duAnId) {
      const duAn = (duAnList as DuAn[]).find((d) => d.id === duAnId);
      if (duAn) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "duAnSnapshot",
          snapshot: buildDuAnSnapshot(duAn),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "duAnSnapshot",
        snapshot: {},
      });
    }
  };

  const handleBoPhanChange = (key: string, boPhanId: string | undefined) => {
    handleUpdateField(key, "boPhanId", boPhanId);
    if (boPhanId) {
      const boPhan = (boPhanList as BoPhan[]).find((b) => b.id === boPhanId);
      if (boPhan) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "boPhanSnapshot",
          snapshot: buildBoPhanSnapshot(boPhan),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "boPhanSnapshot",
        snapshot: {},
      });
    }
  };

  const handleSanPhamChange = (key: string, sanPhamId: string | undefined) => {
    handleUpdateField(key, "sanPhamId", sanPhamId);
    if (sanPhamId) {
      const sanPham = (sanPhamList as SanPham[]).find((s) => s.id === sanPhamId);
      if (sanPham) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "sanPhamSnapshot",
          snapshot: buildSanPhamSnapshot(sanPham),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "sanPhamSnapshot",
        snapshot: {},
      });
    }
  };

  const handleDongTienChange = (key: string, dongTienId: string | undefined) => {
    handleUpdateField(key, "dongTienId", dongTienId);
    if (dongTienId) {
      const dongTien = (dongTienList as DongTien[]).find((d) => d.id === dongTienId);
      if (dongTien) {
        handler.executeEvent("updateChiTietSnapshot", {
          key,
          snapshotField: "dongTienSnapshot",
          snapshot: buildDongTienSnapshot(dongTien),
        });
      }
    } else {
      handler.executeEvent("updateChiTietSnapshot", {
        key,
        snapshotField: "dongTienSnapshot",
        snapshot: {},
      });
    }
  };

  const columns = [
    {
      title: "STT",
      width: 45,
      align: "center" as const,
      fixed: "left" as const,
      className: "excel-stt-cell",
      render: (_: unknown, __: unknown, index: number) => (
        <span className="font-medium text-gray-500">{index + 1}</span>
      ),
    },
    {
      title: (
        <span>
          Nghiệp vụ <span className="text-red-500">*</span>
        </span>
      ),
      dataIndex: "nghiepVu",
      width: 180,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          placeholder="Chọn nghiệp vụ"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handler.executeEvent("handleNghiepVuChange", { key: record.key, nghiepVu: v })}
          onFocus={() => { activeRowRef.current = index; }}
          options={nghiepVuOptions}
          className="w-full excel-cell-input"
          variant="borderless"
          status={!value ? "error" : ""}
          popupMatchSelectWidth={280}
          disabled={!typedHeader?.loaiGiaoDich}
        />
      ),
    },
    {
      title: "Diễn giải",
      dataIndex: "noiDung",
      width: 180,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Input
          size="small"
          placeholder="Nhập diễn giải"
          value={value || ""}
          onChange={(e) => handleUpdateField(record.key, "noiDung", e.target.value)}
          onFocus={() => { activeRowRef.current = index; }}
          className="excel-cell-input"
          variant="borderless"
        />
      ),
    },
    {
      title: (
        <span>
          TK Nợ <span className="text-red-500">*</span>
        </span>
      ),
      dataIndex: "taiKhoanNo",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          placeholder="Chọn TK"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleUpdateField(record.key, "taiKhoanNo", v || "")}
          onFocus={() => { activeRowRef.current = index; }}
          options={(taiKhoanList as TaiKhoanItem[]).map((tk) => ({
            value: tk.ma,
            label: `${tk.ma} - ${tk.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          status={!value ? "error" : ""}
          popupMatchSelectWidth={280}
        />
      ),
    },
    {
      title: (
        <span>
          TK Có <span className="text-red-500">*</span>
        </span>
      ),
      dataIndex: "taiKhoanCo",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          placeholder="Chọn TK"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleUpdateField(record.key, "taiKhoanCo", v || "")}
          onFocus={() => { activeRowRef.current = index; }}
          options={(taiKhoanList as TaiKhoanItem[]).map((tk) => ({
            value: tk.ma,
            label: `${tk.ma} - ${tk.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          status={!value ? "error" : ""}
          popupMatchSelectWidth={280}
        />
      ),
    },
    {
      title: (
        <span>
          Số tiền <span className="text-red-500">*</span>
        </span>
      ),
      dataIndex: "soTien",
      width: 130,
      render: (value: number, record: ChungTuChiTiet, index: number) => (
        <InputNumber
          size="small"
          min={0}
          className="w-full excel-cell-input"
          value={value}
          onChange={(v) => handleUpdateField(record.key, "soTien", v || 0)}
          onFocus={() => { activeRowRef.current = index; }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(v) => (v ? Number(v.replace(/\$\s?|(,*)/g, "")) : 0) as 0}
          variant="borderless"
          status={!value || value <= 0 ? "error" : ""}
        />
      ),
    },
    {
      title: "Đối tượng",
      dataIndex: "doiTuongId",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleDoiTuongChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(doiTuongList as DoiTuong[])
            .filter((d) => d.loai !== "NHAN_VIEN")
            .map((d) => ({
              value: d.id,
              label: `${d.ma} - ${d.ten}`,
            }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={280}
        />
      ),
    },
    {
      title: "Dự án",
      dataIndex: "duAnId",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleDuAnChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(duAnList as DuAn[]).map((da) => ({
            value: da.id,
            label: `${da.ma} - ${da.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={280}
        />
      ),
    },
    {
      title: "Bộ phận",
      dataIndex: "boPhanId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleBoPhanChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(boPhanList as BoPhan[])
            .filter((bp) => !bp.ten.toLowerCase().includes("đội"))
            .map((bp) => ({
              value: bp.id,
              label: `${bp.ma} - ${bp.ten}`,
            }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Sản phẩm",
      dataIndex: "sanPhamId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleSanPhamChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(sanPhamList as SanPham[]).map((sp) => ({
            value: sp.id,
            label: `${sp.ma} - ${sp.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Dòng tiền",
      dataIndex: "dongTienId",
      width: 130,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Select
          size="small"
          showSearch
          allowClear
          placeholder="Chọn"
          optionFilterProp="label"
          value={value || undefined}
          onChange={(v) => handleDongTienChange(record.key, v)}
          onFocus={() => { activeRowRef.current = index; }}
          options={(dongTienList as DongTien[]).map((dt) => ({
            value: dt.id,
            label: `${dt.ma} - ${dt.ten}`,
          }))}
          className="w-full excel-cell-input"
          variant="borderless"
          popupMatchSelectWidth={250}
        />
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "ghiChu",
      width: 150,
      render: (value: string, record: ChungTuChiTiet, index: number) => (
        <Input
          size="small"
          placeholder="Ghi chú"
          value={value || ""}
          onChange={(e) => handleUpdateField(record.key, "ghiChu", e.target.value)}
          onFocus={() => { activeRowRef.current = index; }}
          className="excel-cell-input"
          variant="borderless"
        />
      ),
    },
    {
      title: "",
      width: 70,
      align: "center" as const,
      fixed: "right" as const,
      className: "excel-action-cell",
      render: (_: unknown, record: ChungTuChiTiet) => (
        <div className="flex gap-0.5 justify-center">
          <Tooltip title="Nhân bản (Ctrl+D)">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handler.executeEvent("duplicateChiTiet", { key: record.key })}
              className="!px-1.5"
            />
          </Tooltip>
          <Popconfirm
            title="Xóa dòng này?"
            onConfirm={() => handler.executeEvent("removeChiTiet", { key: record.key })}
            okText="Xóa"
            cancelText="Hủy"
            disabled={(chiTietList as ChungTuChiTiet[]).length <= 1}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={(chiTietList as ChungTuChiTiet[]).length <= 1}
              className="!px-1.5"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  const total = (chiTietList as ChungTuChiTiet[]).reduce(
    (sum, item) => sum + (item.soTien || 0),
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  return (
    <div ref={tableRef} className="excel-tab-content excel-editable-table nkc-chi-tiet-wrapper">
      <div className="nkc-table-container">
        <Table
          columns={columns}
          dataSource={chiTietList as ChungTuChiTiet[]}
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ x: 1600 }}
          bordered
          className="excel-table resizable-table chi-tiet-excel-table"
          rowClassName={(_, index) =>
            index === activeRowRef.current ? "excel-row-active" : ""
          }
        />
      </div>

      {/* Footer with add button and total */}
      <div className="nkc-form-footer">
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handler.executeEvent("addChiTiet", {})}
          className="text-xs"
        >
          Thêm dòng (Ctrl+N)
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">
            {(chiTietList as ChungTuChiTiet[]).length} dòng
          </span>
          <div className="text-right">
            <span className="text-gray-500 text-xs sm:text-sm mr-2">Tổng cộng:</span>
            <span className="text-base sm:text-lg font-bold text-green-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
