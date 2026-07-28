import { useEffect, useState } from 'react';
import { mensajeError, modulosApi, type Modulo } from '../../api/resources';
import AccionesFila from '../../components/AccionesFila';
import EstadoBadge from '../../components/EstadoBadge';
import Modal from '../../components/Modal';
import ModalFormFooter from '../../components/ModalFormFooter';

const FORM_VACIO = { nombre: '', descripcion: '', icono: '' };

export default function ModulesPage() {
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
      setModulos(await modulosApi.listar());
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

  function abrirEditar(m: Modulo) {
    setEditandoId(m.id);
    setForm({ nombre: m.nombre, descripcion: m.descripcion ?? '', icono: m.icono ?? '' });
    setMostrarForm(true);
  }

  async function guardar() {
    setError(null);
    try {
      if (editandoId) await modulosApi.actualizar(editandoId, form);
      else await modulosApi.crear(form);
      setMostrarForm(false);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  async function eliminar(m: Modulo) {
    if (!confirm(`¿Inactivar el módulo "${m.nombre}"? Sus menús dejarán de renderizarse.`)) return;
    setError(null);
    try {
      await modulosApi.eliminar(m.id);
      await cargar();
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  return (
    <section>
      <div className="cabecera-seccion">
        <h1>Módulos</h1>
        <button className="boton-primario" onClick={abrirCrear}>
          <i className="bi bi-plus-lg" /> Nuevo módulo
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {mostrarForm && (
        <Modal titulo={editandoId ? 'Editar módulo' : 'Nuevo módulo'} onClose={() => setMostrarForm(false)}>
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
              Ícono (clase de Bootstrap Icons, ej. "cart", "people")
              <input value={form.icono} onChange={(e) => setForm({ ...form, icono: e.target.value })} />
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
            textoCrear="Crear módulo"
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
            {modulos.map((m) => (
              <tr key={m.id}>
                <td>{m.nombre}</td>
                <td>{m.descripcion ?? '—'}</td>
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
