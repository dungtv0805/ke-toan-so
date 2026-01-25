import { Module } from '@nestjs/common';
import { CoreModule } from '@app/core';
import { controllers } from './controllers';

@Module({
  imports: [CoreModule],
  controllers,
  providers: [],
})
export class GatewayModule {}
