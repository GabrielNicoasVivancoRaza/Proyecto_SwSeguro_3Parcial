import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Global Scope de soft delete (Shift-Left): todas las lecturas filtran
 * automáticamente estado = ACTIVO, para que ningún endpoint pueda
 * exponer registros inactivos por error del desarrollador.
 */
function conFiltroActivo(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { estado: 'ACTIVO', ...args.where };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { estado: 'ACTIVO', ...args.where };
          return query(args);
        },
        async count({ args, query }) {
          args.where = { estado: 'ACTIVO', ...args.where };
          return query(args);
        },
      },
    },
  });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /** Cliente con Global Scope: usar en todas las consultas de negocio. */
  readonly activo = conFiltroActivo(this);

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
