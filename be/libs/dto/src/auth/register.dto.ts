// Register DTOs
export type UserRole =
  | 'ADMIN'
  | 'GIAM_DOC'
  | 'KE_TOAN_TRUONG'
  | 'KE_TOAN_QUY'
  | 'KE_TOAN_CONG_NO'
  | 'KE_TOAN_TONG_HOP'
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
