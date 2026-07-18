import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.activo.rol.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const rol = await this.prisma.activo.rol.findFirst({ where: { id } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    return rol;
  }

  async create(dto: CreateRoleDto, actorId: string) {
    await this.validarNombreUnico(dto.nombre);
    return this.prisma.rol.create({
      data: { ...dto, creadoPor: actorId },
    });
  }

  async update(id: string, dto: UpdateRoleDto, actorId: string) {
    await this.findOne(id);
    if (dto.nombre) await this.validarNombreUnico(dto.nombre, id);
    return this.prisma.rol.update({
      where: { id },
      data: { ...dto, actualizadoPor: actorId },
    });
  }

  /** Soft delete — bloqueado si el rol está asignado a usuarios activos (PDF). */
  async remove(id: string, actorId: string) {
    await this.findOne(id);

    const asignados = await this.prisma.activo.usuarioRol.count({
      where: { rolId: id, usuario: { estado: 'ACTIVO' } },
    });
    if (asignados > 0) {
      throw new ConflictException(
        `No se puede eliminar: el rol está asignado a ${asignados} usuario(s) activo(s)`,
      );
    }

    await this.prisma.rol.update({
      where: { id },
      data: { estado: 'INACTIVO', actualizadoPor: actorId },
    });
    return { message: 'Rol inactivado' };
  }

  // ========== Asignaciones M:N ==========

  /** POST /roles/{id}/users — la pivote registra su propia auditoría (PDF). */
  async assignUser(rolId: string, userId: string, actorId: string) {
    await this.findOne(rolId);
    const usuario = await this.prisma.activo.usuario.findFirst({
      where: { id: userId },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.usuarioRol.upsert({
      where: { usuarioId_rolId: { usuarioId: userId, rolId } },
      // Si existía revocada (INACTIVO), se reactiva dejando rastro de quién
      update: { estado: 'ACTIVO', actualizadoPor: actorId },
      create: { usuarioId: userId, rolId, creadoPor: actorId },
    });
  }

  /** DELETE /roles/{id}/users/{userId} — eliminación FÍSICA en la pivote (PDF). */
  async unassignUser(rolId: string, userId: string) {
    const asignacion = await this.prisma.usuarioRol.findUnique({
      where: { usuarioId_rolId: { usuarioId: userId, rolId } },
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');

    await this.prisma.usuarioRol.delete({ where: { id: asignacion.id } });
    return { message: 'Rol desasignado del usuario' };
  }

  /** POST /roles/{id}/modules */
  async assignModule(rolId: string, moduloId: string, actorId: string) {
    await this.findOne(rolId);
    const modulo = await this.prisma.activo.modulo.findFirst({
      where: { id: moduloId },
    });
    if (!modulo) throw new NotFoundException('Módulo no encontrado');

    return this.prisma.rolModulo.upsert({
      where: { rolId_moduloId: { rolId, moduloId } },
      update: { estado: 'ACTIVO', actualizadoPor: actorId },
      create: { rolId, moduloId, creadoPor: actorId },
    });
  }

  /** POST /roles/{id}/menus — asigna un ítem/submenú específico al rol. */
  async assignMenu(rolId: string, menuId: string, actorId: string) {
    await this.findOne(rolId);
    const menu = await this.prisma.activo.menu.findFirst({
      where: { id: menuId },
    });
    if (!menu) throw new NotFoundException('Menú no encontrado');

    return this.prisma.rolMenu.upsert({
      where: { rolId_menuId: { rolId, menuId } },
      update: { estado: 'ACTIVO', actualizadoPor: actorId },
      create: { rolId, menuId, creadoPor: actorId },
    });
  }

  private async validarNombreUnico(nombre: string, exceptoId?: string) {
    const existente = await this.prisma.rol.findFirst({
      where: { nombre, ...(exceptoId && { NOT: { id: exceptoId } }) },
    });
    if (existente) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }
  }
}
