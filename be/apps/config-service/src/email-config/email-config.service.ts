import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailConfig } from '@app/entities';
import * as nodemailer from 'nodemailer';
import { CreateEmailConfigDto, UpdateEmailConfigDto } from './dto';

@Injectable()
export class EmailConfig_Service {
  private readonly logger = new Logger(EmailConfig_Service.name);

  constructor(
    @InjectRepository(EmailConfig)
    private readonly repo: Repository<EmailConfig>,
  ) {}

  async findActive(): Promise<EmailConfig | null> {
    return this.repo.findOne({ where: { isActive: true } });
  }

  async createOrUpdate(dto: CreateEmailConfigDto): Promise<EmailConfig> {
    const existing = await this.findActive();

    if (existing) {
      Object.assign(existing, dto);
      return this.repo.save(existing);
    }

    const config = this.repo.create({
      ...dto,
      isActive: true,
    });
    return this.repo.save(config);
  }

  async update(dto: UpdateEmailConfigDto): Promise<EmailConfig> {
    const existing = await this.findActive();
    if (!existing) {
      throw new NotFoundException('Chưa có cấu hình email');
    }

    Object.assign(existing, dto);
    return this.repo.save(existing);
  }

  async testConnection(to: string): Promise<{ success: boolean; message: string }> {
    const config = await this.findActive();
    if (!config) {
      throw new NotFoundException('Chưa có cấu hình email. Vui lòng thiết lập trước.');
    }

    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    try {
      await transporter.sendMail({
        from: config.smtpFrom || config.smtpUser,
        to,
        subject: 'Test kết nối email - Master CEO',
        html: `<div style="font-family:Arial,sans-serif;padding:20px;">
          <h3>Kết nối email thành công!</h3>
          <p>Email này xác nhận cấu hình SMTP của bạn đã hoạt động.</p>
          <p style="color:#999;font-size:12px;">Gửi từ hệ thống Master CEO</p>
        </div>`,
      });

      this.logger.log(`Test email sent successfully to ${to}`);
      return { success: true, message: 'Gửi email test thành công!' };
    } catch (error) {
      this.logger.error(`Test email failed: ${(error as Error).message}`);
      throw new InternalServerErrorException(
        `Gửi email thất bại: ${(error as Error).message}`,
      );
    }
  }
}
