import { beforeEach, describe, expect, it } from 'vitest';
import { cargarSesion, guardarSesion, limpiarSesion } from './storage';
import type { Sesion } from './types';

const sesion: Sesion = {
  accessToken: 'acc',
  refreshToken: 'ref',
  rol: { id: 'r1', nombre: 'Admin' },
  menus: [],
};

describe('storage de sesión (sessionStorage, no localStorage)', () => {
  beforeEach(() => sessionStorage.clear());

  it('cargarSesion devuelve null si no hay nada guardado', () => {
    expect(cargarSesion()).toBeNull();
  });

  it('guardarSesion + cargarSesion hacen round-trip', () => {
    guardarSesion(sesion);
    expect(cargarSesion()).toEqual(sesion);
  });

  it('limpiarSesion borra lo guardado', () => {
    guardarSesion(sesion);
    limpiarSesion();
    expect(cargarSesion()).toBeNull();
  });

  it('cargarSesion tolera JSON corrupto sin lanzar (y lo limpia)', () => {
    sessionStorage.setItem('mg_sesion', '{json invalido');
    expect(cargarSesion()).toBeNull();
    expect(sessionStorage.getItem('mg_sesion')).toBeNull();
  });
});
