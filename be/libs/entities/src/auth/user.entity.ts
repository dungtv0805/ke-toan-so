import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  GIAM_DOC = 'GIAM_DOC',
  KE_TOAN_TRUONG = 'KE_TOAN_TRUONG',
  KE_TOAN_QUY = 'KE_TOAN_QUY',
  KE_TOAN_CONG_NO = 'KE_TOAN_CONG_NO',
  KE_TOAN_TONG_HOP = 'KE_TOAN_TONG_HOP',
  MANAGER = 'MANAGER',
  KIEM_SOAT = 'KIEM_SOAT',
}

export enum UserStatus {
  HOAT_DONG = 'HOAT_DONG',
  KHOA = 'KHOA',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  hoTen: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.KIEM_SOAT })
  vaiTro: UserRole;

  @Column('array', { default: [] })
  permissions: string[];

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.HOAT_DONG })
  trangThai: UserStatus;

  @Column({ default: true })
  isActive: boolean;
}

export interface UserEntities {
  User: typeof User;
}

declare module '../entities' {
  interface Entities extends UserEntities {}
}
