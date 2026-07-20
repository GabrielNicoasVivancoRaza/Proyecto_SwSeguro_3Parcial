import type { Sesion } from './types';

/**
 * sessionStorage (no localStorage): la sesión muere al cerrar la pestaña,
 * acotando la ventana de exposición del token (aislamiento por sesión).
 */
const CLAVE = 'mg_sesion';

export function cargarSesion(): Sesion | null {
  const crudo = sessionStorage.getItem(CLAVE);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as Sesion;
  } catch {
    sessionStorage.removeItem(CLAVE);
    return null;
  }
}

export function guardarSesion(sesion: Sesion) {
  sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
}

export function limpiarSesion() {
  sessionStorage.removeItem(CLAVE);
}
