import { NestFactory } from '@nestjs/core';
import { MasterDataServiceModule } from './master-data-service.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  createAppLogger,
  LoggingInterceptor,
  GlobalExceptionFilter,
} from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    MasterDataServiceModule,
    // Disable the default body parser so we can register one with a larger
    // limit. The default Express limit is 100kb, which rejects bulk imports
    // (e.g. Danh mục import of a few hundred/thousand rows) with
    // "request entity too large".
    { bodyParser: false, logger: createAppLogger('master-data') },
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

  const port = process.env.SERVICE_MASTER_DATA_PORT || 3002;

  await app.listen(port);
  Logger.log(`Master Data Service running on port ${port}`, 'Bootstrap');
}
void bootstrap();
