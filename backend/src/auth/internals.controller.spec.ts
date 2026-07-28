import { InternalsController } from './internals.controller';
import type { AuthService } from './auth.service';

describe('InternalsController', () => {
  it('validateToken delega el token del body (endpoint Zero Trust para microservicios hijos)', () => {
    const service = { validateToken: jest.fn() };
    const controller = new InternalsController(service as unknown as AuthService);

    controller.validateToken({ token: 'jwt-a-validar' });

    expect(service.validateToken).toHaveBeenCalledWith('jwt-a-validar');
  });
});
