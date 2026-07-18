import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AccessTokenGuard } from './auth/guards/access-token.guard';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Secrets solo vía variables de entorno — nunca hardcodeados
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global: 30 peticiones/min por IP (login es más estricto)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    // Orden: primero rate limiting, luego Zero Trust (token en TODO endpoint)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
})
export class AppModule {}
