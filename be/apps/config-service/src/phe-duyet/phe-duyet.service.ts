import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { TenantContextService } from '@app/core';
import { STORAGE_SERVICE } from '@app/storage';
import type { StorageService } from '@app/storage';
import {
  HoSoPheDuyet,
  KetQuaXuLy,
  LichSuPheDuyet,
  LoaiDoiTuongPheDuyet,
  QuyTrinhPheDuyet,
  TrangThaiPheDuyet,
} from '@app/entities';
import { CauHinhPheDuyetService } from './cau-hinh.service';
import { DongBoTrangThaiService } from './dong-bo-trang-thai.service';
import { ThongBaoService } from './thong-bao.service';
import { ViTriPheDuyetService } from './vi-tri.service';
import { kiemTraFile } from './ho-so.helper';
import {
  apDungDuyet,
  apDungTraLai,
  apDungTuChoi,
  buocDangCho,
  datLaiTuDau,
  sinhBuocTuCauHinh,
  thayDoiTrongYeu,
  tinhThoiGianXuLyGiay,
} from './helpers';

export interface GuiDuyetDto {
  loaiDoiTuong: LoaiDoiTuongPheDuyet;
  doiTuongId: string;
  loaiNghiepVuMa: string;
  loaiNghiepVuTen?: string;
  soPhieu?: string;
  noiDung?: string;
  soTien?: number;
  ngayNghiepVu?: Date | string;
  boPhan?: string;
  nguoiLapTen?: string;
}

export interface XuLyDto {
  yKien?: string;
  hoTen?: string;
}

const NHAN_HANH_DONG: Record<'DUYET' | 'TRA_LAI' | 'TU_CHOI', string> = {
  DUYET: 'duyệt',
  TRA_LAI: 'trả lại',
  TU_CHOI: 'từ chối',
};

@Injectable()
export class PheDuyetService {
  constructor(
    @InjectRepository(QuyTrinhPheDuyet)
    private readonly quyTrinhRepo: MongoRepository<QuyTrinhPheDuyet>,
    @InjectRepository(LichSuPheDuyet)
    private readonly lichSuRepo: Repository<LichSuPheDuyet>,
    private readonly cauHinh: CauHinhPheDuyetService,
    private readonly viTri: ViTriPheDuyetService,
    private readonly thongBao: ThongBaoService,
    private readonly dongBo: DongBoTrangThaiService,
    private readonly tenantContext: TenantContextService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  private userId(): string {
    const id = this.tenantContext.getCurrentUserId();
    if (!id) throw new ForbiddenException('Không xác định được người dùng');
    return id;
  }

  private async ghiLichSu(
    qt: QuyTrinhPheDuyet,
    ketQua: KetQuaXuLy,
    thongTin: {
      thuTu?: number;
      viTriTen?: string;
      nguoiXuLyId?: string;
      nguoiXuLyTen?: string;
      batDauCho?: Date;
      thoiDiemXuLy?: Date;
      yKien?: string;
    },
  ): Promise<void> {
    await this.lichSuRepo.save(
      this.lichSuRepo.create({
        quyTrinhId: qt.id,
        loaiDoiTuong: qt.loaiDoiTuong,
        doiTuongId: qt.doiTuongId,
        loaiNghiepVuMa: qt.loaiNghiepVuMa,
        thuTu: thongTin.thuTu ?? 0,
        viTriTen: thongTin.viTriTen,
        nguoiXuLyId: thongTin.nguoiXuLyId,
        nguoiXuLyTen: thongTin.nguoiXuLyTen,
        batDauCho: thongTin.batDauCho,
        thoiDiemXuLy: thongTin.thoiDiemXuLy,
        ketQua,
        yKien: thongTin.yKien,
        phienBan: qt.phienBan,
        thoiGianXuLyGiay: tinhThoiGianXuLyGiay(
          thongTin.batDauCho,
          thongTin.thoiDiemXuLy,
        ),
      }),
    );
  }

  /**
   * Báo cho ĐÚNG người đang giữ vị trí của bước đang chờ — mục 13.
   *
   * Gọi sau khi đã lưu quy trình, và chỉ với bước `DANG_CHO`. Không có chỗ nào
   * lặp qua toàn bộ `qt.buoc` để gửi: đó chính là cách cấp sau nhận được thông
   * báo khi chưa đến lượt, điều mục 13 cấm.
   */
  private async baoChoBuocDangCho(qt: QuyTrinhPheDuyet): Promise<void> {
    const buoc = buocDangCho(qt.buoc);
    if (!buoc) return;

    const nguoi = await this.viTri.nguoiGiuViTri(buoc.viTriTen);
    await this.thongBao.taoNhieu(
      nguoi.map((n) => ({
        userId: n.userId,
        loai: 'DEN_LUOT_DUYET' as const,
        tieuDe: `Chờ bạn duyệt: ${qt.soPhieu ?? qt.loaiNghiepVuTen ?? 'nghiệp vụ'}`,
        noiDung: qt.noiDung,
        duongDan: `/phe-duyet/cho-toi-duyet?id=${qt.id}`,
        quyTrinhId: qt.id,
      })),
    );
  }

  private async baoChoNguoiLap(
    qt: QuyTrinhPheDuyet,
    loai: 'BI_TRA_LAI' | 'BI_TU_CHOI' | 'HOAN_THANH',
    yKien?: string,
  ): Promise<void> {
    if (!qt.nguoiLapId) return;
    const tieuDe = {
      BI_TRA_LAI: `Bị trả lại: ${qt.soPhieu ?? 'nghiệp vụ'}`,
      BI_TU_CHOI: `Bị từ chối: ${qt.soPhieu ?? 'nghiệp vụ'}`,
      HOAN_THANH: `Đã duyệt xong: ${qt.soPhieu ?? 'nghiệp vụ'}`,
    }[loai];

    await this.thongBao.tao({
      userId: qt.nguoiLapId,
      loai,
      tieuDe,
      noiDung: yKien ?? qt.noiDung,
      duongDan: `/phe-duyet/cho-toi-duyet?id=${qt.id}`,
      quyTrinhId: qt.id,
    });
  }

  private async capNhatTrangThai(
    qt: QuyTrinhPheDuyet,
    trangThai: TrangThaiPheDuyet,
  ): Promise<QuyTrinhPheDuyet> {
    qt.trangThai = trangThai;
    const daLuu = await this.quyTrinhRepo.save(qt);
    await this.dongBo.ghi(
      qt.loaiDoiTuong,
      qt.doiTuongId,
      trangThai,
      qt.phienBan,
    );
    return daLuu;
  }

  async timTheoDoiTuong(
    loaiDoiTuong: LoaiDoiTuongPheDuyet,
    doiTuongId: string,
  ): Promise<QuyTrinhPheDuyet | null> {
    return this.quyTrinhRepo.findOne({
      where: { loaiDoiTuong, doiTuongId, isActive: true },
    });
  }

  async chiTiet(id: string): Promise<QuyTrinhPheDuyet> {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException('Không tìm thấy quy trình phê duyệt');
    }
    const qt = await this.quyTrinhRepo.findOne({
      where: { _id: new ObjectId(id) as never },
    });
    if (!qt) throw new NotFoundException('Không tìm thấy quy trình phê duyệt');
    return qt;
  }

  /** Lịch sử đầy đủ của một quy trình — mục 7 và 14. */
  async lichSu(quyTrinhId: string): Promise<LichSuPheDuyet[]> {
    const ds = await this.lichSuRepo.find({ where: { quyTrinhId } });
    return ds.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Gửi phê duyệt — mục 5 bước 2 và 3.
   *
   * Gọi lại trên một nghiệp vụ đã bị trả lại thì đây là lần gửi lại: luồng đặt
   * về cấp 1 (mục 11 — không giữ phê duyệt cũ), `ngayGuiDuyet` GIỮ NGUYÊN lần
   * đầu để tổng thời gian phê duyệt ở mục 9 phản ánh cả quãng phải làm lại.
   */
  async guiDuyet(dto: GuiDuyetDto): Promise<QuyTrinhPheDuyet> {
    const cauHinh = await this.cauHinh.tim(dto.loaiDoiTuong, dto.loaiNghiepVuMa);
    if (!cauHinh?.buoc?.length) {
      throw new BadRequestException(
        `Loại nghiệp vụ "${dto.loaiNghiepVuTen ?? dto.loaiNghiepVuMa}" chưa được thiết lập luồng phê duyệt`,
      );
    }

    const thieuNguoi: string[] = [];
    for (const b of cauHinh.buoc) {
      const nguoi = await this.viTri.nguoiGiuViTri(b.viTriTen);
      if (!nguoi.length) thieuNguoi.push(b.viTriTen);
    }
    if (thieuNguoi.length) {
      // Chặn ngay từ đây thay vì để nghiệp vụ treo vô thời hạn ở một cấp không
      // ai giữ — người lập sẽ không hiểu vì sao chứng từ đứng im.
      throw new BadRequestException(
        `Chưa có người đảm nhiệm vị trí: ${thieuNguoi.join(', ')}. Vào Cấu hình › Phê duyệt để gán người.`,
      );
    }

    const bayGio = new Date();
    const dangCo = await this.timTheoDoiTuong(dto.loaiDoiTuong, dto.doiTuongId);

    if (dangCo && dangCo.trangThai === 'CHO_PHE_DUYET') {
      throw new BadRequestException('Nghiệp vụ này đang chờ phê duyệt');
    }
    if (dangCo && dangCo.trangThai === 'CHINH_THUC') {
      throw new BadRequestException('Nghiệp vụ này đã phê duyệt xong');
    }

    const qt =
      dangCo ??
      this.quyTrinhRepo.create({
        loaiDoiTuong: dto.loaiDoiTuong,
        doiTuongId: dto.doiTuongId,
        phienBan: 1,
        hoSo: [],
        isActive: true,
      });

    qt.loaiNghiepVuMa = dto.loaiNghiepVuMa;
    qt.loaiNghiepVuTen = dto.loaiNghiepVuTen ?? cauHinh.loaiNghiepVuTen;
    qt.soPhieu = dto.soPhieu;
    qt.noiDung = dto.noiDung;
    qt.soTien = dto.soTien ?? 0;
    qt.ngayNghiepVu = dto.ngayNghiepVu ? new Date(dto.ngayNghiepVu) : undefined;
    qt.boPhan = dto.boPhan;
    qt.nguoiLapId = qt.nguoiLapId ?? this.userId();
    qt.nguoiLapTen = dto.nguoiLapTen ?? qt.nguoiLapTen;
    qt.buoc = sinhBuocTuCauHinh(cauHinh.buoc, bayGio, qt.phienBan);
    qt.buocHienTai = qt.buoc[0].thuTu;
    qt.ngayGuiDuyet = qt.ngayGuiDuyet ?? bayGio;
    qt.ngayHoanThanh = undefined;

    const daLuu = await this.capNhatTrangThai(qt, 'CHO_PHE_DUYET');
    await this.ghiLichSu(daLuu, 'GUI_DUYET', {
      nguoiXuLyId: daLuu.nguoiLapId,
      nguoiXuLyTen: daLuu.nguoiLapTen,
      thoiDiemXuLy: bayGio,
    });
    await this.baoChoBuocDangCho(daLuu);
    return daLuu;
  }

  /**
   * Danh sách "Chờ tôi duyệt" — mục 6.
   *
   * Điều kiện lọc là giao của ba thứ: quy trình đang CHO_PHE_DUYET, bước đang
   * DANG_CHO, và vị trí của bước đó nằm trong các vị trí tôi giữ. Bước
   * CHUA_DEN_LUOT không bao giờ lọt vào — đó là yêu cầu cốt lõi của mục 6.
   */
  async choToiDuyet(): Promise<
    (QuyTrinhPheDuyet & { viTriCanDuyet: string; thoiGianChoGiay: number })[]
  > {
    const userId = this.userId();
    const viTriCuaToi = await this.viTri.viTriCuaNguoi(userId);
    if (!viTriCuaToi.length) return [];

    const ds = await this.quyTrinhRepo.find({
      where: { trangThai: 'CHO_PHE_DUYET', isActive: true },
    });

    const bayGio = Date.now();
    return ds
      .map((qt) => {
        const buoc = buocDangCho(qt.buoc);
        if (!buoc || !viTriCuaToi.includes(buoc.viTriTen)) return null;
        return Object.assign(qt, {
          viTriCanDuyet: buoc.viTriTen,
          thoiGianChoGiay: buoc.batDauCho
            ? Math.round((bayGio - new Date(buoc.batDauCho).getTime()) / 1000)
            : 0,
        });
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.thoiGianChoGiay - a.thoiGianChoGiay);
  }

  private async kiemTraDenLuot(qt: QuyTrinhPheDuyet): Promise<number> {
    if (qt.trangThai !== 'CHO_PHE_DUYET') {
      throw new BadRequestException(
        'Nghiệp vụ không ở trạng thái chờ phê duyệt',
      );
    }
    const buoc = buocDangCho(qt.buoc);
    if (!buoc) throw new BadRequestException('Không có bước nào đang chờ');

    const viTriCuaToi = await this.viTri.viTriCuaNguoi(this.userId());
    if (!viTriCuaToi.includes(buoc.viTriTen)) {
      throw new ForbiddenException(
        `Nghiệp vụ đang chờ vị trí "${buoc.viTriTen}", bạn không đảm nhiệm vị trí này`,
      );
    }
    return buoc.thuTu;
  }

  /** Duyệt — mục 5 bước 4 và 5. */
  async duyet(id: string, dto: XuLyDto): Promise<QuyTrinhPheDuyet> {
    const qt = await this.chiTiet(id);
    const thuTu = await this.kiemTraDenLuot(qt);
    const bayGio = new Date();
    const truoc = qt.buoc.find((b) => b.thuTu === thuTu);

    const kq = apDungDuyet(qt.buoc, {
      thuTu,
      nguoiXuLyId: this.userId(),
      nguoiXuLyTen: dto.hoTen,
      yKien: dto.yKien,
      thoiDiem: bayGio,
    });

    qt.buoc = kq.buoc;
    qt.buocHienTai = kq.buocKeTiep;
    if (kq.hoanThanh) qt.ngayHoanThanh = bayGio;

    // Mục 5 bước 5 + mục 12: đủ cấp bắt buộc → Đã kiểm soát đủ → Chính thức.
    const daLuu = await this.capNhatTrangThai(
      qt,
      kq.hoanThanh ? 'CHINH_THUC' : 'CHO_PHE_DUYET',
    );

    await this.ghiLichSu(daLuu, 'DUYET', {
      thuTu,
      viTriTen: truoc?.viTriTen,
      nguoiXuLyId: this.userId(),
      nguoiXuLyTen: dto.hoTen,
      batDauCho: truoc?.batDauCho,
      thoiDiemXuLy: bayGio,
      yKien: dto.yKien,
    });

    if (kq.hoanThanh) await this.baoChoNguoiLap(daLuu, 'HOAN_THANH');
    else await this.baoChoBuocDangCho(daLuu);

    return daLuu;
  }

  private async dungLuong(
    id: string,
    dto: XuLyDto,
    kieu: 'TRA_LAI' | 'TU_CHOI',
  ): Promise<QuyTrinhPheDuyet> {
    const qt = await this.chiTiet(id);
    const thuTu = await this.kiemTraDenLuot(qt);
    const bayGio = new Date();
    const truoc = qt.buoc.find((b) => b.thuTu === thuTu);

    if (!dto.yKien?.trim()) {
      throw new BadRequestException(
        `Phải ghi lý do khi ${NHAN_HANH_DONG[kieu]} nghiệp vụ`,
      );
    }

    const apDung = kieu === 'TRA_LAI' ? apDungTraLai : apDungTuChoi;
    const kq = apDung(qt.buoc, {
      thuTu,
      nguoiXuLyId: this.userId(),
      nguoiXuLyTen: dto.hoTen,
      yKien: dto.yKien,
      thoiDiem: bayGio,
    });

    qt.buoc = kq.buoc;
    qt.buocHienTai = 0;

    const daLuu = await this.capNhatTrangThai(
      qt,
      kieu === 'TRA_LAI' ? 'YEU_CAU_BO_SUNG' : 'TU_CHOI',
    );

    await this.ghiLichSu(daLuu, kieu, {
      thuTu,
      viTriTen: truoc?.viTriTen,
      nguoiXuLyId: this.userId(),
      nguoiXuLyTen: dto.hoTen,
      batDauCho: truoc?.batDauCho,
      thoiDiemXuLy: bayGio,
      yKien: dto.yKien,
    });

    await this.baoChoNguoiLap(
      daLuu,
      kieu === 'TRA_LAI' ? 'BI_TRA_LAI' : 'BI_TU_CHOI',
      dto.yKien,
    );
    return daLuu;
  }

  /** Yêu cầu bổ sung / trả lại — mục 7. */
  async traLai(id: string, dto: XuLyDto): Promise<QuyTrinhPheDuyet> {
    return this.dungLuong(id, dto, 'TRA_LAI');
  }

  /** Từ chối — mục 7. */
  async tuChoi(id: string, dto: XuLyDto): Promise<QuyTrinhPheDuyet> {
    return this.dungLuong(id, dto, 'TU_CHOI');
  }

  /**
   * Nghiệp vụ vừa bị sửa nội dung trọng yếu — mục 11.
   *
   * voucher-service gọi vào đây sau khi lưu bản ghi mới. Nếu nghiệp vụ chưa
   * từng gửi duyệt thì không có gì để làm. Nếu đã có cấp duyệt thì tăng phiên
   * bản, xoá phê duyệt cũ và bắt duyệt lại từ đầu.
   */
  async sauKhiSua(
    loaiDoiTuong: LoaiDoiTuongPheDuyet,
    doiTuongId: string,
    truoc: unknown,
    sau: unknown,
  ): Promise<{ phaiDuyetLai: boolean; truongDaDoi: string[] }> {
    const qt = await this.timTheoDoiTuong(loaiDoiTuong, doiTuongId);
    if (!qt || qt.trangThai === 'NHAP') {
      return { phaiDuyetLai: false, truongDaDoi: [] };
    }

    const truongDaDoi = thayDoiTrongYeu(truoc, sau);
    if (!truongDaDoi.length) return { phaiDuyetLai: false, truongDaDoi: [] };

    const bayGio = new Date();
    qt.phienBan += 1;
    qt.buoc = datLaiTuDau(qt.buoc, bayGio, qt.phienBan);
    qt.buocHienTai = qt.buoc[0]?.thuTu ?? 0;
    qt.ngayHoanThanh = undefined;
    qt.soTien = Number((sau as { soTien?: number })?.soTien ?? qt.soTien);
    qt.noiDung = (sau as { noiDung?: string })?.noiDung ?? qt.noiDung;

    const daLuu = await this.capNhatTrangThai(qt, 'CHO_PHE_DUYET');
    await this.ghiLichSu(daLuu, 'SUA_TRONG_YEU', {
      nguoiXuLyId: this.tenantContext.getCurrentUserId(),
      thoiDiemXuLy: bayGio,
      yKien: `Đã sửa: ${truongDaDoi.join(', ')} — phải phê duyệt lại từ đầu`,
    });
    await this.baoChoBuocDangCho(daLuu);

    return { phaiDuyetLai: true, truongDaDoi };
  }

  /**
   * Gắn CHỨNG TỪ NỘI BỘ đã có trên hệ thống — hình thức thứ hai của mục 8.
   *
   * Lưu bằng ID, không sao chép nội dung: chứng từ gốc sửa thì hồ sơ đính kèm
   * trỏ sang bản mới, không giữ ảnh chụp cũ.
   */
  async themHoSoLienKet(
    id: string,
    hoSo: Omit<HoSoPheDuyet, 'id' | 'nguon' | 'storageKey'>,
  ): Promise<QuyTrinhPheDuyet> {
    const qt = await this.chiTiet(id);
    if (!hoSo.doiTuongIdLienKet) {
      throw new BadRequestException('Thiếu chứng từ cần liên kết');
    }
    return this.ghiThemHoSo(qt, {
      ...hoSo,
      id: new ObjectId().toHexString(),
      nguon: 'LIEN_KET_NOI_BO',
    });
  }

  /** Tải file hồ sơ lên — hình thức thứ nhất của mục 8. */
  async taiLenHoSo(
    id: string,
    file: Express.Multer.File,
    thongTin: { ten?: string; loai?: string; so?: string; ngayChungTu?: string },
  ): Promise<QuyTrinhPheDuyet> {
    kiemTraFile(file);
    const qt = await this.chiTiet(id);

    const tenantId = this.tenantContext.getCurrentTenantId() ?? '';
    const luu = await this.storage.save(file.buffer, {
      filename: file.originalname,
      mimeType: file.mimetype,
      tenantId,
    });

    return this.ghiThemHoSo(qt, {
      id: new ObjectId().toHexString(),
      // Mục 8 đòi lưu TÊN hồ sơ; người dùng bỏ trống thì lấy tên file.
      ten: thongTin.ten?.trim() || file.originalname,
      loai: thongTin.loai,
      so: thongTin.so,
      ngayChungTu: thongTin.ngayChungTu
        ? new Date(thongTin.ngayChungTu)
        : undefined,
      nguon: 'TAI_LEN',
      storageKey: luu.storageKey,
      fileTen: file.originalname,
      mimeType: file.mimetype,
      size: luu.size,
    });
  }

  private async ghiThemHoSo(
    qt: QuyTrinhPheDuyet,
    hoSo: HoSoPheDuyet,
  ): Promise<QuyTrinhPheDuyet> {
    // Mục 8 đòi lưu người tải/gắn và thời điểm — đóng dấu ở server, không tin
    // giá trị client gửi lên.
    qt.hoSo = [
      ...(qt.hoSo ?? []),
      {
        ...hoSo,
        nguoiGanId: this.userId(),
        nguoiGanTen: this.tenantContext.getCurrentEmail(),
        thoiDiemGan: new Date(),
      },
    ];
    return this.quyTrinhRepo.save(qt);
  }

  /** Đọc file hồ sơ để tải về/xem. */
  async docFileHoSo(
    id: string,
    hoSoId: string,
  ): Promise<{ hoSo: HoSoPheDuyet; stream: NodeJS.ReadableStream }> {
    const qt = await this.chiTiet(id);
    const hoSo = (qt.hoSo ?? []).find((h) => h.id === hoSoId);
    if (!hoSo) throw new NotFoundException('Không tìm thấy hồ sơ');
    if (!hoSo.storageKey) {
      throw new BadRequestException('Hồ sơ này là liên kết nội bộ, không có file');
    }
    const tenantId = this.tenantContext.getCurrentTenantId() ?? '';
    return { hoSo, stream: await this.storage.stream(hoSo.storageKey, tenantId) };
  }

  /**
   * Gỡ hồ sơ.
   *
   * KHÔNG cho gỡ khi nghiệp vụ đã chính thức: hồ sơ là căn cứ của chữ ký đã
   * đặt, gỡ đi là phá mất vết kiểm toán (mục 8 đòi truy được phiên bản hồ sơ
   * đã được duyệt).
   */
  async xoaHoSo(id: string, hoSoId: string): Promise<QuyTrinhPheDuyet> {
    const qt = await this.chiTiet(id);
    if (qt.trangThai === 'CHINH_THUC' || qt.trangThai === 'DA_KIEM_SOAT') {
      throw new BadRequestException(
        'Nghiệp vụ đã phê duyệt xong, không gỡ được hồ sơ đã dùng làm căn cứ duyệt.',
      );
    }

    const hoSo = (qt.hoSo ?? []).find((h) => h.id === hoSoId);
    if (!hoSo) throw new NotFoundException('Không tìm thấy hồ sơ');

    qt.hoSo = (qt.hoSo ?? []).filter((h) => h.id !== hoSoId);
    const daLuu = await this.quyTrinhRepo.save(qt);

    // Xoá file sau khi đã lưu bản ghi: ngược lại mà lưu hỏng thì mất file mà
    // dòng hồ sơ vẫn còn, bấm xem ra lỗi.
    if (hoSo.storageKey) await this.storage.delete(hoSo.storageKey);
    return daLuu;
  }

  /**
   * Trạng thái của nhiều nghiệp vụ một lượt — lưới Nhật ký chung gọi để vẽ cột
   * trạng thái mà không phải bắn một request cho mỗi dòng.
   */
  async trangThaiHangLoat(
    loaiDoiTuong: LoaiDoiTuongPheDuyet,
    doiTuongIds: string[],
  ): Promise<Record<string, { trangThai: TrangThaiPheDuyet; quyTrinhId: string; viTriCanDuyet?: string }>> {
    if (!doiTuongIds.length) return {};
    const ds = await this.quyTrinhRepo.find({
      where: { loaiDoiTuong, doiTuongId: { $in: doiTuongIds } as never },
    });

    const ra: Record<string, { trangThai: TrangThaiPheDuyet; quyTrinhId: string; viTriCanDuyet?: string }> = {};
    for (const qt of ds) {
      ra[qt.doiTuongId] = {
        trangThai: qt.trangThai,
        quyTrinhId: qt.id,
        viTriCanDuyet: buocDangCho(qt.buoc)?.viTriTen,
      };
    }
    return ra;
  }
}
