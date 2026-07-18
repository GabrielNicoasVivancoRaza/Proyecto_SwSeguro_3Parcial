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
import {
  AssignMenuDto,
  AssignModuleDto,
  AssignUserDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: AccessTokenPayload) {
    return this.rolesService.create(dto, user.sub);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.rolesService.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.rolesService.remove(id, user.sub);
  }

  // ===== Asignaciones M:N =====

  @Post(':id/users')
  assignUser(
    @Param('id', ParseUUIDPipe) rolId: string,
    @Body() dto: AssignUserDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.rolesService.assignUser(rolId, dto.userId, user.sub);
  }

  @Delete(':id/users/:userId')
  unassignUser(
    @Param('id', ParseUUIDPipe) rolId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.rolesService.unassignUser(rolId, userId);
  }

  @Post(':id/modules')
  assignModule(
    @Param('id', ParseUUIDPipe) rolId: string,
    @Body() dto: AssignModuleDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.rolesService.assignModule(rolId, dto.moduleId, user.sub);
  }

  @Post(':id/menus')
  assignMenu(
    @Param('id', ParseUUIDPipe) rolId: string,
    @Body() dto: AssignMenuDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.rolesService.assignMenu(rolId, dto.menuId, user.sub);
  }
}
