import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación y sanitización global de entradas (Shift-Left):
  // - whitelist: elimina propiedades no declaradas en los DTOs
  // - forbidNonWhitelisted: rechaza payloads con campos desconocidos
  // - transform: convierte tipos según el DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
