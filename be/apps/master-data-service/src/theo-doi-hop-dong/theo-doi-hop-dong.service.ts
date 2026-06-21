import { sanitizeUpdateDto, TenantContextService } from '@app/core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HopDong, TheoDoiHopDong } from '@app/entities';
import { UpsertTheoDoiHopDongDto } from './dto';

export interface TheoDoiHopDongRow {
  hopDongId: string;
  soHopDong: string;
  tenCongTrinh: string;
  nam?: number;
  giaTriSauThue?: number;
  ngayKy?: Date;
  doiTuongId?: string;
  trangThaiHopDong?: string;
  tracking: TheoDoiHopDong | null;
  daThanhToan: number;
  daTraHoaDon: number;
  conLai: number;
}

const num = (v: unknown): number => Number(v) || 0;

@Injectable()
export class TheoDoiHopDongService {
  constructor(
    @InjectRepository(TheoDoiHopDong)
    private readonly repo: Repository<TheoDoiHopDong>,
    @InjectRepository(HopDong)
    private readonly hopDongRepo: Repository<HopDong>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  private computeTotals(hd: HopDong, t: TheoDoiHopDong | null) {
    const daThanhToan = (t?.dotThanhToan || []).reduce((s, d) => s + num(d.soTien), 0);
    const daTraHoaDon = (t?.dotHoaDon || []).reduce((s, d) => s + num(d.soTien), 0);
    const base = num(t?.quyetToan?.giaTri) || num(hd.giaTriSauThue);
    const conLai = base - daThanhToan;
    return { daThanhToan, daTraHoaDon, conLai };
  }

  private toRow(hd: HopDong, t: TheoDoiHopDong | null): TheoDoiHopDongRow {
    const { daThanhToan, daTraHoaDon, conLai } = this.computeTotals(hd, t);
    return {
      hopDongId: hd._id.toString(),
      soHopDong: hd.soHopDong,
      tenCongTrinh: hd.tenCongTrinh,
      nam: hd.nam,
      giaTriSauThue: hd.giaTriSauThue,
      ngayKy: hd.ngayKy,
      doiTuongId: hd.doiTuongId,
      trangThaiHopDong: hd.trangThai,
      tracking: t,
      daThanhToan,
      daTraHoaDon,
      conLai,
    };
  }

  async list(query: { nam?: number; search?: string }): Promise<TheoDoiHopDongRow[]> {
    const tenant = this.getTenantFilter();
    const hopDongs = await this.hopDongRepo.find({
      where: { isActive: true, ...tenant } as any,
    });
    const trackings = await this.repo.find({ where: { ...tenant } as any });
    const byHd = new Map(trackings.map((t) => [t.hopDongId, t]));

    let rows = hopDongs.map((hd) => this.toRow(hd, byHd.get(hd._id.toString()) ?? null));

    if (query.nam) {
      const n = Number(query.nam);
      rows = rows.filter((r) => r.nam === n);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.soHopDong || '').toLowerCase().includes(s) ||
          (r.tenCongTrinh || '').toLowerCase().includes(s),
      );
    }
    return rows;
  }

  async getByHopDongId(hopDongId: string): Promise<TheoDoiHopDong | null> {
    return this.repo.findOne({
      where: { hopDongId, ...this.getTenantFilter() } as any,
    });
  }

  async upsert(
    hopDongId: string,
    dto: UpsertTheoDoiHopDongDto,
  ): Promise<TheoDoiHopDong> {
    let tracking = await this.getByHopDongId(hopDongId);
    if (!tracking) {
      // tenantId được TenantProxy tự gắn khi save
      tracking = this.repo.create({
        hopDongId,
        isActive: true,
      } as Partial<TheoDoiHopDong>) as TheoDoiHopDong;
    }
    Object.assign(tracking, sanitizeUpdateDto(dto));
    tracking.hopDongId = hopDongId;
    return this.repo.save(tracking);
  }

  async getStats(): Promise<{
    tongGiaTri: number;
    tongDaThanhToan: number;
    tongConLai: number;
  }> {
    const rows = await this.list({});
    return {
      tongGiaTri: rows.reduce((s, r) => s + num(r.giaTriSauThue), 0),
      tongDaThanhToan: rows.reduce((s, r) => s + r.daThanhToan, 0),
      tongConLai: rows.reduce((s, r) => s + r.conLai, 0),
    };
  }
}
