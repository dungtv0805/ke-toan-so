import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestOptions, ServiceResponse } from './interfaces';
import { BaseServiceClient } from './service-client.base';

// Import types from DTO
import type {
  BoPhanResponse,
  ChungTuQueryParams,
  ChungTuResponse,
  CreateChungTuRequest,
  DoiTuongResponse,
  DuAnResponse,
  KhoanMucResponse,
  NhatKyChungEntry,
  TaiKhoanResponse,
} from '@app/dto';

@Injectable()
export class ServiceClient extends BaseServiceClient {
  constructor(configService: ConfigService) {
    super(configService);
  }

  // ============ Generic Methods ============

  async get<T>(
    serviceName: string,
    path: string,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, 'GET', path, options);
  }

  async post<T>(
    serviceName: string,
    path: string,
    options?: RequestOptions,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, 'POST', path, options);
  }

  async put<T>(
    serviceName: string,
    path: string,
    options?: RequestOptions,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, 'PUT', path, options);
  }

  async delete<T>(
    serviceName: string,
    path: string,
    options?: Omit<RequestOptions, 'body'>,
  ): Promise<ServiceResponse<T>> {
    return this.request<T>(serviceName, 'DELETE', path, options);
  }

  // ============ Master Data Service Methods ============

  async getTaiKhoan(
    authToken?: string,
  ): Promise<ServiceResponse<TaiKhoanResponse[]>> {
    return this.get<TaiKhoanResponse[]>('master-data', '/tai-khoan', {
      headers: authToken ? { Authorization: authToken } : undefined,
    });
  }

  async getTaiKhoanByMa(
    ma: string,
    authToken?: string,
  ): Promise<ServiceResponse<TaiKhoanResponse>> {
    return this.get<TaiKhoanResponse>('master-data', `/tai-khoan/by-ma/${ma}`, {
      headers: authToken ? { Authorization: authToken } : undefined,
    });
  }

  async getBoPhan(
    authToken?: string,
  ): Promise<ServiceResponse<BoPhanResponse[]>> {
    return this.get<BoPhanResponse[]>('master-data', '/bo-phan', {
      headers: authToken ? { Authorization: authToken } : undefined,
    });
  }

  async getDuAn(authToken?: string): Promise<ServiceResponse<DuAnResponse[]>> {
    return this.get<DuAnResponse[]>('master-data', '/du-an', {
      headers: authToken ? { Authorization: authToken } : undefined,
    });
  }

  async getDoiTuong(
    authToken?: string,
  ): Promise<ServiceResponse<DoiTuongResponse[]>> {
    return this.get<DoiTuongResponse[]>('master-data', '/doi-tuong', {
      headers: authToken ? { Authorization: authToken } : undefined,
    });
  }

  async getKhoanMuc(
    authToken?: string,
  ): Promise<ServiceResponse<KhoanMucResponse[]>> {
    return this.get<KhoanMucResponse[]>('master-data', '/khoan-muc', {
      headers: authToken ? { Authorization: authToken } : undefined,
    });
  }

  // ============ Voucher Service Methods ============

  async getChungTu(
    params?: ChungTuQueryParams,
    authToken?: string,
  ): Promise<ServiceResponse<ChungTuResponse[]>> {
    return this.get<ChungTuResponse[]>('voucher', '/chung-tu', {
      headers: authToken ? { Authorization: authToken } : undefined,
      query: params as Record<string, string | undefined>,
    });
  }

  async getChungTuById(
    id: string,
    authToken?: string,
  ): Promise<ServiceResponse<ChungTuResponse>> {
    return this.get<ChungTuResponse>('voucher', `/chung-tu/${id}`, {
      headers: authToken ? { Authorization: authToken } : undefined,
    });
  }

  async createChungTu(
    dto: CreateChungTuRequest,
    authToken?: string,
  ): Promise<ServiceResponse<ChungTuResponse>> {
    return this.post<ChungTuResponse>('voucher', '/chung-tu', {
      headers: authToken ? { Authorization: authToken } : undefined,
      body: dto,
    });
  }

  async getNhatKyChung(
    startDate?: string,
    endDate?: string,
    authToken?: string,
  ): Promise<ServiceResponse<NhatKyChungEntry[]>> {
    // Use high limit to get all entries for backward compatibility
    const response = await this.get<{
      data: NhatKyChungEntry[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('voucher', '/nhat-ky-chung', {
      headers: authToken ? { Authorization: authToken } : undefined,
      query: {
        startDate: startDate || '2000-01-01',
        endDate: endDate || '2100-12-31',
        limit: '10000',
      },
    });

    // Extract data array from paginated response
    return {
      success: response.success,
      data: response.data?.data || [],
    };
  }
}
