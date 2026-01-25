import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CongNo } from '@app/entities';
import { CongNoService } from './cong-no.service';
import { CongNoController } from './cong-no.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CongNo])],
  controllers: [CongNoController],
  providers: [CongNoService],
  exports: [CongNoService],
})
export class CongNoModule {}
