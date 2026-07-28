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

  /**
   * Solo para nodos hoja (Items). Dos formas válidas:
   *  - Ruta relativa interna del propio Master (ej. "/ventas/ordenes"),
   *    renderizada por React Router.
   *  - URL absoluta http(s) de un microservicio hijo con frontend propio
   *    (ej. "http://localhost:5174"), que el cliente abre como enlace
   *    externo — nunca como ruta interna.
   * El esquema se restringe explícitamente a http/https: el valor se usa
   * después como `href` en el sidebar, así que aceptar cualquier string
   * abriría la puerta a esquemas peligrosos (ej. "javascript:alert(1)").
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^(\/[a-zA-Z0-9\-_/]*|https?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/[a-zA-Z0-9\-_/%.]*)?)$/, {
    message:
      'url debe ser una ruta relativa (ej. /ventas/ordenes) o una URL http(s) externa (ej. http://localhost:5174)',
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
