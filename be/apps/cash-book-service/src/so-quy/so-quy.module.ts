import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServiceClientModule } from '@app/service-client';
import { SoQuyService } from './so-quy.service';
import { SoQuyController } from './so-quy.controller';

@Module({
  imports: [ConfigModule, ServiceClientModule.forRoot()],
  controllers: [SoQuyController],
  providers: [SoQuyService],
  exports: [SoQuyService],
})
export class SoQuyModule {}
