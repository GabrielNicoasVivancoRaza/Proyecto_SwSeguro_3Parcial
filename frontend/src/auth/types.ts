export interface Rol {
  id: string;
  nombre: string;
  descripcion?: string | null;
}

/** Nodo del árbol devuelto por GET /api/menus/tree (Adjacency List resuelta). */
export interface NodoMenu {
  id: string;
  nombre: string;
  url: string | null; // solo los nodos hoja tienen url
  icono: string | null;
  orden: number;
  hijos: NodoMenu[];
}

export interface ModuloConMenus {
  modulo: { id: string; nombre: string; icono: string | null };
  menus: NodoMenu[];
}

/** Resultado del login: aún NO se puede entrar al dashboard. */
export interface LoginPendiente {
  tempToken: string;
  roles: Rol[];
}

/** Sesión definitiva tras seleccionar rol (contexto de seguridad acotado). */
export interface Sesion {
  accessToken: string;
  refreshToken: string;
  rol: Rol;
  menus: ModuloConMenus[];
}
