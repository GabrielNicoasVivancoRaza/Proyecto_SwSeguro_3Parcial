import { IsJWT } from 'class-validator';

export class ValidateTokenDto {
  @IsJWT({ message: 'token debe ser un JWT válido' })
  token!: string;
}
