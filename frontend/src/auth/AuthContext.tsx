/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import { cargarSesion, guardarSesion, limpiarSesion } from './storage';
import type { LoginPendiente, ModuloConMenus, Sesion } from './types';

interface ContextoAuth {
  /** Login OK pero SIN rol elegido: solo puede ir al Workspace Selector. */
  pendiente: LoginPendiente | null;
  /** Sesión completa: rol seleccionado + menús del rol. */
  sesion: Sesion | null;
  login: (email: string, password: string) => Promise<void>;
  seleccionarRol: (roleId: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Vuelve a pedir /menus/tree con el AccessToken actual y actualiza la
   * sesión en memoria y en sessionStorage. El árbol de menús se resuelve
   * una sola vez en select-role y queda "congelado" en el token/sesión —
   * si un administrador agrega o reasigna un menú mientras el usuario ya
   * tiene la sesión abierta, esto permite verlo sin cerrar sesión.
   */
  refrescarMenus: () => Promise<void>;
}

const AuthContext = createContext<ContextoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // El TempToken vive SOLO en memoria: nunca se persiste.
  const [pendiente, setPendiente] = useState<LoginPendiente | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(() => cargarSesion());

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<LoginPendiente>('/auth/login', {
      email,
      password,
    });
    // La pantalla inicial NO entra al sistema directamente (PDF):
    // solo guardamos el estado pendiente para el selector de rol.
    setPendiente(data);
  }, []);

  const seleccionarRol = useCallback(
    async (roleId: string) => {
      if (!pendiente) throw new Error('No hay login pendiente');

      const { data } = await api.post<{
        accessToken: string;
        refreshToken: string;
        rol: { id: string; nombre: string };
      }>(
        '/auth/select-role',
        { roleId },
        { headers: { Authorization: `Bearer ${pendiente.tempToken}` } },
      );

      // Con el JWT definitivo se pide el árbol de menús DEL ROL:
      // el backend lo deduce del token, el cliente no manda el rol.
      const arbol = await api.get<ModuloConMenus[]>('/menus/tree', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });

      const nueva: Sesion = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        rol: data.rol,
        menus: arbol.data,
      };
      guardarSesion(nueva);
      setSesion(nueva);
      setPendiente(null);
    },
    [pendiente],
  );

  const refrescarMenus = useCallback(async () => {
    if (!sesion) return;
    const arbol = await api.get<ModuloConMenus[]>('/menus/tree');
    const actualizada: Sesion = { ...sesion, menus: arbol.data };
    guardarSesion(actualizada);
    setSesion(actualizada);
  }, [sesion]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // aunque el backend falle, la sesión local se destruye igual
    }
    limpiarSesion();
    setSesion(null);
    setPendiente(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ pendiente, sesion, login, seleccionarRol, logout, refrescarMenus }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
