import { AppController } from './app.controller';

describe('AppController', () => {
  it('health responde status ok (usado por el PaaS para health checks)', () => {
    const controller = new AppController();
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
