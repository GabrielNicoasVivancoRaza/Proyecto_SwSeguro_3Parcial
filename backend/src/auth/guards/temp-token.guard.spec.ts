import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { TempTokenGuard } from './temp-token.guard';

function crearContexto(headers: Record<string, string> = {}) {
  const request = { headers, user: undefined as unknown };
  const contexto = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { contexto, request };
}

describe('TempTokenGuard', () => {
  let guard: TempTokenGuard;
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    guard = new TempTokenGuard(jwtService as unknown as JwtService);
  });

  it('rechaza sin encabezado Authorization', async () => {
    const { contexto } = crearContexto();
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un token que no verifica', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad'));
    const { contexto } = crearContexto({ authorization: 'Bearer malo' });
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un AccessToken presentado como TempToken', async () => {
    jwtService.verifyAsync.mockResolvedValue({ type: 'access', sub: 'u1' });
    const { contexto } = crearContexto({ authorization: 'Bearer access-token' });
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('permite el paso con un TempToken válido', async () => {
    const payload = { type: 'temp', sub: 'u1' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const { contexto, request } = crearContexto({ authorization: 'Bearer temp-valido' });

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });
});
