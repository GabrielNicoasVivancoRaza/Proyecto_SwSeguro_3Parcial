import type { ReactNode } from 'react';

/** Botones Editar/Eliminar repetidos en toda tabla admin; admite acciones extra al frente. */
export default function AccionesFila({
  onEditar,
  onEliminar,
  children,
}: {
  onEditar: () => void;
  onEliminar: () => void;
  children?: ReactNode;
}) {
  return (
    <td className="celda-acciones">
      {children}
      <button onClick={onEditar}>
        <i className="bi bi-pencil" /> Editar
      </button>
      <button className="boton-peligro" onClick={onEliminar}>
        <i className="bi bi-trash" /> Eliminar
      </button>
    </td>
  );
}
