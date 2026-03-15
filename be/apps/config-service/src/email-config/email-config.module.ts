import { Module } from '@nestjs/common';
import { EmailConfig } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { EmailConfig_Service } from './email-config.service';
import { EmailConfig_Controller } from './email-config.controller';

@Module({
  imports: [DatabaseModule.forFeature([EmailConfig])],
  controllers: [EmailConfig_Controller],
  providers: [EmailConfig_Service],
  exports: [EmailConfig_Service],
})
export class EmailConfig_Module {}
