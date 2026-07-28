import { ModulesController } from './modules.controller';
import type { ModulesService } from './modules.service';
import type { AccessTokenPayload } from '../auth/interfaces/token-payload.interface';

describe('ModulesController', () => {
  let controller: ModulesController;
  let service: { [K in keyof ModulesService]?: jest.Mock };
  const actor = { sub: 'admin1' } as AccessTokenPayload;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new ModulesController(service as unknown as ModulesService);
  });

  it('findAll delega al servicio', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('create pasa el DTO y el actor', () => {
    const dto = { nombre: 'Finanzas' } as never;
    controller.create(dto, actor);
    expect(service.create).toHaveBeenCalledWith(dto, 'admin1');
  });

  it('update pasa id, DTO y actor', () => {
    const dto = { descripcion: 'x' } as never;
    controller.update('m1', dto, actor);
    expect(service.update).toHaveBeenCalledWith('m1', dto, 'admin1');
  });

  it('remove pasa id y actor', () => {
    controller.remove('m1', actor);
    expect(service.remove).toHaveBeenCalledWith('m1', 'admin1');
  });
});
