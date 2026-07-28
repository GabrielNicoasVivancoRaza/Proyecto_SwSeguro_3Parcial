import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

describe('Modal', () => {
  it('renderiza el título y el contenido', () => {
    render(
      <Modal titulo="Nuevo usuario" onClose={vi.fn()}>
        <p>contenido del formulario</p>
      </Modal>,
    );
    expect(screen.getByText('Nuevo usuario')).toBeInTheDocument();
    expect(screen.getByText('contenido del formulario')).toBeInTheDocument();
  });

  it('NO cierra al hacer clic dentro de la caja del modal', () => {
    const onClose = vi.fn();
    render(
      <Modal titulo="X" onClose={onClose}>
        <p>contenido</p>
      </Modal>,
    );
    fireEvent.click(screen.getByText('contenido'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cierra al hacer clic directamente sobre el fondo (overlay)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal titulo="X" onClose={onClose}>
        <p>contenido</p>
      </Modal>,
    );
    const overlay = container.querySelector('.modal-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra con la tecla Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal titulo="X" onClose={onClose}>
        <p>contenido</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al hacer clic en el botón de cerrar', () => {
    const onClose = vi.fn();
    render(
      <Modal titulo="X" onClose={onClose}>
        <p>contenido</p>
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
