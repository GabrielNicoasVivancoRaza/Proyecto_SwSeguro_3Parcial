import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { menusApi, mensajeError, modulosApi, rolesApi, usuariosApi } from './resources';

vi.mock('./client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const apiMock = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(apiMock).forEach((fn) => fn.mockResolvedValue({ data: {} }));
});

describe('usuariosApi', () => {
  it('listar pide /users con page y limit', async () => {
    await usuariosApi.listar(2, 15);
    expect(apiMock.get).toHaveBeenCalledWith('/users', { params: { page: 2, limit: 15 } });
  });

  it('crear hace POST a /users con el payload', async () => {
    const datos = { email: 'a@b.com', username: 'a', nombreCompleto: 'A', password: 'x' };
    await usuariosApi.crear(datos);
    expect(apiMock.post).toHaveBeenCalledWith('/users', datos);
  });

  it('eliminar hace DELETE a /users/:id', async () => {
    await usuariosApi.eliminar('u1');
    expect(apiMock.delete).toHaveBeenCalledWith('/users/u1');
  });
});

describe('rolesApi', () => {
  it('asignarUsuario hace POST a /roles/:id/users con el userId', async () => {
    await rolesApi.asignarUsuario('r1', 'u1');
    expect(apiMock.post).toHaveBeenCalledWith('/roles/r1/users', { userId: 'u1' });
  });

  it('desasignarUsuario hace DELETE a /roles/:id/users/:userId', async () => {
    await rolesApi.desasignarUsuario('r1', 'u1');
    expect(apiMock.delete).toHaveBeenCalledWith('/roles/r1/users/u1');
  });

  it('asignarModulo hace POST a /roles/:id/modules', async () => {
    await rolesApi.asignarModulo('r1', 'm1');
    expect(apiMock.post).toHaveBeenCalledWith('/roles/r1/modules', { moduleId: 'm1' });
  });
});

describe('modulosApi', () => {
  it('actualizar hace PUT a /modules/:id', async () => {
    await modulosApi.actualizar('m1', { nombre: 'Nuevo' });
    expect(apiMock.put).toHaveBeenCalledWith('/modules/m1', { nombre: 'Nuevo' });
  });
});

describe('menusApi', () => {
  it('crear hace POST a /menus con el payload', async () => {
    await menusApi.crear({ nombre: 'Item', moduloId: 'm1' });
    expect(apiMock.post).toHaveBeenCalledWith('/menus', { nombre: 'Item', moduloId: 'm1' });
  });
});

describe('mensajeError', () => {
  it('extrae un mensaje simple de una respuesta de error de NestJS', () => {
    const error = { response: { data: { message: 'Credenciales inválidas' } } };
    expect(mensajeError(error)).toBe('Credenciales inválidas');
  });

  it('une varios mensajes de class-validator con " · "', () => {
    const error = {
      response: { data: { message: ['email debe ser un email válido', 'password muy corta'] } },
    };
    expect(mensajeError(error)).toBe('email debe ser un email válido · password muy corta');
  });

  it('devuelve un mensaje genérico cuando el error no trae respuesta del backend', () => {
    expect(mensajeError(new Error('network error'))).toBe('Ocurrió un error inesperado');
  });

  it('devuelve un mensaje genérico ante un error completamente inesperado', () => {
    expect(mensajeError(null)).toBe('Ocurrió un error inesperado');
  });
});
