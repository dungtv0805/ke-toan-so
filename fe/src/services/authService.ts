import { ServiceBase, setAuthToken, clearAuthToken } from './base/service-base';
import { NguoiDung } from '@/types';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: NguoiDung;
}

interface RegisterRequest {
  email: string;
  password: string;
  hoTen: string;
  vaiTro?: string;
}

interface UpdateProfileRequest {
  hoTen?: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

class AuthService extends ServiceBase {
  constructor() {
    super({ endpoint: '/auth' });
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>(credentials, { endpoint: '/login' });
    // Set token for subsequent requests
    setAuthToken(response.token);
    return response;
  }

  async register(data: RegisterRequest): Promise<NguoiDung> {
    return this.post<NguoiDung>(data, { endpoint: '/register' });
  }

  async getMe(): Promise<NguoiDung> {
    return this.get<NguoiDung>({ endpoint: '/me' });
  }

  async updateProfile(data: UpdateProfileRequest): Promise<NguoiDung> {
    return this.put<NguoiDung>(data, { endpoint: '/me' });
  }

  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    return this.post<{ message: string }>(data, { endpoint: '/change-password' });
  }

  async logout(): Promise<void> {
    try {
      await this.post<void>({}, { endpoint: '/logout' });
    } finally {
      clearAuthToken();
    }
  }

  async verify(token: string): Promise<NguoiDung> {
    return this.post<NguoiDung>({ token }, { endpoint: '/verify' });
  }
}

export const authService = new AuthService();
