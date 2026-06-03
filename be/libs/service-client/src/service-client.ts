import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestOptions, ServiceResponse } from './interfaces';
import { BaseServiceClient } from './service-client.base';
import { aggregateOpeningByAccount } from './helpers/aggregate-opening';

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

type SoDuDauKyRawItem = {
  maTaiKhoan: string;
  duNo: number;
  duCo: number;
  chiTietType?: string;
  chiTietId?: string;
  chiTietMa?: string;
  chiTietTen?: string;
  nganHang?: string;
};
type SoDuDauKyRawResponse = {
  ngayApDung: string | null;
  items: SoDuDauKyRawItem[];
};

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
    tenantId?: string,
  ): Promise<ServiceResponse<TaiKhoanResponse[]>> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const allAccounts: TaiKhoanResponse[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await this.get<TaiKhoanResponse[]>('master-data', '/tai-khoan', {
        headers: Object.keys(headers).length ? headers : undefined,
        query: {
          limit: String(limit),
          page: String(page),
        },
      });

      if (!response.success) {
        return { success: false, data: allAccounts };
      }

      const accounts = Array.isArray(response.data) ? response.data : [];
      allAccounts.push(...accounts);

      if (accounts.length < limit) break;
      page++;
    }

    return { success: true, data: allAccounts };
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

  async getSoDuDauKy(
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<{
    ngayApDung: string | null;
    items: Array<{ maTaiKhoan: string; duNo: number; duCo: number }>;
  }>> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const res = await this.get<{
      ngayApDung: string | null;
      items: Array<{ maTaiKhoan: string; duNo: number; duCo: number }>;
    }>('master-data', '/so-du-dau-ky', {
      headers: Object.keys(headers).length ? headers : undefined,
    });

    if (res.success && res.data) {
      return {
        ...res,
        data: {
          ngayApDung: res.data.ngayApDung,
          items: aggregateOpeningByAccount(res.data.items as any),
        },
      };
    }
    return res;
  }

  async getSoDuDauKyRaw(
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<SoDuDauKyRawResponse>> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    return this.get<SoDuDauKyRawResponse>('master-data', '/so-du-dau-ky', {
      headers: Object.keys(headers).length ? headers : undefined,
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
    tenantId?: string,
  ): Promise<ServiceResponse<NhatKyChungEntry[]>> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    const allEntries: NhatKyChungEntry[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await this.get<NhatKyChungEntry[]>('voucher', '/nhat-ky-chung', {
        headers: Object.keys(headers).length ? headers : undefined,
        query: {
          startDate: startDate || '2000-01-01',
          endDate: endDate || '2100-12-31',
          limit: String(limit),
          page: String(page),
        },
      });

      if (!response.success) {
        return { success: false, data: allEntries };
      }

      const entries = Array.isArray(response.data) ? response.data : [];
      allEntries.push(...entries);

      if (entries.length < limit) break;
      page++;
    }

    return { success: true, data: allEntries };
  }

  // ============ Voucher Service - Aggregation Methods ============

  async aggregateBalance(
    startDate: string,
    endDate: string,
    authToken?: string,
    tenantId?: string,
  ): Promise<ServiceResponse<Array<{
    ma: string;
    priorNo: number;
    priorCo: number;
    periodNo: number;
    periodCo: number;
  }>>> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = authToken;
    if (tenantId) headers['x-tenant-id'] = tenantId;

    return this.get('voucher', '/nhat-ky-chung/aggregate-balance', {
      headers: Object.keys(headers).length ? headers : undefined,
      query: { startDate, endDate },
    });
  }
}
