import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/**
 * Prueba de seguridad unitaria (Shift-Left, OE5): la validación de
 * contraseñas fuertes debe rechazar entradas débiles ANTES de que
 * lleguen al hash Argon2 o a la base de datos.
 */
describe('CreateUserDto (validación de entradas)', () => {
  const base = {
    email: 'usuario@espe.edu.ec',
    username: 'usuario.prueba',
    nombreCompleto: 'Usuario de Prueba',
  };

  async function validarPassword(password: string) {
    const dto = plainToInstance(CreateUserDto, { ...base, password });
    return validate(dto);
  }

  it('rechaza una contraseña puramente numérica y corta', async () => {
    const errores = await validarPassword('12345678');
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza una contraseña sin símbolos ni mayúsculas', async () => {
    const errores = await validarPassword('contraseñalarga123');
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza una contraseña por debajo del mínimo de longitud', async () => {
    const errores = await validarPassword('Ab1#a');
    expect(errores.length).toBeGreaterThan(0);
  });

  it('acepta una contraseña que cumple mayúscula+minúscula+número+símbolo', async () => {
    const errores = await validarPassword('Segura#2026xyz');
    expect(errores).toHaveLength(0);
  });

  it('rechaza un email con formato inválido', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...base,
      email: 'no-es-un-email',
      password: 'Segura#2026xyz',
    });
    const errores = await validate(dto);
    expect(errores.some((e) => e.property === 'email')).toBe(true);
  });

  it('rechaza un username con caracteres no permitidos (sanitización)', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...base,
      username: '<script>alert(1)</script>',
      password: 'Segura#2026xyz',
    });
    const errores = await validate(dto);
    expect(errores.some((e) => e.property === 'username')).toBe(true);
  });
});
