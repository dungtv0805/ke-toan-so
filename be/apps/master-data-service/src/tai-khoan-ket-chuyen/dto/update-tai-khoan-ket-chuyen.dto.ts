import { PartialType } from '@nestjs/mapped-types';
import { CreateTaiKhoanKetChuyenDto } from './create-tai-khoan-ket-chuyen.dto';

export class UpdateTaiKhoanKetChuyenDto extends PartialType(CreateTaiKhoanKetChuyenDto) {}
