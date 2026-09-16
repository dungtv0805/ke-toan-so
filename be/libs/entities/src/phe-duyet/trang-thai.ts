/**
 * Trạng thái nghiệp vụ — mục 10 tài liệu.
 *
 * Do workflow điều khiển, KHÔNG cho người dùng tự chọn (nguyên tắc mục 2).
 * `DA_KIEM_SOAT` và `CHINH_THUC` tách làm hai vì tài liệu tách: "đã đủ cấp
 * duyệt" là sự kiện của workflow, "được chạy vào báo cáo" là quyết định của
 * kế toán. Hiện engine chuyển thẳng DA_KIEM_SOAT → CHINH_THUC trong cùng một
 * thao tác; tách sẵn để sau này chèn bước khoá sổ mà không phải đổi kiểu.
 */
export type TrangThaiPheDuyet =
  | 'NHAP'
  | 'CHO_PHE_DUYET'
  | 'YEU_CAU_BO_SUNG'
  | 'TU_CHOI'
  | 'DA_KIEM_SOAT'
  | 'CHINH_THUC';

/** Chỉ trạng thái này mới được chạy vào báo cáo chính thức — mục 12. */
export const TRANG_THAI_CHINH_THUC: TrangThaiPheDuyet = 'CHINH_THUC';

export const NHAN_TRANG_THAI: Record<TrangThaiPheDuyet, string> = {
  NHAP: 'Nháp',
  CHO_PHE_DUYET: 'Chờ phê duyệt',
  YEU_CAU_BO_SUNG: 'Yêu cầu bổ sung',
  TU_CHOI: 'Từ chối',
  DA_KIEM_SOAT: 'Đã kiểm soát đủ',
  CHINH_THUC: 'Chính thức',
};

/** Trạng thái của MỘT bước trong luồng — mục 7 ("đã duyệt, đang chờ, chưa đến lượt"). */
export type TrangThaiBuoc =
  | 'CHUA_DEN_LUOT'
  | 'DANG_CHO'
  | 'DA_DUYET'
  | 'TRA_LAI'
  | 'TU_CHOI';

/** Kết quả một lần xử lý, ghi vào lịch sử — mục 14. */
export type KetQuaXuLy =
  | 'GUI_DUYET'
  | 'DUYET'
  | 'TRA_LAI'
  | 'TU_CHOI'
  | 'SUA_TRONG_YEU';

/**
 * Loại đối tượng được phê duyệt — mục 17. Đợt này chỉ có chứng từ kế toán;
 * thêm loại mới chỉ cần khai thêm ở đây và ở `DongBoTrangThaiService`.
 */
export type LoaiDoiTuongPheDuyet = 'CHUNG_TU';
