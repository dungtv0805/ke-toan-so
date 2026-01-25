import { Entity, Column, ObjectIdColumn } from 'typeorm';
import { ObjectId } from 'mongodb';

@Entity('voucher_sequences')
export class VoucherSequence {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  loai: string;

  @Column()
  year: number;

  @Column({ default: 0 })
  lastSequence: number;

  get id(): string {
    return this._id.toString();
  }
}

export interface VoucherSequenceEntities {
  VoucherSequence: typeof VoucherSequence;
}

declare module '../entities' {
  interface Entities extends VoucherSequenceEntities {}
}
