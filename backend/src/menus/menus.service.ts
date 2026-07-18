import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';

interface FilaMenu {
  id: string;
  nombre: string;
  url: string | null;
  icono: string | null;
  orden: number;
  parent_id: string | null;
  modulo_id: string;
  modulo_nombre: string;
  modulo_icono: string | null;
}

export interface NodoMenu {
  id: string;
  nombre: string;
  url: string | null;
  icono: string | null;
  orden: number;
  hijos: NodoMenu[];
}

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/menus/tree — Árbol jerárquico del ROL DEL TOKEN.
   *
   * UNA SOLA consulta con CTE (WITH RECURSIVE) resuelve toda la
   * recursividad en la base de datos — sin problema N+1 y con tiempo
   * predecible sin importar la profundidad (requisito de Performance).
   *
   * $queryRaw usa parámetros vinculados (${}) — NO es concatenación de
   * strings; Prisma los envía como bind parameters ($1, $2...).
   *
   * Reglas aplicadas:
   *  - Solo menús asignados al rol (rol_has_menus activa).
   *  - Solo menús, módulos y pivotes en estado ACTIVO.
   *  - La recursión parte de las raíces (parent_id NULL): si un padre está
   *    inactivo o no pertenece al rol, sus hijos quedan fuera automáticamente.
   */
  async tree(rolId: string) {
    const filas = await this.prisma.$queryRaw<FilaMenu[]>(Prisma.sql`
      WITH RECURSIVE arbol AS (
        SELECT m.id, m.nombre, m.url, m.icono, m.orden, m.parent_id, m.modulo_id
        FROM menus m
        INNER JOIN modulos mo ON mo.id = m.modulo_id AND mo.estado = 'ACTIVO'
        INNER JOIN rol_has_modulos rmo
          ON rmo.modulo_id = m.modulo_id
          AND rmo.rol_id = ${rolId}::uuid
          AND rmo.estado = 'ACTIVO'
        INNER JOIN rol_has_menus rm
          ON rm.menu_id = m.id
          AND rm.rol_id = ${rolId}::uuid
          AND rm.estado = 'ACTIVO'
        WHERE m.parent_id IS NULL AND m.estado = 'ACTIVO'

        UNION ALL

        SELECT h.id, h.nombre, h.url, h.icono, h.orden, h.parent_id, h.modulo_id
        FROM menus h
        INNER JOIN arbol a ON h.parent_id = a.id
        INNER JOIN rol_has_menus rm
          ON rm.menu_id = h.id
          AND rm.rol_id = ${rolId}::uuid
          AND rm.estado = 'ACTIVO'
        WHERE h.estado = 'ACTIVO'
      )
      SELECT a.*, mo.nombre AS modulo_nombre, mo.icono AS modulo_icono
      FROM arbol a
      INNER JOIN modulos mo ON mo.id = a.modulo_id
      ORDER BY a.orden ASC
    `);

    return this.construirArbol(filas);
  }

  async findAll() {
    return this.prisma.activo.menu.findMany({
      orderBy: [{ moduloId: 'asc' }, { orden: 'asc' }],
    });
  }

  async findOne(id: string) {
    const menu = await this.prisma.activo.menu.findFirst({ where: { id } });
    if (!menu) throw new NotFoundException('Menú no encontrado');
    return menu;
  }

  async create(dto: CreateMenuDto, actorId: string) {
    const modulo = await this.prisma.activo.modulo.findFirst({
      where: { id: dto.moduloId },
    });
    if (!modulo) throw new NotFoundException('Módulo no encontrado');

    if (dto.parentId) {
      const padre = await this.findOne(dto.parentId);
      if (padre.moduloId !== dto.moduloId) {
        throw new BadRequestException(
          'El menú padre pertenece a otro módulo',
        );
      }
    }

    return this.prisma.menu.create({
      data: {
        nombre: dto.nombre,
        moduloId: dto.moduloId,
        parentId: dto.parentId ?? null,
        url: dto.url ?? null,
        orden: dto.orden ?? 0,
        icono: dto.icono ?? null,
        creadoPor: actorId,
      },
    });
  }

  async update(id: string, dto: UpdateMenuDto, actorId: string) {
    const menu = await this.findOne(id);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      // Crítico (PDF): el nuevo parent_id no debe generar referencia cíclica
      await this.validarSinCiclos(id, dto.parentId);
      const padre = await this.findOne(dto.parentId);
      const moduloDestino = dto.moduloId ?? menu.moduloId;
      if (padre.moduloId !== moduloDestino) {
        throw new BadRequestException('El menú padre pertenece a otro módulo');
      }
    }

    return this.prisma.menu.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.moduloId !== undefined && { moduloId: dto.moduloId }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.orden !== undefined && { orden: dto.orden }),
        ...(dto.icono !== undefined && { icono: dto.icono }),
        actualizadoPor: actorId,
      },
    });
  }

  /**
   * Soft delete. Los hijos no se tocan: al partir la recursión desde las
   * raíces activas, el árbol los ignora automáticamente (regla del PDF).
   */
  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.menu.update({
      where: { id },
      data: { estado: 'INACTIVO', actualizadoPor: actorId },
    });
    return { message: 'Menú inactivado; sus hijos no se renderizarán' };
  }

  /**
   * Recorre los ancestros del padre propuesto: si en la cadena aparece el
   * propio menú, habría un bucle infinito (A→B→A) — se rechaza.
   */
  private async validarSinCiclos(menuId: string, nuevoParentId: string) {
    if (menuId === nuevoParentId) {
      throw new BadRequestException('Un menú no puede ser su propio padre');
    }

    let cursor: string | null = nuevoParentId;
    const visitados = new Set<string>();
    while (cursor) {
      if (cursor === menuId) {
        throw new BadRequestException(
          'El parent_id genera una referencia cíclica',
        );
      }
      if (visitados.has(cursor)) break; // ciclo preexistente: no seguir
      visitados.add(cursor);

      const padre: { parentId: string | null } | null =
        await this.prisma.menu.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = padre?.parentId ?? null;
    }
  }

  /** Arma la jerarquía en memoria y agrupa por módulo. */
  private construirArbol(filas: FilaMenu[]) {
    const nodos = new Map<string, NodoMenu>();
    const porModulo = new Map<
      string,
      { modulo: { id: string; nombre: string; icono: string | null }; raices: NodoMenu[] }
    >();

    for (const fila of filas) {
      nodos.set(fila.id, {
        id: fila.id,
        nombre: fila.nombre,
        url: fila.url,
        icono: fila.icono,
        orden: fila.orden,
        hijos: [],
      });
    }

    for (const fila of filas) {
      const nodo = nodos.get(fila.id)!;
      if (fila.parent_id && nodos.has(fila.parent_id)) {
        nodos.get(fila.parent_id)!.hijos.push(nodo);
      } else {
        if (!porModulo.has(fila.modulo_id)) {
          porModulo.set(fila.modulo_id, {
            modulo: {
              id: fila.modulo_id,
              nombre: fila.modulo_nombre,
              icono: fila.modulo_icono,
            },
            raices: [],
          });
        }
        porModulo.get(fila.modulo_id)!.raices.push(nodo);
      }
    }

    const ordenar = (lista: NodoMenu[]) => {
      lista.sort((a, b) => a.orden - b.orden);
      lista.forEach((n) => ordenar(n.hijos));
    };

    return Array.from(porModulo.values()).map((grupo) => {
      ordenar(grupo.raices);
      return { modulo: grupo.modulo, menus: grupo.raices };
    });
  }
}
