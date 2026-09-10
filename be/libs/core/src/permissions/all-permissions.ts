/**
 * Shared permission modules and generator — used by master-data-service (tenant provisioning)
 * and auth-service (lazy provisioning for Portal-created companies).
 *
 * PHẢI khớp đúng từng khoá với ma trận Phân quyền của FE (sinh từ
 * `fe/src/config/menuCatalog.tsx`) — test `permissionModules.test.ts` bên FE
 * đọc thẳng file này và so hai chiều. Thứ tự theo menu (sheet "Menu tài chính").
 *
 * Thư viện tài liệu (config-service `tai-lieu`) cũng lấy danh sách category hợp
 * lệ từ đây: mọi khoá kết thúc bằng /quy-trinh, /huong-dan, /bieu-mau, /chinh-sach.
 */
export const PERMISSION_MODULES = [
  '/tong-quan',
  '/trung-tam-du-lieu/ke-hoach',
  '/trung-tam-du-lieu/du-bao',
  '/bao-cao/pnl',
  '/bao-cao/pnl-3-lop',
  '/bao-cao/pnl-khong-khau-hao',
  '/phan-tich/cong-no',
  '/phan-tich/dong-tien',
  '/phan-tich/ton-kho',
  '/phan-tich/thanh-khoan',
  '/tong-hop/quy-trinh',
  '/tong-hop/huong-dan',
  '/chung-tu/ket-chuyen-lai-lo',
  '/chung-tu/nhat-ky-chung',
  '/bao-cao/so-chi-tiet-tai-khoan',
  '/bao-cao/so-chi-tiet-cong-no',
  '/bao-cao/bang-tong-hop',
  '/danh-muc/tai-khoan',
  '/danh-muc/quy-chuan',
  '/danh-muc/tai-khoan-ket-chuyen',
  '/bao-cao/tai-chinh',
  '/bep-an/dinh-muc-tien-an',
  '/bep-an/cong-thuc-dinh-luong',
  '/bep-an/diem-danh-an',
  '/bep-an/de-xuat-mua',
  '/bep-an/kiem-soat-chi-phi',
  '/bao-cao/so-cai',
  '/bao-cao/bang-can-doi',
  '/von-dong-tien/quy-trinh',
  '/von-dong-tien/huong-dan',
  '/chung-tu/phieu-thu',
  '/chung-tu/phieu-chi',
  '/so-quy',
  '/mua-hang/quy-trinh',
  '/mua-hang/huong-dan',
  '/cong-no/phai-tra',
  '/ban-hang/quy-trinh',
  '/ban-hang/huong-dan',
  '/bao-cao/hop-dong',
  '/danh-muc/hop-dong',
  '/trung-tam-du-lieu/hop-dong',
  '/cong-no/phai-thu',
  '/trung-tam-du-lieu/thu-tien-hop-dong',
  '/trung-tam-du-lieu/hd-ban-ra',
  '/bao-cao/doanh-thu',
  '/tien-luong/quy-trinh',
  '/tien-luong/huong-dan',
  '/kho/quy-trinh',
  '/kho/huong-dan',
  '/kho/nhap-kho',
  '/kho/xuat-kho',
  '/kho/chuyen-kho',
  '/tai-san/quy-trinh',
  '/tai-san/huong-dan',
  '/trung-tam-du-lieu/tai-san',
  '/ccdc/quy-trinh',
  '/ccdc/huong-dan',
  '/trung-tam-du-lieu/dung-cu',
  '/thue/quy-trinh',
  '/thue/huong-dan',
  '/thue/bao-cao-tndn',
  '/thue/tong-hop',
  '/thue/bang-ke-mua-vao',
  '/thue/bang-ke-ban-ra',
  '/quy-trinh',
  '/chinh-sach',
  '/bieu-mau',
  '/huong-dan',
  '/danh-muc/doi-tuong',
  '/danh-muc/chu-dau-tu',
  '/danh-muc/nhom-quan-ly',
  '/danh-muc/bo-phan',
  '/danh-muc/so-du-dau-ky',
  '/danh-muc/hang-hoa-vat-tu',
  '/danh-muc/nhom-vat-tu',
  '/danh-muc/don-vi-tinh',
  '/danh-muc/kho',
  '/danh-muc/san-pham',
  '/danh-muc/nhom-san-pham',
  '/danh-muc/du-an',
  '/danh-muc/nhom-khuyen-mai',
  '/danh-muc/ngan-hang',
  '/danh-muc/dong-tien',
  '/danh-muc/nhom-dong-tien',
  '/danh-muc/khoan-muc',
  '/danh-muc/nhom-khoan-muc',
  '/danh-muc/loai-chung-tu',
  '/danh-muc/loai-giao-dich',
  '/danh-muc/ho-so-chung-tu',
  '/danh-muc/ly-do-khong-hop-le',
  '/cau-hinh/vai-tro',
  '/cau-hinh/phan-quyen',
  '/cau-hinh/thanh-vien',
];

const PERMISSION_ACTIONS = ['xem', 'them', 'sua', 'xoa', 'xuat'];

export function generateAllPermissions(): string[] {
  const permissions: string[] = [];
  for (const mod of PERMISSION_MODULES) {
    for (const action of PERMISSION_ACTIONS) {
      permissions.push(`${mod}:${action}`);
    }
  }
  return permissions;
}
