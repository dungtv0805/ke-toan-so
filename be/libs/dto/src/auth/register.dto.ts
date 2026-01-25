// Register DTOs
export type UserRole =
  | 'ADMIN'
  | 'KE_TOAN_TRUONG'
  | 'KE_TOAN_TONG_HOP'
  | 'KE_TOAN_VIEN'
  | 'THU_QUY'
  | 'MANAGER'
  | 'KIEM_SOAT';

export interface RegisterRequest {
  email: string;
  password: string;
  hoTen: string;
  vaiTro?: UserRole;
  permissions?: string[];
}

export interface RegisterResponse {
  id: string;
  email: string;
  hoTen: string;
  vaiTro: UserRole;
}

export interface RegisterDTOs {
  RegisterRequest: RegisterRequest;
  RegisterResponse: RegisterResponse;
}

declare module '../dto' {
  interface DTOs extends RegisterDTOs {}
}
