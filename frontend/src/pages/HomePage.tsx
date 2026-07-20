import { useAuth } from '../auth/AuthContext';

export default function HomePage() {
  const { sesion } = useAuth();

  return (
    <section>
      <h1>Bienvenido</h1>
      <p>
        Estás operando con el rol <strong>{sesion?.rol.nombre}</strong>. La
        navegación del panel izquierdo se construyó en tiempo de ejecución a
        partir del menú que el Master devolvió para este rol.
      </p>
    </section>
  );
}
