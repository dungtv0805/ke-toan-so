import { IsString, IsEnum, IsMongoId } from 'class-validator';
import { UserRole } from '@app/entities';

export class AddExistingUserDto {
  @IsMongoId({ message: 'User ID không hợp lệ' })
  userId: string;

  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  vaiTro: UserRole;
}
