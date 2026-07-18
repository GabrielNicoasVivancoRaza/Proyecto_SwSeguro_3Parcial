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
import { CreateModuleDto, UpdateModuleDto } from './dto/module.dto';
import { ModulesService } from './modules.service';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  findAll() {
    return this.modulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.modulesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateModuleDto, @CurrentUser() user: AccessTokenPayload) {
    return this.modulesService.create(dto, user.sub);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.modulesService.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.modulesService.remove(id, user.sub);
  }
}
