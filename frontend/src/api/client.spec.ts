import { beforeEach, describe, expect, it } from 'vitest';
import { guardarSesion } from '../auth/storage';
import type { Sesion } from '../auth/types';
import { api } from './client';

const sesion: Sesion = {
  accessToken: 'acc-viejo',
  refreshToken: 'ref-viejo',
  rol: { id: 'r1', nombre: 'Admin' },
  menus: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const interceptorRequest = (api.interceptors.request as any).handlers[0].fulfilled;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const interceptorResponseError = (api.interceptors.response as any).handlers[0].rejected;

describe('interceptor de request (adjunta el Bearer token)', () => {
  beforeEach(() => sessionStorage.clear());

  it('adjunta el AccessToken si hay sesión activa', async () => {
    guardarSesion(sesion);
    const config = await interceptorRequest({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer acc-viejo');
  });

  it('no sobrescribe un Authorization ya presente en la petición', async () => {
    guardarSesion(sesion);
    const config = await interceptorRequest({ headers: { Authorization: 'Bearer manual' } });
    expect(config.headers.Authorization).toBe('Bearer manual');
  });

  it('no adjunta ningún token si no hay sesión activa', async () => {
    const config = await interceptorRequest({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('interceptor de response — casos que NO deben reintentar', () => {
  beforeEach(() => sessionStorage.clear());

  it('propaga el error tal cual si no es 401', async () => {
    const error = { response: { status: 500 }, config: {} };
    await expect(interceptorResponseError(error)).rejects.toBe(error);
  });

  it('no reintenta una petición del propio flujo de auth (evita recursión en login)', async () => {
    guardarSesion(sesion);
    const error = { response: { status: 401 }, config: { url: '/auth/login' } };
    await expect(interceptorResponseError(error)).rejects.toBe(error);
  });

  it('no reintenta dos veces la misma petición (evita bucle infinito)', async () => {
    guardarSesion(sesion);
    const error = { response: { status: 401 }, config: { url: '/users', _reintentado: true } };
    await expect(interceptorResponseError(error)).rejects.toBe(error);
  });

  it('no intenta refrescar si no hay sesión activa', async () => {
    const error = { response: { status: 401 }, config: { url: '/users' } };
    await expect(interceptorResponseError(error)).rejects.toBe(error);
  });
});
