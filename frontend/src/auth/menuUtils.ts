import type { NodoMenu } from './types';

/** Aplana el árbol y devuelve solo los nodos hoja (los que tienen url). */
export function hojas(nodos: NodoMenu[]): NodoMenu[] {
  return nodos.flatMap((n) => (n.url ? [n] : hojas(n.hijos)));
}

/** Todos los items (hoja) visibles para el rol actual, sin importar el módulo. */
export function itemsDeSesion(menus: { menus: NodoMenu[] }[]): NodoMenu[] {
  return menus.flatMap((m) => hojas(m.menus));
}

/** ¿El rol actual tiene acceso a esta url exacta? (para condicionar KPIs/accesos). */
export function tieneAcceso(menus: { menus: NodoMenu[] }[], url: string): boolean {
  return itemsDeSesion(menus).some((item) => item.url === url);
}

/**
 * El campo `icono` viene de la base de datos (texto libre, sección
 * Administración). Se valida contra un patrón simple antes de usarlo como
 * clase CSS de Bootstrap Icons, para no inyectar clases arbitrarias.
 */
export function claseIcono(icono: string | null | undefined, porDefecto: string): string {
  if (icono && /^[a-z0-9-]+$/.test(icono)) return icono;
  return porDefecto;
}

/**
 * Un ítem de menú puede apuntar a una ruta INTERNA del propio Master
 * (ej. "/admin/usuarios", renderizada por React Router) o a una URL
 * EXTERNA — típicamente el frontend propio de un microservicio hijo que
 * ya tiene su propia interfaz (ej. "http://localhost:5174" del proyecto
 * de Reservas). Las externas se abren con un enlace normal, nunca como
 * ruta interna del SPA.
 */
export function esUrlExterna(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
