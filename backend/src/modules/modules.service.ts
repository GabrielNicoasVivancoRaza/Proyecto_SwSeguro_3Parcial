import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto, UpdateModuleDto } from './dto/module.dto';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.activo.modulo.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const modulo = await this.prisma.activo.modulo.findFirst({ where: { id } });
    if (!modulo) throw new NotFoundException('Módulo no encontrado');
    return modulo;
  }

  async create(dto: CreateModuleDto, actorId: string) {
    await this.validarNombreUnico(dto.nombre);
    return this.prisma.modulo.create({ data: { ...dto, creadoPor: actorId } });
  }

  async update(id: string, dto: UpdateModuleDto, actorId: string) {
    await this.findOne(id);
    if (dto.nombre) await this.validarNombreUnico(dto.nombre, id);
    return this.prisma.modulo.update({
      where: { id },
      data: { ...dto, actualizadoPor: actorId },
    });
  }

  /**
   * Soft delete. Al quedar INACTIVO, el árbol de menús lo excluye
   * automáticamente ("sus menús asociados no deben renderizarse" — PDF).
   */
  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.modulo.update({
      where: { id },
      data: { estado: 'INACTIVO', actualizadoPor: actorId },
    });
    return { message: 'Módulo inactivado; sus menús dejarán de renderizarse' };
  }

  private async validarNombreUnico(nombre: string, exceptoId?: string) {
    const existente = await this.prisma.modulo.findFirst({
      where: { nombre, ...(exceptoId && { NOT: { id: exceptoId } }) },
    });
    if (existente) {
      throw new ConflictException('Ya existe un módulo con ese nombre');
    }
  }
}
