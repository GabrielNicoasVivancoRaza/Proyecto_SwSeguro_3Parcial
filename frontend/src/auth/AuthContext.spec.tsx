import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    apiMock.get.mockReset();
    apiMock.post.mockReset();
  });

  it('login guarda el estado "pendiente" — NO entra directo al dashboard (PDF 5.3)', async () => {
    apiMock.post.mockResolvedValue({
      data: { tempToken: 'temp123', roles: [{ id: 'r1', nombre: 'Admin' }] },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('a@b.com', 'Clave#123456');
    });

    expect(result.current.pendiente).toEqual({
      tempToken: 'temp123',
      roles: [{ id: 'r1', nombre: 'Admin' }],
    });
    expect(result.current.sesion).toBeNull();
    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'Clave#123456',
    });
  });

  it('seleccionarRol arma la sesión completa y la persiste en sessionStorage', async () => {
    apiMock.post
      .mockResolvedValueOnce({
        data: { tempToken: 'temp123', roles: [{ id: 'r1', nombre: 'Admin' }] },
      })
      .mockResolvedValueOnce({
        data: { accessToken: 'acc123', refreshToken: 'ref123', rol: { id: 'r1', nombre: 'Admin' } },
      });
    apiMock.get.mockResolvedValue({
      data: [{ modulo: { id: 'm1', nombre: 'Admin', icono: null }, menus: [] }],
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('a@b.com', 'x');
    });
    await act(async () => {
      await result.current.seleccionarRol('r1');
    });

    expect(result.current.sesion?.accessToken).toBe('acc123');
    expect(result.current.pendiente).toBeNull();
    expect(sessionStorage.getItem('mg_sesion')).toContain('acc123');
  });

  it('seleccionarRol sin login previo lanza error (no se puede saltar el flujo)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(result.current.seleccionarRol('r1')).rejects.toThrow('No hay login pendiente');
  });

  it('logout limpia la sesión local aunque la llamada al backend falle', async () => {
    apiMock.post
      .mockResolvedValueOnce({ data: { tempToken: 't', roles: [{ id: 'r1', nombre: 'A' }] } })
      .mockResolvedValueOnce({
        data: { accessToken: 'acc', refreshToken: 'ref', rol: { id: 'r1', nombre: 'A' } },
      });
    apiMock.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('a@b.com', 'x');
    });
    await act(async () => {
      await result.current.seleccionarRol('r1');
    });
    expect(result.current.sesion).not.toBeNull();

    apiMock.post.mockRejectedValueOnce(new Error('backend caído'));
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.sesion).toBeNull();
    expect(sessionStorage.getItem('mg_sesion')).toBeNull();
  });

  it('refrescarMenus vuelve a pedir /menus/tree y actualiza solo los menús de la sesión', async () => {
    apiMock.post
      .mockResolvedValueOnce({ data: { tempToken: 't', roles: [{ id: 'r1', nombre: 'A' }] } })
      .mockResolvedValueOnce({
        data: { accessToken: 'acc', refreshToken: 'ref', rol: { id: 'r1', nombre: 'A' } },
      });
    apiMock.get.mockResolvedValueOnce({ data: [] }); // árbol inicial en select-role

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('a@b.com', 'x');
    });
    await act(async () => {
      await result.current.seleccionarRol('r1');
    });

    const arbolActualizado = [{ modulo: { id: 'm2', nombre: 'Nuevo', icono: null }, menus: [] }];
    apiMock.get.mockResolvedValueOnce({ data: arbolActualizado });

    await act(async () => {
      await result.current.refrescarMenus();
    });

    expect(result.current.sesion?.menus).toEqual(arbolActualizado);
    expect(result.current.sesion?.accessToken).toBe('acc'); // el resto de la sesión no cambia
  });

  it('refrescarMenus no hace nada si no hay sesión activa', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.refrescarMenus();
    });
    expect(apiMock.get).not.toHaveBeenCalled();
  });
});
