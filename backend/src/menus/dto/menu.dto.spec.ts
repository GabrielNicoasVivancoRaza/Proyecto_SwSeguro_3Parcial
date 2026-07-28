import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMenuDto } from './menu.dto';

/**
 * Prueba de seguridad unitaria (Shift-Left): el campo `url` termina como
 * `href` de un <a> en el frontend (enlaces externos a microservicios hijo
 * con frontend propio, ej. Reservas). Debe aceptar rutas internas y URLs
 * http(s) externas, pero rechazar cualquier otro esquema (ej. "javascript:"),
 * que sería un vector de XSS si se inyectara como enlace.
 */
describe('CreateMenuDto (validación de url)', () => {
  const base = { nombre: 'Dashboard', moduloId: '11111111-1111-4111-8111-111111111111' };

  async function validarUrl(url: string) {
    const dto = plainToInstance(CreateMenuDto, { ...base, url });
    return validate(dto);
  }

  it('acepta una ruta relativa interna', async () => {
    expect(await validarUrl('/ventas/ordenes')).toHaveLength(0);
  });

  it('acepta una URL http externa (microservicio hijo con frontend propio)', async () => {
    expect(await validarUrl('http://localhost:5174')).toHaveLength(0);
  });

  it('acepta una URL https externa con ruta', async () => {
    expect(await validarUrl('https://reservas.midominio.com/dashboard')).toHaveLength(0);
  });

  it('rechaza el esquema "javascript:" (vector de XSS en el href del sidebar)', async () => {
    const errores = await validarUrl('javascript:alert(1)');
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza una ruta que no empieza con "/" ni con http(s)://', async () => {
    const errores = await validarUrl('ventas/ordenes');
    expect(errores.length).toBeGreaterThan(0);
  });
});
