# Phase 2: Backend - Service & Controller

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tạo Service, Controller và Module cho HopDong

---

## Task 1: Tạo HopDong Service

**Files:**
- Create: `be/apps/master-data-service/src/hop-dong/hop-dong.service.ts`

**Step 1: Tạo file service**

```typescript
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HopDong } from '@app/entities';
import { CreateHopDongDto, UpdateHopDongDto, HopDongQueryDto } from './dto';
import { PaginatedResult } from '@app/dto';

@Injectable()
export class HopDongService {
  constructor(
    @InjectRepository(HopDong)
    private readonly hopDongRepository: Repository<HopDong>,
  ) {}

  async findAllPaginated(
    query: HopDongQueryDto,
  ): Promise<PaginatedResult<HopDong>> {
    const { page = 1, limit = 10, search, trangThai, doiTuongId } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.hopDongRepository.find();
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.soHopDong.toLowerCase().includes(searchLower) ||
          item.tenCongTrinh.toLowerCase().includes(searchLower),
      );
    }

    if (trangThai) {
      filteredItems = filteredItems.filter(
        (item) => item.trangThai === trangThai,
      );
    }

    if (doiTuongId) {
      filteredItems = filteredItems.filter(
        (item) => item.doiTuongId === doiTuongId,
      );
    }

    const total = filteredItems.length;
    const data = filteredItems.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(): Promise<HopDong[]> {
    const allItems = await this.hopDongRepository.find();
    return allItems.filter((item) => item.isActive !== false);
  }

  async findOne(id: string): Promise<HopDong> {
    const { ObjectId } = await import('mongodb');
    const hopDong = await this.hopDongRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!hopDong) {
      throw new NotFoundException(`HopDong with ID ${id} not found`);
    }

    return hopDong;
  }

  async findBySoHopDong(soHopDong: string): Promise<HopDong | null> {
    return this.hopDongRepository.findOne({ where: { soHopDong } });
  }

  async create(createDto: CreateHopDongDto): Promise<HopDong> {
    const existing = await this.findBySoHopDong(createDto.soHopDong);
    if (existing) {
      throw new ConflictException(`Số hợp đồng ${createDto.soHopDong} đã tồn tại`);
    }

    const hopDong = this.hopDongRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.hopDongRepository.save(hopDong);
  }

  async update(id: string, updateDto: UpdateHopDongDto): Promise<HopDong> {
    const hopDong = await this.findOne(id);

    if (updateDto.soHopDong && updateDto.soHopDong !== hopDong.soHopDong) {
      const existing = await this.findBySoHopDong(updateDto.soHopDong);
      if (existing) {
        throw new ConflictException(`Số hợp đồng ${updateDto.soHopDong} đã tồn tại`);
      }
    }

    Object.assign(hopDong, updateDto);
    return this.hopDongRepository.save(hopDong);
  }

  async delete(id: string): Promise<void> {
    const hopDong = await this.findOne(id);
    hopDong.isActive = false;
    await this.hopDongRepository.save(hopDong);
  }

  async search(keyword: string, limit = 20): Promise<HopDong[]> {
    const allItems = await this.findAll();

    if (!keyword) {
      return allItems.slice(0, limit);
    }

    const searchLower = keyword.toLowerCase();
    return allItems
      .filter(
        (item) =>
          item.soHopDong.toLowerCase().includes(searchLower) ||
          item.tenCongTrinh.toLowerCase().includes(searchLower),
      )
      .slice(0, limit);
  }

  async checkSoHopDongExists(soHopDong: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findBySoHopDong(soHopDong);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  async getStats(): Promise<{ total: number; byTrangThai: Record<string, number> }> {
    const allItems = await this.findAll();
    const byTrangThai: Record<string, number> = {};

    allItems.forEach((item) => {
      const status = item.trangThai || 'CHUA_XAC_DINH';
      byTrangThai[status] = (byTrangThai[status] || 0) + 1;
    });

    return { total: allItems.length, byTrangThai };
  }
}
```

**Step 2: Commit**

```bash
git add be/apps/master-data-service/src/hop-dong/hop-dong.service.ts
git commit -m "feat(be): add HopDongService with CRUD operations"
```

---

## Task 2: Tạo HopDong Controller

**Files:**
- Create: `be/apps/master-data-service/src/hop-dong/hop-dong.controller.ts`

**Step 1: Tạo file controller**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HopDongService } from './hop-dong.service';
import { CreateHopDongDto, UpdateHopDongDto, HopDongQueryDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('hop-dong')
@UseGuards(JwtGuard, RoleGuard)
export class HopDongController {
  constructor(private readonly hopDongService: HopDongService) {}

  @Get()
  @Roles(
    'ADMIN',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findAll(@Query() query: HopDongQueryDto) {
    const result = await this.hopDongService.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all')
  @Roles(
    'ADMIN',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getAll() {
    const data = await this.hopDongService.findAll();
    return { success: true, data };
  }

  @Get('search')
  @Roles(
    'ADMIN',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async search(
    @Query('keyword') keyword: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.hopDongService.search(keyword || '', limit || 20);
    return { success: true, data };
  }

  @Get('check-so-hop-dong')
  @Roles(
    'ADMIN',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async checkSoHopDong(
    @Query('soHopDong') soHopDong: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.hopDongService.checkSoHopDongExists(soHopDong, excludeId);
    return { success: true, data: { exists } };
  }

  @Get('stats')
  @Roles(
    'ADMIN',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getStats() {
    const data = await this.hopDongService.getStats();
    return { success: true, data };
  }

  @Get(':id')
  @Roles(
    'ADMIN',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findOne(@Param('id') id: string) {
    const data = await this.hopDongService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  async create(@Body() createDto: CreateHopDongDto) {
    const data = await this.hopDongService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  async update(@Param('id') id: string, @Body() updateDto: UpdateHopDongDto) {
    const data = await this.hopDongService.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.hopDongService.delete(id);
    return { success: true, message: 'Deleted successfully' };
  }
}
```

**Step 2: Commit**

```bash
git add be/apps/master-data-service/src/hop-dong/hop-dong.controller.ts
git commit -m "feat(be): add HopDongController with all endpoints"
```

---

## Task 3: Tạo HopDong Module

**Files:**
- Create: `be/apps/master-data-service/src/hop-dong/hop-dong.module.ts`

**Step 1: Tạo file module**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HopDong } from '@app/entities';
import { HopDongService } from './hop-dong.service';
import { HopDongController } from './hop-dong.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HopDong])],
  controllers: [HopDongController],
  providers: [HopDongService],
  exports: [HopDongService],
})
export class HopDongModule {}
```

**Step 2: Commit**

```bash
git add be/apps/master-data-service/src/hop-dong/hop-dong.module.ts
git commit -m "feat(be): add HopDongModule"
```

---

## Task 4: Register Module trong MasterDataServiceModule

**Files:**
- Modify: `be/apps/master-data-service/src/master-data-service.module.ts`

**Step 1: Thêm import HopDong entity và module**

Thêm vào imports:
```typescript
import { HopDongModule } from './hop-dong/hop-dong.module';
```

Thêm `HopDong` vào entity imports:
```typescript
import {
  // ... existing imports
  HopDong,
} from '@app/entities';
```

Thêm `HopDong` vào `DatabaseModule.forFeature([...])` array.

Thêm `HopDongModule` vào `imports` array.

**Step 2: Commit**

```bash
git add be/apps/master-data-service/src/master-data-service.module.ts
git commit -m "feat(be): register HopDongModule in MasterDataServiceModule"
```

---

## Phase 2 Complete Checklist

- [ ] HopDongService with all CRUD operations
- [ ] HopDongController with all endpoints
- [ ] HopDongModule created
- [ ] Module registered in MasterDataServiceModule
- [ ] Entity added to DatabaseModule.forFeature
