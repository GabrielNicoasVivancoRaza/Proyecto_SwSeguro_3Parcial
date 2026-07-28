import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { AccessTokenPayload, TempTokenPayload } from './interfaces/token-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let service: { [K in keyof AuthService]?: jest.Mock };

  beforeEach(() => {
    service = {
      login: jest.fn(),
      selectRole: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };
    controller = new AuthController(service as unknown as AuthService);
  });

  it('login delega el DTO de credenciales', () => {
    const dto = { email: 'a@b.com', password: 'x' };
    controller.login(dto);
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('selectRole usa el sub del TempToken y el roleId del body', () => {
    const tempUser = { sub: 'u1', type: 'temp' } as TempTokenPayload;
    controller.selectRole(tempUser, { roleId: 'r1' });
    expect(service.selectRole).toHaveBeenCalledWith('u1', 'r1');
  });

  it('refresh delega el refreshToken del body', () => {
    controller.refresh({ refreshToken: 'token-plano' });
    expect(service.refresh).toHaveBeenCalledWith('token-plano');
  });

  it('logout usa el sub del AccessToken (revoca sesiones del usuario autenticado)', () => {
    const user = { sub: 'u1', type: 'access' } as unknown as AccessTokenPayload;
    controller.logout(user);
    expect(service.logout).toHaveBeenCalledWith('u1');
  });
});
