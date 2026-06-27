import { IsString, IsOptional, IsBoolean, IsArray, IsInt } from 'class-validator';

export class UpdateLinhVucDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  menuKeys?: string[];

  @IsOptional()
  glossary?: Record<string, { label?: string; surfaces?: Record<string, string> }>;
}
