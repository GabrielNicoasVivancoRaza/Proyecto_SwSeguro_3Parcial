import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

/**
 * Pruebas de seguridad unitarias (Shift-Left, OE5) del flujo de
 * autenticación: credenciales inválidas, menor privilegio y detección
 * de reutilización de refresh tokens (Zero Trust).
 */
describe('AuthService (seguridad)', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  const PASSWORD_CORRECTA = 'Clave#Segura123';
  let hashAlmacenado: string;

  beforeAll(async () => {
    hashAlmacenado = await argon2.hash(PASSWORD_CORRECTA);
  });

  beforeEach(async () => {
    prisma = {
      activo: {
        usuario: { findFirst: jest.fn() },
        usuarioRol: { findFirst: jest.fn(), findMany: jest.fn() },
        rolModulo: { findMany: jest.fn().mockResolvedValue([]) },
        rolMenu: { findMany: jest.fn().mockResolvedValue([]) },
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'rt-nuevo' }),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token.firmado.fake'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_clave: string, porDefecto: unknown) => porDefecto) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('rechaza con mensaje genérico si el usuario no existe', async () => {
      prisma.activo.usuario.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nadie@espe.edu.ec', password: 'cualquiera123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza con el MISMO mensaje si la contraseña es incorrecta', async () => {
      prisma.activo.usuario.findFirst.mockResolvedValue({
        id: 'u1',
        passwordHash: hashAlmacenado,
      });

      await expect(
        service.login({ email: 'u@espe.edu.ec', password: 'incorrecta-123' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('rechaza si el usuario no tiene roles activos asignados', async () => {
      prisma.activo.usuario.findFirst.mockResolvedValue({
        id: 'u1',
        passwordHash: hashAlmacenado,
      });
      prisma.activo.usuarioRol.findMany.mockResolvedValue([]);

      await expect(
        service.login({ email: 'u@espe.edu.ec', password: PASSWORD_CORRECTA }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devuelve TempToken + roles con credenciales correctas', async () => {
      prisma.activo.usuario.findFirst.mockResolvedValue({
        id: 'u1',
        passwordHash: hashAlmacenado,
      });
      prisma.activo.usuarioRol.findMany.mockResolvedValue([
        { rol: { id: 'r1', nombre: 'Vendedor' } },
      ]);

      const resultado = await service.login({
        email: 'u@espe.edu.ec',
        password: PASSWORD_CORRECTA,
      });

      expect(resultado.tempToken).toBe('token.firmado.fake');
      expect(resultado.roles).toEqual([{ id: 'r1', nombre: 'Vendedor' }]);
    });
  });

  describe('selectRole (menor privilegio)', () => {
    it('rechaza un rol que el usuario NO posee', async () => {
      prisma.activo.usuarioRol.findFirst.mockResolvedValue(null);

      await expect(service.selectRole('u1', 'rol-ajeno')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('emite el AccessToken solo cuando el usuario posee el rol', async () => {
      prisma.activo.usuarioRol.findFirst.mockResolvedValue({
        rol: { id: 'r1', nombre: 'Vendedor' },
      });

      const resultado = await service.selectRole('u1', 'r1');
      expect(resultado.accessToken).toBe('token.firmado.fake');
      expect(resultado.rol).toEqual({ id: 'r1', nombre: 'Vendedor' });
    });
  });

  describe('refresh (rotación y detección de reutilización)', () => {
    it('rechaza un token que no existe', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('token-inexistente')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('detecta reutilización: revoca TODAS las sesiones del usuario', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        usuarioId: 'u1',
        rolId: 'r1',
        revocado: true, // ya fue usado antes -> señal de robo
        estado: 'ACTIVO',
        expiraEn: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh('token-ya-rotado')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId: 'u1', revocado: false }),
          data: expect.objectContaining({ revocado: true }),
        }),
      );
    });

    it('rechaza un token expirado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        usuarioId: 'u1',
        rolId: 'r1',
        revocado: false,
        estado: 'ACTIVO',
        expiraEn: new Date(Date.now() - 1000), // ya expiró
      });

      await expect(service.refresh('token-expirado')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
