import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class AssignUserDto {
  @IsUUID('4')
  userId!: string;
}

export class AssignModuleDto {
  @IsUUID('4')
  moduleId!: string;
}

export class AssignMenuDto {
  @IsUUID('4')
  menuId!: string;
}
