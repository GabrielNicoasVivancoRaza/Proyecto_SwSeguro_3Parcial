import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EstadoBadge from './EstadoBadge';

describe('EstadoBadge', () => {
  it('muestra el estilo "ok" para ACTIVO', () => {
    render(<EstadoBadge estado="ACTIVO" />);
    expect(screen.getByText('ACTIVO')).toHaveClass('ok');
  });

  it('muestra el estilo "off" para INACTIVO', () => {
    render(<EstadoBadge estado="INACTIVO" />);
    expect(screen.getByText('INACTIVO')).toHaveClass('off');
  });
});
