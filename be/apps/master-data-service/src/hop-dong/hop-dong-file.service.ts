import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { HopDongFile } from '@app/entities';
import { TenantContextService } from '@app/core';
import { STORAGE_SERVICE } from '@app/storage';
import type { StorageService } from '@app/storage';
import { kiemTraFile } from './hop-dong-file.rules';

@Injectable()
export class HopDongFileService {
  constructor(
    @InjectRepository(HopDongFile)
    private readonly repo: Repository<HopDongFile>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly tenantContext: TenantContextService,
  ) {}

  list(hopDongId: string) {
    return this.repo.find({
      where: { hopDongId },
      order: { createdAt: 'DESC' } as any,
    });
  }

  /** Số file của từng hợp đồng — bảng danh mục cần hiện badge mà không tải cả danh sách. */
  async demTheoHopDong(hopDongIds: string[]): Promise<Record<string, number>> {
    if (!hopDongIds.length) return {};
    const rows = await this.repo.find({
      where: { hopDongId: { $in: hopDongIds } } as any,
    });
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.hopDongId] = (acc[r.hopDongId] || 0) + 1;
      return acc;
    }, {});
  }

  async create(hopDongId: string, file: Express.Multer.File) {
    kiemTraFile(file);
    const saved = await this.storage.save(file.buffer, {
      filename: file.originalname,
      mimeType: file.mimetype,
      tenantId: this.tenantId(),
    });
    return this.repo.save(
      this.repo.create({
        hopDongId,
        tenFile: file.originalname,
        mimeType: file.mimetype,
        size: saved.size,
        storageKey: saved.storageKey,
        createdBy: this.tenantContext.getCurrentUserId(),
      }),
    );
  }

  async findOne(id: string) {
    const f = await this.repo.findOne({
      where: { _id: new ObjectId(id) } as any,
    });
    if (!f) throw new NotFoundException('Không tìm thấy file');
    return f;
  }

  async streamFile(id: string) {
    const f = await this.findOne(id);
    return { f, stream: await this.storage.stream(f.storageKey, this.tenantId()) };
  }

  /** File GridFS mang tenantId của người tải lên; stream phải khớp để không rò chéo. */
  private tenantId(): string {
    return this.tenantContext.getCurrentTenantId() || '';
  }

  async remove(id: string) {
    const f = await this.findOne(id);
    await this.storage.delete(f.storageKey);
    await this.repo.remove(f);
  }
}
