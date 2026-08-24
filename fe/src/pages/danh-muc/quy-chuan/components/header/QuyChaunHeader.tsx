import React, { useState, useEffect, useMemo } from 'react';
import { Button } from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { FilterBar } from '@/components/common/FilterBar';
import { useQuyChaunHandler, useQuyChaunState } from '../../QuyChaunHandlerContext';
import { usePagePermission } from "@/hooks/usePagePermission";
import { ImportDanhMucButton } from '@/components/import-danh-muc';
import { quyChuanImportConfig } from '@/components/import-danh-muc/configs';
import { ExportDanhMucButton, ExportDanhMucConfig } from '@/components/export-danh-muc';
import { quyChauanService } from '@/services/quyChaunService';
import type { HoSoChungTuRef, LoaiGiaoDich, QuyChuan } from '@/types';
import './QuyChaunHeader.state';
import { PaginationMeta } from '../table/QuyChaunTable.state';
import type { CheDoXem } from '@/components/table/bang-cay';

// Cùng nhãn với bảng và với form: cột đã tên "Loại chi phí" nên không lặp chữ.
const NHAN_LOAI_CHI_PHI: Record<NonNullable<QuyChuan["loaiChiPhi"]>, string> = {
  CO_DINH: "Cố định",
  BIEN_DOI: "Biến đổi",
};

const DEFAULT_PAGINATION: PaginationMeta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

interface QuyChaunHeaderProps {
  settingsButton?: React.ReactNode;
  /** Nút "Xóa đã chọn (N)" — do trang cha dựng (useBulkDelete). */
  bulkDeleteButton?: React.ReactNode;
  /** Chế độ xem của bảng — file Excel xuất ra theo đúng dạng đang nhìn thấy. */
  cheDo?: CheDoXem;
}

export const QuyChaunHeader: React.FC<QuyChaunHeaderProps> = ({ settingsButton, bulkDeleteButton, cheDo }) => {
  const handler = useQuyChaunHandler();
  const { canCreate, canExport } = usePagePermission("/danh-muc/quy-chuan");
  const [searchText] = useQuyChaunState('searchText', '');
  const [activeTab] = useQuyChaunState('activeTab', 'all');
  const [pagination] = useQuyChaunState('pagination', DEFAULT_PAGINATION);
  const [loaiGiaoDichList] = useQuyChaunState('loaiGiaoDichList', [] as LoaiGiaoDich[]);
  const [localSearchText, setLocalSearchText] = useState(searchText);

  const exportConfig: ExportDanhMucConfig = useMemo(() => ({
    fileName: "danh-muc-quy-chuan",
    sheetName: "Quy chuẩn",
    title: "DANH MỤC QUY CHUẨN HẠCH TOÁN",
    // Đủ cột như bảng trên màn hình — trước đây file xuất ra chỉ có 5 cột và
    // bốn trong số đó trống trơn vì map sai tên trường (tkNo/tkCo/loaiGiaoDichMa
    // không tồn tại; entity dùng taiKhoanNo/taiKhoanCo/loaiGiaoDich).
    columns: [
      { header: "Nghiệp vụ", dataKey: "nghiepVu", width: 30 },
      { header: "Loại giao dịch", dataKey: "loaiGiaoDich", width: 20 },
      { header: "TK Nợ", dataKey: "taiKhoanNo", width: 12 },
      { header: "TK Có", dataKey: "taiKhoanCo", width: 12 },
      { header: "Định khoản", dataKey: "dinhKhoan", width: 22 },
      { header: "Nhóm khoản mục", dataKey: "nhomKhoanMuc", width: 20 },
      { header: "Khoản mục", dataKey: "khoanMuc", width: 18 },
      { header: "Dòng tiền", dataKey: "dongTien", width: 16 },
      { header: "Loại chi phí", dataKey: "loaiChiPhi", width: 14 },
      { header: "Mô tả", dataKey: "moTa", width: 40 },
      { header: "Biên tập hồ sơ", dataKey: "hoSoChungTu", width: 30 },
    ],
    fetchData: async () => {
      const data = await quyChauanService.getAll();
      const tenLoai = new Map(loaiGiaoDichList.map((l: LoaiGiaoDich) => [l.ma, l.ten]));
      return data.map((item: QuyChuan) => ({
        nghiepVu: item.nghiepVu || "",
        loaiGiaoDich: tenLoai.get(item.loaiGiaoDich) || item.loaiGiaoDich || "",
        taiKhoanNo: item.taiKhoanNo || "",
        taiKhoanCo: item.taiKhoanCo || "",
        dinhKhoan:
          item.taiKhoanNo || item.taiKhoanCo
            ? `Nợ ${item.taiKhoanNo || "-"} / Có ${item.taiKhoanCo || "-"}`
            : "",
        nhomKhoanMuc: item.nhomKhoanMuc || "",
        khoanMuc: item.khoanMuc || "",
        dongTien: item.dongTien || "",
        loaiChiPhi: item.loaiChiPhi ? NHAN_LOAI_CHI_PHI[item.loaiChiPhi] : "",
        hoSoChungTu: (item.hoSoChungTu ?? []).map((h: HoSoChungTuRef) => h.ten).join(", "),
        // Mã loại giao dịch thô — chỉ để gom nhóm, không có cột nào in ra.
        maLoaiGiaoDich: item.loaiGiaoDich || "",
      }));
    },
    // Đang xem dạng cây thì file cũng gom nhóm theo loại giao dịch — dùng chung
    // `gomTheoNhom` với bảng nên thứ tự nhóm y hệt trên màn hình.
    group: cheDo === 'cay'
      ? {
          layMa: (row) => row.maLoaiGiaoDich as string,
          danhMuc: loaiGiaoDichList,
          donVi: 'quy chuẩn',
          nhanTrong: '(Chưa gán loại giao dịch)',
          // Loại giao dịch đã nằm trên dòng tiêu đề nhóm — như bảng ở chế độ cây.
          boCot: ['loaiGiaoDich'],
        }
      : undefined,
  }), [loaiGiaoDichList, cheDo]);

  // Sync local state with global state (for refresh button)
  useEffect(() => {
    setLocalSearchText(searchText);
  }, [searchText]);

  const handleSearch = (value: string) => {
    // Use paginated search API
    handler.executeEvent('searchPaginated', { 
      keyword: value,
      page: 1,
      limit: pagination.limit,
      loaiGiaoDich: activeTab === 'all' ? undefined : activeTab,
    });
  };

  const handleRefresh = () => {
    handler.executeEvent('refresh', {});
  };

  const handleAdd = () => {
    handler.executeEvent('openModal', {});
  };

  const handleImported = () => {
    handler.executeEvent('refresh', {});
  };

  return (
    <>
      <FilterBar
        search={{
          value: localSearchText,
          onChange: setLocalSearchText,
          onSearch: () => handleSearch(localSearchText),
          placeholder: 'Tìm kiếm nghiệp vụ...',
          width: 250,
        }}
        onReset={handleRefresh}
        actions={
          <>
            {settingsButton}
            <ExportDanhMucButton config={exportConfig} canExport={canExport} />
            <ImportDanhMucButton
              config={quyChuanImportConfig}
              canCreate={canCreate}
              onImported={handleImported}
            />
            {bulkDeleteButton}
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                Thêm mới
              </Button>
            )}
          </>
        }
      />
    </>
  );
};
