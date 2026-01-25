import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoucherSequence, LoaiChungTu } from '@app/entities';

@Injectable()
export class VoucherNumberService {
  constructor(
    @InjectRepository(VoucherSequence)
    private readonly sequenceRepository: Repository<VoucherSequence>,
  ) {}

  /**
   * Generate voucher number in format: {PREFIX}{SEQ}/{YEAR}
   * PT001/2024 for PHIEU_THU
   * PC001/2024 for PHIEU_CHI
   */
  async generateVoucherNumber(loai: LoaiChungTu): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = loai === 'PHIEU_THU' ? 'PT' : 'PC';

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
   * Parse voucher number to extract components
   */
  parseVoucherNumber(soPhieu: string): {
    prefix: string;
    sequence: number;
    year: number;
  } | null {
    const match = soPhieu.match(/^(PT|PC)(\d{3})\/(\d{4})$/);
    if (!match) return null;

    return {
      prefix: match[1],
      sequence: parseInt(match[2], 10),
      year: parseInt(match[3], 10),
    };
  }
}
