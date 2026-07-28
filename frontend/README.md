# 🛡️ Master Gateway — Sistema de Autenticación y Autorización Centralizado

<div align="center">

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![SonarCloud](https://img.shields.io/badge/SAST-SonarCloud-4E9BCD?style=for-the-badge&logo=sonarcloud&logoColor=white)
![Semgrep](https://img.shields.io/badge/SAST-Semgrep-0B2545?style=for-the-badge&logo=semgrep&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Proyecto Integrador Parcial III — Desarrollo de Software Seguro — ESPE, 2026**

📖 [Documentación por avances](./docs) · 🔁 [Pipeline en Actions](../../actions) · 🌐 [Backend en producción](https://proyecto-swseguro-3parcial.onrender.com/api)

</div>

---

## 📋 Tabla de contenidos

- [Descripción general](#-descripción-general)
- [Diagrama de flujo del sistema](#-diagrama-de-flujo-del-sistema)
- [Arquitectura y stack](#-arquitectura-y-stack)
- [Modelo de datos](#-modelo-de-datos)
- [Flujo de autenticación (Zero Trust)](#-flujo-de-autenticación-zero-trust)
- [Estrategia de ramas](#-estrategia-de-ramas)
- [Pipeline CI/CD](#-pipeline-cicd)
- [Análisis de seguridad estático (SAST)](#-análisis-de-seguridad-estático-sast)
- [API — Endpoints disponibles](#-api--endpoints-disponibles)
- [Seguridad implementada (Shift-Left)](#-seguridad-implementada-shift-left)
- [Estructura del repositorio](#-estructura-del-repositorio)
- [Setup local](#-setup-local)
- [Pruebas automatizadas](#-pruebas-automatizadas)
- [Variables de entorno](#-variables-de-entorno)
- [Secrets requeridos en GitHub](#-secrets-requeridos-en-github)
- [Despliegue](#-despliegue)
- [Documentación por avances](#-documentación-por-avances)

---

## 🌟 Descripción general

**Master Gateway** es el microservicio maestro de identidad de un ecosistema de
microservicios: centraliza la **autenticación**, la **autorización dinámica por
rol** y la **navegación** (menús construidos en tiempo de ejecución), bajo los
principios **Shift-Left Security** (seguridad integrada desde el diseño, no
añadida al final) y **Zero Trust** ("nunca confiar, siempre verificar").

En vez de que cada microservicio del ecosistema implemente su propio login y su
propia tabla de usuarios, todos delegan la identidad en este Master: reciben un
JWT firmado por él y lo validan (directamente contra `/api/internals/validate-token`,
o localmente con la clave pública en un esquema asimétrico) sin mantener su
propia base de datos de usuarios.

| Bloque | Qué resuelve |
|---|---|
| **Backend** (`backend/`) | API REST en NestJS + Prisma + PostgreSQL: identidad, roles, módulos, menú recursivo y emisión/validación de JWT |
| **Frontend** (`frontend/`) | SPA en React: login → selector de rol obligatorio → panel con rutas y sidebar generados 100% desde el JSON que devuelve el backend |
| **Pipeline** (`.github/workflows/`, `scripts/`) | Build, pruebas, SAST (SonarCloud + Semgrep) y despliegue automatizado, con notificaciones a Telegram |

---

## 🖼️ Diagrama de flujo del sistema


![alt text](src/assets/diagrama-flujo.png)

---

## 🏗️ Arquitectura y stack

| Capa | Tecnología | Justificación |
|---|---|---|
| **Backend** | [NestJS 11](https://nestjs.com/) (TypeScript) | Guards, interceptors, pipes y módulos nativos de seguridad; arquitectura modular exigida por el enunciado |
| **ORM** | [Prisma 6](https://www.prisma.io/) | Consultas 100% parametrizadas (sin concatenación SQL), migraciones versionadas, soporta `$queryRaw` con bind params para la CTE recursiva |
| **Base de datos** | PostgreSQL 16 (Docker en local / Render en producción) | Soporte nativo de `WITH RECURSIVE` para el árbol de menús (Adjacency List) |
| **Autenticación** | `@nestjs/jwt` + `argon2` | JWT de doble paso (TempToken → AccessToken) y hash de contraseñas Argon2id |
| **Rate limiting** | `@nestjs/throttler` | 5 intentos/min en login, 30 req/min global |
| **Frontend** | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [React Router 7](https://reactrouter.com/) | SPA con inyección de rutas en tiempo de ejecución (sin rutas hardcodeadas) |
| **Cliente HTTP** | `axios` con interceptores | Adjunta el Bearer token y rota el refresh token automáticamente ante un 401 |
| **CI/CD** | GitHub Actions | Build, tests, SAST y despliegue automatizados (ver [Pipeline CI/CD](#-pipeline-cicd)) |
| **SAST** | SonarCloud + Semgrep | Doble capa de análisis estático (ver [sección dedicada](#-análisis-de-seguridad-estático-sast)) |
| **Notificaciones** | Bot de Telegram | Cada fase del pipeline reporta su estado al grupo del equipo |
| **Despliegue** | Render (Web Service, backend) | Disparado por la **CLI de Render dentro del pipeline**, no por su auto-deploy nativo, para garantizar que el código ya pasó los gates de seguridad |

---

## 🗃️ Modelo de datos

Todas las entidades (incluidas las tablas pivote M:N) heredan el **patrón de
auditoría y estado global** exigido por la especificación:

```prisma
id                  UUID
estado              ACTIVO | INACTIVO   // soft delete — nunca DELETE físico
fecha_creacion      timestamp (auto)
fecha_actualizacion timestamp (auto)
creado_por          UUID nullable
actualizado_por     UUID nullable
```

```
usuarios ──<usuario_has_roles>── roles ──<rol_has_modulos>── modulos
                                    │                            │
                                    └──<rol_has_menus>── menus ──┘
                                                          │  ▲
                                                          └──┘ parent_id (Adjacency List)

refresh_tokens ── usuario_id (rotación + detección de reuso)
```

- **`menus`** implementa el patrón **Adjacency List** en una sola tabla:
  `parent_id = NULL` ⇒ menú principal; con valor ⇒ submenú/ítem. La `url` solo
  se completa en nodos hoja.
- Las 3 tablas pivote (`usuario_has_roles`, `rol_has_modulos`, `rol_has_menus`)
  **no son tablas tontas**: también llevan auditoría completa.

Esquema completo en [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma).

---

## 🔐 Flujo de autenticación (Zero Trust)

```
1. POST /api/auth/login {email, password}
     → Argon2 verifica el hash · mensaje de error GENÉRICO si falla
     → 200 { tempToken (5 min, SIN permisos), roles: [...] }

2. POST /api/auth/select-role {roleId}   Authorization: Bearer <tempToken>
     → Verifica que el usuario POSEA ese rol
     → 200 { accessToken (15 min, SOLO permisos de ese rol), refreshToken, rol }
        ⚠️ Menor privilegio: el token nunca lleva permisos de otros roles
           que el usuario también tenga.

3. GET /api/menus/tree   Authorization: Bearer <accessToken>
     → El rol se lee DEL TOKEN, no lo elige el cliente (Tenant/Rol Isolation)
     → Una sola consulta WITH RECURSIVE resuelve todo el árbol (sin N+1)

4. POST /api/auth/refresh-token {refreshToken}
     → Rotación: el token usado se invalida y se emite uno nuevo
     → Reutilizar un token ya rotado revoca TODAS las sesiones del usuario

5. POST /api/internals/validate-token {token}
     → Endpoint privado para que los microservicios hijos (ej. Ventas)
       validen el JWT sin tener su propia base de datos de usuarios
```

Guard global (`AccessTokenGuard`, registrado como `APP_GUARD`): **todo**
endpoint nuevo exige un AccessToken válido por defecto — las únicas rutas
públicas están marcadas explícitamente con `@Public()` (login, select-role,
refresh, validate-token y el health check).

---

## 🌿 Estrategia de ramas

```
feature/*  ──PR──▶  dev  ──PR──▶  test  ──PR──▶  main
                                              (protegida — solo vía PR)
```

| Rama | Propósito |
|---|---|
| `feature/*` | Una rama por funcionalidad, nace de `dev` |
| `dev` | Integración continua del equipo |
| `test` | QA / staging — código listo para ir a producción |
| `main` | Producción. Solo recibe merges por Pull Request desde `test`. Cada push aquí dispara el pipeline completo |

---

## 🔄 Pipeline CI/CD

Tres workflows en [`.github/workflows/`](./.github/workflows/):

### `ci-cd.yml` — pipeline completo (push a `main`)

```
notify-start ──▶ build-test ──▶ sonarcloud ──▶ sast-avanzado ──▶ deploy
   (Telegram)    (build+tests    (Quality Gate    (Semgrep sobre    (Render CLI,
                  +cobertura)     bloqueante)       el diff .ts)      gated)
```

| Job | Qué hace | Bloquea el pipeline si… |
|---|---|---|
| `notify-start` | Avisa a Telegram que el pipeline inició en `main` | — |
| `build-test` | `npm ci` + `prisma generate` + `nest build` + `jest --coverage` (backend) + build del frontend | El build falla o una prueba falla |
| `sonarcloud` | Analiza calidad y vulnerabilidades conocidas; espera el Quality Gate | El Quality Gate de SonarCloud falla |
| `sast-avanzado` | Corre Semgrep solo sobre los `.ts`/`.py` modificados en el diff | Semgrep reporta hallazgos `ERROR`/`WARNING` |
| `deploy` | Si `RENDER_API_KEY`/`RENDER_SERVICE_ID` existen, instala la Render CLI y ejecuta `render deploys create` | El despliegue falla (el paso se omite limpio si Render aún no está configurado) |

### `pr-checks.yml` — validación temprana (todo Pull Request hacia `dev`/`test`/`main`)

Build + pruebas unitarias en cada PR, antes de llegar a `main` — feedback
inmediato sin esperar al pipeline completo.

### `notify-merges.yml` — aviso de integración (push a `dev` o `test`)

Notifica a Telegram cada merge exitoso hacia esas ramas.

---

## 🕵️ Análisis de seguridad estático (SAST)

Dos capas complementarias, ambas ejecutadas en cada push a `main`:

### 1. SonarCloud — calidad de código y vulnerabilidades conocidas

Configurado en [`sonar-project.properties`](./sonar-project.properties):
code smells, bugs, vulnerabilidades y cobertura de pruebas
(`backend/coverage/lcov.info`). El **Quality Gate es bloqueante**: si no pasa,
el pipeline se detiene antes de llegar al despliegue.

### 2. Semgrep — el "SAST avanzado" del pipeline

[`scripts/sast_ml_scan.py`](./scripts/sast_ml_scan.py) implementa el paso que
el enunciado del proyecto describe como *"Análisis SAST Avanzado (Modelo de
Minería de Datos/ML)"*. En vez de entrenar un modelo desde cero (fuera del
alcance ágil del proyecto, como el propio enunciado reconoce), se usa un
**motor de reglas de seguridad real y gratuito** — Semgrep con los rulesets
`p/security-audit` y `p/owasp-top-ten`, construidos sobre patrones de CWEs —
aplicado únicamente a los archivos `.ts`/`.py` que cambiaron en el commit:

```bash
python scripts/sast_ml_scan.py --base-ref origin/main
# exit 0 → sin hallazgos (seguro)
# exit 1 → hallazgos ERROR/WARNING (bloquea el pipeline)
```

> Verificado contra el diff real del proyecto (39 archivos `.ts`): **0
> hallazgos**, consistente con el uso exclusivo de Prisma parametrizado y la
> ausencia de secrets hardcodeados o `eval`.

---

## 🔌 API — Endpoints disponibles

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Credenciales → TempToken + roles del usuario |
| `POST` | `/api/auth/select-role` | TempToken + `roleId` → AccessToken definitivo |
| `POST` | `/api/auth/refresh-token` | Rotación de tokens con detección de reuso |
| `POST` | `/api/auth/logout` | Revoca todos los refresh tokens del usuario |

### Validación interna (`/api/internals`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/internals/validate-token` | Para microservicios hijos (Zero Trust) — no expone datos sensibles |

### Gestión (`/api/users`, `/api/roles`, `/api/modules`, `/api/menus`)

| Recurso | Endpoints |
|---|---|
| **Usuarios** | `GET` (paginado) · `GET /:id` · `POST` · `PUT /:id` · `DELETE /:id` (soft delete + revoca sesiones) |
| **Roles** | CRUD + `POST/DELETE /:id/users/:userId` · `POST /:id/modules` · `POST /:id/menus` |
| **Módulos** | CRUD estándar |
| **Menús** | CRUD (con validación anti-ciclos en `parent_id`) + `GET /menus/tree` (árbol recursivo vía CTE, según el rol del token) |

Todos los `DELETE` son **soft delete** (`estado = INACTIVO`) — nunca se borra
un registro físicamente.

---

## 🔒 Seguridad implementada (Shift-Left)

| Requisito | Implementación |
|---|---|
| Hash de contraseñas | `argon2` (Argon2id) |
| Validación de contraseñas fuertes | `class-validator`: ≥10 caracteres, mayúscula, minúscula, número y símbolo |
| Prevención de inyección SQL | 100% Prisma parametrizado — la única consulta cruda (`$queryRaw` del árbol de menús) usa `Prisma.sql` con bind params, nunca concatenación |
| Sanitización de entradas | `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) |
| Mensajes de error genéricos | Login nunca revela si falló el email o la contraseña |
| Rate limiting | 5 intentos/min en login, 30 req/min global |
| Menor privilegio | El AccessToken solo lleva los permisos del rol seleccionado |
| Rotación de refresh tokens | Detecta reutilización → revoca todas las sesiones del usuario |
| Zero Trust | Guard global — todo endpoint exige token válido salvo `@Public()` explícito |
| Gestión de secrets | Solo variables de entorno; `.env` en `.gitignore`, `JWT_SECRET` con fail-fast si falta |
| CORS | Restringido a un origen explícito (`FRONTEND_ORIGIN`), nunca `*` |
| Auditoría | `creado_por`/`actualizado_por`/`fecha_*` en todas las entidades, incluidas las tablas pivote |

---

## 📁 Estructura del repositorio

```
Proyecto/
├── .github/workflows/
│   ├── ci-cd.yml              # Pipeline completo (push a main)
│   ├── pr-checks.yml          # Build + tests en cada PR
│   └── notify-merges.yml      # Notificación al mergear a dev/test
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Modelo de datos completo
│   │   ├── migrations/
│   │   └── seed.ts            # Datos de prueba (usuarios, roles, módulos, menús)
│   └── src/
│       ├── main.ts            # Bootstrap, ValidationPipe global, CORS
│       ├── app.module.ts      # Módulo raíz + guards globales
│       ├── auth/               # Login, select-role, refresh, guards Zero Trust
│       ├── users/ roles/ modules/ menus/   # CRUD de cada entidad
│       ├── prisma/            # PrismaService con soft-delete global
│       └── common/            # DTOs compartidos (paginación)
│
├── frontend/
│   └── src/
│       ├── api/                # Cliente axios + funciones por recurso
│       ├── auth/                # AuthContext, storage de sesión, utilidades de menú
│       ├── components/          # DashboardLayout, SidebarMenu, Modal
│       └── pages/
│           ├── LoginPage.tsx / SelectRolePage.tsx
│           ├── HomePage.tsx     # Dashboard con KPIs
│           └── admin/            # Usuarios, Roles, Módulos, Menús (CRUD real)
│
├── scripts/
│   ├── sast_ml_scan.py         # SAST avanzado (Semgrep sobre el diff)
│   └── notify_telegram.py      # Notificaciones del pipeline
│
├── docs/                       # Documentación técnica por avance (AVANCE_1..5)
├── docker-compose.yml           # PostgreSQL local para desarrollo
└── sonar-project.properties     # Configuración de SonarCloud
```

---

## 🛠️ Setup local

### Prerrequisitos

- Node.js 22+
- Docker Desktop (para PostgreSQL local)
- Git

### 1. Base de datos

```bash
docker compose up -d
```

> El contenedor expone Postgres en el puerto **5544** del host (no 5432), para
> no chocar con instancias locales existentes — ver comentario en
> [`docker-compose.yml`](./docker-compose.yml).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # completar JWT_SECRET y DATABASE_URL
npx prisma generate
npx prisma migrate dev
npx prisma db seed          # crea usuarios, roles, módulos y menús de prueba
npm run start:dev
```

Backend disponible en `http://localhost:3000/api`.

**Credenciales sembradas (solo entorno local):**

| Usuario | Contraseña | Roles |
|---|---|---|
| `admin@espe.edu.ec` | `Admin#2026` | Administrador, Vendedor |
| `vendedor@espe.edu.ec` | `Ventas#2026` | Vendedor |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en `http://localhost:5173`.

---

## 🧪 Pruebas automatizadas

```bash
cd backend
npm test          # 19 pruebas unitarias de seguridad
npm run test:cov  # con cobertura (lcov.info para SonarCloud)
```

| Archivo | Qué verifica |
|---|---|
| `users/dto/create-user.dto.spec.ts` | Rechazo de contraseñas débiles, emails inválidos, usernames peligrosos |
| `auth/auth.service.spec.ts` | Mensajes genéricos de login, menor privilegio en `select-role`, detección de reutilización de refresh tokens |
| `menus/menus.service.spec.ts` | Rechazo de referencias cíclicas en `parent_id`, validación de módulo del padre |

---

## ⚙️ Variables de entorno

`backend/.env` (plantilla completa en [`.env.example`](./backend/.env.example)):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5544/master_gateway?schema=public"
PORT=3000
JWT_SECRET="<valor aleatorio ≥ 48 bytes>"
JWT_TEMP_EXPIRES_IN="5m"
JWT_ACCESS_EXPIRES_IN="15m"
REFRESH_TOKEN_DAYS=7
FRONTEND_ORIGIN="http://localhost:5173"
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

---

## 🔑 Secrets requeridos en GitHub

**Settings → Secrets and variables → Actions**

| Secret | Uso | De dónde sale |
|---|---|---|
| `SONAR_TOKEN` | Análisis de SonarCloud | SonarCloud → My Account → Security |
| `TELEGRAM_BOT_TOKEN` | Notificaciones del pipeline | [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Grupo destino de las notificaciones | `getUpdates` de la API de Telegram |
| `RENDER_API_KEY` | Despliegue automático (opcional) | Render → Account Settings → API Keys |
| `RENDER_SERVICE_ID` | Servicio a desplegar (opcional) | URL del dashboard de Render |

Sin `RENDER_API_KEY`/`RENDER_SERVICE_ID` el pipeline igual corre completo — el
job `deploy` se omite limpio en vez de fallar.

---

## 🚀 Despliegue

- **Backend:** Render Web Service. El despliegue se dispara **desde la CLI de
  Render dentro del job `deploy`** del pipeline (no por el auto-deploy nativo
  de Render), para garantizar que el código ya superó SonarCloud y Semgrep
  antes de salir a producción.
- **Base de datos de producción:** PostgreSQL en Render, migrada con
  `prisma migrate deploy` en el arranque del contenedor.
- **Frontend:** opcional como Render Static Site (o Vercel/Netlify), apuntando
  `VITE_API_URL` al backend desplegado y `FRONTEND_ORIGIN` (en el backend) al
  dominio del frontend, para que el CORS lo permita.

---

## 📚 Documentación por avances

El desarrollo completo está documentado paso a paso, con comandos, decisiones
de diseño y verificaciones reales en cada etapa:

| Avance | Contenido |
|---|---|
| [Avance 1](./docs/AVANCE_1_Base_y_Modelo_de_Datos.md) | Base del proyecto y modelo de datos |
| [Avance 2](./docs/AVANCE_2_Autenticacion_y_Tokens.md) | Autenticación, selección de rol y tokens Zero Trust |
| [Avance 3](./docs/AVANCE_3_CRUDs_y_Arbol_de_Menus.md) | CRUDs, asignaciones M:N y árbol de menús recursivo |
| [Avance 4](./docs/AVANCE_4_Frontend_SPA.md) | Frontend SPA: Workspace Selector y rutas dinámicas |
| [Avance 5](./docs/AVANCE_5_DevSecOps.md) | Ramas, pipeline CI/CD, SAST y despliegue |

---

<div align="center">

**Universidad de las Fuerzas Armadas ESPE** · Desarrollo de Software Seguro · Parcial III

</div>
