import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import type { NodoMenu } from './auth/types';
import DashboardLayout from './components/DashboardLayout';
import DynamicPage from './pages/DynamicPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SelectRolePage from './pages/SelectRolePage';

/** Aplana el árbol y devuelve solo los nodos hoja (los que tienen url). */
function hojas(nodos: NodoMenu[]): NodoMenu[] {
  return nodos.flatMap((n) => (n.url ? [n] : hojas(n.hijos)));
}

/**
 * Enrutamiento Basado en Menú (PDF 5.4): las rutas NO están hardcodeadas;
 * se inyectan al enrutador en tiempo de ejecución a partir del JSON que el
 * Master devolvió tras la selección del rol.
 */
function RutasDinamicas() {
  const { sesion } = useAuth();

  const items = sesion ? sesion.menus.flatMap((m) => hojas(m.menus)) : [];

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/seleccionar-rol" element={<SelectRolePage />} />

      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<HomePage />} />
        {items.map((item) => (
          <Route
            key={item.id}
            path={item.url!}
            element={<DynamicPage titulo={item.nombre} />}
          />
        ))}
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
