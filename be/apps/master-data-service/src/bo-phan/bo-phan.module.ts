import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoPhan } from '@app/entities';
import { BoPhanService } from './bo-phan.service';
import { BoPhanController } from './bo-phan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BoPhan])],
  controllers: [BoPhanController],
  providers: [BoPhanService],
  exports: [BoPhanService],
})
export class BoPhanModule {}
