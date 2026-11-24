/**
 * Vista mensual.
 *
 * Cada celda lleva hasta tres puntos con las categorías de ese día, incluidas
 * las ocurrencias futuras de lo que se repite, que se calculan al vuelo sin
 * guardar nada.
 */

import { useMemo, useState } from 'react';
import Icono from './Icono.jsx';
import ListaDiario, { Vacio } from './ListaDiario.jsx';
import { DIAS_SEMANA, obtenerCategoria } from '../utilidades/constantes.js';
import { ocurrenciasEntre } from '../utilidades/repeticion.js';
import {
  aFechaISO,
  capitalizar,
  etiquetaDia,
  finDelDia,
  formatearMes,
  generarRejillaMes,
  inicioDelDia
} from '../utilidades/fechas.js';
import { momentoEfectivo } from '../utilidades/modelo.js';

export function VistaCalendario({ recordatorios, ...manejadores }) {
  const hoy = new Date();
  const [ano, setAno] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [diaElegido, setDiaElegido] = useState(aFechaISO(hoy));

  const celdas = useMemo(() => generarRejillaMes(ano, mes), [ano, mes]);

  /** Índice de ocurrencias por día para todo el rango visible. */
  const porDia = useMemo(() => {
    if (!celdas.length) return new Map();

    const desde = inicioDelDia(celdas[0].fecha);
    const hasta = finDelDia(celdas[celdas.length - 1].fecha);
    const mapa = new Map();

    recordatorios
      .filter((r) => !r.archivado)
      .forEach((recordatorio) => {
        ocurrenciasEntre(recordatorio, desde, hasta, 60).forEach((fecha) => {
          const clave = aFechaISO(fecha);
          if (!mapa.has(clave)) mapa.set(clave, []);
          // Copia situada en esa fecha, para que la fila muestre la hora de la
          // ocurrencia y no la de la serie original.
          mapa.get(clave).push({
            ...recordatorio,
            fecha: clave,
            hora: `${String(fecha.getHours()).padStart(2, '0')}:${String(
              fecha.getMinutes()
            ).padStart(2, '0')}`,
            pospuestoHasta: null
          });
        });
      });

    return mapa;
  }, [recordatorios, celdas]);

  const delDia = useMemo(
    () => (porDia.get(diaElegido) || []).sort((a, b) => momentoEfectivo(a) - momentoEfectivo(b)),
    [porDia, diaElegido]
  );

  const cambiarMes = (salto) => {
    const referencia = new Date(ano, mes + salto, 1);
    setAno(referencia.getFullYear());
    setMes(referencia.getMonth());
  };

  return (
    <>
      <div className="calendario-barra">
        <h2 className="calendario-mes">{capitalizar(formatearMes(new Date(ano, mes, 1)))}</h2>

        <div className="en-linea" style={{ gap: 'var(--space-1)' }}>
          <button
            type="button"
            className="icono-boton"
            onClick={() => cambiarMes(-1)}
            aria-label="Mes anterior"
          >
            <Icono nombre="chevron-left" />
          </button>
          <button
            type="button"
            className="icono-boton"
            onClick={() => cambiarMes(1)}
            aria-label="Mes siguiente"
          >
            <Icono nombre="chevron-right" />
          </button>
        </div>
      </div>

      <div className="calendario-semana">
        {DIAS_SEMANA.map((dia) => (
          <span key={dia.indice}>{dia.corto}</span>
        ))}
      </div>

      <div className="calendario-rejilla">
        {celdas.map((celda) => {
          const elementos = porDia.get(celda.claveISO) || [];
          const colores = [
            ...new Set(elementos.map((r) => obtenerCategoria(r.categoria).color))
          ].slice(0, 3);

          const clases = [
            'celda',
            celda.delMes ? '' : 'fuera',
            celda.esHoy ? 'hoy' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={celda.claveISO}
              type="button"
              className={clases}
              aria-pressed={diaElegido === celda.claveISO}
              onClick={() => setDiaElegido(celda.claveISO)}
              aria-label={`${celda.fecha.getDate()}, ${elementos.length} recordatorios`}
            >
              <span>{celda.fecha.getDate()}</span>
              <span className="celda-puntos">
                {colores.map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <section className="jornada">
        <h2 className="jornada-titulo">
          {capitalizar(etiquetaDia(new Date(`${diaElegido}T12:00:00`)))}
          <span className="regla" />
          <span>{delDia.length}</span>
        </h2>

        <ListaDiario
          recordatorios={delDia}
          modo="plano"
          vacio={<Vacio titulo="Día libre" texto="No hay nada previsto para este día." />}
          {...manejadores}
        />
      </section>
    </>
  );
}

export default VistaCalendario;
