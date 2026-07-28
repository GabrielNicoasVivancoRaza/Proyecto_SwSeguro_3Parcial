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
