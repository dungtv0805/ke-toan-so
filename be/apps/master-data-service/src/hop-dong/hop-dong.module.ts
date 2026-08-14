import { Module } from '@nestjs/common';
import { HopDong, HopDongFile } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { StorageModule } from '@app/storage';
import { HopDongService } from './hop-dong.service';
import { HopDongController } from './hop-dong.controller';
import { HopDongFileService } from './hop-dong-file.service';
import { HopDongFileController } from './hop-dong-file.controller';

@Module({
  imports: [
    DatabaseModule.forFeature([HopDong, HopDongFile]),
    StorageModule.forBucket('hop_dong_files'),
  ],
  controllers: [HopDongController, HopDongFileController],
  providers: [HopDongService, HopDongFileService],
  exports: [HopDongService],
})
export class HopDongModule {}
