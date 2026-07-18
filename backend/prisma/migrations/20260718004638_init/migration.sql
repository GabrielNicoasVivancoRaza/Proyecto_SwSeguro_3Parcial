-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "creado_por" UUID,
    "actualizado_por" UUID,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "creado_por" UUID,
    "actualizado_por" UUID,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_has_roles" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "creado_por" UUID,
    "actualizado_por" UUID,

    CONSTRAINT "usuario_has_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulos" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "creado_por" UUID,
    "actualizado_por" UUID,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_has_modulos" (
    "id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "creado_por" UUID,
    "actualizado_por" UUID,

    CONSTRAINT "rol_has_modulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT,
    "icono" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "modulo_id" UUID NOT NULL,
    "parent_id" UUID,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "creado_por" UUID,
    "actualizado_por" UUID,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_has_menus" (
    "id" UUID NOT NULL,
    "rol_id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "creado_por" UUID,
    "actualizado_por" UUID,

    CONSTRAINT "rol_has_menus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_has_roles_usuario_id_rol_id_key" ON "usuario_has_roles"("usuario_id", "rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "modulos_nombre_key" ON "modulos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "rol_has_modulos_rol_id_modulo_id_key" ON "rol_has_modulos"("rol_id", "modulo_id");

-- CreateIndex
CREATE UNIQUE INDEX "rol_has_menus_rol_id_menu_id_key" ON "rol_has_menus"("rol_id", "menu_id");

-- AddForeignKey
ALTER TABLE "usuario_has_roles" ADD CONSTRAINT "usuario_has_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_has_roles" ADD CONSTRAINT "usuario_has_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_has_modulos" ADD CONSTRAINT "rol_has_modulos_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_has_modulos" ADD CONSTRAINT "rol_has_modulos_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_has_menus" ADD CONSTRAINT "rol_has_menus_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_has_menus" ADD CONSTRAINT "rol_has_menus_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
