import { IsString, IsNumber, IsBoolean, IsOptional, IsEmail, Min, Max } from 'class-validator';

export class CreateEmailConfigDto {
  @IsString()
  smtpHost: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  smtpPort: number;

  @IsBoolean()
  @IsOptional()
  smtpSecure?: boolean;

  @IsString()
  smtpUser: string;

  @IsString()
  smtpPass: string;

  @IsString()
  @IsOptional()
  smtpFrom?: string;
}
