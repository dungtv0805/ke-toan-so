import { Module } from '@nestjs/common';
import { CongNo } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { CongNoService } from './cong-no.service';
import { CongNoController } from './cong-no.controller';

@Module({
  imports: [DatabaseModule.forFeature([CongNo])],
  controllers: [CongNoController],
  providers: [CongNoService],
  exports: [CongNoService],
})
export class CongNoModule {}
