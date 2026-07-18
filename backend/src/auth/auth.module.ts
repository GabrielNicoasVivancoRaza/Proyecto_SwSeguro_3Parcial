import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { InternalsController } from './internals.controller';

@Module({
  imports: [
    // global: el guard Zero Trust necesita JwtService en toda la app
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          // Fail-fast: jamás arrancar con un secret por defecto
          throw new Error('JWT_SECRET no está definido en el entorno');
        }
        return { secret };
      },
    }),
  ],
  controllers: [AuthController, InternalsController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
