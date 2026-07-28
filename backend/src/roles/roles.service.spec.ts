import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      activo: {
        rol: { findMany: jest.fn(), findFirst: jest.fn() },
        usuario: { findFirst: jest.fn() },
        usuarioRol: { count: jest.fn() },
        modulo: { findFirst: jest.fn() },
        menu: { findFirst: jest.fn() },
      },
      rol: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
      usuarioRol: { upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      rolModulo: { upsert: jest.fn() },
      rolMenu: { upsert: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [RolesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(RolesService);
  });

  describe('create', () => {
    it('rechaza un nombre de rol duplicado', async () => {
      prisma.rol.findFirst.mockResolvedValue({ id: 'existente' });
      await expect(service.create({ nombre: 'Administrador' }, 'admin1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('crea el rol cuando el nombre es único', async () => {
      prisma.rol.findFirst.mockResolvedValue(null);
      prisma.rol.create.mockResolvedValue({ id: 'r1', nombre: 'Auditor' });
      const resultado = await service.create({ nombre: 'Auditor' }, 'admin1');
      expect(resultado).toEqual({ id: 'r1', nombre: 'Auditor' });
    });
  });

  describe('remove', () => {
    it('bloquea con 409 si el rol tiene usuarios activos asignados', async () => {
      prisma.activo.rol.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.activo.usuarioRol.count.mockResolvedValue(3);
      await expect(service.remove('r1', 'admin1')).rejects.toThrow(ConflictException);
      expect(prisma.rol.update).not.toHaveBeenCalled();
    });

    it('inactiva el rol cuando no tiene usuarios activos', async () => {
      prisma.activo.rol.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.activo.usuarioRol.count.mockResolvedValue(0);
      prisma.rol.update.mockResolvedValue({});
      const resultado = await service.remove('r1', 'admin1');
      expect(resultado.message).toMatch(/inactivado/);
    });
  });

  describe('assignUser / unassignUser (pivote M:N)', () => {
    it('rechaza asignar un usuario inexistente', async () => {
      prisma.activo.rol.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.activo.usuario.findFirst.mockResolvedValue(null);
      await expect(service.assignUser('r1', 'u-inexistente', 'admin1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('asigna un usuario existente al rol con auditoría', async () => {
      prisma.activo.rol.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.activo.usuario.findFirst.mockResolvedValue({ id: 'u1' });
      prisma.usuarioRol.upsert.mockResolvedValue({ id: 'pivote1' });

      await service.assignUser('r1', 'u1', 'admin1');

      expect(prisma.usuarioRol.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ usuarioId: 'u1', rolId: 'r1', creadoPor: 'admin1' }),
        }),
      );
    });

    it('desasignar una relación inexistente lanza 404', async () => {
      prisma.usuarioRol.findUnique.mockResolvedValue(null);
      await expect(service.unassignUser('r1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('desasignar elimina físicamente la fila pivote', async () => {
      prisma.usuarioRol.findUnique.mockResolvedValue({ id: 'pivote1' });
      prisma.usuarioRol.delete.mockResolvedValue({});
      await service.unassignUser('r1', 'u1');
      expect(prisma.usuarioRol.delete).toHaveBeenCalledWith({ where: { id: 'pivote1' } });
    });
  });

  describe('assignModule / assignMenu', () => {
    it('rechaza vincular un módulo inexistente', async () => {
      prisma.activo.rol.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.activo.modulo.findFirst.mockResolvedValue(null);
      await expect(service.assignModule('r1', 'mod-x', 'admin1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza vincular un menú inexistente', async () => {
      prisma.activo.rol.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.activo.menu.findFirst.mockResolvedValue(null);
      await expect(service.assignMenu('r1', 'menu-x', 'admin1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
