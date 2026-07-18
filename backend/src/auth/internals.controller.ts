import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ValidateTokenDto } from './dto/validate-token.dto';

/**
 * Endpoint de VALIDACIÓN INTERNA para microservicios hijos (Zero Trust,
 * estrategia a: validación directa contra el Master). No expone datos
 * sensibles: solo confirma validez, userId, rol y permisos.
 */
@Controller('internals')
export class InternalsController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  validateToken(@Body() dto: ValidateTokenDto) {
    return this.authService.validateToken(dto.token);
  }
}
