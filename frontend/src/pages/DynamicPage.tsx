import { useLocation } from 'react-router-dom';

/**
 * Página genérica para los items del menú. En el ecosistema real, cada url
 * apunta a un microservicio hijo (ej. Ventas); aquí se muestra el contexto
 * de la ruta inyectada dinámicamente.
 */
export default function DynamicPage({ titulo }: { titulo: string }) {
  const { pathname } = useLocation();

  return (
    <section>
      <h1>{titulo}</h1>
      <p>
        Ruta <code>{pathname}</code> generada dinámicamente desde el menú del
        rol — ningún path está hardcodeado en el frontend.
      </p>
      <p>
        Aquí se integrará el microservicio hijo correspondiente (validando su
        token contra el Master, según Zero Trust).
      </p>
    </section>
  );
}
