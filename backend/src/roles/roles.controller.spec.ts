import { RolesController } from './roles.controller';
import type { RolesService } from './roles.service';
import type { AccessTokenPayload } from '../auth/interfaces/token-payload.interface';

describe('RolesController', () => {
  let controller: RolesController;
  let service: { [K in keyof RolesService]?: jest.Mock };
  const actor = { sub: 'admin1' } as AccessTokenPayload;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      assignUser: jest.fn(),
      unassignUser: jest.fn(),
      assignModule: jest.fn(),
      assignMenu: jest.fn(),
    };
    controller = new RolesController(service as unknown as RolesService);
  });

  it('create pasa el DTO y el actor', () => {
    const dto = { nombre: 'Auditor' } as never;
    controller.create(dto, actor);
    expect(service.create).toHaveBeenCalledWith(dto, 'admin1');
  });

  it('remove pasa id y actor', () => {
    controller.remove('r1', actor);
    expect(service.remove).toHaveBeenCalledWith('r1', 'admin1');
  });

  it('assignUser extrae userId del body y lo pasa junto al rolId/actor', () => {
    controller.assignUser('r1', { userId: 'u1' }, actor);
    expect(service.assignUser).toHaveBeenCalledWith('r1', 'u1', 'admin1');
  });

  it('unassignUser pasa rolId y userId de los params (sin actor: eliminación física)', () => {
    controller.unassignUser('r1', 'u1');
    expect(service.unassignUser).toHaveBeenCalledWith('r1', 'u1');
  });

  it('assignModule extrae moduleId del body', () => {
    controller.assignModule('r1', { moduleId: 'm1' }, actor);
    expect(service.assignModule).toHaveBeenCalledWith('r1', 'm1', 'admin1');
  });

  it('assignMenu extrae menuId del body', () => {
    controller.assignMenu('r1', { menuId: 'mn1' }, actor);
    expect(service.assignMenu).toHaveBeenCalledWith('r1', 'mn1', 'admin1');
  });
});
