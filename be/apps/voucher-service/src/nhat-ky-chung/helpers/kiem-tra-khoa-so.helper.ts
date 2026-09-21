import { ServiceClientService } from '@app/service-client';

export interface KetQuaKiemTraKhoaSo {
  choPhep: boolean;
  lyDo?: string;
}

export async function kiemTraKhoaSo(
  serviceClient: ServiceClientService,
  params: {
    loaiChungTuMa?: string;
    chiNhanhId?: string;
    ngayChungTu: Date;
    userId: string;
  },
): Promise<KetQuaKiemTraKhoaSo> {
  try {
    const result = await serviceClient.post<{
      biKhoa: boolean;
      lyDo?: string;
    }>('config', '/khoa-so/kiem-tra', {
      loaiChungTuMa: params.loaiChungTuMa,
      chiNhanhId: params.chiNhanhId,
      ngayChungTu: params.ngayChungTu,
      userId: params.userId,
    });

    if (result.biKhoa) {
      return {
        choPhep: false,
        lyDo: `Chứng từ đã bị khóa sổ. ${result.lyDo || ''}`,
      };
    }
  } catch {
    // Nếu config-service không khả dụng, cho phép (fail-open)
    // Log warning in production
  }

  return { choPhep: true };
}
