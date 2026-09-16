import type { TrangThaiPheDuyet } from '@app/entities';

/**
 * Ai được sửa/xoá chứng từ ở trạng thái nào — mục 11.
 *
 * Tài liệu chỉ nói về việc phải duyệt lại sau khi sửa. Hai ràng buộc thêm ở
 * đây là hệ quả thực tế của nó:
 *
 * - Đang chờ duyệt mà người khác sửa được thì người duyệt đang đọc một đằng,
 *   bấm duyệt một nẻo. Chỉ người lập được sửa, và sửa xong phải gửi lại.
 * - Đã chính thức thì KHÔNG cấm sửa (nghiệp vụ có thể phải chỉnh thật), nhưng
 *   sửa là mất hiệu lực phê duyệt cũ và chứng từ rời khỏi báo cáo cho tới khi
 *   duyệt xong lại.
 */

export interface KetQuaKiemTra {
  choPhep: boolean;
  /** Sửa xong thì phải chạy lại luồng phê duyệt từ đầu. */
  phaiDuyetLai?: boolean;
  lyDo?: string;
}

interface ChungTuToiThieu {
  trangThaiPheDuyet?: TrangThaiPheDuyet | string;
  nguoiTaoId?: string;
}

/** Trạng thái mà nội dung đã được ai đó ký duyệt, sửa là phải ký lại. */
const DA_CO_CHU_KY = ['CHO_PHE_DUYET', 'DA_KIEM_SOAT', 'CHINH_THUC'];

export function kiemTraQuyenSua(
  chungTu: ChungTuToiThieu,
  userId?: string,
): KetQuaKiemTra {
  const tt = chungTu.trangThaiPheDuyet;

  if (!tt || tt === 'NHAP') return { choPhep: true, phaiDuyetLai: false };

  if (tt === 'CHO_PHE_DUYET' && chungTu.nguoiTaoId !== userId) {
    return {
      choPhep: false,
      lyDo:
        'Chứng từ đang chờ phê duyệt, chỉ người lập mới được sửa. ' +
        'Nếu cần chỉnh, đề nghị người duyệt trả lại.',
    };
  }

  // Bị trả lại / từ chối: sửa rồi gửi lại, luồng chạy lại từ cấp 1.
  return { choPhep: true, phaiDuyetLai: DA_CO_CHU_KY.includes(tt) || tt === 'YEU_CAU_BO_SUNG' };
}

export function kiemTraQuyenXoa(chungTu: ChungTuToiThieu): KetQuaKiemTra {
  const tt = chungTu.trangThaiPheDuyet;

  if (tt === 'CHO_PHE_DUYET') {
    return {
      choPhep: false,
      lyDo: 'Chứng từ đang chờ phê duyệt, không xoá được. Đề nghị người duyệt từ chối trước.',
    };
  }
  if (tt === 'CHINH_THUC' || tt === 'DA_KIEM_SOAT') {
    return {
      choPhep: false,
      lyDo: 'Chứng từ đã phê duyệt xong và đang nằm trong báo cáo chính thức, không xoá được.',
    };
  }
  return { choPhep: true };
}
