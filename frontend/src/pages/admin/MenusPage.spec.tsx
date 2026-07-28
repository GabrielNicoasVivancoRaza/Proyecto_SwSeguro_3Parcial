import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { menusApi, modulosApi } from '../../api/resources';
import MenusPage from './MenusPage';

vi.mock('../../api/resources', async () => {
  const actual = await vi.importActual<typeof import('../../api/resources')>('../../api/resources');
  return {
    ...actual,
    menusApi: { listar: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn() },
    modulosApi: { listar: vi.fn() },
  };
});

const menusMock = menusApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const modulosMock = modulosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const menuRaiz = {
  id: 'mn1',
  nombre: 'Panel Ventas',
  url: null,
  icono: null,
  orden: 1,
  moduloId: 'm1',
  parentId: null,
  estado: 'ACTIVO' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  menusMock.listar.mockResolvedValue([menuRaiz]);
  modulosMock.listar.mockResolvedValue([
    { id: 'm1', nombre: 'Ventas', descripcion: null, icono: null, estado: 'ACTIVO' },
  ]);
});

describe('MenusPage', () => {
  it('carga y muestra la lista de menús con su módulo y padre', async () => {
    render(<MenusPage />);
    expect(await screen.findByText('Panel Ventas')).toBeInTheDocument();
    expect(screen.getByText('Ventas')).toBeInTheDocument(); // columna Módulo
    expect(screen.getByText('— (raíz)')).toBeInTheDocument();
  });

  it('crea un menú nuevo eligiendo módulo (el botón se habilita solo con módulo elegido)', async () => {
    menusMock.crear.mockResolvedValue({});
    render(<MenusPage />);
    await screen.findByText('Panel Ventas');

    await userEvent.click(screen.getByText('Nuevo menú'));
    expect(screen.getByText('Crear menú')).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Nombre'), 'Reportes');
    await userEvent.selectOptions(screen.getByLabelText('Módulo'), 'm1');
    expect(screen.getByText('Crear menú')).toBeEnabled();

    await userEvent.click(screen.getByText('Crear menú'));

    await waitFor(() =>
      expect(menusMock.crear).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Reportes', moduloId: 'm1' }),
      ),
    );
  });

  it('el select de "Menú padre" solo ofrece opciones del mismo módulo elegido', async () => {
    render(<MenusPage />);
    await screen.findByText('Panel Ventas');

    await userEvent.click(screen.getByText('Nuevo menú'));
    await userEvent.selectOptions(screen.getByLabelText('Módulo'), 'm1');

    // "Panel Ventas" (mn1) pertenece a m1, así que aparece como opción de padre
    const selectPadre = screen.getByLabelText(/Menú padre/);
    expect(within(selectPadre).getByText('Panel Ventas')).toBeInTheDocument();
  });

  it('elimina un menú tras confirmar', async () => {
    menusMock.eliminar.mockResolvedValue({});
    render(<MenusPage />);
    await screen.findByText('Panel Ventas');

    await userEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => expect(menusMock.eliminar).toHaveBeenCalledWith('mn1'));
  });
});
