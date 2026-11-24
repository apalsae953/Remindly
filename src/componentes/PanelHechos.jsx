/**
 * Resumen compacto que encabeza el tramo "Hechos".
 *
 * Antes era una pestaña entera de estadísticas; en la práctica eso era una
 * pantalla que se visita una vez. Aquí son tres cifras y un gráfico de siete
 * barras, justo encima de lo que de verdad se quiere ver: lo completado.
 */

import { useMemo } from 'react';
import { aFechaISO, sumarDias } from '../utilidades/fechas.js';

const ETIQUETAS_DIA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function PanelHechos({ historial, recordatorios }) {
  const ultimaSemana = useMemo(() => {
    const dias = [];
    for (let i = 6; i >= 0; i -= 1) {
      const fecha = sumarDias(new Date(), -i);
      const clave = aFechaISO(fecha);
      dias.push({
        clave,
        cuenta: historial.filter((h) => h.dia === clave).length,
        // getDay() da 0 para domingo; se reordena para empezar en lunes.
        etiqueta: ETIQUETAS_DIA[(fecha.getDay() + 6) % 7]
      });
    }
    return dias;
  }, [historial]);

  const maximo = Math.max(1, ...ultimaSemana.map((d) => d.cuenta));
  const totalSemana = ultimaSemana.reduce((suma, dia) => suma + dia.cuenta, 0);
  const hoy = historial.filter((h) => h.dia === aFechaISO(new Date())).length;

  const mejorRacha = useMemo(
    () => recordatorios.reduce((maximoActual, r) => Math.max(maximoActual, r.racha || 0), 0),
    [recordatorios]
  );

  if (!historial.length) return null;

  return (
    <>
      <div className="cifras">
        <div>
          <p className="cifra-valor">{hoy}</p>
          <p className="cifra-rotulo">Hoy</p>
        </div>
        <div>
          <p className="cifra-valor">{totalSemana}</p>
          <p className="cifra-rotulo">Últimos 7 días</p>
        </div>
        <div>
          <p className="cifra-valor">{mejorRacha}</p>
          <p className="cifra-rotulo">Mejor racha</p>
        </div>
      </div>

      <div className="semana" aria-hidden="true">
        {ultimaSemana.map((dia) => (
          <div className="semana-columna" key={dia.clave}>
            <span
              className={`semana-barra ${dia.cuenta ? '' : 'vacia'}`}
              style={{ height: `${Math.max(2, (dia.cuenta / maximo) * 100)}%` }}
            />
            <span className="semana-dia">{dia.etiqueta}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default PanelHechos;
