/**
 * Vista mensual.
 *
 * Cada celda muestra puntos de color con las categorías que hay ese día,
 * incluyendo las ocurrencias futuras de los recordatorios repetitivos, que se
 * calculan al vuelo sin guardar nada.
 */

import { useMemo, useState } from 'react';
import Icono from './Icono.jsx';
import ListaRecordatorios, { EstadoVacio } from './ListaRecordatorios.jsx';
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
import { ordenarRecordatorios } from '../utilidades/modelo.js';

export function VistaCalendario({ recordatorios, ...manejadores }) {
  const hoy = new Date();
  const [ano, setAno] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [diaElegido, setDiaElegido] = useState(aFechaISO(hoy));

  const celdas = useMemo(() => generarRejillaMes(ano, mes), [ano, mes]);

  /**
   * Índice de ocurrencias por día para todo el rango visible.
   * Se recalcula solo al cambiar de mes o al tocar los recordatorios.
   */
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
          // Se guarda una copia situada en esa fecha para que la tarjeta
          // muestre la hora correcta de la ocurrencia, no la de la serie.
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
    () => ordenarRecordatorios(porDia.get(diaElegido) || [], 'fecha'),
    [porDia, diaElegido]
  );

  const cambiarMes = (salto) => {
    const referencia = new Date(ano, mes + salto, 1);
    setAno(referencia.getFullYear());
    setMes(referencia.getMonth());
  };

  const irAHoy = () => {
    setAno(hoy.getFullYear());
    setMes(hoy.getMonth());
    setDiaElegido(aFechaISO(hoy));
  };

  return (
    <>
      <div className="seccion" style={{ marginTop: 16 }}>
        <div className="calendario">
          <div className="calendario-cabecera">
            <button
              type="button"
              className="boton-icono"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
            >
              <Icono nombre="chevron-left" />
            </button>

            <h3>{capitalizar(formatearMes(new Date(ano, mes, 1)))}</h3>

            <button
              type="button"
              className="boton-icono"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
            >
              <Icono nombre="chevron-right" />
            </button>
          </div>

          <div className="calendario-dias-semana">
            {DIAS_SEMANA.map((dia) => (
              <span key={dia.indice}>{dia.corto}</span>
            ))}
          </div>

          <div className="calendario-rejilla">
            {celdas.map((celda) => {
              const elementos = porDia.get(celda.claveISO) || [];
              // Solo se pintan tres puntos como mucho para no ensuciar la celda.
              const colores = [
                ...new Set(elementos.map((r) => obtenerCategoria(r.categoria).color))
              ].slice(0, 3);

              const clases = [
                'celda-dia',
                celda.delMes ? '' : 'fuera',
                celda.esHoy ? 'hoy' : '',
                diaElegido === celda.claveISO ? 'seleccionado' : ''
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={celda.claveISO}
                  type="button"
                  className={clases}
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

          <button
            type="button"
            className="boton secundario ancho"
            style={{ marginTop: 14 }}
            onClick={irAHoy}
          >
            <Icono nombre="calendar-check" />
            Volver a hoy
          </button>
        </div>
      </div>

      <section className="seccion">
        <div className="seccion-titulo">
          <h2>
            <Icono nombre="calendar-day" />
            {capitalizar(etiquetaDia(new Date(`${diaElegido}T12:00:00`)))}
          </h2>
          <span className="contador">{delDia.length}</span>
        </div>

        <ListaRecordatorios
          recordatorios={delDia}
          agrupar={false}
          mostrarFecha={false}
          vacio={<EstadoVacio icono="calendar-check" titulo="Día libre" texto="No hay nada previsto." />}
          {...manejadores}
        />
      </section>
    </>
  );
}

export default VistaCalendario;
