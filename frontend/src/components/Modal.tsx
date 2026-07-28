import { useEffect, type MouseEvent, type ReactNode } from 'react';

interface Props {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}

/** Modal accesible: cierra con Escape o clic fuera de la caja. */
export default function Modal({ titulo, onClose, children }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Cierra solo si el clic fue directamente sobre el fondo (no un clic que
  // burbujeó desde el contenido). Evita necesitar un onClick+stopPropagation
  // en modal-caja, que un lector de pantalla no podría operar por teclado.
  function cerrarSiEsFondo(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    // El fondo es un backdrop decorativo: el cierre por clic es un atajo para
    // mouse, no un control semántico — el equivalente por teclado ya existe
    // (Escape, manejado arriba, y el botón de cierre). role="presentation"
    // lo saca del árbol de accesibilidad en vez de fingir que es interactivo.
    <div className="modal-overlay" onClick={cerrarSiEsFondo} role="presentation">
      <div className="modal-caja" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabecera">
          <h3>{titulo}</h3>
          <button className="modal-cerrar" onClick={onClose} aria-label="Cerrar">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  );
}
