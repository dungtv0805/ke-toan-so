import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigServiceModule } from './config-service.module';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    ConfigServiceModule,
    // Disable the default body parser so we can register one with a larger
    // limit. The default Express limit is 100kb, which rejects bulk imports
    // (e.g. Quy chuẩn hạch toán import of a few hundred/thousand rows) with
    // "request entity too large".
    { bodyParser: false, logger: createAppLogger('config') },
  );

  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '10mb' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors();

  const port = process.env.CONFIG_SERVICE_PORT || 3007;
  await app.listen(port);
  console.log(`Config Service is running on port ${port}`);
}
bootstrap();
