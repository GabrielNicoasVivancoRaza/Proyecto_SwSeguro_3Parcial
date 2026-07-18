import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Excepción explícita al guard global Zero Trust.
 * Solo debe usarse en los endpoints del flujo de autenticación
 * (login, select-role, refresh, validate-token) y el health check.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
