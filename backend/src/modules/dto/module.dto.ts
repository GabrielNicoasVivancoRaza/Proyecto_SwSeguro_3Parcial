import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icono?: string;
}

export class UpdateModuleDto extends PartialType(CreateModuleDto) {}
