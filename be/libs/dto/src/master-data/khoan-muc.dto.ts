// Khoan Muc DTOs
export type LoaiKhoanMuc = 'THU' | 'CHI';

export interface KhoanMucResponse {
  _id: string;
  ma: string;
  ten: string;
  loai: LoaiKhoanMuc;
  /** Mã nhóm khoản mục — khi lưu là mã, khi lưu là id, bên đọc phải nhận cả hai. */
  nhom?: string;
  /** 'CO_DINH' | 'BIEN_DOI' — chưa khai thì rỗng. */
  loaiChiPhi?: string;
  moTa?: string;
  isActive: boolean;
}

export interface CreateKhoanMucRequest {
  ma: string;
  ten: string;
  loai: LoaiKhoanMuc;
  moTa?: string;
}

export interface KhoanMucDTOs {
  KhoanMucResponse: KhoanMucResponse;
  CreateKhoanMucRequest: CreateKhoanMucRequest;
}

declare module '../dto' {
  interface DTOs extends KhoanMucDTOs {}
}
