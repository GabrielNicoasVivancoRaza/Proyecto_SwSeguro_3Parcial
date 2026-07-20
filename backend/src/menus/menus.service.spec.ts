import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MenusService } from './menus.service';
import type { UpdateMenuDto } from './dto/menu.dto';

/**
 * Prueba de seguridad/integridad unitaria (Shift-Left, OE2): el patrón
 * Adjacency List no debe permitir referencias cíclicas en parent_id
 * (requisito explícito de la especificación), pues un ciclo produciría
 * un bucle infinito al construir el árbol de navegación.
 */
describe('MenusService (validación de ciclos en parent_id)', () => {
  let service: MenusService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      activo: {
        menu: { findFirst: jest.fn() },
        modulo: { findFirst: jest.fn() },
      },
      menu: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [MenusService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(MenusService);
  });

  it('rechaza que un menú sea su propio padre', async () => {
    prisma.activo.menu.findFirst.mockResolvedValue({
      id: 'm1',
      moduloId: 'mod1',
      parentId: null,
    });

    await expect(
      service.update('m1', { parentId: 'm1' } as UpdateMenuDto, 'actor'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza una referencia cíclica (A → B, y se intenta B como padre de A)', async () => {
    // findOne('a') al inicio de update()
    prisma.activo.menu.findFirst.mockResolvedValueOnce({
      id: 'a',
      moduloId: 'mod1',
      parentId: null,
    });
    // Ancestro de 'b' (el nuevo padre propuesto) es 'a' → cierra el ciclo
    prisma.menu.findUnique.mockResolvedValueOnce({ parentId: 'a' });

    await expect(
      service.update('a', { parentId: 'b' } as UpdateMenuDto, 'actor'),
    ).rejects.toThrow(BadRequestException);

    // Nunca debe llegar a ejecutar el UPDATE si detecta el ciclo
    expect(prisma.menu.update).not.toHaveBeenCalled();
  });

  it('permite un parent_id válido sin ciclos y del mismo módulo', async () => {
    // findOne('hijo') al inicio de update()
    prisma.activo.menu.findFirst
      .mockResolvedValueOnce({ id: 'hijo', moduloId: 'mod1', parentId: 'raiz' })
      // findOne('otraRama') al validar que el padre exista
      .mockResolvedValueOnce({ id: 'otraRama', moduloId: 'mod1', parentId: null });
    // 'otraRama' no tiene ancestros → sin ciclo
    prisma.menu.findUnique.mockResolvedValueOnce({ parentId: null });

    await service.update('hijo', { parentId: 'otraRama' } as UpdateMenuDto, 'actor');

    expect(prisma.menu.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'hijo' },
        data: expect.objectContaining({ parentId: 'otraRama' }),
      }),
    );
  });

  it('rechaza asignar un padre que pertenece a otro módulo', async () => {
    prisma.activo.menu.findFirst
      .mockResolvedValueOnce({ id: 'hijo', moduloId: 'mod1', parentId: null })
      .mockResolvedValueOnce({ id: 'padreDeOtroModulo', moduloId: 'mod2', parentId: null });
    prisma.menu.findUnique.mockResolvedValueOnce({ parentId: null });

    await expect(
      service.update(
        'hijo',
        { parentId: 'padreDeOtroModulo' } as UpdateMenuDto,
        'actor',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
