import { NavLink } from 'react-router-dom';
import { claseIcono, esUrlExterna } from '../auth/menuUtils';
import type { NodoMenu } from '../auth/types';

/**
 * Renderizado RECURSIVO del árbol de menús: los nodos con url (hojas)
 * son enlaces; los intermedios son agrupadores jerárquicos. Una hoja con
 * URL externa (ej. el frontend propio de un microservicio hijo) se abre
 * en pestaña nueva con un <a> normal — nunca como ruta interna del SPA.
 */
function Nodo({ nodo, nivel }: { nodo: NodoMenu; nivel: number }) {
  if (nodo.url && esUrlExterna(nodo.url)) {
    return (
      <li>
        <a
          href={nodo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="item"
          style={{ paddingLeft: `${12 + nivel * 14}px` }}
        >
          <i className={`bi bi-${claseIcono(nodo.icono, 'box-arrow-up-right')}`} />
          {nodo.nombre}
          <i className="bi bi-box-arrow-up-right icono-externo" />
        </a>
      </li>
    );
  }

  if (nodo.url) {
    return (
      <li>
        <NavLink
          to={nodo.url}
          className={({ isActive }) => (isActive ? 'item activo' : 'item')}
          style={{ paddingLeft: `${12 + nivel * 14}px` }}
        >
          <i className={`bi bi-${claseIcono(nodo.icono, 'dot')}`} />
          {nodo.nombre}
        </NavLink>
      </li>
    );
  }

  return (
    <li>
      <span className="grupo" style={{ paddingLeft: `${12 + nivel * 14}px` }}>
        <i className={`bi bi-${claseIcono(nodo.icono, 'chevron-right')}`} />
        {nodo.nombre}
      </span>
      {nodo.hijos.length > 0 && (
        <ul>
          {nodo.hijos.map((hijo) => (
            <Nodo key={hijo.id} nodo={hijo} nivel={nivel + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function SidebarMenu({ menus }: { menus: NodoMenu[] }) {
  return (
    <ul className="menu">
      {menus.map((nodo) => (
        <Nodo key={nodo.id} nodo={nodo} nivel={0} />
      ))}
    </ul>
  );
}
