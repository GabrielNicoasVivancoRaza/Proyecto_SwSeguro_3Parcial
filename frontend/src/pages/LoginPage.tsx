import { useState, useEffect, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

import slide1 from '../assets/slide1.png';
import slide2 from '../assets/slide2.png';
import slide3 from '../assets/slide3.png';
import slide4 from '../assets/slide4.jpg';

const SLIDES = [
  {
    imagen: slide1,
    titulo: 'Master Gateway',
    texto: 'Centraliza la autenticación de todos tus microservicios.',
  },
  {
    imagen: slide2,
    titulo: 'Zero Trust Security',
    texto: 'Cada acceso es validado antes de conceder permisos.',
  },
  {
    imagen: slide3,
    titulo: 'Identity & Access Management',
    texto: 'Gestiona usuarios, roles y permisos desde un único lugar.',
  },
  {
    imagen: slide4,
    titulo: 'DevSecOps Platform',
    texto: 'Seguridad integrada durante todo el ciclo de desarrollo.',
  },
];

export default function LoginPage() {
  const { login, sesion, pendiente } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // --- Estado únicamente visual del slider (no toca lógica de auth) ---
  const [slideActivo, setSlideActivo] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSlideActivo((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(intervalo);
  }, []);

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
    <div className="login-layout">
      {/* ===== Lado izquierdo: formulario a pantalla completa (lógica intacta) ===== */}
      <div className="login-panel-formulario">
        <div className="login-form-wrap">
          <div className="login-marca">
            <span className="icono-marca">
              <i className="bi bi-shield-lock-fill" />
            </span>
            <div>
              <h1>Master Gateway</h1>
              <p className="login-marca-sub">Plataforma de identidad y accesos</p>
            </div>
          </div>

          <div className="login-divisor" />

          <form onSubmit={onSubmit} className="login-form">
            <p className="subtitulo">Inicia sesión para continuar</p>

            <label className="login-campo">
              Email
              <div className="login-input-grupo">
                <i className="bi bi-envelope login-input-icono" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  autoComplete="username"
                  autoFocus
                  placeholder="nombre@empresa.com"
                />
              </div>
            </label>

            <label className="login-campo">
              Contraseña
              <div className="login-input-grupo">
                <i className="bi bi-lock login-input-icono" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
            </label>

            {error && (
              <p className="error">
                <i className="bi bi-exclamation-triangle" /> {error}
              </p>
            )}

            <button type="submit" disabled={cargando} className="login-boton-submit">
              {cargando ? (
                <>
                  <span className="login-spinner" /> Verificando…
                </>
              ) : (
                <>
                  Ingresar <i className="bi bi-arrow-right" />
                </>
              )}
            </button>

            <p className="login-footer-nota">
              <i className="bi bi-shield-check" /> Conexión cifrada y protegida
            </p>
          </form>
        </div>

        {/* Divisor curvo decorativo — solo visual */}
        <div className="login-curva-divisora" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 L55,0 C92,16 92,84 55,100 L0,100 Z" />
          </svg>
        </div>
      </div>

      {/* ===== Lado derecho: slider ===== */}
      <div className="login-slider">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.titulo}
            className={`login-slide ${i === slideActivo ? 'activo' : ''}`}
            style={{ backgroundImage: `url(${slide.imagen})` }}
          />
        ))}

        <div className="login-slide-overlay" />

        <div className="login-slide-contenido">
          <div className="login-slide-texto">
            <h2>{SLIDES[slideActivo].titulo}</h2>
            <p>{SLIDES[slideActivo].texto}</p>
          </div>

          <div className="login-slide-indicadores">
            {SLIDES.map((slide, i) => (
              <button
                key={slide.titulo}
                type="button"
                className={`login-indicador ${i === slideActivo ? 'activo' : ''}`}
                onClick={() => setSlideActivo(i)}
                aria-label={`Ir a slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}