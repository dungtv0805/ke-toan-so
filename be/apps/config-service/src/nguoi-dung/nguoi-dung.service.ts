import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserCredential,
  UserTenant,
  UserStatus,
  AppUserRole,
} from '@app/entities';
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
  theoVaiTro: Record<string, number>;
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
  tenantRole?: string;
}

@Injectable()
export class NguoiDung_Service {
  constructor(
    // Identity connection (masterceo_identity) — user identity data
    @InjectRepository(User, 'identity')
    private readonly repo: Repository<User>,
    @InjectRepository(UserCredential, 'identity')
    private readonly credentialRepo: Repository<UserCredential>,
    @InjectRepository(UserTenant, 'identity')
    private readonly userTenantRepo: Repository<UserTenant>,
    // Default connection (digital_book) — functional accounting role
    @InjectRepository(AppUserRole)
    private readonly appUserRoleRepo: Repository<AppUserRole>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<UserWithTenant>> {
    const { page = 1, limit = 10, search, vaiTro, trangThai } = query;
    const currentTenantId = this.tenantContext.getCurrentTenantId();
    const isSuperAdmin = this.tenantContext.isSuperAdmin();

    // Step 1: Get memberships from identity DB (who is in this tenant)
    let userTenants: UserTenant[];
    if (isSuperAdmin && !currentTenantId) {
      // Super admin without tenant context — get all memberships across tenants
      userTenants = await this.userTenantRepo.find({ where: { isActive: true } });
    } else if (currentTenantId) {
      userTenants = await this.userTenantRepo.find({
        where: { tenantId: currentTenantId, isActive: true },
      });
    } else {
      userTenants = [];
    }

    const memberUserIds = [...new Set(userTenants.map((ut) => ut.userId))];

    if (memberUserIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Step 2: Load functional roles from AppUserRole (digital_book)
    // tenantRole is the ACCOUNTING role displayed/filtered in this UI — NOT userTenant.role
    const whereRole: Record<string, any> = {
      userId: { $in: memberUserIds } as any,
      isActive: true,
    };
    if (currentTenantId) {
      whereRole.tenantId = currentTenantId;
    }
    const appUserRoles = await this.appUserRoleRepo.find({ where: whereRole as any });

    // Step 3: Apply vaiTro filter via AppUserRole (functional role), not userTenant.role
    let userIds: string[];
    if (vaiTro) {
      const filteredRoles = appUserRoles.filter((aur) => aur.role === vaiTro);
      userIds = filteredRoles.map((aur) => aur.userId);
    } else {
      userIds = memberUserIds;
    }

    if (userIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    // Step 4: Fetch user details from identity DB
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

    // Step 5: Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      allUsers = allUsers.filter(
        (item) =>
          item.hoTen.toLowerCase().includes(searchLower) ||
          item.email.toLowerCase().includes(searchLower),
      );
    }

    // Step 6: Map users with functional role from AppUserRole
    // Members with no AppUserRole row default to 'KIEM_SOAT' (consistent with auth-service convention)
    const usersWithTenant: UserWithTenant[] = allUsers.map((user) => {
      const userId = user._id.toString();
      const appUserRole = appUserRoles.find((aur) => aur.userId === userId);
      return {
        _id: userId,
        id: userId,
        email: user.email,
        hoTen: user.hoTen,
        trangThai: user.trangThai,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        tenantRole: appUserRole?.role ?? 'KIEM_SOAT',
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

    const tenantId = this.tenantContext.getCurrentTenantId();

    // Create user in identity DB
    const item = this.repo.create({
      email: dto.email.toLowerCase(),
      hoTen: dto.hoTen,
      trangThai: dto.trangThai || UserStatus.HOAT_DONG,
      isActive: true,
    });

    const savedUser = await this.repo.save(item);

    // Create UserCredential in identity DB
    const credential = this.credentialRepo.create({
      userId: savedUser._id.toString(),
      password: hashedPassword,
      isActive: true,
    });

    await this.credentialRepo.save(credential);

    if (tenantId) {
      // Create membership in identity DB — role='member' (membership tier, NOT functional role)
      const userTenant = this.userTenantRepo.create({
        userId: savedUser._id.toString(),
        tenantId,
        role: 'member',
        isActive: true,
      });
      await this.userTenantRepo.save(userTenant);

      // Create functional role in AppUserRole (digital_book)
      const appUserRole = this.appUserRoleRepo.create({
        userId: savedUser._id.toString(),
        tenantId,
        role: dto.vaiTro || 'KIEM_SOAT',
        isActive: true,
      });
      await this.appUserRoleRepo.save(appUserRole);
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

    // Update user basic info in identity DB
    if (dto.hoTen) item.hoTen = dto.hoTen;
    if (dto.email) item.email = dto.email;
    if (dto.trangThai) item.trangThai = dto.trangThai;

    const savedUser = await this.repo.save(item);

    // Update functional role in AppUserRole (digital_book) — NOT userTenant.role
    if (dto.vaiTro) {
      const currentTenantId = this.tenantContext.getCurrentTenantId();
      if (currentTenantId) {
        const appUserRole = await this.appUserRoleRepo.findOne({
          where: {
            userId: item._id.toString(),
            tenantId: currentTenantId,
          } as any,
        });

        if (appUserRole) {
          appUserRole.role = dto.vaiTro;
          await this.appUserRoleRepo.save(appUserRole);
        } else {
          // Create if missing (e.g. user existed before AppUserRole table was introduced)
          const newRole = this.appUserRoleRepo.create({
            userId: item._id.toString(),
            tenantId: currentTenantId,
            role: dto.vaiTro,
            isActive: true,
          });
          await this.appUserRoleRepo.save(newRole);
        }
      }
    }

    return savedUser;
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);

    // Soft delete user in identity DB
    item.isActive = false;
    await this.repo.save(item);

    // Soft delete UserCredential in identity DB
    const credential = await this.credentialRepo.findOne({
      where: { userId: item._id.toString() },
    });

    if (credential) {
      credential.isActive = false;
      await this.credentialRepo.save(credential);
    }

    // Soft delete UserTenant memberships in identity DB
    const userTenants = await this.userTenantRepo.find({
      where: { userId: item._id.toString() },
    });

    for (const ut of userTenants) {
      ut.isActive = false;
      await this.userTenantRepo.save(ut);
    }

    // Deactivate AppUserRole rows in digital_book
    // Ensures deleted user loses functional role access
    const appUserRoles = await this.appUserRoleRepo.find({
      where: { userId: item._id.toString() } as any,
    });

    for (const aur of appUserRoles) {
      aur.isActive = false;
      await this.appUserRoleRepo.save(aur);
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

    // Check existing membership in identity DB
    const existingMembership = await this.userTenantRepo.findOne({
      where: { userId: user._id.toString(), tenantId },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException('Người dùng đã là thành viên của công ty này');
      }
      // Reactivate membership — membership tier stays 'member'
      existingMembership.isActive = true;
      existingMembership.role = 'member';
      await this.userTenantRepo.save(existingMembership);
    } else {
      const userTenant = this.userTenantRepo.create({
        userId: user._id.toString(),
        tenantId,
        role: 'member',
        isActive: true,
      });
      await this.userTenantRepo.save(userTenant);
    }

    // Update or create functional role in AppUserRole (digital_book)
    const existingAppUserRole = await this.appUserRoleRepo.findOne({
      where: { userId: user._id.toString(), tenantId } as any,
    });

    if (existingAppUserRole) {
      existingAppUserRole.role = dto.vaiTro;
      existingAppUserRole.isActive = true;
      await this.appUserRoleRepo.save(existingAppUserRole);
    } else {
      const newRole = this.appUserRoleRepo.create({
        userId: user._id.toString(),
        tenantId,
        role: dto.vaiTro,
        isActive: true,
      });
      await this.appUserRoleRepo.save(newRole);
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

  async searchUsersNotInTenant(
    search?: string,
  ): Promise<Array<{ id: string; email: string; hoTen: string }>> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (!tenantId) return [];

    // Get user IDs already in this tenant from identity DB
    const existingMemberships = await this.userTenantRepo.find({
      where: { tenantId, isActive: true },
    });
    const existingUserIds = new Set(existingMemberships.map((m) => m.userId));

    // Get all active users from identity DB
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

    // Get memberships from identity DB
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

    // Get unique user IDs from memberships
    const userIds = [...new Set(userTenants.map((ut) => ut.userId))];

    if (userIds.length === 0) {
      return {
        tongNguoiDung: 0,
        dangHoatDong: 0,
        daKhoa: 0,
        theoVaiTro: {},
      };
    }

    // Fetch users from identity DB
    const { ObjectId } = await import('mongodb');
    const objectIds = userIds.map((id) => new ObjectId(id));

    const allUsers = await this.repo.find({
      where: {
        _id: { $in: objectIds } as any,
        isActive: true,
      },
    });

    // Get functional roles from AppUserRole (digital_book) for theoVaiTro stats
    const whereRole: Record<string, any> = {
      userId: { $in: userIds } as any,
      isActive: true,
    };
    if (currentTenantId) {
      whereRole.tenantId = currentTenantId;
    }
    const appUserRoles = await this.appUserRoleRepo.find({ where: whereRole as any });

    // Count by functional role from AppUserRole
    const theoVaiTro: Record<string, number> = {};
    for (const aur of appUserRoles) {
      theoVaiTro[aur.role] = (theoVaiTro[aur.role] || 0) + 1;
    }

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
