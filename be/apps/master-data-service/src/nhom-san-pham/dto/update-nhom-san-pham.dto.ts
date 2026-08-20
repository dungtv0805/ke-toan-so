import { PartialType } from '@nestjs/mapped-types';
import { CreateNhomSanPhamDto } from './create-nhom-san-pham.dto';

export class UpdateNhomSanPhamDto extends PartialType(CreateNhomSanPhamDto) {}
