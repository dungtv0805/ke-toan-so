import { ServiceClient } from '@app/service-client';

export interface KetQuaKiemTraKhoaSo {
  choPhep: boolean;
  lyDo?: string;
}

export async function kiemTraKhoaSo(
  serviceClient: ServiceClient,
  params: {
    loaiChungTuMa?: string;
    chiNhanhId?: string;
    ngayChungTu: Date;
    userId?: string;
  },
): Promise<KetQuaKiemTraKhoaSo> {
  if (!params.userId) {
    return { choPhep: true };
  }

  try {
    const result = await serviceClient.post<{
      biKhoa: boolean;
      lyDo?: string;
    }>('config', '/khoa-so/kiem-tra', {
      body: {
        loaiChungTuMa: params.loaiChungTuMa,
        chiNhanhId: params.chiNhanhId,
        ngayChungTu: params.ngayChungTu,
        userId: params.userId,
      },
    });

    if (result.data?.biKhoa) {
      return {
        choPhep: false,
        lyDo: `Chứng từ đã bị khóa sổ. ${result.data.lyDo || ''}`,
      };
    }
  } catch {
    // Nếu config-service không khả dụng, cho phép (fail-open)
    // Log warning in production
  }

  return { choPhep: true };
}
