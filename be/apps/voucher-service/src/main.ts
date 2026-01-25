import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { VoucherServiceModule } from './voucher-service.module';

async function bootstrap() {
  const app = await NestFactory.create(VoucherServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = process.env.VOUCHER_SERVICE_PORT || 3003;
  await app.listen(port);
  console.log(`Voucher Service is running on port ${port}`);
}
bootstrap();
