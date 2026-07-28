import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SidebarMenu from './SidebarMenu';
import type { NodoMenu } from '../auth/types';

function nodo(parcial: Partial<NodoMenu>): NodoMenu {
  return { id: 'x', nombre: 'x', url: null, icono: null, orden: 0, hijos: [], ...parcial };
}

describe('SidebarMenu (renderizado recursivo)', () => {
  it('renderiza un ítem hoja como enlace navegable', () => {
    render(
      <MemoryRouter>
        <SidebarMenu menus={[nodo({ id: 'a', nombre: 'Reportes', url: '/ventas/reportes' })]} />
      </MemoryRouter>,
    );
    const enlace = screen.getByRole('link', { name: /Reportes/ });
    expect(enlace).toHaveAttribute('href', '/ventas/reportes');
  });

  it('renderiza un nodo intermedio (sin url) como agrupador con sus hijos anidados', () => {
    render(
      <MemoryRouter>
        <SidebarMenu
          menus={[
            nodo({
              id: 'grupo',
              nombre: 'Órdenes',
              url: null,
              hijos: [nodo({ id: 'hoja', nombre: 'Crear Orden', url: '/ventas/ordenes/crear' })],
            }),
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Órdenes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Crear Orden/ })).toBeInTheDocument();
  });
});
