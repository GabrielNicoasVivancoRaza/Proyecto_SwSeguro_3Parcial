import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  /**
   * Health check público (lo requieren los PaaS como Render/Railway).
   * No expone información del sistema.
   */
  @Public()
  @Get()
  health() {
    return { status: 'ok' };
  }
}
