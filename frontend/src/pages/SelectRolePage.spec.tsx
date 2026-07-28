import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import SelectRolePage from './SelectRolePage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;

function renderPagina(estado: {
  sesion?: unknown;
  pendiente?: unknown;
  seleccionarRol: ReturnType<typeof vi.fn>;
}) {
  useAuthMock.mockReturnValue({ sesion: null, pendiente: null, ...estado });
  return render(
    <MemoryRouter initialEntries={['/seleccionar-rol']}>
      <Routes>
        <Route path="/login" element={<p>pantalla de login</p>} />
        <Route path="/seleccionar-rol" element={<SelectRolePage />} />
        <Route path="/" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SelectRolePage (Workspace Selector)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin login pendiente redirige a /login', () => {
    renderPagina({ seleccionarRol: vi.fn() });
    expect(screen.getByText('pantalla de login')).toBeInTheDocument();
  });

  it('con sesión completa redirige al dashboard (no debe re-seleccionar rol)', () => {
    renderPagina({ sesion: { rol: {} }, seleccionarRol: vi.fn() });
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('lista los roles del login pendiente y permite elegir uno', async () => {
    const seleccionarRol = vi.fn().mockResolvedValue(undefined);
    renderPagina({
      pendiente: {
        tempToken: 't',
        roles: [
          { id: 'r1', nombre: 'Administrador', descripcion: 'Gestión total' },
          { id: 'r2', nombre: 'Vendedor', descripcion: null },
        ],
      },
      seleccionarRol,
    });

    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Vendedor')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Administrador'));

    expect(seleccionarRol).toHaveBeenCalledWith('r1');
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });

  it('muestra un error si falla la selección de rol', async () => {
    const seleccionarRol = vi.fn().mockRejectedValue(new Error('fail'));
    renderPagina({
      pendiente: { tempToken: 't', roles: [{ id: 'r1', nombre: 'Administrador' }] },
      seleccionarRol,
    });

    await userEvent.click(screen.getByText('Administrador'));

    expect(await screen.findByText(/no fue posible seleccionar el rol/i)).toBeInTheDocument();
  });
});
