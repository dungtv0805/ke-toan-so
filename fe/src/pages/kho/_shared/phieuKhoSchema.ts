import { z } from 'zod';
import type { LoaiPhieuKho } from '@/types';

/** Schema cho một dòng chi tiết phiếu kho */
const chiTietSchema = z.object({
  stt: z.number(),
  hangHoaMa: z.string(),
  hangHoaTen: z.string().default(''),
  quyCach: z.string().optional(),
  donViTinh: z.string().optional(),
  khoMa: z.string().optional(),
  khoTen: z.string().optional(),
  tkNo: z.string().optional(),
  tkCo: z.string().optional(),
  soLuong: z.number().min(0).default(0),
  soLuongChungTu: z.number().optional(),
  soLuongThucTe: z.number().optional(),
  donGia: z.number().min(0).default(0),
  thanhTien: z.number().min(0).default(0),
});

/** Schema header chung cho phiếu kho */
const baseHeaderSchema = z.object({
  loaiNghiepVu: z.string().optional(),
  soPhieu: z.string().optional(),
  ngayHachToan: z.string().min(1, 'Vui lòng chọn ngày hạch toán'),
  ngayChungTu: z.string().optional(),
  soChungTuGoc: z.string().optional(),
  thamChieu: z.string().optional(),
  doiTuongMa: z.string().optional(),
  doiTuongTen: z.string().optional(),
  diaChi: z.string().optional(),
  nguoiGiaoNhan: z.string().optional(),
  nhanVien: z.string().optional(),
  dienGiai: z.string().optional(),
  khoMa: z.string().optional(),
  khoTen: z.string().optional(),
  khoXuatMa: z.string().optional(),
  khoXuatTen: z.string().optional(),
  khoNhapMa: z.string().optional(),
  khoNhapTen: z.string().optional(),
  nguoiVanChuyen: z.string().optional(),
  hopDongVC: z.string().optional(),
  phuongTienVC: z.string().optional(),
  lenhDieuDong: z.string().optional(),
  veViec: z.string().optional(),
  chiTiet: z.array(chiTietSchema).default([]),
});

/** Factory: tạo schema có validation tùy loaiPhieu */
export function makePhieuKhoSchema(loaiPhieu: LoaiPhieuKho) {
  return baseHeaderSchema.superRefine((data, ctx) => {
    // Bắt buộc ít nhất 1 dòng chi tiết có hangHoaMa
    const hasHangHoa = data.chiTiet.some((r) => r.hangHoaMa && r.hangHoaMa.trim() !== '');
    if (!hasHangHoa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['chiTiet'],
        message: 'Phiếu phải có ít nhất một dòng hàng hóa',
      });
    }

    if (loaiPhieu === 'CHUYEN') {
      // Phiếu chuyển kho: khoXuatMa + khoNhapMa bắt buộc ở header
      if (!data.khoXuatMa || data.khoXuatMa.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['khoXuatMa'],
          message: 'Vui lòng chọn kho xuất',
        });
      }
      if (!data.khoNhapMa || data.khoNhapMa.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['khoNhapMa'],
          message: 'Vui lòng chọn kho nhập',
        });
      }
    } else {
      // Phiếu nhập / xuất: ít nhất 1 dòng có khoMa, hoặc header có khoMa
      const headerHasKho = data.khoMa && data.khoMa.trim() !== '';
      const detailHasKho = data.chiTiet.some((r) => r.khoMa && r.khoMa.trim() !== '');
      if (!headerHasKho && !detailHasKho) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chiTiet'],
          message: 'Vui lòng chọn kho cho ít nhất một dòng (hoặc chọn kho mặc định ở header)',
        });
      }
    }
  });
}

/** Schema mặc định (không ràng buộc loaiPhieu cụ thể — dùng cho khởi tạo form) */
export const phieuKhoSchema = baseHeaderSchema;

export type PhieuKhoFormValues = z.infer<typeof baseHeaderSchema>;
export type ChiTietFormValues = z.infer<typeof chiTietSchema>;
