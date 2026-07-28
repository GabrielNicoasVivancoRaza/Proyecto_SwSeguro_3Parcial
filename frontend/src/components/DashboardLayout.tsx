import { useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { claseIcono } from '../auth/menuUtils';
import SidebarMenu from './SidebarMenu';

export default function DashboardLayout() {
  const { sesion, logout, refrescarMenus } = useAuth();
  const navigate = useNavigate();
  const [actualizando, setActualizando] = useState(false);

  // Zero Trust también en el cliente: sin sesión completa no hay dashboard
  if (!sesion) return <Navigate to="/login" replace />;

  async function salir() {
    await logout();
    navigate('/login', { replace: true });
  }

  async function actualizarMenu() {
    setActualizando(true);
    try {
      await refrescarMenus();
    } finally {
      setActualizando(false);
    }
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-cabecera">
          <span className="icono-marca">
            <i className="bi bi-shield-lock-fill" />
          </span>
          <div>
            <h2>Master Gateway</h2>
            <span className="chip-rol">
              <i className="bi bi-person-check" /> {sesion.rol.nombre}
            </span>
          </div>
        </div>

        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'enlace-inicio activo' : 'enlace-inicio')}>
            <i className="bi bi-speedometer2" /> Panel general
          </NavLink>

          {sesion.menus.map(({ modulo, menus }) => (
            <div key={modulo.id} className="bloque-modulo">
              <h3>
                <i className={`bi bi-${claseIcono(modulo.icono, 'folder')}`} />
                {modulo.nombre}
              </h3>
              <SidebarMenu menus={menus} />
            </div>
          ))}
        </nav>

        <button
          className="boton-salir"
          onClick={actualizarMenu}
          disabled={actualizando}
          title="Vuelve a pedir el menú al backend — útil si un administrador acaba de agregar o reasignar algo a tu rol"
        >
          <i className={`bi bi-arrow-clockwise ${actualizando ? 'girando' : ''}`} />
          {actualizando ? 'Actualizando…' : 'Actualizar menú'}
        </button>
        <button className="boton-salir" onClick={salir}>
          <i className="bi bi-box-arrow-right" /> Cerrar sesión
        </button>
      </aside>

      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
