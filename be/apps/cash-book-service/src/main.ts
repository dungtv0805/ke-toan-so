import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { CashBookServiceModule } from './cash-book-service.module';

async function bootstrap() {
  const app = await NestFactory.create(CashBookServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const port = process.env.CASH_BOOK_SERVICE_PORT || 3004;
  await app.listen(port);
  console.log(`Cash Book Service is running on port ${port}`);
}
bootstrap();
