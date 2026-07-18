/**
 * Seed de datos de desarrollo.
 * Ejecutar con: npx prisma db seed
 *
 * Usuarios de prueba (solo para entorno local):
 *  - admin@espe.edu.ec    / Admin#2026    (roles: Administrador y Vendedor)
 *  - vendedor@espe.edu.ec / Ventas#2026   (rol: Vendedor)
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // ---------- Usuarios ----------
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@espe.edu.ec' },
    update: {},
    create: {
      email: 'admin@espe.edu.ec',
      username: 'admin',
      nombreCompleto: 'Administrador del Sistema',
      passwordHash: await argon2.hash('Admin#2026'),
    },
  });

  const vendedor = await prisma.usuario.upsert({
    where: { email: 'vendedor@espe.edu.ec' },
    update: {},
    create: {
      email: 'vendedor@espe.edu.ec',
      username: 'vendedor',
      nombreCompleto: 'Vendedor de Prueba',
      passwordHash: await argon2.hash('Ventas#2026'),
    },
  });

  // ---------- Roles ----------
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: {
      nombre: 'Administrador',
      descripcion: 'Gestión total del sistema',
      creadoPor: admin.id,
    },
  });

  const rolVendedor = await prisma.rol.upsert({
    where: { nombre: 'Vendedor' },
    update: {},
    create: {
      nombre: 'Vendedor',
      descripcion: 'Operaciones del módulo de Ventas',
      creadoPor: admin.id,
    },
  });

  // ---------- Usuario <-> Rol (M:N) ----------
  const asignaciones: Array<[string, string]> = [
    [admin.id, rolAdmin.id],
    [admin.id, rolVendedor.id],
    [vendedor.id, rolVendedor.id],
  ];
  for (const [usuarioId, rolId] of asignaciones) {
    await prisma.usuarioRol.upsert({
      where: { usuarioId_rolId: { usuarioId, rolId } },
      update: {},
      create: { usuarioId, rolId, creadoPor: admin.id },
    });
  }

  // ---------- Módulos ----------
  const modAdministracion = await prisma.modulo.upsert({
    where: { nombre: 'Administración' },
    update: {},
    create: {
      nombre: 'Administración',
      descripcion: 'Gestión de identidad, módulos y menús',
      icono: 'settings',
      creadoPor: admin.id,
    },
  });

  const modVentas = await prisma.modulo.upsert({
    where: { nombre: 'Ventas' },
    update: {},
    create: {
      nombre: 'Ventas',
      descripcion: 'Módulo de ventas (microservicio hijo futuro)',
      icono: 'shopping-cart',
      creadoPor: admin.id,
    },
  });

  // ---------- Rol <-> Módulo ----------
  const rolModulos: Array<[string, string]> = [
    [rolAdmin.id, modAdministracion.id],
    [rolVendedor.id, modVentas.id],
  ];
  for (const [rolId, moduloId] of rolModulos) {
    await prisma.rolModulo.upsert({
      where: { rolId_moduloId: { rolId, moduloId } },
      update: {},
      create: { rolId, moduloId, creadoPor: admin.id },
    });
  }

  // ---------- Menús (Adjacency List: url solo en nodos hoja) ----------
  async function menu(
    nombre: string,
    moduloId: string,
    parentId: string | null,
    url: string | null,
    orden: number,
  ) {
    const existente = await prisma.menu.findFirst({
      where: { nombre, moduloId, parentId },
    });
    if (existente) return existente;
    return prisma.menu.create({
      data: { nombre, moduloId, parentId, url, orden, creadoPor: admin.id },
    });
  }

  // Módulo Administración
  const mAdminRoot = await menu('Administración', modAdministracion.id, null, null, 1);
  const mUsuarios = await menu('Usuarios', modAdministracion.id, mAdminRoot.id, '/admin/usuarios', 1);
  const mRoles = await menu('Roles', modAdministracion.id, mAdminRoot.id, '/admin/roles', 2);
  const mModulos = await menu('Módulos', modAdministracion.id, mAdminRoot.id, '/admin/modulos', 3);
  const mMenus = await menu('Menús', modAdministracion.id, mAdminRoot.id, '/admin/menus', 4);

  // Módulo Ventas (con submenú intermedio para probar la recursividad)
  const mVentasRoot = await menu('Ventas', modVentas.id, null, null, 1);
  const mOrdenes = await menu('Órdenes', modVentas.id, mVentasRoot.id, null, 1);
  const mCrearOrden = await menu('Crear Orden', modVentas.id, mOrdenes.id, '/ventas/ordenes/crear', 1);
  const mListarOrdenes = await menu('Listar Órdenes', modVentas.id, mOrdenes.id, '/ventas/ordenes', 2);
  const mReportes = await menu('Reportes', modVentas.id, mVentasRoot.id, '/ventas/reportes', 2);

  // ---------- Rol <-> Menú ----------
  const rolMenus: Array<[string, string]> = [
    [rolAdmin.id, mAdminRoot.id],
    [rolAdmin.id, mUsuarios.id],
    [rolAdmin.id, mRoles.id],
    [rolAdmin.id, mModulos.id],
    [rolAdmin.id, mMenus.id],
    [rolVendedor.id, mVentasRoot.id],
    [rolVendedor.id, mOrdenes.id],
    [rolVendedor.id, mCrearOrden.id],
    [rolVendedor.id, mListarOrdenes.id],
    [rolVendedor.id, mReportes.id],
  ];
  for (const [rolId, menuId] of rolMenus) {
    await prisma.rolMenu.upsert({
      where: { rolId_menuId: { rolId, menuId } },
      update: {},
      create: { rolId, menuId, creadoPor: admin.id },
    });
  }

  console.log('Seed completado: 2 usuarios, 2 roles, 2 módulos, 10 menús.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
