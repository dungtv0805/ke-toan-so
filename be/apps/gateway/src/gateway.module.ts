import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CoreModule, TenantModule } from '@app/core';
import { controllers } from './controllers';
import { TenantHeaderInterceptor } from './interceptors';

@Module({
  imports: [CoreModule, TenantModule],
  controllers,
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantHeaderInterceptor,
    },
  ],
})
export class GatewayModule {}
