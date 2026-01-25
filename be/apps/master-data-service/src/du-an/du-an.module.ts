import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DuAn } from '@app/entities';
import { DuAnService } from './du-an.service';
import { DuAnController } from './du-an.controller';
import { ChuDauTuModule } from '../chu-dau-tu/chu-dau-tu.module';

@Module({
  imports: [TypeOrmModule.forFeature([DuAn]), forwardRef(() => ChuDauTuModule)],
  controllers: [DuAnController],
  providers: [DuAnService],
  exports: [DuAnService],
})
export class DuAnModule {}
