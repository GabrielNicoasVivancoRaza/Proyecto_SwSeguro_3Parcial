import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      activo: {
        usuario: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
      },
      usuario: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el usuario no existe o está inactivo', async () => {
      prisma.activo.usuario.findFirst.mockResolvedValue(null);
      await expect(service.findOne('u1')).rejects.toThrow(NotFoundException);
    });

    it('devuelve el usuario con sus roles aplanados', async () => {
      prisma.activo.usuario.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        roles: [{ rol: { id: 'r1', nombre: 'Vendedor' } }],
      });
      const resultado = await service.findOne('u1');
      expect(resultado.roles).toEqual([{ id: 'r1', nombre: 'Vendedor' }]);
    });
  });

  describe('create', () => {
    const dto = {
      email: 'Nuevo@Espe.edu.ec',
      username: 'nuevo',
      nombreCompleto: 'Nuevo Usuario',
      password: 'Segura#2026xyz',
    };

    it('rechaza con 409 si el email o username ya existen', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: 'existente' });
      await expect(service.create(dto, 'admin1')).rejects.toThrow(ConflictException);
      expect(prisma.usuario.create).not.toHaveBeenCalled();
    });

    it('crea el usuario con email normalizado y password hasheada (nunca en claro)', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);
      prisma.usuario.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'nuevo-id', ...data }),
      );

      const resultado = await service.create(dto, 'admin1');

      expect(resultado.email).toBe('nuevo@espe.edu.ec'); // normalizado a minúsculas
      const argsCreate = prisma.usuario.create.mock.calls[0][0];
      expect(argsCreate.data.passwordHash).not.toBe(dto.password);
      expect(await argon2.verify(argsCreate.data.passwordHash, dto.password)).toBe(true);
      expect(argsCreate.data.creadoPor).toBe('admin1');
    });
  });

  describe('remove (soft delete)', () => {
    it('inactiva al usuario Y revoca sus refresh tokens en la misma transacción', async () => {
      prisma.activo.usuario.findFirst.mockResolvedValue({ id: 'u1', roles: [] });
      prisma.usuario.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await service.remove('u1', 'admin1');

      expect(prisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({ estado: 'INACTIVO' }),
        }),
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId: 'u1', revocado: false }),
        }),
      );
    });

    it('lanza 404 si el usuario ya está inactivo/no existe', async () => {
      prisma.activo.usuario.findFirst.mockResolvedValue(null);
      await expect(service.remove('inexistente', 'admin1')).rejects.toThrow(NotFoundException);
    });
  });
});
