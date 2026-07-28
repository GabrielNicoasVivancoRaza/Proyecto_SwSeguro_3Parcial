import { Fragment, useEffect, useState } from 'react';
import { mensajeError, rolesApi, usuariosApi, type Rol, type Usuario, type UsuarioDetalle } from '../../api/resources';
import AccionesFila from '../../components/AccionesFila';
import EstadoBadge from '../../components/EstadoBadge';
import Modal from '../../components/Modal';
import ModalFormFooter from '../../components/ModalFormFooter';

const FORM_VACIO = { email: '', username: '', nombreCompleto: '', password: '' };

export default function UsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<UsuarioDetalle | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [rolParaAsignar, setRolParaAsignar] = useState('');

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const res = await usuariosApi.listar(pagina);
      setUsuarios(res.data);
      setTotalPaginas(res.meta.totalPages || 1);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  useEffect(() => {
    rolesApi.listar().then(setRoles).catch(() => {});
  }, []);

  function abrirCrear() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setMostrarForm(true);
  }

  function abrirEditar(u: Usuario) {
    setEditandoId(u.id);
    setForm({ email: u.email, username: u.username, nombreCompleto: u.nombreCompleto, password: '' });
    setMostrarForm(true);
  }

  async function guardar() {
    setError(null);
    try {
      if (editandoId) {
        const payload: Partial<typeof form> = { ...form };
        if (!payload.password) delete payload.password; // no forzar cambio de contraseña al editar
        await usuariosApi.actualizar(editandoId, payload);
      } else {
        await usuariosApi.crear(form);
      }
      setMostrarForm(false);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function eliminar(u: Usuario) {
    if (!confirm(`¿Inactivar al usuario "${u.username}"? Esto también revoca sus sesiones activas.`)) return;
    setError(null);
    try {
      await usuariosApi.eliminar(u.id);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function alternarExpandido(u: Usuario) {
    if (expandidoId === u.id) {
      setExpandidoId(null);
      setDetalle(null);
      return;
    }
    setExpandidoId(u.id);
    setRolParaAsignar('');
    try {
      setDetalle(await usuariosApi.obtener(u.id));
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function asignarRol() {
    if (!detalle || !rolParaAsignar) return;
    try {
      await rolesApi.asignarUsuario(rolParaAsignar, detalle.id);
      setDetalle(await usuariosApi.obtener(detalle.id));
      setRolParaAsignar('');
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function quitarRol(rolId: string) {
    if (!detalle) return;
    try {
      await rolesApi.desasignarUsuario(rolId, detalle.id);
      setDetalle(await usuariosApi.obtener(detalle.id));
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <section>
      <div className="cabecera-seccion">
        <h1>Usuarios</h1>
        <button className="boton-primario" onClick={abrirCrear}>
          <i className="bi bi-plus-lg" /> Nuevo usuario
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {mostrarForm && (
        <Modal titulo={editandoId ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setMostrarForm(false)}>
          <div className="grid-form">
            <label>
              Email
              <input
                type="email"
                autoFocus
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Username
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </label>
            <label>
              Nombre completo
              <input
                value={form.nombreCompleto}
                onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
              />
            </label>
            <label>
              {editandoId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mín. 10 caracteres"
              />
              <small>Debe incluir mayúscula, minúscula, número y símbolo.</small>
            </label>
          </div>
          <ModalFormFooter
            editando={!!editandoId}
            textoCrear="Crear usuario"
            onGuardar={guardar}
            onCancelar={() => setMostrarForm(false)}
          />
        </Modal>
      )}

      {cargando ? (
        <p>Cargando…</p>
      ) : (
        <>
          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Email</th>
                <th>Username</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <Fragment key={u.id}>
                  <tr>
                    <td>{u.email}</td>
                    <td>{u.username}</td>
                    <td>{u.nombreCompleto}</td>
                    <td>
                      <EstadoBadge estado={u.estado} />
                    </td>
                    <AccionesFila onEditar={() => abrirEditar(u)} onEliminar={() => eliminar(u)}>
                      <button onClick={() => alternarExpandido(u)}>
                        <i className="bi bi-people" /> {expandidoId === u.id ? 'Ocultar roles' : 'Ver roles'}
                      </button>
                    </AccionesFila>
                  </tr>
                  {expandidoId === u.id && detalle && (
                    <tr className="fila-expandida">
                      <td colSpan={5}>
                        <strong>Roles asignados:</strong>
                        <div className="chips-roles">
                          {detalle.roles.length === 0 && <span>Sin roles asignados</span>}
                          {detalle.roles.map((r) => (
                            <span key={r.id} className="chip-quitar">
                              {r.nombre}
                              <button onClick={() => quitarRol(r.id)} title="Quitar rol">
                                <i className="bi bi-x" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="fila-asignar">
                          <select
                            value={rolParaAsignar}
                            onChange={(e) => setRolParaAsignar(e.target.value)}
                          >
                            <option value="">Seleccionar rol…</option>
                            {roles
                              .filter((r) => !detalle.roles.some((dr) => dr.id === r.id))
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.nombre}
                                </option>
                              ))}
                          </select>
                          <button onClick={asignarRol} disabled={!rolParaAsignar}>
                            <i className="bi bi-link-45deg" /> Asignar rol
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>

          <div className="paginacion">
            <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              <i className="bi bi-chevron-left" /> Anterior
            </button>
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <button disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
              Siguiente <i className="bi bi-chevron-right" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
