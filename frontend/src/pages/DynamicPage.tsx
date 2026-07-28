import { useLocation } from 'react-router-dom';

/**
 * Página genérica para los items del menú que aún no tienen un microservicio
 * hijo real detrás (ej. Ventas — OE4 del PDF: "arquitectura preparada para
 * la integración de futuros microservicios"). Los ítems de Administración
 * (Usuarios/Roles/Módulos/Menús) SÍ tienen pantallas reales — ver src/pages/admin.
 */
export default function DynamicPage({ titulo }: { titulo: string }) {
  const { pathname } = useLocation();

  return (
    <section>
      <h1>{titulo}</h1>
      <div className="panel-vacio">
        <i className="bi bi-cone-striped" style={{ fontSize: '1.6rem', color: 'var(--texto-mudo)' }} />
        <p style={{ margin: '10px 0 4px' }}>
          Ruta <code>{pathname}</code> generada dinámicamente desde el menú del rol — ningún path está
          hardcodeado en el frontend.
        </p>
        <p style={{ margin: 0 }}>
          Aquí se integrará el microservicio hijo correspondiente (validando su token contra el Master,
          según Zero Trust).
        </p>
      </div>
    </section>
  );
}
