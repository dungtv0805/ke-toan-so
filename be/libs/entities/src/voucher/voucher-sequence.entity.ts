import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('voucher_sequences')
export class VoucherSequence extends BaseEntity {
  @Column()
  loai: string;

  @Column()
  year: number;

  @Column({ default: 0 })
  lastSequence: number;
}

export interface VoucherSequenceEntities {
  VoucherSequence: typeof VoucherSequence;
}

declare module '../entities' {
  interface Entities extends VoucherSequenceEntities {}
}
