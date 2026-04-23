import { NguoiDung, VaiTro } from '@/types';

export const vaiTroOptions: { value: VaiTro; label: string; color: string; description: string }[] = [
  { value: 'ADMIN', label: 'Quản trị viên', color: 'red', description: 'Toàn quyền quản lý hệ thống' },
  { value: 'GIAM_DOC', label: 'Giám đốc', color: 'gold', description: 'Phê duyệt, xem báo cáo tổng quan' },
  { value: 'KE_TOAN_TRUONG', label: 'Kế toán trưởng', color: 'magenta', description: 'Quản lý kế toán, phê duyệt chứng từ' },
  { value: 'KE_TOAN_QUY', label: 'Kế toán quỹ', color: 'blue', description: 'Quản lý thu chi, sổ quỹ' },
  { value: 'KE_TOAN_CONG_NO', label: 'Kế toán công nợ', color: 'orange', description: 'Quản lý công nợ phải thu/trả' },
  { value: 'KE_TOAN_TONG_HOP', label: 'Kế toán tổng hợp', color: 'purple', description: 'Lập báo cáo, tổng hợp số liệu' },
  { value: 'MANAGER', label: 'Quản lý', color: 'green', description: 'Phê duyệt chứng từ, xem báo cáo' },
  { value: 'KIEM_SOAT', label: 'Kiểm soát', color: 'cyan', description: 'Kiểm tra, đối chiếu số liệu' },
];

export const mockNguoiDung: NguoiDung[] = [
  {
    id: '1',
    hoTen: 'Nguyễn Văn Admin',
    email: 'admin@company.com',
    vaiTro: 'ADMIN',
    trangThai: 'HOAT_DONG',
  },
  {
    id: '2',
    hoTen: 'Trần Văn Giám Đốc',
    email: 'giamdoc@company.com',
    vaiTro: 'GIAM_DOC',
    trangThai: 'HOAT_DONG',
  },
  {
    id: '3',
    hoTen: 'Lê Thị Kế Toán Trưởng',
    email: 'ketoantruong@company.com',
    vaiTro: 'KE_TOAN_TRUONG',
    trangThai: 'HOAT_DONG',
  },
  {
    id: '4',
    hoTen: 'Phạm Thị Quỹ',
    email: 'ketoanquy@company.com',
    vaiTro: 'KE_TOAN_QUY',
    trangThai: 'HOAT_DONG',
  },
  {
    id: '5',
    hoTen: 'Hoàng Văn Công Nợ',
    email: 'ketoancongno@company.com',
    vaiTro: 'KE_TOAN_CONG_NO',
    trangThai: 'HOAT_DONG',
  },
  {
    id: '6',
    hoTen: 'Vũ Thị Tổng Hợp',
    email: 'ketoantonghop@company.com',
    vaiTro: 'KE_TOAN_TONG_HOP',
    trangThai: 'HOAT_DONG',
  },
  {
    id: '7',
    hoTen: 'Ngô Văn Quản Lý',
    email: 'manager@company.com',
    vaiTro: 'MANAGER',
    trangThai: 'HOAT_DONG',
  },
  {
    id: '8',
    hoTen: 'Đặng Thị Kiểm Soát',
    email: 'kiemsoat@company.com',
    vaiTro: 'KIEM_SOAT',
    trangThai: 'HOAT_DONG',
  },
];

export const moTaQuyenTheoVaiTro: Record<VaiTro, string[]> = {
  ADMIN: [
    'Quản lý người dùng',
    'Cấu hình hệ thống',
    'Xem tất cả báo cáo',
    'Phê duyệt chứng từ',
    'Quản lý danh mục',
    'Sao lưu & phục hồi dữ liệu',
  ],
  GIAM_DOC: [
    'Phê duyệt chứng từ lớn',
    'Xem tất cả báo cáo',
    'Xem dashboard tổng quan',
    'Theo dõi tình hình tài chính',
  ],
  KE_TOAN_TRUONG: [
    'Phê duyệt chứng từ',
    'Quản lý kế toán viên',
    'Xem tất cả báo cáo',
    'Cấu hình quy chuẩn hạch toán',
    'Kiểm tra số liệu',
  ],
  KE_TOAN_QUY: [
    'Tạo phiếu thu/chi',
    'Xem sổ quỹ',
    'In phiếu thu/chi',
    'Xem công nợ liên quan',
  ],
  KE_TOAN_CONG_NO: [
    'Quản lý công nợ phải thu',
    'Quản lý công nợ phải trả',
    'Đối chiếu công nợ',
    'Xem báo cáo công nợ',
  ],
  KE_TOAN_TONG_HOP: [
    'Lập báo cáo tài chính',
    'Xem sổ cái',
    'Xem nhật ký chung',
    'Tổng hợp số liệu',
    'Xuất báo cáo',
  ],
  MANAGER: [
    'Phê duyệt chứng từ',
    'Xem tất cả báo cáo',
    'Theo dõi tiến độ',
    'Xem dashboard tổng quan',
  ],
  KIEM_SOAT: [
    'Xem tất cả chứng từ',
    'Xem lịch sử thay đổi',
    'Đối chiếu số liệu',
    'Xuất báo cáo kiểm soát',
  ],
};
