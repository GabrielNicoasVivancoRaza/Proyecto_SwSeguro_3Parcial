import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ModulesService } from './modules.service';

describe('ModulesService', () => {
  let service: ModulesService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      activo: { modulo: { findMany: jest.fn(), findFirst: jest.fn() } },
      modulo: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [ModulesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ModulesService);
  });

  it('findOne lanza 404 si el módulo no existe', async () => {
    prisma.activo.modulo.findFirst.mockResolvedValue(null);
    await expect(service.findOne('m1')).rejects.toThrow(NotFoundException);
  });

  it('create rechaza un nombre de módulo duplicado', async () => {
    prisma.modulo.findFirst.mockResolvedValue({ id: 'existente' });
    await expect(service.create({ nombre: 'Ventas' }, 'admin1')).rejects.toThrow(
      ConflictException,
    );
  });

  it('create registra al actor en creadoPor', async () => {
    prisma.modulo.findFirst.mockResolvedValue(null);
    prisma.modulo.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'm1', ...data }),
    );
    const resultado = await service.create({ nombre: 'RRHH' }, 'admin1');
    expect(resultado.creadoPor).toBe('admin1');
  });

  it('update revalida unicidad solo cuando cambia el nombre', async () => {
    prisma.activo.modulo.findFirst.mockResolvedValue({ id: 'm1', nombre: 'Ventas' });
    prisma.modulo.update.mockResolvedValue({ id: 'm1', descripcion: 'nueva' });
    await service.update('m1', { descripcion: 'nueva' }, 'admin1');
    expect(prisma.modulo.findFirst).not.toHaveBeenCalled(); // validarNombreUnico no se llamó
  });

  it('remove inactiva el módulo (soft delete)', async () => {
    prisma.activo.modulo.findFirst.mockResolvedValue({ id: 'm1' });
    prisma.modulo.update.mockResolvedValue({});
    const resultado = await service.remove('m1', 'admin1');
    expect(prisma.modulo.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estado: 'INACTIVO' }) }),
    );
    expect(resultado.message).toMatch(/inactivado/);
  });
});
