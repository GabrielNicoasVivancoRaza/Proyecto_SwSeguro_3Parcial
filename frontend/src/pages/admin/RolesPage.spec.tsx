import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { menusApi, modulosApi, rolesApi } from '../../api/resources';
import RolesPage from './RolesPage';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ sesion: { rol: { id: 'r1', nombre: 'Administrador' } } }),
}));

vi.mock('../../api/resources', async () => {
  const actual = await vi.importActual<typeof import('../../api/resources')>('../../api/resources');
  return {
    ...actual,
    rolesApi: {
      listar: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      eliminar: vi.fn(),
      asignarModulo: vi.fn(),
      asignarMenu: vi.fn(),
    },
    modulosApi: { listar: vi.fn() },
    menusApi: { listar: vi.fn() },
  };
});

const rolesMock = rolesApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const modulosMock = modulosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const menusMock = menusApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const rolBase = { id: 'r1', nombre: 'Administrador', descripcion: 'Gestión total', estado: 'ACTIVO' as const };

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  rolesMock.listar.mockResolvedValue([rolBase]);
  modulosMock.listar.mockResolvedValue([{ id: 'm1', nombre: 'Ventas', descripcion: null, icono: null, estado: 'ACTIVO' }]);
  menusMock.listar.mockResolvedValue([
    { id: 'mn1', nombre: 'Reportes', url: '/ventas/reportes', icono: null, orden: 1, moduloId: 'm1', parentId: null, estado: 'ACTIVO' },
  ]);
});

describe('RolesPage', () => {
  it('carga y muestra la lista de roles', async () => {
    render(<RolesPage />);
    expect(await screen.findByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Gestión total')).toBeInTheDocument();
  });

  it('crea un rol nuevo', async () => {
    rolesMock.crear.mockResolvedValue({});
    render(<RolesPage />);
    await screen.findByText('Administrador');

    await userEvent.click(screen.getByText('Nuevo rol'));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Auditor');
    await userEvent.click(screen.getByText('Crear rol'));

    await waitFor(() =>
      expect(rolesMock.crear).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Auditor' }),
      ),
    );
  });

  it('elimina un rol tras confirmar', async () => {
    rolesMock.eliminar.mockResolvedValue({});
    render(<RolesPage />);
    await screen.findByText('Administrador');

    await userEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => expect(rolesMock.eliminar).toHaveBeenCalledWith('r1'));
  });

  it('vincula un módulo y un menú al rol activo y refresca el árbol de la sesión', async () => {
    rolesMock.asignarModulo.mockResolvedValue({});
    rolesMock.asignarMenu.mockResolvedValue({});
    render(<RolesPage />);
    await screen.findByText('Administrador');

    await userEvent.click(screen.getByText('Vincular módulo/menú'));

    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'm1');
    await userEvent.click(screen.getByText('Vincular módulo'));
    await waitFor(() => expect(rolesMock.asignarModulo).toHaveBeenCalledWith('r1', 'm1'));

    await userEvent.selectOptions(selects[1], 'mn1');
    await userEvent.click(screen.getByText('Vincular menú'));
    await waitFor(() => expect(rolesMock.asignarMenu).toHaveBeenCalledWith('r1', 'mn1'));
  });
});
