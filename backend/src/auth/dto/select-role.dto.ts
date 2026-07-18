import { IsUUID } from 'class-validator';

export class SelectRoleDto {
  @IsUUID('4', { message: 'roleId debe ser un UUID válido' })
  roleId!: string;
}
