import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum LoaiTaiKhoan {
  TAI_SAN = 'TAI_SAN', // Tài sản
  NO_PHAI_TRA = 'NO_PHAI_TRA', // Nợ phải trả
  VON_CHU_SO_HUU = 'VON_CHU_SO_HUU', // Vốn chủ sở hữu
  DOANH_THU = 'DOANH_THU', // Doanh thu
  CHI_PHI = 'CHI_PHI', // Chi phí
  THU_NHAP_KHAC = 'THU_NHAP_KHAC', // Thu nhập khác
  CHI_PHI_KHAC = 'CHI_PHI_KHAC', // Chi phí khác
  XAC_DINH_KQKD = 'XAC_DINH_KQKD', // Xác định kết quả kinh doanh
}

export enum NhomTaiKhoan {
  NO = 'NO', // Nợ
  CO = 'CO', // Có
  LUONG_TINH = 'LUONG_TINH', // Lưỡng tính (Số dư 2 bên)
  KHONG_CO_SO_DU = 'KHONG_CO_SO_DU', // Không có số dư
}

export enum ChiTietTheo {
  KHACH_HANG = 'KHACH_HANG',
  NHA_CUNG_CAP = 'NHA_CUNG_CAP',
  NHAN_VIEN = 'NHAN_VIEN',
  NHA_THAU = 'NHA_THAU',
  NGAN_HANG_QUY = 'NGAN_HANG_QUY',
}

@Entity('tai_khoan')
export class TaiKhoan extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column()
  capDo: number;

  @Column({ type: 'enum', enum: LoaiTaiKhoan })
  loai: LoaiTaiKhoan;

  @Column({ type: 'enum', enum: NhomTaiKhoan })
  nhom: NhomTaiKhoan;

  @Column({ nullable: true })
  parentId: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ type: 'enum', enum: ChiTietTheo, nullable: true })
  chiTietTheo?: ChiTietTheo;

  @Column({ default: true })
  isActive: boolean;
}

export interface TaiKhoanEntities {
  TaiKhoan: typeof TaiKhoan;
}

declare module '../entities' {
  interface Entities extends TaiKhoanEntities {}
}
