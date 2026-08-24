import { PartialType } from '@nestjs/mapped-types';
import { CreateNhomDongTienDto } from './create-nhom-dong-tien.dto';

export class UpdateNhomDongTienDto extends PartialType(CreateNhomDongTienDto) {}
