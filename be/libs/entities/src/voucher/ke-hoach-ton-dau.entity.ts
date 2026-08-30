import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { LoaiKeHoach } from './ke-hoach.entity';

/**
 * Tồn quỹ đầu năm của bảng kế hoạch dòng tiền — MỘT bản ghi cho mỗi cặp
 * (năm, loại kế hoạch).
 *
 * Nhập tay, không đọc từ số dư thực tế: kế hoạch năm sau thường được lập trước
 * khi khoá sổ năm nay, nên số dư thực tế lúc đó chưa phải là số cuối cùng.
 *
 * Tồn đầu của T2 trở đi là tồn cuối tháng trước, tính khi đọc — không lưu.
 */
@Entity('ke_hoach_ton_dau')
export class KeHoachTonDau extends BaseEntity {
  @Column({ default: 'KE_HOACH' })
  loaiKeHoach: LoaiKeHoach;

  @Column()
  nam: number;

  @Column({ default: 0 })
  soTien: number;

  @Column()
  nguoiTaoId: string;
}

export interface KeHoachTonDauEntities {
  KeHoachTonDau: typeof KeHoachTonDau;
}

declare module '../entities' {
  interface Entities extends KeHoachTonDauEntities {}
}
