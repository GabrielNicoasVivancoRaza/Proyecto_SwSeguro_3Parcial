/** Par de botones Guardar/Cancelar repetido en todos los formularios admin. */
export default function ModalFormFooter({
  editando,
  textoCrear,
  onGuardar,
  onCancelar,
  disabled,
}: {
  editando: boolean;
  textoCrear: string;
  onGuardar: () => void;
  onCancelar: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="acciones-form">
      <button className="boton-primario" onClick={onGuardar} disabled={disabled}>
        <i className="bi bi-check-lg" /> {editando ? 'Guardar cambios' : textoCrear}
      </button>
      <button className="boton-secundario" onClick={onCancelar}>
        Cancelar
      </button>
    </div>
  );
}
