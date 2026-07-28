import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';

function crearContexto(headers: Record<string, string> = {}) {
  const request = { headers, user: undefined as unknown };
  const contexto = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { contexto, request };
}

describe('AccessTokenGuard (Zero Trust)', () => {
  let guard: AccessTokenGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new AccessTokenGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('permite el paso sin token si la ruta es @Public()', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { contexto } = crearContexto();
    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rechaza sin encabezado Authorization', async () => {
    const { contexto } = crearContexto();
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un encabezado que no es "Bearer <token>"', async () => {
    const { contexto } = crearContexto({ authorization: 'Basic abc123' });
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un token que no verifica (inválido/expirado)', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));
    const { contexto } = crearContexto({ authorization: 'Bearer token-malo' });
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un TempToken presentado como AccessToken', async () => {
    jwtService.verifyAsync.mockResolvedValue({ type: 'temp', sub: 'u1' });
    const { contexto } = crearContexto({ authorization: 'Bearer temp-token' });
    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('permite el paso con un AccessToken válido y adjunta el payload a la request', async () => {
    const payload = {
      type: 'access',
      sub: 'u1',
      rol: { id: 'r1', nombre: 'Admin' },
      permisos: { modulos: [], menus: [] },
    };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const { contexto, request } = crearContexto({ authorization: 'Bearer valido' });

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });
});
