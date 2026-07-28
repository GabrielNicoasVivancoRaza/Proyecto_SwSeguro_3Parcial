export default function EstadoBadge({ estado }: { estado: 'ACTIVO' | 'INACTIVO' }) {
  return <span className={`badge-estado ${estado === 'ACTIVO' ? 'ok' : 'off'}`}>{estado}</span>;
}
