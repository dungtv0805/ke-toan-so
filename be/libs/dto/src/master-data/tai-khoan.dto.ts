// Tai Khoan DTOs
export interface TaiKhoanResponse {
  _id: string;
  ma: string;
  ten: string;
  capDo: number;
  loai: 'NO' | 'CO';
  nhom: string;
  parentId?: string;
  moTa?: string;
  isActive: boolean;
}

export interface CreateTaiKhoanRequest {
  ma: string;
  ten: string;
  capDo: number;
  loai: 'NO' | 'CO';
  nhom: string;
  parentId?: string;
  moTa?: string;
}

export interface TaiKhoanDTOs {
  TaiKhoanResponse: TaiKhoanResponse;
  CreateTaiKhoanRequest: CreateTaiKhoanRequest;
}

declare module '../dto' {
  interface DTOs extends TaiKhoanDTOs {}
}
