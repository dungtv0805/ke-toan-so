import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import {
  buildSoChiTiet,
  computeRelevantCodes,
  type SoChiTietReport,
  type OpeningRow,
} from './so-chi-tiet.helper';

@Injectable()
export class SoChiTietService {
  constructor(private readonly serviceClient: ServiceClient) {}

  async getSoChiTiet(
    maTaiKhoan: string,
    maDoiTuong: string | undefined,
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<SoChiTietReport> {
    // Lấy TẤT CẢ chứng từ (cần cả phát sinh trước kỳ cho số dư đầu kỳ)
    const [vouchersRes, accountsRes, doiTuongRes, openingRes] =
      await Promise.all([
        this.serviceClient.getNhatKyChung(undefined, undefined, authToken),
        this.serviceClient.getTaiKhoan(authToken),
        this.serviceClient.getDoiTuong(authToken),
        this.serviceClient.getSoDuDauKyRaw(authToken),
      ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const doiTuongs = doiTuongRes.success ? doiTuongRes.data || [] : [];
    const opening: OpeningRow[] = openingRes.success
      ? openingRes.data?.items || []
      : [];

    const account = accounts.find((a) => a.ma === maTaiKhoan);
    if (!account) {
      return {
        taiKhoan: { ma: maTaiKhoan, ten: 'Unknown', loai: 'NO' },
        soDuDauKyNo: 0,
        soDuDauKyCo: 0,
        rows: [],
        tongPhatSinhNo: 0,
        tongPhatSinhCo: 0,
        soDuCuoiKyNo: 0,
        soDuCuoiKyCo: 0,
      };
    }

    const relevantCodes = computeRelevantCodes(accounts, maTaiKhoan);

    // Chuẩn hoá endDate về cuối ngày để bao trùm trọn ngày kết thúc.
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const report = buildSoChiTiet(
      { ma: account.ma, ten: account.ten, loai: account.loai },
      relevantCodes,
      vouchers,
      opening,
      maDoiTuong,
      startDate,
      end,
    );

    if (maDoiTuong) {
      const dt = doiTuongs.find((d) => d.ma === maDoiTuong);
      if (dt) report.doiTuong = { ma: dt.ma, ten: dt.ten };
    }

    return report;
  }
}
