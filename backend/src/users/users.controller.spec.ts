import { UsersController } from './users.controller';
import type { UsersService } from './users.service';
import type { AccessTokenPayload } from '../auth/interfaces/token-payload.interface';

describe('UsersController', () => {
  let controller: UsersController;
  let service: { [K in keyof UsersService]?: jest.Mock };
  const actor = { sub: 'admin1' } as AccessTokenPayload;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new UsersController(service as unknown as UsersService);
  });

  it('findAll delega la paginación al servicio', () => {
    const pagination = { page: 2, limit: 10 };
    controller.findAll(pagination);
    expect(service.findAll).toHaveBeenCalledWith(pagination);
  });

  it('findOne delega el id', () => {
    controller.findOne('u1');
    expect(service.findOne).toHaveBeenCalledWith('u1');
  });

  it('create pasa el DTO y el id del actor autenticado (auditoría)', () => {
    const dto = { email: 'a@b.com' } as never;
    controller.create(dto, actor);
    expect(service.create).toHaveBeenCalledWith(dto, 'admin1');
  });

  it('update pasa id, DTO y actor', () => {
    const dto = { nombreCompleto: 'Nuevo' } as never;
    controller.update('u1', dto, actor);
    expect(service.update).toHaveBeenCalledWith('u1', dto, 'admin1');
  });

  it('remove pasa id y actor (soft delete auditable)', () => {
    controller.remove('u1', actor);
    expect(service.remove).toHaveBeenCalledWith('u1', 'admin1');
  });
});
