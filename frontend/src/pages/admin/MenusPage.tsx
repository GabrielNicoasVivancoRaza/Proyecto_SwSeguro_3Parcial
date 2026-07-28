import { useEffect, useState } from 'react';
import { mensajeError, menusApi, modulosApi, type MenuPlano, type Modulo } from '../../api/resources';
import AccionesFila from '../../components/AccionesFila';
import EstadoBadge from '../../components/EstadoBadge';
import Modal from '../../components/Modal';
import ModalFormFooter from '../../components/ModalFormFooter';

const FORM_VACIO = { nombre: '', moduloId: '', parentId: '', url: '', orden: 0 };

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuPlano[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const [m, mod] = await Promise.all([menusApi.listar(), modulosApi.listar()]);
      setMenus(m);
      setModulos(mod);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function nombreModulo(id: string) {
    return modulos.find((m) => m.id === id)?.nombre ?? '—';
  }

  function nombrePadre(id: string | null) {
    if (!id) return '— (raíz)';
    return menus.find((m) => m.id === id)?.nombre ?? '—';
  }

  // Solo se puede elegir como padre un menú del MISMO módulo (regla del backend)
  const padresDisponibles = menus.filter(
    (m) => m.moduloId === form.moduloId && m.id !== editandoId,
  );

  function abrirCrear() {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setMostrarForm(true);
  }

  function abrirEditar(m: MenuPlano) {
    setEditandoId(m.id);
    setForm({
      nombre: m.nombre,
      moduloId: m.moduloId,
      parentId: m.parentId ?? '',
      url: m.url ?? '',
      orden: m.orden,
    });
    setMostrarForm(true);
  }

  async function guardar() {
    setError(null);
    try {
      const payload = {
        nombre: form.nombre,
        moduloId: form.moduloId,
        parentId: form.parentId || undefined,
        url: form.url || undefined,
        orden: Number(form.orden),
      };
      if (editandoId) await menusApi.actualizar(editandoId, payload);
      else await menusApi.crear(payload);
      setMostrarForm(false);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function eliminar(m: MenuPlano) {
    if (!confirm(`¿Inactivar el menú "${m.nombre}"? Sus hijos dejarán de renderizarse.`)) return;
    setError(null);
    try {
      await menusApi.eliminar(m.id);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <section>
      <div className="cabecera-seccion">
        <h1>Menús</h1>
        <button className="boton-primario" onClick={abrirCrear}>
          <i className="bi bi-plus-lg" /> Nuevo menú
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {mostrarForm && (
        <Modal titulo={editandoId ? 'Editar menú' : 'Nuevo menú'} onClose={() => setMostrarForm(false)}>
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
              Módulo
              <select
                value={form.moduloId}
                onChange={(e) => setForm({ ...form, moduloId: e.target.value, parentId: '' })}
              >
                <option value="">Seleccionar módulo…</option>
                {modulos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Menú padre (vacío = raíz)
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                disabled={!form.moduloId}
              >
                <option value="">— (raíz)</option>
                {padresDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              URL (solo si es un item hoja)
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="/modulo/ruta"
              />
              <small>Déjalo vacío si este nodo agrupa submenús (no es un ítem final).</small>
            </label>
            <label>
              Orden
              <input
                type="number"
                value={form.orden}
                onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
              />
            </label>
          </div>
          <ModalFormFooter
            editando={!!editandoId}
            textoCrear="Crear menú"
            onGuardar={guardar}
            onCancelar={() => setMostrarForm(false)}
            disabled={!form.moduloId}
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
              <th>Módulo</th>
              <th>Padre</th>
              <th>URL</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {menus.map((m) => (
              <tr key={m.id}>
                <td>{m.nombre}</td>
                <td>{nombreModulo(m.moduloId)}</td>
                <td>{nombrePadre(m.parentId)}</td>
                <td>{m.url ?? '—'}</td>
                <td>
                  <EstadoBadge estado={m.estado} />
                </td>
                <AccionesFila onEditar={() => abrirEditar(m)} onEliminar={() => eliminar(m)} />
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
