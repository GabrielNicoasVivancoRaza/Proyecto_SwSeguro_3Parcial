import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MenusService } from './menus.service';
import type { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';

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
        menu: { findFirst: jest.fn(), findMany: jest.fn() },
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

  describe('CRUD y árbol', () => {
    it('findAll ordena por módulo y orden', async () => {
      prisma.activo.menu.findMany.mockResolvedValue([{ id: 'm1' }]);
      const resultado = await service.findAll();
      expect(prisma.activo.menu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ moduloId: 'asc' }, { orden: 'asc' }] }),
      );
      expect(resultado).toEqual([{ id: 'm1' }]);
    });

    it('findOne lanza 404 si el menú no existe', async () => {
      prisma.activo.menu.findFirst.mockResolvedValue(null);
      await expect(service.findOne('inexistente')).rejects.toThrow(NotFoundException);
    });

    it('create rechaza si el módulo no existe', async () => {
      prisma.activo.modulo.findFirst.mockResolvedValue(null);
      const dto = { nombre: 'Item', moduloId: 'mod-x' } as CreateMenuDto;
      await expect(service.create(dto, 'actor')).rejects.toThrow(NotFoundException);
    });

    it('create rechaza un padre de otro módulo', async () => {
      prisma.activo.modulo.findFirst.mockResolvedValue({ id: 'mod1' });
      prisma.activo.menu.findFirst.mockResolvedValue({ id: 'padre', moduloId: 'mod2' });
      const dto = { nombre: 'Item', moduloId: 'mod1', parentId: 'padre' } as CreateMenuDto;
      await expect(service.create(dto, 'actor')).rejects.toThrow(BadRequestException);
    });

    it('create construye el registro con valores por defecto (url/parentId null, orden 0)', async () => {
      prisma.activo.modulo.findFirst.mockResolvedValue({ id: 'mod1' });
      prisma.menu.create.mockResolvedValue({ id: 'nuevo' });

      await service.create({ nombre: 'Raíz', moduloId: 'mod1' } as CreateMenuDto, 'actor');

      expect(prisma.menu.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Raíz',
          moduloId: 'mod1',
          parentId: null,
          url: null,
          orden: 0,
          creadoPor: 'actor',
        }),
      });
    });

    it('remove inactiva el menú (soft delete)', async () => {
      prisma.activo.menu.findFirst.mockResolvedValue({ id: 'm1' });
      const resultado = await service.remove('m1', 'actor');
      expect(prisma.menu.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({ estado: 'INACTIVO' }),
        }),
      );
      expect(resultado.message).toMatch(/inactivado/);
    });

    it('tree arma la jerarquía agrupada por módulo a partir de las filas del CTE', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'raiz',
          nombre: 'Ventas',
          url: null,
          icono: null,
          orden: 1,
          parent_id: null,
          modulo_id: 'mod1',
          modulo_nombre: 'Ventas',
          modulo_icono: 'cart',
        },
        {
          id: 'hijo',
          nombre: 'Crear Orden',
          url: '/ventas/ordenes/crear',
          icono: null,
          orden: 1,
          parent_id: 'raiz',
          modulo_id: 'mod1',
          modulo_nombre: 'Ventas',
          modulo_icono: 'cart',
        },
      ]);

      const arbol = await service.tree('rol1');

      expect(arbol).toHaveLength(1);
      expect(arbol[0].modulo.nombre).toBe('Ventas');
      expect(arbol[0].menus).toHaveLength(1);
      expect(arbol[0].menus[0].hijos[0].nombre).toBe('Crear Orden');
      expect(arbol[0].menus[0].hijos[0].url).toBe('/ventas/ordenes/crear');
    });

    it('tree devuelve arreglo vacío cuando el rol no tiene menús asignados', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      const arbol = await service.tree('rol-sin-menus');
      expect(arbol).toEqual([]);
    });
  });
});
