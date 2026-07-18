# Avance 1 — Base del Proyecto y Modelo de Datos

**Proyecto:** Sistema de Autenticación y Autorización Centralizado (Master Gateway)
**Materia:** Desarrollo de Software Seguro — Parcial III
**Fecha:** 17 de julio de 2026

---

## 1. Objetivo del avance

Dejar lista la **base del microservicio maestro**: estructura del backend, base de
datos, ORM y el modelo de datos relacional completo, cumpliendo desde el primer
commit los principios **Shift-Left** (seguridad desde el diseño) y el
**Patrón de Auditoría y Estado Global** exigido en la especificación.

Objetivos específicos del PDF cubiertos en este avance:

| Objetivo | Estado |
|---|---|
| **OE1** — Modelo relacional con relación M:N Usuarios ↔ Roles | ✅ Completo |
| **OE2** — Menús recursivos en una sola tabla (Adjacency List) | ✅ Completo (modelo de datos) |
| **OE5** — Shift-Left: ORM contra inyección SQL, validación de entradas | ✅ Base implementada |

---

## 2. Stack tecnológico elegido y justificación

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend | **NestJS 11** (TypeScript) | Framework recomendado en el PDF. Trae *guards*, *interceptors* y *pipes* nativos de seguridad, inyección de dependencias y arquitectura modular. |
| ORM | **Prisma 6** | ORM recomendado para NestJS. Todas las consultas son parametrizadas internamente (previene inyección SQL), genera tipos TypeScript y soporta CTE recursivas / consultas jerárquicas. |
| Base de datos | **PostgreSQL 16** (Docker) | Soporte nativo de `WITH RECURSIVE` (CTE) para recorrer el árbol de menús, requisito clave del PDF. |
| Frontend (futuro) | **React** + React Router | SPA con inyección dinámica de rutas en runtime (Parte 4). |

> **Nota sobre Prisma:** npm instaló inicialmente Prisma **v7** (recién liberada),
> que cambió el formato de configuración (`prisma.config.ts` + *driver adapters*)
> y rompe el patrón clásico `url = env("DATABASE_URL")`. Se fijó la versión
> **v6** (estable y documentada) para evitar complejidad innecesaria:
> `npm install @prisma/client@6 && npm install -D prisma@6`.

---

## 3. Estructura creada

```
Proyecto/
├── docker-compose.yml          # PostgreSQL 16 local para desarrollo
├── docs/
│   └── AVANCE_1_...md          # Este documento
└── backend/                    # Microservicio Maestro (NestJS)
    ├── .env                    # Secrets locales (NO se sube al repo)
    ├── .env.example            # Plantilla de variables de entorno
    ├── .gitignore
    ├── prisma/
    │   ├── schema.prisma       # Modelo de datos completo
    │   └── migrations/
    │       └── ..._init/       # Migración inicial (7 tablas)
    └── src/
        ├── main.ts             # Bootstrap + ValidationPipe global
        ├── app.module.ts       # Módulo raíz (ConfigModule + PrismaModule)
        └── prisma/
            ├── prisma.module.ts   # Módulo global de acceso a datos
            └── prisma.service.ts  # PrismaClient + soft delete global
```

---

## 4. Comandos ejecutados

```bash
# 1. Scaffold del proyecto NestJS
npx --yes @nestjs/cli new backend --package-manager npm --skip-git --skip-install

# 2. Instalación de dependencias
cd backend
npm install
npm install @prisma/client@6 @nestjs/config class-validator class-transformer
npm install -D prisma@6

# 3. Levantar la base de datos local
docker compose up -d

# 4. Crear y aplicar la migración inicial (genera también el cliente Prisma)
npx prisma migrate dev --name init

# 5. Verificación
npm run build          # compila sin errores
npm run start          # arranca y conecta a la BD
# GET http://localhost:3000/api  ->  HTTP 200
docker exec master-gateway-db psql -U master -d master_gateway -c "\dt"  # 7 tablas + _prisma_migrations
```

---

## 5. Base de datos con Docker

Archivo [`docker-compose.yml`](../docker-compose.yml): PostgreSQL 16-alpine con
*healthcheck* y volumen persistente `pgdata`.

> **Incidencia real resuelta:** la máquina de desarrollo tiene instancias
> nativas de PostgreSQL en Windows ocupando los puertos **5432 y 5433**, lo que
> provocaba errores `P1000: Authentication failed` (la conexión llegaba al
> Postgres local, no al contenedor). Solución: publicar el contenedor en el
> puerto **5544** del host (`5544:5432`) y actualizar `DATABASE_URL`.

Cadena de conexión (solo en `.env`, nunca en el código):

```
DATABASE_URL="postgresql://master:***@localhost:5544/master_gateway?schema=public"
```

---

## 6. Modelo de datos (`prisma/schema.prisma`)

### 6.1 Patrón de Auditoría y Estado Global

**Todas** las entidades — incluidas las tablas pivote M:N — heredan los campos
obligatorios de la especificación:

| Campo | Tipo | Manejo |
|---|---|---|
| `id` | UUID | Generado por el ORM (`@default(uuid())`) |
| `estado` | Enum `ACTIVO / INACTIVO` | Soft delete: **nunca** se hace DELETE físico |
| `fecha_creacion` | Timestamp | Automático (`@default(now())`), gestionado por el ORM |
| `fecha_actualizacion` | Timestamp | Automático en cada UPDATE (`@updatedAt`) |
| `creado_por` | UUID nullable | Usuario que creó el registro |
| `actualizado_por` | UUID nullable | Último usuario que modificó |

### 6.2 Entidades y relaciones

| Tabla | Descripción |
|---|---|
| `usuarios` | Identidad: email y username únicos, `password_hash` (se llenará con Argon2 en la Parte 2), nombre completo. |
| `roles` | Roles del sistema (ej. Administrador, Vendedor). |
| `usuario_has_roles` | **Pivote M:N** Usuario ↔ Rol, con auditoría propia (permite saber cuándo se otorgó/revocó un rol). |
| `modulos` | Unidades funcionales (ej. Ventas, RRHH, Financiero). |
| `rol_has_modulos` | **Pivote M:N** Rol ↔ Módulo: qué roles ven qué módulos. |
| `menus` | **Una sola tabla** con patrón **Adjacency List**: `parent_id` NULL ⇒ Menú Principal; con valor ⇒ Submenú/Item. `url` solo se llena en **nodos hoja** (Items que enlazan al microservicio destino). Incluye `orden` para el renderizado y FK `modulo_id`. |
| `rol_has_menus` | **Pivote M:N** Rol ↔ Menú: asigna items/submenús específicos a un rol. |

Diagrama lógico de relaciones:

```
usuarios ──< usuario_has_roles >── roles ──< rol_has_modulos >── modulos
                                     │                              │
                                     └──< rol_has_menus >── menus >─┘
                                                             │  ▲
                                                             └──┘ parent_id (recursivo)
```

---

## 7. Medidas de seguridad implementadas (Shift-Left)

1. **Prevención de inyección SQL:** todo acceso a datos pasa por Prisma con
   consultas parametrizadas. No existe ni una consulta SQL concatenada.

2. **Validación/sanitización global de entradas** ([`main.ts`](../backend/src/main.ts)):
   ```ts
   app.useGlobalPipes(new ValidationPipe({
     whitelist: true,            // elimina propiedades no declaradas en DTOs
     forbidNonWhitelisted: true, // rechaza payloads con campos desconocidos
     transform: true,            // fuerza los tipos declarados
   }));
   ```

3. **Soft delete con Global Scope** ([`prisma.service.ts`](../backend/src/prisma/prisma.service.ts)):
   el cliente extendido `prisma.activo` añade automáticamente
   `where: { estado: 'ACTIVO' }` a `findMany`, `findFirst` y `count` de **todos**
   los modelos. Así ningún desarrollador puede filtrar registros inactivos por
   olvido (Nota 2 de la especificación).

4. **Gestión segura de secrets:** credenciales solo en variables de entorno
   (`.env` está en `.gitignore`; se versiona únicamente `.env.example` como
   plantilla). Cero secrets hardcodeados en el código fuente.

---

## 8. Verificación realizada

| Prueba | Resultado |
|---|---|
| `npm run build` | ✅ Compila sin errores |
| `npm run start` + `GET /api` | ✅ HTTP 200, conexión a BD establecida |
| `\dt` en PostgreSQL | ✅ 7 tablas de negocio + `_prisma_migrations` creadas |
| Migración `init` aplicada | ✅ `20260718004638_init` |

---

## 9. Próximos pasos (Avance 2)

- Flujo de autenticación completo: `POST /api/auth/login` (hash **Argon2**,
  mensaje de error genérico, *rate limiting*), **TempToken** → selección de rol
  (`/api/auth/select-role`) → **JWT definitivo** con menor privilegio.
- Refresh token con rotación y revocación, logout y
  `POST /api/internals/validate-token` para los microservicios hijos (Zero Trust).
