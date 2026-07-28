import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rolesApi, usuariosApi } from '../../api/resources';
import UsersPage from './UsersPage';

vi.mock('../../api/resources', async () => {
  const actual = await vi.importActual<typeof import('../../api/resources')>('../../api/resources');
  return {
    ...actual,
    usuariosApi: {
      listar: vi.fn(),
      obtener: vi.fn(),
      crear: vi.fn(),
      actualizar: vi.fn(),
      eliminar: vi.fn(),
    },
    rolesApi: {
      listar: vi.fn(),
      asignarUsuario: vi.fn(),
      desasignarUsuario: vi.fn(),
    },
  };
});

const usuariosMock = usuariosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rolesMock = rolesApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

const usuarioBase = {
  id: 'u1',
  email: 'a@b.com',
  username: 'ausuario',
  nombreCompleto: 'A B',
  estado: 'ACTIVO' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  usuariosMock.listar.mockResolvedValue({
    data: [usuarioBase],
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });
  rolesMock.listar.mockResolvedValue([
    { id: 'r1', nombre: 'Vendedor', descripcion: null, estado: 'ACTIVO' },
  ]);
});

describe('UsersPage', () => {
  it('carga y muestra la lista de usuarios', async () => {
    render(<UsersPage />);
    expect(await screen.findByText('a@b.com')).toBeInTheDocument();
    expect(screen.getByText('ACTIVO')).toBeInTheDocument();
  });

  it('crea un usuario nuevo desde el modal y recarga la lista', async () => {
    usuariosMock.crear.mockResolvedValue({});
    render(<UsersPage />);
    await screen.findByText('a@b.com');

    await userEvent.click(screen.getByText('Nuevo usuario'));
    await userEvent.type(screen.getByLabelText('Email'), 'nuevo@espe.edu.ec');
    await userEvent.type(screen.getByLabelText('Username'), 'nuevoU');
    await userEvent.type(screen.getByLabelText('Nombre completo'), 'Nuevo Usuario');
    await userEvent.type(screen.getByLabelText(/^Contraseña/), 'Segura#2026xyz');
    await userEvent.click(screen.getByText('Crear usuario'));

    await waitFor(() => expect(usuariosMock.crear).toHaveBeenCalled());
    expect(usuariosMock.listar).toHaveBeenCalledTimes(2); // carga inicial + tras crear
  });

  it('muestra el error del backend si falla la creación', async () => {
    usuariosMock.crear.mockRejectedValue({ response: { data: { message: 'email en uso' } } });
    render(<UsersPage />);
    await screen.findByText('a@b.com');

    await userEvent.click(screen.getByText('Nuevo usuario'));
    await userEvent.click(screen.getByText('Crear usuario'));

    expect(await screen.findByText('email en uso')).toBeInTheDocument();
  });

  it('abre el formulario de edición con los datos precargados', async () => {
    render(<UsersPage />);
    await screen.findByText('a@b.com');

    await userEvent.click(screen.getByText('Editar'));

    expect(screen.getByDisplayValue('a@b.com')).toBeInTheDocument();
    expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
  });

  it('elimina un usuario tras confirmar', async () => {
    usuariosMock.eliminar.mockResolvedValue({});
    render(<UsersPage />);
    await screen.findByText('a@b.com');

    await userEvent.click(screen.getByText('Eliminar'));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(usuariosMock.eliminar).toHaveBeenCalledWith('u1'));
  });

  it('expande los roles del usuario, asigna uno nuevo y luego lo quita', async () => {
    usuariosMock.obtener.mockResolvedValue({ ...usuarioBase, roles: [] });
    rolesMock.asignarUsuario.mockResolvedValue({});
    render(<UsersPage />);
    await screen.findByText('a@b.com');

    await userEvent.click(screen.getByText('Ver roles'));
    expect(await screen.findByText('Sin roles asignados')).toBeInTheDocument();

    // Tras asignar, el detalle se vuelve a pedir con el rol ya incluido
    usuariosMock.obtener.mockResolvedValue({
      ...usuarioBase,
      roles: [{ id: 'r1', nombre: 'Vendedor' }],
    });
    await userEvent.selectOptions(screen.getByRole('combobox'), 'r1');
    await userEvent.click(screen.getByText('Asignar rol'));

    expect(await screen.findByText('Vendedor')).toBeInTheDocument();
    expect(rolesMock.asignarUsuario).toHaveBeenCalledWith('r1', 'u1');

    rolesMock.desasignarUsuario.mockResolvedValue({});
    usuariosMock.obtener.mockResolvedValue({ ...usuarioBase, roles: [] });
    const chip = screen.getByText('Vendedor').closest('span')!;
    await userEvent.click(within(chip).getByRole('button'));

    await waitFor(() =>
      expect(rolesMock.desasignarUsuario).toHaveBeenCalledWith('r1', 'u1'),
    );
  });

  it('la paginación pide la siguiente página al backend', async () => {
    usuariosMock.listar.mockResolvedValue({
      data: [usuarioBase],
      meta: { page: 1, limit: 10, total: 25, totalPages: 3 },
    });
    render(<UsersPage />);
    await screen.findByText('a@b.com');

    await userEvent.click(screen.getByText(/Siguiente/));

    await waitFor(() => expect(usuariosMock.listar).toHaveBeenLastCalledWith(2));
  });
});
