import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '@app/dto';
import { TrangThaiHopDong } from '@app/entities/master-data/hop-dong.entity';

export class HopDongQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TrangThaiHopDong)
  trangThaiHopDong?: TrangThaiHopDong;

  @IsOptional()
  @IsString()
  doiTuongId?: string;
}
