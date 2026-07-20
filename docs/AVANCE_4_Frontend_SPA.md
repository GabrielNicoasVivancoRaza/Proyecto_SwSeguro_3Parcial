# Avance 4 — Frontend SPA (React): Workspace Selector y Rutas Dinámicas

**Proyecto:** Sistema de Autenticación y Autorización Centralizado (Master Gateway)
**Materia:** Desarrollo de Software Seguro — Parcial III
**Fecha:** 18 de julio de 2026

---

## 1. Objetivo del avance

Construir el cliente **SPA** que consume el Microservicio Maestro: login
clásico → *Workspace Selector* (selección obligatoria de rol) → navegación
construida **en tiempo de ejecución** a partir del árbol de menús del rol,
sin ninguna ruta hardcodeada en el código fuente.

| Requisito del PDF | Estado |
|---|---|
| **5.3** — Pantalla de Espacio de Trabajo (impide ir directo al dashboard) | ✅ Completo |
| **5.4** — Enrutamiento Basado en Menú (sin rutas hardcodeadas) | ✅ Completo |
| **7.3** — SPA que intercepta el menú e inyecta rutas dinámicamente | ✅ Completo |

---

## 2. Stack y dependencias

| Herramienta | Uso |
|---|---|
| **Vite + React 19 + TypeScript** | Scaffold rápido, tipado estricto compartiendo la forma de los DTOs con el backend. |
| **react-router-dom v7** | Enrutador con inyección de rutas en runtime (`<Route>` generado desde datos, no en código estático). |
| **axios** | Cliente HTTP con interceptores para token y rotación de refresh. |

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install react-router-dom axios
```

---

## 3. Estructura creada

```
frontend/src/
├── api/client.ts              # axios + interceptores (Bearer, refresh 401)
├── auth/
│   ├── types.ts                # Rol, NodoMenu, LoginPendiente, Sesion
│   ├── storage.ts              # sessionStorage (no localStorage)
│   └── AuthContext.tsx         # login, seleccionarRol, logout
├── components/
│   ├── SidebarMenu.tsx         # render RECURSIVO del árbol de menús
│   └── DashboardLayout.tsx     # shell protegido + sidebar + logout
├── pages/
│   ├── LoginPage.tsx
│   ├── SelectRolePage.tsx      # Workspace Selector
│   ├── HomePage.tsx
│   └── DynamicPage.tsx         # página genérica para cada item del menú
└── App.tsx                     # arma <Route> a partir del JSON del menú
```

---

## 4. Flujo implementado (según Figura 1 y sección 5.3 del PDF)

```
1. LoginPage      → POST /auth/login       → { tempToken, roles[] }
                     (el TempToken vive SOLO en memoria de React;
                      NUNCA se persiste en sessionStorage)

2. SelectRolePage → POST /auth/select-role  → { accessToken, refreshToken, rol }
                  → GET  /menus/tree        → árbol del rol elegido
                     (ambas llamadas encadenadas antes de guardar la sesión)

3. guardarSesion()  → sessionStorage: { accessToken, refreshToken, rol, menus }

4. App.tsx aplana el árbol → genera un <Route> por cada nodo hoja (con url)
                            → DashboardLayout + SidebarMenu se renderizan
                              recorriendo el árbol completo (recursión)
```

Ningún componente decide "a dónde puede ir el usuario": esa decisión ya
viene resuelta desde el backend en el JSON de `/menus/tree`.

---

## 5. Decisiones de seguridad y su justificación

1. **El TempToken jamás se persiste** ([AuthContext.tsx](../frontend/src/auth/AuthContext.tsx)):
   vive en un `useState` de React. Si el usuario recarga la página a mitad
   del flujo de selección de rol, se pierde y debe volver a loguearse — no
   queda una credencial de bajo compromiso dando vueltas en el disco.

2. **Sesión en `sessionStorage`, no `localStorage`**
   ([storage.ts](../frontend/src/auth/storage.ts)): la sesión completa
   (incluido el refresh token) desaparece al cerrar la pestaña, acotando la
   ventana de exposición si el dispositivo es compartido.

3. **Interceptor de refresco con un solo reintento**
   ([client.ts](../frontend/src/api/client.ts)): ante un 401 se intenta
   rotar el refresh token exactamente una vez (`_reintentado` evita bucles
   infinitos); si también falla, se limpia la sesión y se redirige a
   `/login`. Las rutas del propio flujo de auth (`/auth/*`) se excluyen del
   reintento para no enmascarar errores de credenciales como si fueran de
   expiración.

4. **Guard de rutas en el cliente además del backend** (Defensa en
   profundidad): `DashboardLayout` redirige a `/login` si no hay `sesion`, y
   `LoginPage`/`SelectRolePage` redirigen hacia adelante si ya existe una
   sesión completa — el flujo no se puede saltar navegando por URL directa.
   Esto es una capa de UX; el control real sigue siendo el guard Zero Trust
   del backend (Avance 2), que rechaza cualquier petición sin AccessToken
   válido independientemente de lo que haga el cliente.

5. **CORS restringido** ([main.ts](../backend/src/main.ts)): el backend
   solo acepta el origen `http://localhost:5173` (configurable por
   `FRONTEND_ORIGIN`), con métodos y headers explícitos — nunca `origin: '*'`.

6. **Rutas fuera del menú del rol no existen para esa sesión**: `App.tsx`
   solo registra `<Route>` para las urls presentes en el árbol devuelto por
   el backend; cualquier otra ruta cae en un catch-all que redirige al
   inicio. Combinado con que el backend ya filtra los permisos por rol
   (Avance 2/3), esto refuerza visualmente el Principio de Menor Privilegio.

---

## 6. Verificación realizada

| Prueba | Resultado |
|---|---|
| `npm run build` (`tsc -b && vite build`) | ✅ Sin errores de tipos |
| `npm run dev` → `GET http://localhost:5173/` | ✅ HTTP 200, `<title>Master Gateway</title>` |
| Backend con `Origin: http://localhost:5173` | ✅ HTTP 200 + header `Access-Control-Allow-Origin` |
| Preflight `OPTIONS /auth/select-role` (con `Authorization` en headers solicitados) | ✅ HTTP 204, `Allow-Methods: GET,POST,PUT,DELETE`, `Allow-Headers: Content-Type,Authorization` |

---

## 7. Próximos pasos (Avance 5 — DevSecOps)

- Pipeline `.github/workflows/ci-cd.yml`: build + tests → SonarCloud (Quality
  Gate) → SAST con modelo ML sobre `.ts` → despliegue por CLI a Railway/Render.
- Notificaciones a Telegram en cada fase del pipeline.
- Documentar la estrategia de ramas ya vigente (`main` / `test` / `dev` /
  `feature/*`) y proteger `main` para aceptar solo Pull Requests desde `test`.
