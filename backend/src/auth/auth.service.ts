import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import {
  AccessTokenPayload,
  TempTokenPayload,
} from './interfaces/token-payload.interface';

// Mensaje genérico: nunca revelar si falló el usuario o la contraseña
const CREDENCIALES_INVALIDAS = 'Credenciales inválidas';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Paso 1 del flujo: valida credenciales y devuelve un TempToken
   * (sin permisos) + la lista de roles activos del usuario.
   */
  async login(dto: LoginDto) {
    const usuario = await this.prisma.activo.usuario.findFirst({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!usuario) {
      // Igualar el tiempo de respuesta: verificar contra un hash dummy
      await argon2.verify(await argon2.hash('dummy'), dto.password).catch(() => false);
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }

    const passwordOk = await argon2.verify(usuario.passwordHash, dto.password);
    if (!passwordOk) {
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }

    const asignaciones = await this.prisma.activo.usuarioRol.findMany({
      where: { usuarioId: usuario.id, rol: { estado: 'ACTIVO' } },
      include: { rol: { select: { id: true, nombre: true, descripcion: true } } },
    });
    if (asignaciones.length === 0) {
      throw new ForbiddenException('El usuario no tiene roles activos asignados');
    }

    const payload: TempTokenPayload = { sub: usuario.id, type: 'temp' };
    const tempToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.expiresIn('JWT_TEMP_EXPIRES_IN', '5m'),
    });

    return {
      tempToken,
      roles: asignaciones.map((a) => a.rol),
    };
  }

  /**
   * Paso 2: valida que el usuario posea el rol elegido y emite el JWT
   * definitivo con SOLO los permisos de ese rol (menor privilegio),
   * más un refresh token rotativo.
   */
  async selectRole(usuarioId: string, roleId: string) {
    const asignacion = await this.prisma.activo.usuarioRol.findFirst({
      where: {
        usuarioId,
        rolId: roleId,
        rol: { estado: 'ACTIVO' },
      },
      include: { rol: { select: { id: true, nombre: true } } },
    });
    if (!asignacion) {
      throw new ForbiddenException('El usuario no posee el rol solicitado');
    }

    const accessToken = await this.emitirAccessToken(usuarioId, asignacion.rol);
    const refresh = await this.emitirRefreshToken(usuarioId, roleId);

    return {
      accessToken,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      rol: asignacion.rol,
    };
  }

  /**
   * Rotación de refresh tokens con detección de reutilización:
   * si llega un token ya rotado (revocado), se asume compromiso y se
   * revocan TODAS las sesiones del usuario (Zero Trust).
   */
  async refresh(refreshTokenPlano: string) {
    const tokenHash = this.hashToken(refreshTokenPlano);
    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!registro || registro.estado === 'INACTIVO') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (registro.revocado) {
      // Reutilización detectada → revocación inmediata de todo
      await this.revocarTodos(registro.usuarioId);
      throw new UnauthorizedException(
        'Refresh token reutilizado: todas las sesiones fueron revocadas',
      );
    }

    if (registro.expiraEn < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Revalidar que el usuario y el rol sigan activos (nunca confiar)
    const asignacion = await this.prisma.activo.usuarioRol.findFirst({
      where: {
        usuarioId: registro.usuarioId,
        rolId: registro.rolId,
        usuario: { estado: 'ACTIVO' },
        rol: { estado: 'ACTIVO' },
      },
      include: { rol: { select: { id: true, nombre: true } } },
    });
    if (!asignacion) {
      await this.revocarTodos(registro.usuarioId);
      throw new UnauthorizedException('La asignación de rol ya no está activa');
    }

    const nuevoRefresh = await this.emitirRefreshToken(
      registro.usuarioId,
      registro.rolId,
    );
    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: {
        revocado: true,
        reemplazadoPor: nuevoRefresh.id,
        actualizadoPor: registro.usuarioId,
      },
    });

    const accessToken = await this.emitirAccessToken(
      registro.usuarioId,
      asignacion.rol,
    );

    return {
      accessToken,
      refreshToken: nuevoRefresh.token,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    };
  }

  /** Invalida todos los refresh tokens del usuario (corta la sesión). */
  async logout(usuarioId: string) {
    await this.revocarTodos(usuarioId);
    return { message: 'Sesión cerrada: tokens revocados' };
  }

  /**
   * Endpoint interno para microservicios hijos (Zero Trust, estrategia
   * de validación directa): confirma validez y devuelve solo
   * userId, rol y permisos — ningún dato sensible.
   */
  async validateToken(token: string) {
    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      if (payload.type !== 'access') {
        return { valido: false };
      }
      return {
        valido: true,
        userId: payload.sub,
        rol: payload.rol,
        permisos: payload.permisos,
      };
    } catch {
      return { valido: false };
    }
  }

  // ================= helpers privados =================

  private async emitirAccessToken(
    usuarioId: string,
    rol: { id: string; nombre: string },
  ): Promise<string> {
    // Menor privilegio: solo los permisos del rol seleccionado
    const [modulos, menus] = await Promise.all([
      this.prisma.activo.rolModulo.findMany({
        where: { rolId: rol.id, modulo: { estado: 'ACTIVO' } },
        select: { moduloId: true },
      }),
      this.prisma.activo.rolMenu.findMany({
        where: { rolId: rol.id, menu: { estado: 'ACTIVO' } },
        select: { menuId: true },
      }),
    ]);

    const payload: AccessTokenPayload = {
      sub: usuarioId,
      type: 'access',
      rol,
      permisos: {
        modulos: modulos.map((m) => m.moduloId),
        menus: menus.map((m) => m.menuId),
      },
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.expiresIn('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  private expiresIn(
    clave: string,
    porDefecto: string,
  ): JwtSignOptions['expiresIn'] {
    return this.config.get<string>(
      clave,
      porDefecto,
    ) as JwtSignOptions['expiresIn'];
  }

  private async emitirRefreshToken(
    usuarioId: string,
    rolId: string,
  ): Promise<{ token: string; id: string }> {
    const tokenPlano = randomBytes(48).toString('hex');
    const dias = Number(this.config.get('REFRESH_TOKEN_DAYS', 7));
    const expiraEn = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

    const registro = await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(tokenPlano),
        usuarioId,
        rolId,
        expiraEn,
        creadoPor: usuarioId,
      },
    });

    return { token: tokenPlano, id: registro.id };
  }

  private async revocarTodos(usuarioId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revocado: false },
      data: { revocado: true, actualizadoPor: usuarioId },
    });
  }

  /** Los refresh tokens se almacenan hasheados: la BD nunca ve el token en claro. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
