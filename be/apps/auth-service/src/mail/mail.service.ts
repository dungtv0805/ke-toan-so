import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendResetPasswordEmail(
    to: string,
    hoTen: string,
    resetLink: string,
  ): Promise<void> {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #1890ff; }
    .content { padding: 30px 0; }
    .btn { display: inline-block; padding: 12px 30px; background-color: #1890ff; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .footer { padding: 20px 0; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
    .warning { background-color: #fff3cd; padding: 10px 15px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Master CEO</h2>
    </div>
    <div class="content">
      <p>Xin chào <strong>${hoTen}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" class="btn">Đặt lại mật khẩu</a>
      </p>
      <div class="warning">
        ⚠️ Link này sẽ hết hạn sau <strong>1 giờ</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
      </div>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống Master CEO.</p>
      <p>Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: 'Đặt lại mật khẩu - Master CEO',
        html,
      });
      this.logger.log(`Reset password email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send reset password email to ${to}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
