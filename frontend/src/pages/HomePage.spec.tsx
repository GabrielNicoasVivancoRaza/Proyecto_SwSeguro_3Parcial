import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { menusApi, modulosApi, rolesApi, usuariosApi } from '../api/resources';
import { useAuth } from '../auth/AuthContext';
import HomePage from './HomePage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../api/resources', async () => {
  const actual = await vi.importActual<typeof import('../api/resources')>('../api/resources');
  return {
    ...actual,
    usuariosApi: { listar: vi.fn() },
    rolesApi: { listar: vi.fn() },
    modulosApi: { listar: vi.fn() },
    menusApi: { listar: vi.fn() },
  };
});

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;
const usuariosMock = usuariosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rolesMock = rolesApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const modulosMock = modulosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const menusMock = menusApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

function renderCon(sesion: unknown) {
  useAuthMock.mockReturnValue({ sesion });
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage (dashboard)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('un rol SIN acceso a Administración no ve ningún KPI administrativo (menor privilegio)', async () => {
    renderCon({
      rol: { nombre: 'Vendedor' },
      menus: [
        {
          modulo: { id: 'm1', nombre: 'Ventas' },
          menus: [{ id: 'i1', nombre: 'Reportes', url: '/ventas/reportes', icono: null, orden: 1, hijos: [] }],
        },
      ],
    });

    expect(await screen.findByText('Reportes')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios activos')).not.toBeInTheDocument();
    expect(usuariosMock.listar).not.toHaveBeenCalled();
  });

  it('un rol CON acceso a Administración pide y muestra los 4 KPIs reales', async () => {
    usuariosMock.listar.mockResolvedValue({ meta: { total: 7 } });
    rolesMock.listar.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
    modulosMock.listar.mockResolvedValue([{ id: 'm1' }]);
    menusMock.listar.mockResolvedValue(new Array(10).fill({ id: 'x' }));

    renderCon({
      rol: { nombre: 'Administrador' },
      menus: [
        {
          modulo: { id: 'admin', nombre: 'Administración' },
          menus: [
            { id: 'u', nombre: 'Usuarios', url: '/admin/usuarios', icono: null, orden: 1, hijos: [] },
            { id: 'r', nombre: 'Roles', url: '/admin/roles', icono: null, orden: 2, hijos: [] },
            { id: 'm', nombre: 'Módulos', url: '/admin/modulos', icono: null, orden: 3, hijos: [] },
            { id: 'me', nombre: 'Menús', url: '/admin/menus', icono: null, orden: 4, hijos: [] },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getByText('7')).toBeInTheDocument());
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
