import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserCredential, UserRole, UserStatus } from '@app/entities';
import {
  CreateNguoiDungDto,
  UpdateNguoiDungDto,
  PaginationQueryDto,
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

@Injectable()
export class NguoiDung_Service {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(UserCredential)
    private readonly credentialRepo: Repository<UserCredential>,
  ) {}

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, search, vaiTro, trangThai } = query;

    const where: any = { isActive: true };

    if (vaiTro) {
      where.vaiTro = vaiTro;
    }

    if (trangThai) {
      where.trangThai = trangThai;
    }

    let allItems = await this.repo.find({ where });

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      allItems = allItems.filter(
        (item) =>
          item.hoTen.toLowerCase().includes(searchLower) ||
          item.email.toLowerCase().includes(searchLower),
      );
    }

    const total = allItems.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const data = allItems.slice(skip, skip + limit);

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

    // Create user without password field
    const item = this.repo.create({
      email: dto.email.toLowerCase(),
      hoTen: dto.hoTen,
      vaiTro: dto.vaiTro,
      trangThai: dto.trangThai || UserStatus.HOAT_DONG,
      permissions: [],
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

    Object.assign(item, dto);
    return this.repo.save(item);
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
  }

  async toggleStatus(id: string): Promise<User> {
    const item = await this.findOne(id);
    item.trangThai =
      item.trangThai === UserStatus.HOAT_DONG
        ? UserStatus.KHOA
        : UserStatus.HOAT_DONG;
    return this.repo.save(item);
  }

  async getStats(): Promise<NguoiDungStats> {
    const allItems = await this.repo.find({ where: { isActive: true } });

    const theoVaiTro = {} as Record<UserRole, number>;
    Object.values(UserRole).forEach((vt) => {
      theoVaiTro[vt] = allItems.filter((item) => item.vaiTro === vt).length;
    });

    return {
      tongNguoiDung: allItems.length,
      dangHoatDong: allItems.filter(
        (item) => item.trangThai === UserStatus.HOAT_DONG,
      ).length,
      daKhoa: allItems.filter((item) => item.trangThai === UserStatus.KHOA)
        .length,
      theoVaiTro,
    };
  }
}
