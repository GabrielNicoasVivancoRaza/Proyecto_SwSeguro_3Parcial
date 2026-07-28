import type { ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { esUrlExterna, itemsDeSesion } from './auth/menuUtils';
import DashboardLayout from './components/DashboardLayout';
import ModulesPage from './pages/admin/ModulesPage';
import MenusPage from './pages/admin/MenusPage';
import RolesPage from './pages/admin/RolesPage';
import UsersPage from './pages/admin/UsersPage';
import DynamicPage from './pages/DynamicPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SelectRolePage from './pages/SelectRolePage';

/**
 * Páginas REALES ya implementadas para rutas del propio Master (gestión de
 * identidad, sección 5.1/5.2 del PDF). Cualquier url del árbol que no esté
 * aquí (ej. las de un futuro microservicio hijo como Ventas) cae en
 * DynamicPage — el placeholder que anuncia la integración pendiente.
 *
 * Esta tabla NO reintroduce rutas hardcodeadas: el CONJUNTO de rutas que
 * existen sigue viniendo 100% del árbol que devuelve /menus/tree según el
 * rol; esto solo decide qué componente se usa para renderizar una url que
 * el backend ya autorizó.
 */
const PAGINAS_REGISTRADAS: Record<string, ComponentType> = {
  '/admin/usuarios': UsersPage,
  '/admin/roles': RolesPage,
  '/admin/modulos': ModulesPage,
  '/admin/menus': MenusPage,
};

/**
 * Enrutamiento Basado en Menú (PDF 5.4): las rutas NO están hardcodeadas;
 * se inyectan al enrutador en tiempo de ejecución a partir del JSON que el
 * Master devolvió tras la selección del rol.
 */
function RutasDinamicas() {
  const { sesion } = useAuth();

  const items = sesion ? itemsDeSesion(sesion.menus) : [];
  // Un ítem con URL externa (ej. el frontend propio de un microservicio
  // hijo) nunca es una ruta interna del SPA — se abre con un <a> normal
  // desde el sidebar/HomePage, jamás se registra en React Router.
  const itemsInternos = items.filter((item) => !esUrlExterna(item.url!));

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/seleccionar-rol" element={<SelectRolePage />} />

      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<HomePage />} />
        {itemsInternos.map((item) => {
          const Pagina = PAGINAS_REGISTRADAS[item.url!] ?? (() => <DynamicPage titulo={item.nombre} />);
          return <Route key={item.id} path={item.url!} element={<Pagina />} />;
        })}
        {/* Cualquier ruta fuera del menú del rol vuelve al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RutasDinamicas />
      </BrowserRouter>
    </AuthProvider>
  );
}
