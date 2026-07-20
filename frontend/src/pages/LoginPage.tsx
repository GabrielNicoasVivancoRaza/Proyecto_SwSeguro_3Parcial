import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login, sesion, pendiente } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Con sesión completa no tiene sentido el login
  if (sesion) return <Navigate to="/" replace />;
  // Con login pendiente, lo que toca es elegir rol
  if (pendiente) return <Navigate to="/seleccionar-rol" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(email, password);
      navigate('/seleccionar-rol', { replace: true });
    } catch {
      // Mensaje genérico: el backend tampoco distingue email/contraseña
      setError('Credenciales inválidas');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="pantalla-centrada">
      <form className="tarjeta" onSubmit={onSubmit}>
        <h1>Master Gateway</h1>
        <p className="subtitulo">Inicio de sesión</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
            autoComplete="username"
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Verificando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
