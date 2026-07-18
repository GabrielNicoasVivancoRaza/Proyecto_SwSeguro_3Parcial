import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TempTokenPayload } from '../interfaces/token-payload.interface';
import { extractBearerToken } from './access-token.guard';

/**
 * Guard exclusivo de /auth/select-role: exige un TempToken válido
 * (emitido en el login). Un AccessToken NO sirve aquí y viceversa.
 */
@Injectable()
export class TempTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('TempToken no proporcionado');
    }

    let payload: TempTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<TempTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('TempToken inválido o expirado');
    }

    if (payload.type !== 'temp') {
      throw new UnauthorizedException('Tipo de token incorrecto');
    }

    (request as Request & { user: TempTokenPayload }).user = payload;
    return true;
  }
}
