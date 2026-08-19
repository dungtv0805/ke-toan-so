import { IsIn, IsOptional, IsString } from 'class-validator';
import { CHI_TIEU_LIST, type ChiTieu } from '../helpers/so-sanh.helper';
import {
  KE_HOACH_DIMENSIONS,
  type KeHoachDimension,
} from '../helpers/dimension-aggregation.helper';
import { KeHoachQueryDto } from './ke-hoach-query.dto';

export class SoSanhQueryDto extends KeHoachQueryDto {
  @IsOptional()
  @IsIn(KE_HOACH_DIMENSIONS)
  type?: KeHoachDimension;

  @IsOptional()
  @IsIn(CHI_TIEU_LIST)
  chiTieu?: ChiTieu;
}

export class SeriesQueryDto {
  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  loaiKeHoach?: string;

  @IsOptional()
  @IsString()
  phienBan?: string;
}
