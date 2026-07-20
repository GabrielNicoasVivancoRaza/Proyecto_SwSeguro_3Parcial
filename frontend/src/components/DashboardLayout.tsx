import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
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
          <h2>Master Gateway</h2>
          <span className="chip-rol">{sesion.rol.nombre}</span>
        </div>

        <nav>
          {sesion.menus.map(({ modulo, menus }) => (
            <div key={modulo.id} className="bloque-modulo">
              <h3>{modulo.nombre}</h3>
              <SidebarMenu menus={menus} />
            </div>
          ))}
        </nav>

        <button className="boton-salir" onClick={salir}>
          Cerrar sesión
        </button>
      </aside>

      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
