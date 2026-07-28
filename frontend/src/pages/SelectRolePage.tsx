import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/**
 * Workspace Selector (PDF 5.3): tras el login clásico se IMPIDE la carga
 * del dashboard; el usuario debe elegir explícitamente el rol con el que
 * operará. El rol elegido delimita el contexto de seguridad de la sesión.
 */
export default function SelectRolePage() {
  const { pendiente, sesion, seleccionarRol } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState<string | null>(null);

  if (sesion) return <Navigate to="/" replace />;
  if (!pendiente) return <Navigate to="/login" replace />;

  async function elegir(roleId: string) {
    setError(null);
    setEligiendo(roleId);
    try {
      await seleccionarRol(roleId);
      navigate('/', { replace: true });
    } catch {
      setError('No fue posible seleccionar el rol. Vuelve a iniciar sesión.');
      setEligiendo(null);
    }
  }

  return (
    <div className="pantalla-centrada">
      <div className="tarjeta">
        <div className="marca">
          <span className="icono-marca">
            <i className="bi bi-diagram-3-fill" />
          </span>
          <h1>Espacio de trabajo</h1>
        </div>
        <p className="subtitulo">Selecciona el rol con el que deseas operar en esta sesión</p>

        <div className="lista-roles">
          {pendiente.roles.map((rol) => (
            <button
              key={rol.id}
              className="boton-rol"
              disabled={eligiendo !== null}
              onClick={() => elegir(rol.id)}
            >
              <span className="icono-rol">
                <i className="bi bi-person-badge" />
              </span>
              <span className="texto-rol">
                <strong>{rol.nombre}</strong>
                {rol.descripcion && <span>{rol.descripcion}</span>}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p className="error">
            <i className="bi bi-exclamation-triangle" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
