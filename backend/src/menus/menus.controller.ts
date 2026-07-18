import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/interfaces/token-payload.interface';
import { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';
import { MenusService } from './menus.service';

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  /**
   * Árbol del rol contenido en el JWT: el cliente NO elige el rol,
   * lo determina el token (Tenant/Rol Isolation a nivel de sesión).
   */
  @Get('tree')
  tree(@CurrentUser() user: AccessTokenPayload) {
    return this.menusService.tree(user.rol.id);
  }

  @Get()
  findAll() {
    return this.menusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.menusService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMenuDto, @CurrentUser() user: AccessTokenPayload) {
    return this.menusService.create(dto, user.sub);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.menusService.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.menusService.remove(id, user.sub);
  }
}
