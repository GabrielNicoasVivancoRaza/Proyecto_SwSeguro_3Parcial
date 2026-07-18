import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// El hash de contraseña JAMÁS se serializa (requisito de la tabla de endpoints)
const USUARIO_PUBLICO = {
  id: true,
  email: true,
  username: true,
  nombreCompleto: true,
  estado: true,
  fechaCreacion: true,
  fechaActualizacion: true,
  creadoPor: true,
  actualizadoPor: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista paginada — el Global Scope ya filtra estado = ACTIVO. */
  async findAll({ page, limit }: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.activo.usuario.findMany({
        select: USUARIO_PUBLICO,
        orderBy: { fechaCreacion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activo.usuario.count(),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const usuario = await this.prisma.activo.usuario.findFirst({
      where: { id },
      select: {
        ...USUARIO_PUBLICO,
        roles: {
          where: { estado: 'ACTIVO', rol: { estado: 'ACTIVO' } },
          select: { rol: { select: { id: true, nombre: true } } },
        },
      },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return { ...usuario, roles: usuario.roles.map((r) => r.rol) };
  }

  async create(dto: CreateUserDto, actorId: string) {
    await this.validarUnicidad(dto.email, dto.username);

    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        username: dto.username,
        nombreCompleto: dto.nombreCompleto,
        passwordHash: await argon2.hash(dto.password),
        creadoPor: actorId,
      },
      select: USUARIO_PUBLICO,
    });
    return usuario;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    await this.findOne(id); // 404 si no existe o está inactivo
    if (dto.email || dto.username) {
      await this.validarUnicidad(dto.email, dto.username, id);
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...(dto.email && { email: dto.email.toLowerCase().trim() }),
        ...(dto.username && { username: dto.username }),
        ...(dto.nombreCompleto && { nombreCompleto: dto.nombreCompleto }),
        ...(dto.password && { passwordHash: await argon2.hash(dto.password) }),
        actualizadoPor: actorId,
      },
      select: USUARIO_PUBLICO,
    });
  }

  /** Soft delete + revocación de sesiones (Zero Trust). */
  async remove(id: string, actorId: string) {
    await this.findOne(id);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id },
        data: { estado: 'INACTIVO', actualizadoPor: actorId },
      }),
      // Un usuario inactivo no debe conservar sesiones vivas
      this.prisma.refreshToken.updateMany({
        where: { usuarioId: id, revocado: false },
        data: { revocado: true, actualizadoPor: actorId },
      }),
    ]);

    return { message: 'Usuario inactivado y sesiones revocadas' };
  }

  private async validarUnicidad(
    email?: string,
    username?: string,
    exceptoId?: string,
  ) {
    const existente = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          ...(email ? [{ email: email.toLowerCase().trim() }] : []),
          ...(username ? [{ username }] : []),
        ],
        ...(exceptoId && { NOT: { id: exceptoId } }),
      },
    });
    if (existente) {
      throw new ConflictException('El email o username ya está registrado');
    }
  }
}
