// Login DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    hoTen: string;
    vaiTro: string;
  };
}

export interface LoginDTOs {
  LoginRequest: LoginRequest;
  LoginResponse: LoginResponse;
}

declare module '../dto' {
  interface DTOs extends LoginDTOs {}
}
