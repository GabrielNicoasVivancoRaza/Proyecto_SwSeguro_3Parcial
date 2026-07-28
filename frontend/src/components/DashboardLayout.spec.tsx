import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import DashboardLayout from './DashboardLayout';

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;

function renderConSesion(sesion: unknown, extra: Record<string, unknown> = {}) {
  useAuthMock.mockReturnValue({
    sesion,
    logout: vi.fn().mockResolvedValue(undefined),
    refrescarMenus: vi.fn().mockResolvedValue(undefined),
    ...extra,
  });
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<p>pantalla de login</p>} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<p>contenido del panel</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardLayout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirige a /login si no hay sesión activa (Zero Trust en el cliente)', () => {
    renderConSesion(null);
    expect(screen.getByText('pantalla de login')).toBeInTheDocument();
  });

  it('muestra el rol activo y los módulos del menú', () => {
    renderConSesion({
      rol: { id: 'r1', nombre: 'Vendedor' },
      menus: [{ modulo: { id: 'm1', nombre: 'Ventas', icono: null }, menus: [] }],
    });
    expect(screen.getByText('Vendedor')).toBeInTheDocument();
    expect(screen.getByText('Ventas')).toBeInTheDocument();
    expect(screen.getByText('contenido del panel')).toBeInTheDocument();
  });

  it('el botón "Actualizar menú" llama a refrescarMenus', async () => {
    const refrescarMenus = vi.fn().mockResolvedValue(undefined);
    renderConSesion(
      { rol: { id: 'r1', nombre: 'Vendedor' }, menus: [] },
      { refrescarMenus },
    );

    await userEvent.click(screen.getByText('Actualizar menú'));

    await waitFor(() => expect(refrescarMenus).toHaveBeenCalledTimes(1));
  });

  it('el botón "Cerrar sesión" llama a logout y navega a /login', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderConSesion({ rol: { id: 'r1', nombre: 'Vendedor' }, menus: [] }, { logout });

    await userEvent.click(screen.getByText('Cerrar sesión'));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('pantalla de login')).toBeInTheDocument();
  });
});
