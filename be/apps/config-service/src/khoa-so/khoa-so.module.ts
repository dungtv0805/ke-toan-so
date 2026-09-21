import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { KhoaSo, KhoaSoCauHinh } from '@app/entities';
import { KhoaSoController } from './khoa-so.controller';
import { KhoaSoService } from './khoa-so.service';

@Module({
  imports: [DatabaseModule.forFeature([KhoaSo, KhoaSoCauHinh])],
  controllers: [KhoaSoController],
  providers: [KhoaSoService],
  exports: [KhoaSoService],
})
export class KhoaSo_Module {}
