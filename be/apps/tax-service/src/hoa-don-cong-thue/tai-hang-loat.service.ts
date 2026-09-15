import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongTyCongThue } from '@app/entities';
import { HoaDonCongThueService } from './hoa-don-cong-thue.service';
import { PhienCongThueService } from './cong-thue/phien.service';

export type TrangThaiMuc = 'cho' | 'dang_chay' | 'xong' | 'can_captcha' | 'bo_qua' | 'loi';

export interface MucChay {
  mst: string;
  tenCongTy: string;
  trangThai: TrangThaiMuc;
  timThay: number;
  themMoi: number;
  thieu: number;
  soLanThu: number;
  ghiChu: string | null;
}

export interface LuotChay {
  id: number;
  tenantId: string;
  nguon: 'tay' | 'lich';
  tuNgay: string;
  denNgay: string;
  trangThai: 'dang_chay' | 'xong';
  batDauLuc: string;
  ketThucLuc: string | null;
  muc: MucChay[];
}

/** Số lần chạy tối đa cho một mã số thuế trong cùng một lượt. */
const SO_LAN_THU_TOI_DA = 3;

/**
 * Tải hóa đơn hàng loạt cho nhiều mã số thuế.
 *
 * Nút thắt của việc chạy hàng loạt là CAPTCHA, không phải tốc độ mạng. Với mỗi
 * mã số thuế, engine kiểm tra phiên đăng nhập trước:
 *
 *   - Còn phiên           -> chạy luôn
 *   - Hết phiên           -> đánh dấu 'can_captcha' và ĐI TIẾP mã kế
 *   - Không lưu mật khẩu  -> bỏ qua, máy không tự đăng nhập được
 *
 * Chỗ quan trọng là nhánh thứ hai: một mã cần captcha KHÔNG làm dừng cả lượt
 * chạy. Những mã còn lại vẫn tải xong, phần cần người nằm chờ. Kế toán gõ vài
 * mã captcha rồi bấm chạy tiếp cho đúng phần còn thiếu.
 *
 * Trạng thái lượt chạy giữ trong bộ nhớ tiến trình — cùng ràng buộc một tiến
 * trình như phiên đăng nhập, đã thỏa mãn bởi `instances: 1, exec_mode: 'fork'`.
 */
@Injectable()
export class TaiHangLoatService {
  private readonly logger = new Logger(TaiHangLoatService.name);
  private readonly luot = new Map<number, LuotChay>();
  private demId = 0;

  constructor(
    @InjectRepository(CongTyCongThue)
    private readonly congTyRepo: Repository<CongTyCongThue>,
    private readonly hoaDon: HoaDonCongThueService,
    private readonly phien: PhienCongThueService,
  ) {}

  /**
   * Bắt đầu một lượt tải. Trả về ngay id; lượt chạy diễn ra ở nền nên đóng tab
   * hay tải lại trang không làm hỏng nó.
   */
  async batDau(
    tenantId: string,
    { dsMst, tuNgay, denNgay, nguon = 'tay' }: {
      dsMst?: string[];
      tuNgay: string;
      denNgay: string;
      nguon?: 'tay' | 'lich';
    },
  ): Promise<LuotChay> {
    if (!tuNgay || !denNgay) throw new Error('Chưa chọn khoảng ngày');

    const moi = await this.congTyRepo.find();
    const tatCa = moi.filter((c) => c.isActive !== false);
    const chon = dsMst?.length ? tatCa.filter((c) => dsMst.includes(c.mst)) : tatCa;
    if (!chon.length) throw new Error('Chưa chọn mã số thuế nào');

    const luot: LuotChay = {
      id: ++this.demId,
      tenantId,
      nguon,
      tuNgay,
      denNgay,
      trangThai: 'dang_chay',
      batDauLuc: new Date().toISOString(),
      ketThucLuc: null,
      muc: chon.map((c) => ({
        mst: c.mst,
        tenCongTy: c.tenCongTy,
        trangThai: 'cho' as TrangThaiMuc,
        timThay: 0,
        themMoi: 0,
        thieu: 0,
        soLanThu: 0,
        ghiChu: null,
      })),
    };
    this.luot.set(luot.id, luot);

    void this.chay(luot, luot.muc);
    return luot;
  }

  /** Chạy tiếp đúng những mã đang chờ captcha, sau khi kế toán đã xác thực. */
  async chayTiep(id: number, { gom = ['can_captcha'] }: { gom?: TrangThaiMuc[] } = {}) {
    const luot = this.luot.get(Number(id));
    if (!luot) throw new Error(`Không tìm thấy lượt chạy ${id}`);

    const muon = luot.muc.filter((m) => gom.includes(m.trangThai));
    const chay = muon.filter((m) => m.soLanThu < SO_LAN_THU_TOI_DA);
    const hetLuot = muon.length - chay.length;
    if (!chay.length) return { daChay: 0, hetLuot };

    luot.trangThai = 'dang_chay';
    luot.ketThucLuc = null;
    void this.chay(luot, chay);
    return { daChay: chay.length, hetLuot };
  }

  trangThai(id: number): LuotChay | null {
    return this.luot.get(Number(id)) ?? null;
  }

  /** Lượt chạy gần nhất của tenant hiện tại, để giao diện mở lại đúng chỗ. */
  ganNhat(tenantId: string): LuotChay | null {
    let ket: LuotChay | null = null;
    for (const l of this.luot.values()) {
      if (l.tenantId === tenantId && (!ket || l.id > ket.id)) ket = l;
    }
    return ket;
  }

  /** Chạy lần lượt từng mã. KHÔNG BAO GIỜ ném lỗi ra ngoài. */
  private async chay(luot: LuotChay, muc: MucChay[]) {
    for (const m of muc) {
      m.trangThai = 'dang_chay';
      m.soLanThu++;
      m.ghiChu = null;

      try {
        const congTy = await this.congTyRepo.findOne({ where: { mst: m.mst } as any });

        if (!this.phien.daDangNhap(luot.tenantId, m.mst)) {
          if (!congTy?.matKhauMaHoa) {
            m.trangThai = 'bo_qua';
            m.ghiChu = 'Không lưu mật khẩu nên không tự đăng nhập được';
            continue;
          }

          // Có lưu mật khẩu thì thử đăng nhập. Bật tự giải captcha thì bước này
          // xong luôn và không cần ai; chế độ nhập tay trả 'can_captcha' và mã
          // này được xếp vào hàng chờ - KHÔNG làm dừng các mã còn lại.
          const ket = await this.phien.batDauDangNhap(luot.tenantId, m.mst);
          if (ket.trangThai !== 'da_dang_nhap') {
            m.trangThai = 'can_captcha';
            m.ghiChu = 'Cần nhập mã captcha';
            continue;
          }
        }

        const ket = await this.hoaDon.dongBo(luot.tenantId, {
          mst: m.mst,
          tuNgay: luot.tuNgay,
          denNgay: luot.denNgay,
        });

        m.timThay = ket.timThay;
        m.themMoi = ket.themMoi;
        m.thieu = ket.thieu;

        // Chạy xong nhưng THIẾU hóa đơn cũng là hỏng: cổng báo 500 mà chỉ tải
        // được 380 thì bảng kê sai, dù không có lỗi nào ném ra.
        const vanDe: string[] = ket.loi.map((l) => l.message);
        if (ket.thieu > 0) vanDe.push(`Tải thiếu ${ket.thieu} hóa đơn so với số cổng Thuế báo`);

        m.trangThai = vanDe.length ? 'loi' : 'xong';
        m.ghiChu = vanDe.length ? vanDe.join('; ') : null;
      } catch (err: any) {
        if (err?.code === 'CHUA_DANG_NHAP') {
          m.trangThai = 'can_captcha';
          m.ghiChu = 'Token hết hạn giữa chừng, cần nhập lại mã captcha';
        } else if (err?.code === 'CAN_MAT_KHAU') {
          m.trangThai = 'bo_qua';
          m.ghiChu = 'Không lưu mật khẩu nên không tự đăng nhập được';
        } else {
          m.trangThai = 'loi';
          m.ghiChu = err?.message ?? String(err);
        }
      }
    }

    luot.trangThai = 'xong';
    luot.ketThucLuc = new Date().toISOString();
  }
}
