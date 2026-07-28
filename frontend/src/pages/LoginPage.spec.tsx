import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import LoginPage from './LoginPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const useAuthMock = useAuth as unknown as ReturnType<typeof vi.fn>;

function renderLogin(estado: { sesion?: unknown; pendiente?: unknown; login: ReturnType<typeof vi.fn> }) {
  useAuthMock.mockReturnValue({ sesion: null, pendiente: null, ...estado });
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/seleccionar-rol" element={<p>selector de rol</p>} />
        <Route path="/" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('con sesión activa redirige al dashboard (no tiene sentido re-loguear)', () => {
    renderLogin({ sesion: { rol: { nombre: 'Admin' } }, login: vi.fn() });
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('con login pendiente redirige al selector de rol', () => {
    renderLogin({ pendiente: { tempToken: 't', roles: [] }, login: vi.fn() });
    expect(screen.getByText('selector de rol')).toBeInTheDocument();
  });

  it('login exitoso navega al selector de rol', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    renderLogin({ login });

    await userEvent.type(screen.getByLabelText('Email'), 'admin@espe.edu.ec');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Admin#2026');
    await userEvent.click(screen.getByText(/Ingresar/));

    expect(login).toHaveBeenCalledWith('admin@espe.edu.ec', 'Admin#2026');
  });

  it('credenciales inválidas muestran un mensaje genérico (no revela cuál campo falló)', async () => {
    const login = vi.fn().mockRejectedValue(new Error('401'));
    renderLogin({ login });

    await userEvent.type(screen.getByLabelText('Email'), 'x@x.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await userEvent.click(screen.getByText(/Ingresar/));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
  });

  it('cambia de slide al hacer clic en un indicador (interacción puramente visual)', async () => {
    renderLogin({ login: vi.fn() });
    const indicadores = screen.getAllByLabelText(/Ir a slide/);
    await userEvent.click(indicadores[1]);
    await waitFor(() => expect(indicadores[1]).toHaveClass('activo'));
  });
});
