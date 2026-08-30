import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SO_THANG, type LoaiKeHoach } from '@app/entities';
import { MucDanhMucDto } from '../../ban-hang/dto/create-ban-hang.dto';

export class CreateKeHoachTaiSanDto {
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;

  // Cột hiển thị mang nhãn "NƠI SỬ DỤNG"; giá trị chọn là Bộ phận/Phòng ban.
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => MucDanhMucDto)
  boPhan: MucDanhMucDto;

  /** Mã tài sản gõ tự do — master-data không có danh mục tài sản. */
  @IsNotEmpty()
  @IsString()
  maTaiSan: string;

  @IsOptional()
  @IsString()
  tenTaiSan?: string;

  @IsNumber()
  @Min(0)
  soLuong: number;

  @IsNumber()
  @Min(0)
  giaBinhQuan: number;

  @IsArray()
  @ArrayMinSize(SO_THANG)
  @ArrayMaxSize(SO_THANG)
  @IsNumber({}, { each: true })
  thang: number[];

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
