import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * File đính kèm của một hợp đồng (bản scan, phụ lục, biên bản...).
 * Bảng riêng thay vì mảng trong `hop_dong` để thêm/xoá file không phải ghi đè hợp đồng.
 * Nội dung file nằm ở GridFS bucket `hop_dong_files`, đây chỉ giữ `storageKey`.
 */
@Entity('hop_dong_file')
export class HopDongFile extends BaseEntity {
  @Column()
  @Index()
  hopDongId: string;

  @Column()
  tenFile: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  @Column()
  storageKey: string;

  @Column({ nullable: true })
  createdBy?: string;
}

export interface HopDongFileEntities {
  HopDongFile: typeof HopDongFile;
}

declare module '../entities' {
  interface Entities extends HopDongFileEntities {}
}
