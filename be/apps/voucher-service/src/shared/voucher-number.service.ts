import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherSequence, LoaiChungTu } from '@app/entities';

/** Tiền tố số phiếu theo loại chứng từ. */
const PREFIX_BY_LOAI: Record<LoaiChungTu, string> = {
  PHIEU_THU: 'PT',
  PHIEU_CHI: 'PC',
  KHAC: 'NK',
};

@Injectable()
export class VoucherNumberService {
  constructor(
    @InjectRepository(VoucherSequence)
    private readonly sequenceRepository: Repository<VoucherSequence>,
  ) {}

  /**
   * Generate voucher number in format: {PREFIX}{SEQ}/{YEAR}
   * PT001/2024 for PHIEU_THU, PC001/2024 for PHIEU_CHI, NK001/2024 for KHAC
   */
  async generateVoucherNumber(loai: LoaiChungTu): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = PREFIX_BY_LOAI[loai] ?? 'PT';

    // Find or create sequence record
    let sequence = await this.sequenceRepository.findOne({
      where: { loai, year },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        loai,
        year,
        lastSequence: 0,
      });
    }

    // Increment sequence
    sequence.lastSequence += 1;
    await this.sequenceRepository.save(sequence);

    // Format: PT001/2024
    const seqStr = sequence.lastSequence.toString().padStart(3, '0');
    return `${prefix}${seqStr}/${year}`;
  }

  /**
   * Generate `count` consecutive voucher numbers in ONE sequence update.
   * Dùng cho import: mỗi item 1 số phiếu riêng nhưng chỉ ghi sequence 1 lần.
   */
  async generateVoucherNumbers(
    loai: LoaiChungTu,
    count: number,
  ): Promise<string[]> {
    if (count <= 0) return [];

    const year = new Date().getFullYear();
    const prefix = PREFIX_BY_LOAI[loai] ?? 'PT';

    let sequence = await this.sequenceRepository.findOne({
      where: { loai, year },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        loai,
        year,
        lastSequence: 0,
      });
    }

    const start = sequence.lastSequence + 1;
    sequence.lastSequence += count;
    await this.sequenceRepository.save(sequence);

    const numbers: string[] = [];
    for (let i = 0; i < count; i++) {
      const seqStr = (start + i).toString().padStart(3, '0');
      numbers.push(`${prefix}${seqStr}/${year}`);
    }
    return numbers;
  }

  /**
   * Parse voucher number to extract components
   */
  parseVoucherNumber(soPhieu: string): {
    prefix: string;
    sequence: number;
    year: number;
  } | null {
    const match = soPhieu.match(/^(PT|PC|NK)(\d{3})\/(\d{4})$/);
    if (!match) return null;

    return {
      prefix: match[1],
      sequence: parseInt(match[2], 10),
      year: parseInt(match[3], 10),
    };
  }
}
