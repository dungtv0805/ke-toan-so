import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('bang_ke_mua_vao')
export class BangKeMuaVao extends BaseEntity {
  @Column({ type: 'date' }) ngayHoaDon: Date;
  @Column() soHoaDon: string;
  @Column({ nullable: true }) kyHieuHoaDon: string;
  @Column() tenNguoiBan: string;
  @Column({ nullable: true }) mstNguoiBan: string;
  @Column({ nullable: true }) tenHangHoa: string;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) giaTriChuaThue: number;
  @Column({ default: '10' }) thueSuat: string; // '0'|'5'|'8'|'10'|'KCT'|'KKKT'
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tienThue: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tongThanhToan: number;
  @Column({ nullable: true }) ghiChu: string;
  @Column({ nullable: true }) chungTuId: string; // không dùng — liên kết đi theo soChungTu (số phiếu)
  @Column({ nullable: true }) soChungTu: string;
  // Dòng nháp sinh từ màn chứng từ: mới có số hóa đơn, chưa có số tiền.
  // KHÔNG được cộng vào Tổng hợp thuế cho tới khi kế toán thuế điền đủ.
  @Column({ default: false }) choBoSung?: boolean;
  @Column({ default: true }) isActive: boolean;
}

export interface BangKeMuaVaoEntities { BangKeMuaVao: typeof BangKeMuaVao; }
declare module '../entities' { interface Entities extends BangKeMuaVaoEntities {} }
