import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserCredential, UserTenant, UserRole, UserStatus } from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  CreateNguoiDungDto,
  UpdateNguoiDungDto,
  PaginationQueryDto,
  AddExistingUserDto,
} from './dto';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456'; // Default password for new users

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NguoiDungStats {
  tongNguoiDung: number;
  dangHoatDong: number;
  daKhoa: number;
  theoVaiTro: Record<UserRole, number>;
}

// Extended user with tenant info
export interface UserWithTenant {
  _id: string;
  id: string;
  email: string;
  hoTen: string;
  trangThai: UserStatus;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantRole?: UserRole;
}

@Injectable()
export class NguoiDung_Service {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(UserCredential)
    private readonly credentialRepo: Repository<UserCredential>,
    @InjectRepository(UserTenant)
    private readonly userTenantRepo: Repository<UserTenant>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<UserWithTenant>> {
    const { page = 1, limit = 10, search, vaiTro, trangThai } = query;
    const currentTenantId = this.tenantContext.getCurrentTenantId();
    const isSuperAdmin = this.tenantContext.isSuperAdmin();

    // Get all user-tenant memberships for current tenant (or all if super admin)
    let userTenants: UserTenant[];
    if (isSuperAdmin && !currentTenantId) {
      // Super admin without tenant context - get all memberships
      userTenants = await this.userTenantRepo.find({ where: { isActive: true } });
    } else if (currentTenantId) {
      // Filter by current tenant
      userTenants = await this.userTenantRepo.find({
        where: { tenantId: currentTenantId, isActive: true },
      });
    } else {
      userTenants = [];
    }

    // Filter by role if specified
    if (vaiTro) {
      userTenants = userTenants.filter((ut) => ut.role === vaiTro);
    }

    // Get unique user IDs
    const userIds = [...new Set(userTenants.map((ut) => ut.userId))];

    if (userIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Fetch users
    const { ObjectId } = await import('mongodb');
    const objectIds = userIds.map((id) => new ObjectId(id));

    const where: Record<string, unknown> = {
      _id: { $in: objectIds } as unknown,
      isActive: true,
    };

    if (trangThai) {
      where.trangThai = trangThai;
    }

    let allUsers = await this.repo.find({ where: where as any });

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      allUsers = allUsers.filter(
        (item) =>
          item.hoTen.toLowerCase().includes(searchLower) ||
          item.email.toLowerCase().includes(searchLower),
      );
    }

    // Map users with their tenant role
    const usersWithTenant: UserWithTenant[] = allUsers.map((user) => {
      const userTenant = userTenants.find((ut) => ut.userId === user._id.toString());
      return {
        _id: user._id.toString(),
        id: user._id.toString(),
        email: user.email,
        hoTen: user.hoTen,
        trangThai: user.trangThai,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        tenantRole: userTenant?.role,
      };
    });

    const total = usersWithTenant.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const data = usersWithTenant.slice(skip, skip + limit);

    return { data, total, page, limit, totalPages };
  }

  async findOne(id: string): Promise<User> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({
      where: { _id: new ObjectId(id) as any, isActive: true },
    });

    if (!item) {
      throw new NotFoundException(`Người dùng với ID ${id} không tồn tại`);
    }

    return item;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });
  }

  async create(dto: CreateNguoiDungDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email đã tồn tại trong hệ thống');
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    const isSuperAdmin = this.tenantContext.isSuperAdmin();

    // SUPER_ADMIN must provide tenantId in DTO, regular user gets from context
    const tenantId = isSuperAdmin
      ? dto.tenantId
      : (dto.tenantId || this.tenantContext.getCurrentTenantId());

    // Create user
    const item = this.repo.create({
      email: dto.email.toLowerCase(),
      hoTen: dto.hoTen,
      trangThai: dto.trangThai || UserStatus.HOAT_DONG,
      isActive: true,
    });

    const savedUser = await this.repo.save(item);

    // Create UserCredential with hashed default password
    const credential = this.credentialRepo.create({
      userId: savedUser._id.toString(),
      password: hashedPassword,
      isActive: true,
    });

    await this.credentialRepo.save(credential);

    // Create UserTenant membership if tenantId provided
    if (tenantId && dto.vaiTro) {
      const userTenant = this.userTenantRepo.create({
        userId: savedUser._id.toString(),
        tenantId,
        role: dto.vaiTro,
        isActive: true,
      });
      await this.userTenantRepo.save(userTenant);
    }

    return savedUser;
  }

  async update(id: string, dto: UpdateNguoiDungDto): Promise<User> {
    const item = await this.findOne(id);

    if (dto.email && dto.email.toLowerCase() !== item.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email đã tồn tại trong hệ thống');
      }
      dto.email = dto.email.toLowerCase();
    }

    // Update user basic info
    if (dto.hoTen) item.hoTen = dto.hoTen;
    if (dto.email) item.email = dto.email;
    if (dto.trangThai) item.trangThai = dto.trangThai;

    const savedUser = await this.repo.save(item);

    // Update role in UserTenant if vaiTro provided
    if (dto.vaiTro) {
      const currentTenantId = this.tenantContext.getCurrentTenantId();
      if (currentTenantId) {
        const userTenant = await this.userTenantRepo.findOne({
          where: {
            userId: item._id.toString(),
            tenantId: currentTenantId,
          },
        });

        if (userTenant) {
          userTenant.role = dto.vaiTro;
          await this.userTenantRepo.save(userTenant);
        }
      }
    }

    return savedUser;
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);

    // Soft delete user
    item.isActive = false;
    await this.repo.save(item);

    // Soft delete corresponding UserCredential
    const credential = await this.credentialRepo.findOne({
      where: { userId: item._id.toString() },
    });

    if (credential) {
      credential.isActive = false;
      await this.credentialRepo.save(credential);
    }

    // Soft delete UserTenant memberships
    const userTenants = await this.userTenantRepo.find({
      where: { userId: item._id.toString() },
    });

    for (const ut of userTenants) {
      ut.isActive = false;
      await this.userTenantRepo.save(ut);
    }
  }

  async toggleStatus(id: string): Promise<User> {
    const item = await this.findOne(id);
    item.trangThai =
      item.trangThai === UserStatus.HOAT_DONG
        ? UserStatus.KHOA
        : UserStatus.HOAT_DONG;
    return this.repo.save(item);
  }

  async addExistingUser(dto: AddExistingUserDto): Promise<UserWithTenant> {
    const { ObjectId } = await import('mongodb');
    const user = await this.repo.findOne({
      where: { _id: new ObjectId(dto.userId) as any, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const tenantId = this.tenantContext.getCurrentTenantId();
    if (!tenantId) {
      throw new ConflictException('Không xác định được công ty hiện tại');
    }

    // Check existing membership
    const existingMembership = await this.userTenantRepo.findOne({
      where: { userId: user._id.toString(), tenantId },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException('Người dùng đã là thành viên của công ty này');
      }
      // Reactivate inactive membership
      existingMembership.isActive = true;
      existingMembership.role = dto.vaiTro;
      await this.userTenantRepo.save(existingMembership);
    } else {
      const userTenant = this.userTenantRepo.create({
        userId: user._id.toString(),
        tenantId,
        role: dto.vaiTro,
        isActive: true,
      });
      await this.userTenantRepo.save(userTenant);
    }

    return {
      _id: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      hoTen: user.hoTen,
      trangThai: user.trangThai,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tenantRole: dto.vaiTro,
    };
  }

  async searchUsersNotInTenant(search?: string): Promise<Array<{ id: string; email: string; hoTen: string }>> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (!tenantId) return [];

    // Get user IDs already in this tenant
    const existingMemberships = await this.userTenantRepo.find({
      where: { tenantId, isActive: true },
    });
    const existingUserIds = new Set(existingMemberships.map((m) => m.userId));

    // Get all active users
    let allUsers = await this.repo.find({ where: { isActive: true } });

    // Filter out users already in tenant
    allUsers = allUsers.filter((u) => !existingUserIds.has(u._id.toString()));

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      allUsers = allUsers.filter(
        (u) =>
          u.hoTen.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower),
      );
    }

    return allUsers.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      hoTen: u.hoTen,
    }));
  }

  async getStats(): Promise<NguoiDungStats> {
    const currentTenantId = this.tenantContext.getCurrentTenantId();
    const isSuperAdmin = this.tenantContext.isSuperAdmin();

    // Get user-tenant memberships
    let userTenants: UserTenant[];
    if (isSuperAdmin && !currentTenantId) {
      userTenants = await this.userTenantRepo.find({ where: { isActive: true } });
    } else if (currentTenantId) {
      userTenants = await this.userTenantRepo.find({
        where: { tenantId: currentTenantId, isActive: true },
      });
    } else {
      userTenants = [];
    }

    // Get unique user IDs
    const userIds = [...new Set(userTenants.map((ut) => ut.userId))];

    if (userIds.length === 0) {
      const emptyStats: Record<UserRole, number> = {} as Record<UserRole, number>;
      Object.values(UserRole).forEach((vt) => {
        emptyStats[vt] = 0;
      });
      return {
        tongNguoiDung: 0,
        dangHoatDong: 0,
        daKhoa: 0,
        theoVaiTro: emptyStats,
      };
    }

    // Fetch users
    const { ObjectId } = await import('mongodb');
    const objectIds = userIds.map((id) => new ObjectId(id));

    const allUsers = await this.repo.find({
      where: {
        _id: { $in: objectIds } as any,
        isActive: true,
      },
    });

    // Count by role
    const theoVaiTro = {} as Record<UserRole, number>;
    Object.values(UserRole).forEach((vt) => {
      theoVaiTro[vt] = userTenants.filter((ut) => ut.role === vt).length;
    });

    return {
      tongNguoiDung: allUsers.length,
      dangHoatDong: allUsers.filter(
        (item) => item.trangThai === UserStatus.HOAT_DONG,
      ).length,
      daKhoa: allUsers.filter((item) => item.trangThai === UserStatus.KHOA)
        .length,
      theoVaiTro,
    };
  }
}
