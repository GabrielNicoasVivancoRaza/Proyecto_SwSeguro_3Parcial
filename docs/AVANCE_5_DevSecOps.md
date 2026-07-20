# Avance 5 — DevSecOps: Ramas, Pipeline CI/CD, SAST y Despliegue

**Proyecto:** Sistema de Autenticación y Autorización Centralizado (Master Gateway)
**Materia:** Desarrollo de Software Seguro — Parcial III
**Fecha:** 20 de julio de 2026

---

## 1. Objetivo del avance

Cerrar el Anexo del PDF ("Requisitos de Infraestructura, CI/CD y DevSecOps"):
estrategia de ramas, pipeline automatizado en GitHub Actions (build → tests →
SonarCloud → SAST avanzado → despliegue), notificaciones a Telegram y
despliegue en un PaaS gratuito disparado por CLI.

Este avance es distinto a los anteriores: en vez de código de aplicación, es
**infraestructura y automatización**. Varias piezas quedan **configuradas y
listas para funcionar**, pero requieren que crees cuentas externas (gratuitas)
y pegues sus credenciales como *Secrets* de GitHub — no hay forma de crear
esas cuentas por ti. Esta guía trae el paso a paso exacto.

---

## 2. Estrategia de ramas — ya implementada

Desde el Avance 3 el repositorio sigue el modelo exigido:

```
feature/xxx  →  dev  →  test  →  main
   (PR)         (PR)      (PR, protegido)
```

- **`main`**: producción. Solo recibe merges vía Pull Request desde `test`.
  **Únicamente los pushes a `main` disparan el pipeline completo** (build,
  SonarCloud, SAST, deploy).
- **`test`**: QA/staging. Recibe PRs desde `dev`.
- **`dev`**: integración de features. Recibe PRs desde `feature/*`.
- **`feature/*`**: una rama por funcionalidad (ej. `feature/frontend-spa`),
  nace de `dev` y vuelve a `dev`.

Los merges hacia `dev` y `test` disparan una notificación a Telegram (sin
pipeline completo); solo `main` ejecuta el pipeline íntegro — así lo pide el
diagrama de secuencia del Anexo (Figura 4).

### Proteger `main` en GitHub (recomendado, manual — 2 minutos)

1. Repositorio → **Settings** → **Branches** → **Add branch ruleset** (o
   *Branch protection rules* en repos clásicos).
2. Rama objetivo: `main`.
3. Activar: *Require a pull request before merging*, *Require status checks
   to pass* (selecciona el check `build-test` de `pr-checks.yml` una vez que
   corra al menos una vez), y opcionalmente *Restrict who can push*.
4. Guardar. Con esto, `main` **solo** acepta cambios por Pull Request — igual
   que pide el PDF ("El código aquí debe ser inmutable excepto mediante Pull
   Requests desde test").

---

## 3. Pipeline CI/CD — archivos creados

```
.github/workflows/
├── ci-cd.yml           # Pipeline completo — dispara con push a main
├── pr-checks.yml        # Build+tests en cada PR hacia dev/test/main (extra)
└── notify-merges.yml    # Notificación Telegram al mergear a dev o test
scripts/
├── sast_ml_scan.py       # "Modelo de Minería de Datos/ML" (Semgrep + CWEs)
└── notify_telegram.py    # Envío de mensajes al bot de Telegram
sonar-project.properties  # Configuración del análisis de SonarCloud
```

> `pr-checks.yml` es un **añadido** sobre lo mínimo pedido: valida cada PR
> hacia `dev`/`test`/`main` (compila y corre las pruebas) para que el
> problema se detecte apenas se abre el PR, no solo hasta llegar a `main`.
> Es coherente con Shift-Left ("fallar lo antes posible") pero no reemplaza
> el pipeline de `main`, que es el que exige el PDF.

### 3.1 Job `build-test` (Fase 1 del Anexo)

`npm ci` + `npx prisma generate` + `npm run build` + `npm run test:cov`
(backend) y build del frontend. Sube la cobertura como artefacto para que
SonarCloud la lea.

### 3.2 Job `sonarcloud` (Fase 2 — Análisis Estático Tradicional)

Corre `SonarSource/sonarqube-scan-action` contra `sonar-project.properties`
y luego `sonarqube-quality-gate-action`, que **bloquea el pipeline si el
Quality Gate falla** (código duplicado, code smells, vulnerabilidades
conocidas, cobertura insuficiente). Notifica éxito/fracaso a Telegram.

### 3.3 Job `sast-avanzado` (Fase 3 — "Modelo de Minería de Datos/ML")

Ver sección 4 — usa [`scripts/sast_ml_scan.py`](../scripts/sast_ml_scan.py).

### 3.4 Job `deploy` (Fase 4 — Despliegue Automático)

Ver sección 6. Detecta automáticamente si los Secrets de Render ya existen;
si no, **omite el despliegue sin romper el pipeline** e imprime cómo
habilitarlo (así el pipeline funciona desde ya para build/tests/Sonar/SAST,
aunque todavía no despliegues a ningún lado).

---

## 4. SAST Avanzado — cómo se resolvió el "Modelo de ML"

El propio Anexo del PDF reconoce que entrenar un modelo desde cero está
fuera del alcance ágil del proyecto y sugiere un **enfoque pragmático**:
*"integrar una herramienta open-source basada en Machine Learning... que
lea los archivos .ts/.py modificados y retorne 0 (seguro) o 1 (vulnerable)"*.

[`scripts/sast_ml_scan.py`](../scripts/sast_ml_scan.py) hace exactamente
eso usando **Semgrep** con los rulesets `p/security-audit` y
`p/owasp-top-ten` (reglas construidas y mantenidas por la comunidad de
seguridad sobre patrones de CWEs — inyección, secrets hardcodeados,
deserialización insegura, etc.) en vez de una red neuronal ad-hoc:

```bash
python scripts/sast_ml_scan.py --base-ref origin/main
```

1. Calcula el diff (`git diff --name-only`) contra la rama base — **solo**
   analiza los `.ts`/`.py` modificados, tal como pide el PDF.
2. Ejecuta Semgrep únicamente sobre esos archivos.
3. Si hay hallazgos de severidad `ERROR`/`WARNING` → **exit code 1**
   (vulnerable, el job falla y detiene el pipeline).
4. Si no hay hallazgos → **exit code 0** (seguro).

**Verificado localmente:** ejecutado contra el diff completo del Avance 2
(39 archivos `.ts`), reportó **0 patrones sospechosos** — es decir, Semgrep
no encontró señales de las vulnerabilidades típicas de OWASP en el código
del Master (consistente con el uso exclusivo de Prisma parametrizado, sin
`eval`, sin secrets hardcodeados).

---

## 5. Notificaciones a Telegram

[`scripts/notify_telegram.py`](../scripts/notify_telegram.py) envía
mensajes vía la API HTTP de Telegram usando `TELEGRAM_BOT_TOKEN` y
`TELEGRAM_CHAT_ID` (Secrets de GitHub, nunca hardcodeados). Si faltan, el
script **no rompe el pipeline** — solo informa que se omitió el aviso.

Eventos cubiertos (los 5 que pide el Anexo):

| Evento del PDF | Workflow que lo dispara |
|---|---|
| Inicio del Pipeline en `main` | `ci-cd.yml` → job `notify-start` |
| Éxito/fracaso del Quality Gate | `ci-cd.yml` → job `sonarcloud` |
| Alerta si el SAST detecta patrones sospechosos | `ci-cd.yml` → job `sast-avanzado` |
| Estado del despliegue (éxito/fallo) | `ci-cd.yml` → job `deploy` |
| Merges exitosos hacia `dev` y `test` | `notify-merges.yml` |

### Cómo crear el bot (paso a paso)

1. En Telegram, busca **@BotFather** y envía `/newbot`.
2. Dale un nombre y un username (debe terminar en `bot`, ej. `mastergateway_ci_bot`).
3. BotFather responde con un **token** (formato `123456:ABC-DEF...`) → ese es
   `TELEGRAM_BOT_TOKEN`.
4. Crea un grupo de Telegram con tu equipo y **agrega el bot** al grupo.
5. Para obtener el `chat_id` del grupo: envía cualquier mensaje al grupo y
   visita `https://api.telegram.org/bot<TOKEN>/getUpdates` en el navegador;
   busca el campo `"chat":{"id": -123456789, ...}` (los IDs de grupo son
   negativos) → ese valor es `TELEGRAM_CHAT_ID`.

---

## 6. Despliegue automático — Render (por CLI, no por webhook)

El PDF es explícito: el despliegue debe dispararse **por la CLI dentro del
pipeline**, no por el auto-deploy nativo del PaaS al detectar un push — así
se garantiza que el código ya pasó SonarCloud y el SAST antes de salir a
producción.

### Pasos para habilitarlo (cuando quieras desplegar de verdad)

1. Crea una cuenta gratuita en [render.com](https://render.com) (puedes
   entrar con tu cuenta de GitHub).
2. **New → Web Service**, conecta el repositorio, configura:
   - Root directory: `backend`
   - Build command: `npm ci && npx prisma generate && npm run build`
   - Start command: `npx prisma migrate deploy && npm run start:prod`
   - Agrega las variables de entorno del backend (`DATABASE_URL`,
     `JWT_SECRET`, etc. — ver [`.env.example`](../backend/.env.example)) en
     la sección *Environment* del servicio.
3. **Importante:** en la configuración del servicio, desactiva
   **Auto-Deploy** (por defecto Render redepliega en cada push; el PDF pide
   que el pipeline sea quien decida cuándo, después de los gates de
   seguridad).
4. Genera una **API Key** personal en Render: Account Settings → API Keys.
5. Copia el **Service ID** del servicio (aparece en la URL del dashboard,
   con el formato `srv-xxxxxxxxxxxx`).
6. Registra en GitHub (ver sección 7) los Secrets `RENDER_API_KEY` y
   `RENDER_SERVICE_ID`.

Con esos dos Secrets presentes, el job `deploy` de `ci-cd.yml` instala la
CLI oficial de Render y ejecuta:

```bash
render deploys create "$RENDER_SERVICE_ID" --wait --confirm --output json
```

Mientras no existan esos Secrets, el job detecta su ausencia y **omite el
paso sin marcar error** — el resto del pipeline (build, tests, SonarCloud,
SAST) funciona igual desde ya.

> **Nota documentada (Anexo, "Limitaciones del PaaS Gratuito"):** el plan
> gratuito de Render duerme tras 15 minutos de inactividad; la primera
> petición tras el reposo puede tardar ~30 segundos. Cuando se integren
> microservicios hijos, deben implementar reintentos (retry) en sus llamadas
> al Master para tolerar ese arranque en frío.

---

## 7. Configurar SonarCloud (paso a paso)

1. Entra a [sonarcloud.io](https://sonarcloud.io) con tu cuenta de GitHub.
2. **+ → Analyze new project**, autoriza SonarCloud sobre tu organización de
   GitHub y selecciona este repositorio.
3. SonarCloud te da un **Organization Key** y un **Project Key**: reemplaza
   los placeholders en [`sonar-project.properties`](../sonar-project.properties):
   ```properties
   sonar.projectKey=tu-organization_Proyecto_SwSeguro_3Parcial
   sonar.organization=tu-organization
   ```
4. My Account → Security → **Generate Token** → cópialo como
   `SONAR_TOKEN`.
5. En el proyecto, configúralo en modo **"Previous version"** o **CI-based
   analysis** (no *Automatic Analysis*), ya que el análisis lo dispara nuestro
   propio workflow, no SonarCloud directamente.

---

## 8. Secrets a registrar en GitHub

**Settings → Secrets and variables → Actions → New repository secret.**

| Secret | De dónde sale |
|---|---|
| `SONAR_TOKEN` | SonarCloud → My Account → Security |
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `TELEGRAM_CHAT_ID` | `getUpdates` del bot (ver sección 5) |
| `RENDER_API_KEY` | Render → Account Settings → API Keys |
| `RENDER_SERVICE_ID` | URL del servicio en el dashboard de Render |

Ninguno de estos valores se escribe jamás en el código fuente — el pipeline
los lee exclusivamente como variables de entorno inyectadas por GitHub
Actions (Gestión Segura de Secrets, sección 6.3 del PDF).

---

## 9. Pruebas unitarias de seguridad agregadas (Shift-Left, OE5)

Antes de este avance el proyecto no tenía pruebas automatizadas — necesarias
para que el job `build-test` (y el Quality Gate de SonarCloud) tengan algo
real que medir. Se agregaron 3 suites, **19 pruebas**, todas verdes:

| Archivo | Qué verifica |
|---|---|
| [`create-user.dto.spec.ts`](../backend/src/users/dto/create-user.dto.spec.ts) | La validación fuerte de contraseñas rechaza entradas débiles/numéricas/cortas y acepta solo las que cumplen mayúscula+minúscula+número+símbolo; rechaza emails inválidos y usernames con caracteres peligrosos (ej. `<script>`). |
| [`auth.service.spec.ts`](../backend/src/auth/auth.service.spec.ts) | Login rechaza usuario inexistente y contraseña incorrecta con el **mismo** mensaje genérico; rechaza usuarios sin roles activos; `select-role` rechaza un rol no asignado (menor privilegio); `refresh` detecta reutilización de tokens y dispara la revocación total; rechaza tokens expirados. |
| [`menus.service.spec.ts`](../backend/src/menus/menus.service.spec.ts) | Un menú no puede ser su propio padre; una referencia cíclica (A→B, B intenta ser padre de A) es rechazada; un `parent_id` válido del mismo módulo se acepta; un padre de otro módulo se rechaza. |

```bash
cd backend
npm run test        # 19/19 passed
npm run test:cov     # genera backend/coverage/lcov.info para SonarCloud
```

---

## 10. Verificación realizada en este avance

| Prueba | Resultado |
|---|---|
| `npm run test` (backend, 3 suites nuevas) | ✅ 19/19 pruebas pasaron |
| `python scripts/sast_ml_scan.py --base-ref <commit>` contra 39 archivos `.ts` reales del proyecto | ✅ 0 hallazgos (ejecuta Semgrep correctamente) |
| `python scripts/notify_telegram.py "..."` sin Secrets configurados | ✅ Se omite sin error (exit 0) — no rompe el pipeline |
| Sintaxis de los 3 workflows YAML | ✅ Revisada manualmente (pendiente de primera ejecución real en GitHub Actions al hacer push) |

> Los workflows de GitHub Actions solo pueden verificarse en ejecución real
> una vez que este código llegue a GitHub — no hay un "modo offline" para
> correr Actions localmente con total fidelidad. La primera vez que se
> pushee a `main`, revisa la pestaña **Actions** del repositorio para
> confirmar que las 4 fases corren en orden.

---

## 11. Estado final del proyecto

Con este avance se completan **todos** los requisitos del PDF:

- ✅ OE1–OE5 (modelo de datos, menús recursivos, login+selección de rol,
  arquitectura Zero Trust, Shift-Left).
- ✅ Backend NestJS + Prisma + PostgreSQL completo (Avances 1–3).
- ✅ Frontend SPA en React con Workspace Selector y rutas dinámicas (Avance 4).
- ✅ Estrategia de ramas `main`/`test`/`dev`/`feature`.
- ✅ Pipeline CI/CD con build, tests, SonarCloud, SAST avanzado, despliegue
  por CLI y notificaciones a Telegram.

**Pendiente de que TÚ hagas** (no es código, son cuentas de terceros):
crear el proyecto en SonarCloud, el bot de Telegram y, si quieres desplegar
de verdad, el servicio en Render — y pegar sus credenciales como Secrets
(secciones 5, 6 y 7 de este documento).
