import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SelectRoleDto } from './dto/select-role.dto';
import { TempTokenGuard } from './guards/temp-token.guard';
import type {
  AccessTokenPayload,
  TempTokenPayload,
} from './interfaces/token-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Rate limiting estricto: máximo 5 intentos de login por minuto por IP. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Requiere TempToken en Authorization: Bearer. */
  @Public()
  @UseGuards(TempTokenGuard)
  @Post('select-role')
  @HttpCode(HttpStatus.OK)
  selectRole(@CurrentUser() user: TempTokenPayload, @Body() dto: SelectRoleDto) {
    return this.authService.selectRole(user.sub, dto.roleId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /** Protegido por el guard global: requiere AccessToken válido. */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: AccessTokenPayload) {
    return this.authService.logout(user.sub);
  }
}
