import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import { buildCongNoReport } from './cong-no-tong-hop.helper';
import {
  AccountInfo,
  DtAggInput,
  DtOpeningInput,
  CongNoFilters,
  BangTongHopCongNo,
} from './cong-no-tong-hop.types';

@Injectable()
export class CongNoTongHopService {
  constructor(private readonly serviceClient: ServiceClient) {}

  async getReport(
    startDate: Date,
    endDate: Date,
    filters: CongNoFilters,
    authToken?: string,
  ): Promise<BangTongHopCongNo> {
    const [dtAggRes, accountsRes, openingRawRes] = await Promise.all([
      this.serviceClient.aggregateBalanceByDoiTuong(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
      this.serviceClient.getSoDuDauKyRaw(authToken),
    ]);

    const dtAgg: DtAggInput[] = dtAggRes.success
      ? ((dtAggRes.data as unknown as DtAggInput[]) ?? [])
      : [];
    const accounts: AccountInfo[] = accountsRes.success
      ? (accountsRes.data ?? []).map((a) => ({
          ma: a.ma,
          ten: a.ten,
          loai: a.loai,
          chiTietTheo: a.chiTietTheo,
        }))
      : [];
    const openingRaw: DtOpeningInput[] =
      openingRawRes.success && openingRawRes.data
        ? ((openingRawRes.data.items as unknown as DtOpeningInput[]) ?? [])
        : [];

    return buildCongNoReport(accounts, dtAgg, openingRaw, filters);
  }
}
