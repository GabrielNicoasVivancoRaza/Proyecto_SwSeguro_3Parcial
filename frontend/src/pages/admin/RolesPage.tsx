import { Fragment, useEffect, useState } from 'react';
import {
  mensajeError,
  menusApi,
  modulosApi,
  rolesApi,
  type MenuPlano,
  type Modulo,
  type Rol,
} from '../../api/resources';
import AccionesFila from '../../components/AccionesFila';
import EstadoBadge from '../../components/EstadoBadge';
import Modal from '../../components/Modal';
import ModalFormFooter from '../../components/ModalFormFooter';
import { useAuth } from '../../auth/AuthContext';

const FORM_VACIO = { nombre: '', descripcion: '' };

export default function RolesPage() {
  const { sesion, refrescarMenus } = useAuth();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [menus, setMenus] = useState<MenuPlano[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [moduloParaAsignar, setModuloParaAsignar] = useState('');
  const [menuParaAsignar, setMenuParaAsignar] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [r, m, mn] = await Promise.all([
        rolesApi.listar(),
        modulosApi.listar(),
        menusApi.listar(),
      ]);
      setRoles(r);
      setModulos(m);
      setMenus(mn);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirCrear() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setMostrarForm(true);
  }

  function abrirEditar(r: Rol) {
    setEditandoId(r.id);
    setForm({ nombre: r.nombre, descripcion: r.descripcion ?? '' });
    setMostrarForm(true);
  }

  async function guardar() {
    setError(null);
    try {
      if (editandoId) await rolesApi.actualizar(editandoId, form);
      else await rolesApi.crear(form);
      setMostrarForm(false);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function eliminar(r: Rol) {
    if (!confirm(`¿Inactivar el rol "${r.nombre}"?`)) return;
    setError(null);
    try {
      await rolesApi.eliminar(r.id);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  function alternarExpandido(r: Rol) {
    setExpandidoId(expandidoId === r.id ? null : r.id);
    setModuloParaAsignar('');
    setMenuParaAsignar('');
    setAviso(null);
  }

  async function asignarModulo(rolId: string) {
    if (!moduloParaAsignar) return;
    try {
      await rolesApi.asignarModulo(rolId, moduloParaAsignar);
      setAviso('Módulo vinculado al rol.');
      setModuloParaAsignar('');
      // El árbol de menús vive en la sesión (se resolvió una vez en
      // select-role): si el rol vinculado es el rol activo, se refresca
      // solo para no depender de un re-login para ver el cambio.
      if (sesion?.rol.id === rolId) await refrescarMenus();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function asignarMenu(rolId: string) {
    if (!menuParaAsignar) return;
    try {
      await rolesApi.asignarMenu(rolId, menuParaAsignar);
      setAviso('Menú vinculado al rol.');
      setMenuParaAsignar('');
      if (sesion?.rol.id === rolId) await refrescarMenus();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <section>
      <div className="cabecera-seccion">
        <h1>Roles</h1>
        <button className="boton-primario" onClick={abrirCrear}>
          <i className="bi bi-plus-lg" /> Nuevo rol
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {mostrarForm && (
        <Modal titulo={editandoId ? 'Editar rol' : 'Nuevo rol'} onClose={() => setMostrarForm(false)}>
          <div className="grid-form">
            <label>
              Nombre
              <input
                autoFocus
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </label>
            <label>
              Descripción
              <input
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </label>
          </div>
          <ModalFormFooter
            editando={!!editandoId}
            textoCrear="Crear rol"
            onGuardar={guardar}
            onCancelar={() => setMostrarForm(false)}
          />
        </Modal>
      )}

      {cargando ? (
        <p>Cargando…</p>
      ) : (
        <table className="tabla-admin">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td>{r.nombre}</td>
                  <td>{r.descripcion ?? '—'}</td>
                  <td>
                    <EstadoBadge estado={r.estado} />
                  </td>
                  <AccionesFila onEditar={() => abrirEditar(r)} onEliminar={() => eliminar(r)}>
                    <button onClick={() => alternarExpandido(r)}>
                      <i className="bi bi-diagram-3" /> {expandidoId === r.id ? 'Ocultar' : 'Vincular módulo/menú'}
                    </button>
                  </AccionesFila>
                </tr>
                {expandidoId === r.id && (
                  <tr className="fila-expandida">
                    <td colSpan={4}>
                      {aviso && (
                        <p className="aviso-ok">
                          <i className="bi bi-check-circle" /> {aviso}
                        </p>
                      )}
                      <div className="fila-asignar">
                        <select value={moduloParaAsignar} onChange={(e) => setModuloParaAsignar(e.target.value)}>
                          <option value="">Seleccionar módulo…</option>
                          {modulos.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre}
                            </option>
                          ))}
                        </select>
                        <button disabled={!moduloParaAsignar} onClick={() => asignarModulo(r.id)}>
                          <i className="bi bi-link-45deg" /> Vincular módulo
                        </button>
                      </div>
                      <div className="fila-asignar">
                        <select value={menuParaAsignar} onChange={(e) => setMenuParaAsignar(e.target.value)}>
                          <option value="">Seleccionar menú/item…</option>
                          {menus.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} {m.url ? `(${m.url})` : ''}
                            </option>
                          ))}
                        </select>
                        <button disabled={!menuParaAsignar} onClick={() => asignarMenu(r.id)}>
                          <i className="bi bi-link-45deg" /> Vincular menú
                        </button>
                      </div>
                      <p className="nota-ayuda">
                        <i className="bi bi-info-circle" /> Para asignar/quitar el rol de un usuario, hazlo desde la
                        pantalla de Usuarios.
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
