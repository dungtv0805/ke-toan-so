import { MiddlewareConsumer, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { RequestContextMiddleware } from './middlewares/request-context.middleware';
import { CDService } from './services/app-event';

@Module({
  imports: [DiscoveryModule],
  providers: [CDService],
  exports: [CDService],
})
export class CoreModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
