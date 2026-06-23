import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { LinhVuc, Tenant } from '@app/entities';
import { CreateLinhVucDto, UpdateLinhVucDto } from '@app/dto';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { sanitizeUpdateDto } from '@app/core';

const DEFAULT_LINH_VUC_CODE = 'KE_TOAN';

@Injectable()
export class LinhVucService {
  constructor(
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}LinhVuc`)
    private readonly linhVucRepository: Repository<LinhVuc>,
    @Inject(`${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async findAll(): Promise<LinhVuc[]> {
    return this.linhVucRepository.find({ order: { order: 'ASC' } });
  }

  async findOne(id: string): Promise<LinhVuc> {
    const { ObjectId } = await import('mongodb');
    const found = await this.linhVucRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!found) throw new NotFoundException(`Không tìm thấy lĩnh vực ${id}`);
    return found;
  }

  async create(dto: CreateLinhVucDto): Promise<LinhVuc> {
    const existing = await this.linhVucRepository.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Lĩnh vực với code ${dto.code} đã tồn tại`);

    const { ObjectId } = await import('mongodb');
    const entity = this.linhVucRepository.create({
      _id: new ObjectId() as any,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      icon: dto.icon ?? 'AppstoreOutlined',
      color: dto.color ?? '#1B3A6B',
      order: dto.order ?? 0,
      isActive: dto.isActive ?? true,
      menuKeys: dto.menuKeys ?? [],
    });
    return this.linhVucRepository.save(entity);
  }

  async update(id: string, dto: UpdateLinhVucDto): Promise<LinhVuc> {
    const linhVuc = await this.findOne(id);
    // code bất biến: sanitizeUpdateDto loại undefined; ta loại thêm 'code' nếu lọt vào.
    const clean = sanitizeUpdateDto(dto as any);
    delete (clean as any).code;
    Object.assign(linhVuc, clean);
    return this.linhVucRepository.save(linhVuc);
  }

  async delete(id: string): Promise<void> {
    const linhVuc = await this.findOne(id);

    if (linhVuc.code === DEFAULT_LINH_VUC_CODE) {
      throw new ConflictException(
        'Không thể xóa lĩnh vực mặc định hệ thống (Kế toán)',
      );
    }

    const tenants = await this.tenantRepository.find();
    const inUse = tenants.filter((t) => (t.modules ?? []).includes(linhVuc.code));
    if (inUse.length > 0) {
      throw new ConflictException(
        `Không thể xóa: còn ${inUse.length} công ty đang dùng lĩnh vực này`,
      );
    }

    await this.linhVucRepository.remove(linhVuc);
  }
}
