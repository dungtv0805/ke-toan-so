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
import { SO_THANG, type ChieuDongTien, type LoaiKeHoach } from '@app/entities';
import { MucDanhMucDto } from '../../ban-hang/dto/create-ban-hang.dto';

export class CreateKeHoachDongTienDto {
  @IsOptional()
  @IsIn(['KE_HOACH', 'DU_BAO'])
  loaiKeHoach?: LoaiKeHoach;

  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  nam: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => MucDanhMucDto)
  nhomDongTien: MucDanhMucDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => MucDanhMucDto)
  dongTien: MucDanhMucDto;

  // Thu hay Chi do người lập chọn: `DongTien.loai` của danh mục là Kinh doanh /
  // Đầu tư / Tài chính, không phải chiều tiền.
  @IsIn(['THU', 'CHI'])
  chieu: ChieuDongTien;

  @IsNumber()
  @Min(0)
  giaTriMucTieu: number;

  // Bảng luôn gửi đủ 12 tháng — thiếu là lỗi phía gọi, không tự bù.
  @IsArray()
  @ArrayMinSize(SO_THANG)
  @ArrayMaxSize(SO_THANG)
  @IsNumber({}, { each: true })
  thang: number[];

  @IsOptional()
  @IsString()
  ghiChu?: string;
}
