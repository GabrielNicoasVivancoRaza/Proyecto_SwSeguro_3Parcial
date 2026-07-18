# Avance 3 — CRUDs, Asignaciones M:N y Árbol de Menús Recursivo (CTE)

**Proyecto:** Sistema de Autenticación y Autorización Centralizado (Master Gateway)
**Materia:** Desarrollo de Software Seguro — Parcial III
**Fecha:** 17 de julio de 2026

---

## 1. Objetivo del avance

Completar los **endpoints mínimos** de la tabla de especificación: CRUD de
Usuarios, Roles, Módulos y Menús con soft delete y auditoría, las asignaciones
M:N, y el endpoint `GET /api/menus/tree` que resuelve la jerarquía recursiva
con **CTE (`WITH RECURSIVE`)** en una sola consulta.

| Objetivo | Estado |
|---|---|
| **OE1** — CRUD Usuarios/Roles con tabla pivote M:N | ✅ Completo |
| **OE2** — Menús recursivos: CRUD + árbol jerárquico por rol | ✅ Completo |
| **OE5** — Shift-Left: validación fuerte, ORM parametrizado | ✅ Completo |
| Requisito de **Performance** — sin consultas N+1 | ✅ CTE en 1 consulta |

Dependencia agregada: `@nestjs/mapped-types` (para `PartialType` en los DTOs
de actualización).

---

## 2. Estructura agregada

```
backend/src/
├── common/dto/pagination.dto.ts   # page/limit validados (límite duro 100)
├── users/    # GET(paginado) GET/{id} POST PUT DELETE  → /api/users
├── roles/    # CRUD + /users /modules /menus           → /api/roles
├── modules/  # CRUD                                    → /api/modules
└── menus/    # CRUD + /tree                            → /api/menus
```

Cada dominio sigue el patrón NestJS: `*.module.ts`, `*.controller.ts`
(validación de entrada, extrae el actor del JWT), `*.service.ts` (lógica y
acceso a datos vía Prisma) y `dto/` (class-validator).

**Todos** estos endpoints están protegidos por el guard global Zero Trust del
Avance 2: sin `Authorization: Bearer <AccessToken>` responden 401.

---

## 3. Gestión de Identidad (Usuarios y Roles)

### Usuarios — `/api/users`

| Método | Regla de seguridad/negocio implementada |
|---|---|
| `GET` | Paginación validada (`page`, `limit` ≤ 100). El Global Scope filtra `estado = ACTIVO`. |
| `GET /{id}` | Incluye los roles activos del usuario. **El campo `password_hash` jamás se serializa** (select explícito `USUARIO_PUBLICO`). |
| `POST` | **Validación fuerte de contraseña** (≥10 caracteres, mayúscula, minúscula, número y símbolo), email/username únicos (409 si se repiten), hash **Argon2id**, `creado_por` desde el JWT. |
| `PUT /{id}` | Re-valida unicidad; si llega contraseña nueva se re-hashea; `actualizado_por` automático. |
| `DELETE /{id}` | **Soft delete** (`estado = INACTIVO`) y además **revoca todos los refresh tokens** del usuario en la misma transacción — un usuario eliminado no conserva sesiones vivas (Zero Trust). |

### Roles — `/api/roles`

| Endpoint | Regla implementada |
|---|---|
| `DELETE /roles/{id}` | **Bloqueado con 409** si el rol está asignado a usuarios activos (regla explícita del PDF). |
| `POST /roles/{id}/users` | Asocia usuario↔rol en la pivote **con auditoría propia** (`creado_por`, fechas). Si la asignación existía revocada, se reactiva dejando rastro. |
| `DELETE /roles/{id}/users/{userId}` | **Eliminación FÍSICA** de la fila pivote (única excepción al soft delete, tal como lo dicta la tabla de endpoints). |
| `POST /roles/{id}/modules` | Vincula módulo completo al rol (pivote `rol_has_modulos`). |
| `POST /roles/{id}/menus` | Asigna item/submenú específico al rol (pivote `rol_has_menus`). |

---

## 4. Módulos y Menús

### Módulos — `/api/modules`

CRUD estándar con nombre único. Al inactivar un módulo, **sus menús dejan de
renderizarse automáticamente**: el árbol hace `INNER JOIN modulos ... estado =
'ACTIVO'`, cumpliendo la regla "al inactivar un módulo, sus menús asociados no
deben renderizarse".

### Menús — `/api/menus` (patrón Adjacency List)

| Regla del PDF | Implementación |
|---|---|
| `parent_id` NULL ⇒ Menú Principal; valor ⇒ Submenú/Item | DTO acepta `parentId` opcional; se valida que el padre exista y **pertenezca al mismo módulo**. |
| `url` solo en nodos hoja | `url` opcional con formato de ruta relativa validado por regex (`/ventas/ordenes`). |
| **Crítico:** el nuevo `parent_id` no debe generar bucle infinito | `PUT /menus/{id}` recorre la cadena de ancestros del padre propuesto; si aparece el propio menú → **400 "referencia cíclica"**. También rechaza ser su propio padre. |
| Si se elimina un padre, ignorar los hijos | Soft delete del padre ⇒ la recursión del árbol (que parte de raíces activas) excluye a todos sus descendientes sin tocarlos. |

---

## 5. `GET /api/menus/tree` — la consulta recursiva (CTE)

Requisito **crítico** de la especificación: *"El ORM debe usar CTE para
resolver la recursividad (parent_id)"* + Performance sin N+1.

### Cómo funciona

**Una sola consulta** con `WITH RECURSIVE` vía `prisma.$queryRaw` con
`Prisma.sql`:

```sql
WITH RECURSIVE arbol AS (
  -- Caso base: menús raíz (parent_id IS NULL) del rol, con módulo activo
  SELECT m.* FROM menus m
  JOIN modulos mo   ON mo.id = m.modulo_id AND mo.estado = 'ACTIVO'
  JOIN rol_has_modulos rmo ON rmo.modulo_id = m.modulo_id
                           AND rmo.rol_id = $1 AND rmo.estado = 'ACTIVO'
  JOIN rol_has_menus rm    ON rm.menu_id = m.id
                           AND rm.rol_id = $1 AND rm.estado = 'ACTIVO'
  WHERE m.parent_id IS NULL AND m.estado = 'ACTIVO'
  UNION ALL
  -- Paso recursivo: hijos activos asignados al rol
  SELECT h.* FROM menus h
  JOIN arbol a ON h.parent_id = a.id
  JOIN rol_has_menus rm ON rm.menu_id = h.id
                        AND rm.rol_id = $1 AND rm.estado = 'ACTIVO'
  WHERE h.estado = 'ACTIVO'
)
SELECT ... ORDER BY orden
```

Puntos de seguridad y performance:

1. **El rol NO lo elige el cliente**: se extrae del claim `rol.id` del JWT
   (*Tenant/Rol Isolation*). Es imposible pedir el árbol de otro rol.
2. **Parámetros vinculados**: `${rolId}` en `Prisma.sql` se envía como bind
   parameter (`$1`) — no existe concatenación de strings (prohibida por la
   especificación). Sin superficie de inyección SQL.
3. **Sin N+1**: la base de datos resuelve toda la profundidad en una pasada;
   el servicio solo arma el árbol en memoria (Map de nodos → `hijos[]`,
   agrupado por módulo y ordenado por `orden`).
4. Respuesta lista para el frontend (Avance 4): módulo → menús → submenús →
   items con `url` solo en hojas, para inyectar rutas dinámicas en React Router.

```json
[
  {
    "modulo": { "id": "...", "nombre": "Ventas", "icono": "shopping-cart" },
    "menus": [
      { "nombre": "Ventas", "url": null, "hijos": [
        { "nombre": "Órdenes", "url": null, "hijos": [
          { "nombre": "Crear Orden", "url": "/ventas/ordenes/crear", "hijos": [] },
          { "nombre": "Listar Órdenes", "url": "/ventas/ordenes", "hijos": [] }
        ]},
        { "nombre": "Reportes", "url": "/ventas/reportes", "hijos": [] }
      ]}
    ]
  }
]
```

---

## 6. Verificación realizada (15 pruebas end-to-end)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Login + select-role Administrador | ✅ Token obtenido |
| 2 | `GET /users` paginado | ✅ Sin `passwordHash` en la respuesta |
| 3 | Crear usuario con contraseña débil | ✅ 400 (validación fuerte) |
| 4 | Crear usuario válido | ✅ 201 con `creado_por` del JWT |
| 5 | Email duplicado | ✅ 409 |
| 6 | `PUT /users/{id}` | ✅ `actualizado_por` registrado |
| 7 | Crear rol "Auditor" | ✅ 201 |
| 8 | Asignar rol a usuario (pivote M:N) | ✅ Con auditoría |
| 9 | Eliminar rol con usuarios activos | ✅ 409 bloqueado |
| 10 | Desasignación física + delete lógico del rol | ✅ |
| 11 | Árbol del Administrador | ✅ Solo módulo Administración (4 items) |
| 12 | Árbol del Vendedor | ✅ Solo Ventas, 3 niveles de recursión, `url` solo en hojas |
| 13 | `PUT` de menú creando ciclo (raíz → nieto) | ✅ 400 rechazado |
| 14 | Soft delete del submenú "Órdenes" | ✅ El árbol oculta también a sus 2 hijos |
| 15 | Soft delete de usuario → `GET /{id}` | ✅ 404 (Global Scope) |

---

## 7. Estado del proyecto y próximos pasos

Con este avance, el **backend del Microservicio Maestro cumple todos los
endpoints mínimos** de la especificación (auth, validación interna, usuarios,
roles, módulos, menús y asignaciones).

**Avance 4:** Frontend SPA en React — login → *Workspace Selector* → rutas
inyectadas dinámicamente desde el JSON del árbol (sin rutas hardcodeadas).

**Avance 5:** DevSecOps — ramas `main`/`test`/`dev`, pipeline GitHub Actions
(build + tests, SonarCloud, SAST con modelo ML, despliegue a Railway/Render por
CLI) y notificaciones por bot de Telegram.
