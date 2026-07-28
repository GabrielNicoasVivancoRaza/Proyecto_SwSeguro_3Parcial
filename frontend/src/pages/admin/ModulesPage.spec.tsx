import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { modulosApi } from '../../api/resources';
import ModulesPage from './ModulesPage';

vi.mock('../../api/resources', async () => {
  const actual = await vi.importActual<typeof import('../../api/resources')>('../../api/resources');
  return {
    ...actual,
    modulosApi: { listar: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), eliminar: vi.fn() },
  };
});

const modulosMock = modulosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const moduloBase = {
  id: 'm1',
  nombre: 'Ventas',
  descripcion: 'Módulo de ventas',
  icono: 'cart-fill',
  estado: 'ACTIVO' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  modulosMock.listar.mockResolvedValue([moduloBase]);
});

describe('ModulesPage', () => {
  it('carga y muestra la lista de módulos', async () => {
    render(<ModulesPage />);
    expect(await screen.findByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('Módulo de ventas')).toBeInTheDocument();
  });

  it('crea un módulo nuevo', async () => {
    modulosMock.crear.mockResolvedValue({});
    render(<ModulesPage />);
    await screen.findByText('Ventas');

    await userEvent.click(screen.getByText('Nuevo módulo'));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Recursos Humanos');
    await userEvent.click(screen.getByText('Crear módulo'));

    await waitFor(() =>
      expect(modulosMock.crear).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Recursos Humanos' }),
      ),
    );
  });

  it('edita un módulo existente', async () => {
    modulosMock.actualizar.mockResolvedValue({});
    render(<ModulesPage />);
    await screen.findByText('Ventas');

    await userEvent.click(screen.getByText('Editar'));
    expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => expect(modulosMock.actualizar).toHaveBeenCalledWith('m1', expect.anything()));
  });

  it('elimina un módulo tras confirmar', async () => {
    modulosMock.eliminar.mockResolvedValue({});
    render(<ModulesPage />);
    await screen.findByText('Ventas');

    await userEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => expect(modulosMock.eliminar).toHaveBeenCalledWith('m1'));
  });

  it('muestra el error del backend si falla la carga inicial', async () => {
    modulosMock.listar.mockRejectedValue({ response: { data: { message: 'sin conexión' } } });
    render(<ModulesPage />);
    expect(await screen.findByText('sin conexión')).toBeInTheDocument();
  });
});
