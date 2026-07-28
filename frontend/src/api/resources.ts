import { api } from './client';

// ===================== Tipos =====================

export interface Usuario {
  id: string;
  email: string;
  username: string;
  nombreCompleto: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface UsuarioDetalle extends Usuario {
  roles: { id: string; nombre: string }[];
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface Modulo {
  id: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface MenuPlano {
  id: string;
  nombre: string;
  url: string | null;
  icono: string | null;
  orden: number;
  moduloId: string;
  parentId: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

interface Paginado<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ===================== Usuarios =====================

export const usuariosApi = {
  listar: (page: number, limit = 10) =>
    api.get<Paginado<Usuario>>('/users', { params: { page, limit } }).then((r) => r.data),

  obtener: (id: string) => api.get<UsuarioDetalle>(`/users/${id}`).then((r) => r.data),

  crear: (datos: {
    email: string;
    username: string;
    nombreCompleto: string;
    password: string;
  }) => api.post<Usuario>('/users', datos).then((r) => r.data),

  actualizar: (
    id: string,
    datos: Partial<{
      email: string;
      username: string;
      nombreCompleto: string;
      password: string;
    }>,
  ) => api.put<Usuario>(`/users/${id}`, datos).then((r) => r.data),

  eliminar: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
};

// ===================== Roles =====================

export const rolesApi = {
  listar: () => api.get<Rol[]>('/roles').then((r) => r.data),

  crear: (datos: { nombre: string; descripcion?: string }) =>
    api.post<Rol>('/roles', datos).then((r) => r.data),

  actualizar: (id: string, datos: Partial<{ nombre: string; descripcion: string }>) =>
    api.put<Rol>(`/roles/${id}`, datos).then((r) => r.data),

  eliminar: (id: string) => api.delete(`/roles/${id}`).then((r) => r.data),

  asignarUsuario: (rolId: string, userId: string) =>
    api.post(`/roles/${rolId}/users`, { userId }).then((r) => r.data),

  desasignarUsuario: (rolId: string, userId: string) =>
    api.delete(`/roles/${rolId}/users/${userId}`).then((r) => r.data),

  asignarModulo: (rolId: string, moduleId: string) =>
    api.post(`/roles/${rolId}/modules`, { moduleId }).then((r) => r.data),

  asignarMenu: (rolId: string, menuId: string) =>
    api.post(`/roles/${rolId}/menus`, { menuId }).then((r) => r.data),
};

// ===================== Módulos =====================

export const modulosApi = {
  listar: () => api.get<Modulo[]>('/modules').then((r) => r.data),

  crear: (datos: { nombre: string; descripcion?: string; icono?: string }) =>
    api.post<Modulo>('/modules', datos).then((r) => r.data),

  actualizar: (
    id: string,
    datos: Partial<{ nombre: string; descripcion: string; icono: string }>,
  ) => api.put<Modulo>(`/modules/${id}`, datos).then((r) => r.data),

  eliminar: (id: string) => api.delete(`/modules/${id}`).then((r) => r.data),
};

// ===================== Menús =====================

export const menusApi = {
  listar: () => api.get<MenuPlano[]>('/menus').then((r) => r.data),

  crear: (datos: {
    nombre: string;
    moduloId: string;
    parentId?: string;
    url?: string;
    orden?: number;
  }) => api.post<MenuPlano>('/menus', datos).then((r) => r.data),

  actualizar: (
    id: string,
    datos: Partial<{
      nombre: string;
      moduloId: string;
      parentId: string | null;
      url: string | null;
      orden: number;
    }>,
  ) => api.put<MenuPlano>(`/menus/${id}`, datos).then((r) => r.data),

  eliminar: (id: string) => api.delete(`/menus/${id}`).then((r) => r.data),
};

/** Extrae el mensaje de error del backend (class-validator o NestJS HttpException). */
export function mensajeError(error: unknown): string {
  const err = error as { response?: { data?: { message?: string | string[] } } };
  const msg = err.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(' · ');
  return msg ?? 'Ocurrió un error inesperado';
}
