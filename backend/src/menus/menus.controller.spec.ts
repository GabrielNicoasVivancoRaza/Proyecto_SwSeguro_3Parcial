import { MenusController } from './menus.controller';
import type { MenusService } from './menus.service';
import type { AccessTokenPayload } from '../auth/interfaces/token-payload.interface';

describe('MenusController', () => {
  let controller: MenusController;
  let service: { [K in keyof MenusService]?: jest.Mock };
  const actor = {
    sub: 'admin1',
    rol: { id: 'rol-vendedor', nombre: 'Vendedor' },
  } as AccessTokenPayload;

  beforeEach(() => {
    service = {
      tree: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new MenusController(service as unknown as MenusService);
  });

  it('tree usa el rol DEL TOKEN, no un parámetro del cliente (Rol Isolation)', () => {
    controller.tree(actor);
    expect(service.tree).toHaveBeenCalledWith('rol-vendedor');
  });

  it('create pasa el DTO y el actor', () => {
    const dto = { nombre: 'Item', moduloId: 'm1' } as never;
    controller.create(dto, actor);
    expect(service.create).toHaveBeenCalledWith(dto, 'admin1');
  });

  it('update pasa id, DTO y actor', () => {
    const dto = { orden: 2 } as never;
    controller.update('menu1', dto, actor);
    expect(service.update).toHaveBeenCalledWith('menu1', dto, 'admin1');
  });

  it('remove pasa id y actor', () => {
    controller.remove('menu1', actor);
    expect(service.remove).toHaveBeenCalledWith('menu1', 'admin1');
  });
});
