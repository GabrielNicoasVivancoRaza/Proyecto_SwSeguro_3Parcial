import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { modulosApi, rolesApi, usuariosApi, menusApi } from '../api/resources';
import { useAuth } from '../auth/AuthContext';
import { claseIcono, esUrlExterna, itemsDeSesion, tieneAcceso } from '../auth/menuUtils';

interface Kpi {
  clave: string;
  etiqueta: string;
  icono: string;
  colorVar: string;
  colorSuaveVar: string;
  valor: number | null;
}

/**
 * Dashboard general: KPIs reales del propio Master (conteos vía las mismas
 * APIs ya probadas de Usuarios/Roles/Módulos/Menús) + accesos rápidos al
 * menú del rol actual.
 *
 * Cada KPI solo se pide/muestra si el rol tiene ese ítem en su árbol de
 * menú — así un rol sin acceso a Administración nunca ve ni dispara esas
 * llamadas (coherente con el principio de menor privilegio del proyecto).
 */
export default function HomePage() {
  const { sesion } = useAuth();
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [cargandoKpis, setCargandoKpis] = useState(true);

  const menus = sesion?.menus ?? [];
  const items = itemsDeSesion(menus);

  useEffect(() => {
    if (!sesion) return;

    const definiciones: Array<{
      clave: string;
      url: string;
      etiqueta: string;
      icono: string;
      colorVar: string;
      colorSuaveVar: string;
      obtener: () => Promise<number>;
    }> = [
      {
        clave: 'usuarios',
        url: '/admin/usuarios',
        etiqueta: 'Usuarios activos',
        icono: 'bi-people-fill',
        colorVar: '--kpi-usuarios',
        colorSuaveVar: '--kpi-usuarios-suave',
        obtener: async () => (await usuariosApi.listar(1, 1)).meta.total,
      },
      {
        clave: 'roles',
        url: '/admin/roles',
        etiqueta: 'Roles activos',
        icono: 'bi-shield-lock-fill',
        colorVar: '--kpi-roles',
        colorSuaveVar: '--kpi-roles-suave',
        obtener: async () => (await rolesApi.listar()).length,
      },
      {
        clave: 'modulos',
        url: '/admin/modulos',
        etiqueta: 'Módulos activos',
        icono: 'bi-grid-1x2-fill',
        colorVar: '--kpi-modulos',
        colorSuaveVar: '--kpi-modulos-suave',
        obtener: async () => (await modulosApi.listar()).length,
      },
      {
        clave: 'menus',
        url: '/admin/menus',
        etiqueta: 'Ítems de menú',
        icono: 'bi-list-nested',
        colorVar: '--kpi-menus',
        colorSuaveVar: '--kpi-menus-suave',
        obtener: async () => (await menusApi.listar()).length,
      },
    ].filter((d) => tieneAcceso(menus, d.url));

    if (definiciones.length === 0) {
      setCargandoKpis(false);
      return;
    }

    setCargandoKpis(true);
    setKpis(definiciones.map((d) => ({ ...d, valor: null })));

    Promise.allSettled(definiciones.map((d) => d.obtener())).then((resultados) => {
      setKpis(
        definiciones.map((d, i) => ({
          ...d,
          valor: resultados[i].status === 'fulfilled' ? (resultados[i] as PromiseFulfilledResult<number>).value : 0,
        })),
      );
      setCargandoKpis(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion?.rol.id]);

  return (
    <section>
      <div className="cabecera-dashboard">
        <h1>Panel general</h1>
        <p>
          Operando como <strong>{sesion?.rol.nombre}</strong> — esta vista y la navegación se
          construyeron en tiempo de ejecución a partir del menú de este rol.
        </p>
      </div>

      {kpis.length > 0 && (
        <div className="grid-kpi">
          {kpis.map((k) => (
            <div className="tarjeta-kpi" key={k.clave}>
              <div
                className="icono-kpi"
                style={{ background: `var(${k.colorSuaveVar})`, color: `var(${k.colorVar})` }}
              >
                <i className={`bi ${k.icono}`} />
              </div>
              <div className="texto-kpi">
                {cargandoKpis || k.valor === null ? (
                  <span className="valor-kpi cargando">…</span>
                ) : (
                  <span className="valor-kpi">{k.valor}</span>
                )}
                <span className="etiqueta-kpi">{k.etiqueta}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="seccion-titulo">
        <i className="bi bi-grid" /> Accesos rápidos
      </h2>

      {items.length === 0 ? (
        <div className="panel-vacio">Tu rol no tiene ítems de menú asignados todavía.</div>
      ) : (
        <div className="grid-accesos">
          {items.map((item) =>
            esUrlExterna(item.url!) ? (
              <a
                key={item.id}
                href={item.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="tarjeta-acceso"
              >
                <span className="icono-acceso">
                  <i className={`bi bi-${claseIcono(item.icono, 'box-arrow-up-right')}`} />
                </span>
                <span>{item.nombre}</span>
                <i className="bi bi-box-arrow-up-right icono-acceso-externo" />
              </a>
            ) : (
              <Link key={item.id} to={item.url!} className="tarjeta-acceso">
                <span className="icono-acceso">
                  <i className={`bi bi-${claseIcono(item.icono, 'link-45deg')}`} />
                </span>
                <span>{item.nombre}</span>
              </Link>
            ),
          )}
        </div>
      )}
    </section>
  );
}
