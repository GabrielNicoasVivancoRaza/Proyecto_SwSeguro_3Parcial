import { describe, expect, it } from 'vitest';
import { claseIcono, hojas, itemsDeSesion, tieneAcceso } from './menuUtils';
import type { NodoMenu } from './types';

function nodo(parcial: Partial<NodoMenu>): NodoMenu {
  return { id: 'x', nombre: 'x', url: null, icono: null, orden: 0, hijos: [], ...parcial };
}

describe('hojas', () => {
  it('devuelve solo los nodos con url, recorriendo hijos anidados', () => {
    const arbol: NodoMenu[] = [
      nodo({
        id: 'raiz',
        nombre: 'Ventas',
        url: null,
        hijos: [
          nodo({ id: 'crear', nombre: 'Crear Orden', url: '/ventas/ordenes/crear' }),
          nodo({
            id: 'grupo',
            nombre: 'Órdenes',
            url: null,
            hijos: [nodo({ id: 'listar', nombre: 'Listar', url: '/ventas/ordenes' })],
          }),
        ],
      }),
    ];

    const resultado = hojas(arbol);

    expect(resultado.map((n) => n.id)).toEqual(['crear', 'listar']);
  });

  it('devuelve arreglo vacío si no hay ningún nodo con url', () => {
    const arbol = [nodo({ id: 'a', url: null, hijos: [] })];
    expect(hojas(arbol)).toEqual([]);
  });
});

describe('itemsDeSesion', () => {
  it('aplana los items de todos los módulos de la sesión', () => {
    const menus = [
      { menus: [nodo({ id: 'a', url: '/a' })] },
      { menus: [nodo({ id: 'b', url: '/b' })] },
    ];
    expect(itemsDeSesion(menus).map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('tieneAcceso', () => {
  it('true cuando la url existe entre los items del rol', () => {
    const menus = [{ menus: [nodo({ id: 'a', url: '/admin/usuarios' })] }];
    expect(tieneAcceso(menus, '/admin/usuarios')).toBe(true);
  });

  it('false cuando la url no está en el menú del rol (evita fugas de datos)', () => {
    const menus = [{ menus: [nodo({ id: 'a', url: '/ventas/reportes' })] }];
    expect(tieneAcceso(menus, '/admin/usuarios')).toBe(false);
  });
});

describe('claseIcono', () => {
  it('acepta un nombre de ícono válido (letras, números, guiones)', () => {
    expect(claseIcono('cart-fill', 'folder')).toBe('cart-fill');
  });

  it('cae al valor por defecto si el ícono es null', () => {
    expect(claseIcono(null, 'folder')).toBe('folder');
  });

  it('cae al valor por defecto si el ícono tiene caracteres no seguros (sanitización)', () => {
    expect(claseIcono('cart"><script>alert(1)</script>', 'folder')).toBe('folder');
  });
});
