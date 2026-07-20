import { NavLink } from 'react-router-dom';
import type { NodoMenu } from '../auth/types';

/**
 * Renderizado RECURSIVO del árbol de menús: los nodos con url (hojas)
 * son enlaces; los intermedios son agrupadores jerárquicos.
 */
function Nodo({ nodo, nivel }: { nodo: NodoMenu; nivel: number }) {
  if (nodo.url) {
    return (
      <li>
        <NavLink
          to={nodo.url}
          className={({ isActive }) => (isActive ? 'item activo' : 'item')}
          style={{ paddingLeft: `${12 + nivel * 14}px` }}
        >
          {nodo.nombre}
        </NavLink>
      </li>
    );
  }

  return (
    <li>
      <span className="grupo" style={{ paddingLeft: `${12 + nivel * 14}px` }}>
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
