import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'username solo admite letras, números, punto, guion y guion bajo',
  })
  username!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombreCompleto!: string;

  // Validación fuerte de contraseña (Shift-Left, tabla de endpoints del PDF)
  @IsString()
  @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'La contraseña debe incluir mayúscula, minúscula, número y símbolo',
  })
  password!: string;
}
