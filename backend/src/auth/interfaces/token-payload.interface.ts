/**
 * TempToken: emitido tras validar credenciales. Solo sirve para
 * seleccionar rol — no otorga ningún permiso sobre recursos.
 */
export interface TempTokenPayload {
  sub: string; // id del usuario
  type: 'temp';
}

/**
 * AccessToken definitivo (Zero Trust, menor privilegio): contiene
 * ÚNICAMENTE el rol seleccionado y sus permisos — nunca los permisos
 * globales del usuario ni los de sus otros roles.
 */
export interface AccessTokenPayload {
  sub: string; // id del usuario
  type: 'access';
  rol: {
    id: string;
    nombre: string;
  };
  permisos: {
    modulos: string[]; // ids de módulos visibles para el rol
    menus: string[]; // ids de menús/items asignados al rol
  };
}

export type TokenPayload = TempTokenPayload | AccessTokenPayload;
