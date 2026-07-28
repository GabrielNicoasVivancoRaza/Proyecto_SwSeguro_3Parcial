import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { claseIcono } from '../auth/menuUtils';
import SidebarMenu from './SidebarMenu';

export default function DashboardLayout() {
  const { sesion, logout } = useAuth();
  const navigate = useNavigate();

  // Zero Trust también en el cliente: sin sesión completa no hay dashboard
  if (!sesion) return <Navigate to="/login" replace />;

  async function salir() {
    await logout();
    navigate('/login', { replace: true });
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
