# Avance 2 — Autenticación, Selección de Rol y Tokens (Zero Trust)

**Proyecto:** Sistema de Autenticación y Autorización Centralizado (Master Gateway)
**Materia:** Desarrollo de Software Seguro — Parcial III
**Fecha:** 17 de julio de 2026

---

## 1. Objetivo del avance

Implementar el **flujo completo de autenticación** del diagrama de secuencia de la
especificación (Figura 1): login clásico → **TempToken** → selección explícita de
rol (*Workspace Selector*) → **JWT definitivo** con menor privilegio, más refresh
tokens con rotación, logout y el endpoint interno de validación para
microservicios hijos.

Objetivos específicos del PDF cubiertos:

| Objetivo | Estado |
|---|---|
| **OE3** — Flujo de login con selección activa de rol | ✅ Completo (backend) |
| **OE4** — Master emite y valida tokens JWT bajo Zero Trust | ✅ Completo |
| **OE5** — Shift-Left: Argon2, validación de entradas, rate limiting | ✅ Completo |

---

## 2. Dependencias agregadas

```bash
npm install argon2 @nestjs/jwt @nestjs/throttler
```

| Paquete | Uso |
|---|---|
| `argon2` | Hash de contraseñas **Argon2id** (algoritmo lento y adaptativo exigido por la especificación; ganador del Password Hashing Competition). |
| `@nestjs/jwt` | Firma y verificación de JWT (HS256 con secret de 48 bytes aleatorios en `.env`). |
| `@nestjs/throttler` | **Rate limiting**: 30 req/min global, **5 intentos/min en login**. |

Variables de entorno nuevas (en `.env`, plantilla en `.env.example`):

```
JWT_SECRET="<48 bytes aleatorios en base64>"
JWT_TEMP_EXPIRES_IN="5m"       # vida del TempToken
JWT_ACCESS_EXPIRES_IN="15m"    # vida corta del AccessToken (Zero Trust)
REFRESH_TOKEN_DAYS=7
```

> El módulo hace **fail-fast**: si `JWT_SECRET` no está definido, la aplicación
> se niega a arrancar (`auth.module.ts`). Jamás existe un secret por defecto.

---

## 3. Modelo de datos agregado

Nueva tabla `refresh_tokens` (migración `20260718010126_refresh_tokens`), con el
patrón de auditoría completo como todas las entidades:

| Campo | Propósito |
|---|---|
| `token_hash` (único) | **Solo se almacena el hash SHA-256** del token — la BD nunca ve el token en claro; un volcado de BD no permite robar sesiones. |
| `usuario_id`, `rol_id` | A quién pertenece la sesión y con qué rol se emitió. |
| `expira_en` | Expiración absoluta (7 días). |
| `revocado` | Marcado en logout y en cada rotación. |
| `reemplazado_por` | UUID del token que lo sustituyó (cadena de rotación auditable). |

---

## 4. Flujo implementado (según Figura 1 del PDF)

```
POST /api/auth/login {email, password}
  └─> valida Argon2 → 200 {tempToken (5 min, sin permisos), roles: [...]}

POST /api/auth/select-role {roleId}   (Authorization: Bearer <tempToken>)
  └─> verifica que el usuario POSEA ese rol (tabla pivote activa)
  └─> 200 {accessToken (15 min, SOLO permisos de ese rol), refreshToken, rol}

POST /api/auth/refresh-token {refreshToken}
  └─> rotación: revoca el usado, emite par nuevo
  └─> si llega un token YA ROTADO → revoca TODAS las sesiones del usuario

POST /api/auth/logout                  (Authorization: Bearer <accessToken>)
  └─> revoca todos los refresh tokens del usuario

POST /api/internals/validate-token {token}
  └─> para microservicios hijos: {valido, userId, rol, permisos} — nada sensible
```

### Estructura de los tokens

**TempToken** (`type: 'temp'`): solo `sub` (id del usuario). **No otorga acceso
a ningún recurso** — únicamente sirve para llamar a `select-role`.

**AccessToken** (`type: 'access'`) — **Principio de Menor Privilegio**:

```json
{
  "sub": "<uuid usuario>",
  "type": "access",
  "rol": { "id": "<uuid>", "nombre": "Vendedor" },
  "permisos": {
    "modulos": ["<solo los ids del rol seleccionado>"],
    "menus": ["<solo los ids del rol seleccionado>"]
  }
}
```

Si el usuario tiene más roles, sus permisos **no viajan** en el token: un token
comprometido solo expone el contexto del rol elegido.

---

## 5. Arquitectura de seguridad (archivos clave)

```
backend/src/auth/
├── auth.module.ts            # JwtModule global + fail-fast del secret
├── auth.controller.ts        # login, select-role, refresh-token, logout
├── internals.controller.ts   # POST /api/internals/validate-token
├── auth.service.ts           # toda la lógica (Argon2, rotación, revocación)
├── guards/
│   ├── access-token.guard.ts # guard GLOBAL Zero Trust (APP_GUARD)
│   └── temp-token.guard.ts   # exclusivo de select-role
├── decorators/
│   ├── public.decorator.ts   # @Public() — excepción explícita y auditable
│   └── current-user.decorator.ts
├── dto/                      # validación de entradas (class-validator)
└── interfaces/token-payload.interface.ts
```

### Decisiones de seguridad y su justificación

1. **Guard global como `APP_GUARD`** (Zero Trust, "validación obligatoria en
   cada endpoint"): todo endpoint que se cree en el futuro exige AccessToken
   **por defecto**, sin que el desarrollador deba recordarlo. Las únicas rutas
   públicas son las del propio flujo de auth, marcadas explícitamente con
   `@Public()` (grep-eable y auditable).

2. **Tokens tipados** (`type: 'temp' | 'access'`): un TempToken jamás pasa el
   guard de recursos y un AccessToken jamás sirve para seleccionar rol.
   Verificado con pruebas (devuelve 401).

3. **Mensaje de error genérico en login** ("Credenciales inválidas"): no se
   revela si falló el email o la contraseña. Además, cuando el usuario no
   existe se verifica contra un hash dummy para **igualar el tiempo de
   respuesta** (mitiga enumeración de usuarios por temporización).

4. **Rate limiting estricto en login** (5/min por IP) contra fuerza bruta,
   como exige la tabla de endpoints del PDF.

5. **Rotación de refresh tokens con detección de reutilización**: cada refresh
   invalida el token usado; si alguien presenta un token ya rotado (señal de
   robo), se revocan **todas** las sesiones del usuario de inmediato
   ("Revocación inmediata si se detecta reutilización" — PDF).

6. **Revalidación en el refresh** (nunca confiar): antes de emitir el nuevo
   par se consulta que el usuario, el rol y la asignación sigan `ACTIVO`.

---

## 6. Datos de prueba (seed)

```bash
npx prisma db seed    # ejecuta prisma/seed.ts (idempotente, usa upserts)
```

| Usuario | Contraseña | Roles |
|---|---|---|
| `admin@espe.edu.ec` | `Admin#2026` | Administrador, Vendedor |
| `vendedor@espe.edu.ec` | `Ventas#2026` | Vendedor |

Módulos: **Administración** (menús Usuarios, Roles, Módulos, Menús) y
**Ventas** (Órdenes → Crear Orden / Listar Órdenes, Reportes — incluye un
submenú intermedio para probar la recursividad del árbol).

---

## 7. Verificación realizada (11 pruebas end-to-end)

| # | Prueba | Resultado |
|---|---|---|
| 0 | Health check público `GET /api` | ✅ 200 |
| 1 | Endpoint protegido sin token | ✅ 401 |
| 2 | Login con contraseña incorrecta | ✅ 401 + mensaje genérico |
| 3 | Login correcto | ✅ TempToken + lista de roles |
| 4 | TempToken usado como AccessToken | ✅ 401 (tipo incorrecto) |
| 5 | `select-role` con rol propio | ✅ 200, JWT definitivo |
| 6 | Payload del JWT | ✅ Solo 1 módulo y 5 menús del rol Vendedor (menor privilegio) |
| 7 | `validate-token` (microservicio hijo) | ✅ `valido=true`, rol y permisos |
| 8 | Rotación de refresh token | ✅ Nuevo par emitido |
| 9 | **Reuso del refresh viejo** | ✅ 401 + revocación de todas las sesiones |
| 10 | Logout | ✅ Tokens revocados |
| 11 | Vendedor solicita rol Administrador | ✅ 403 Forbidden |

---

## 8. Próximos pasos (Avance 3)

- CRUDs completos de **Usuarios, Roles, Módulos y Menús** con soft delete y
  auditoría (`creado_por` / `actualizado_por` desde el JWT).
- Asignaciones M:N (`/api/roles/{id}/users`, `/modules`, `/menus`).
- **`GET /api/menus/tree`**: árbol recursivo del rol del JWT mediante
  **CTE (`WITH RECURSIVE`)** en una sola consulta (sin N+1).
