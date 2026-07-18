import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMenuDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre!: string;

  @IsUUID('4')
  moduloId!: string;

  /** null / ausente ⇒ Menú Principal; con valor ⇒ Submenú o Item (PDF). */
  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  /** Solo para nodos hoja (Items). Ruta relativa hacia el microservicio destino. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^\/[a-zA-Z0-9\-_/]*$/, {
    message: 'url debe ser una ruta relativa (ej. /ventas/ordenes)',
  })
  url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orden?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icono?: string;
}

export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
