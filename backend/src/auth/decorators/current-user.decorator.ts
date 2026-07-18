import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TokenPayload } from '../interfaces/token-payload.interface';

/** Extrae el payload del token ya verificado por el guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: TokenPayload }>();
    return request.user;
  },
);
