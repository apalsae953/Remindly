/**
 * Editor de la regla de repetición.
 *
 * La versión anterior escondía casi todo detrás de un chip llamado "A medida",
 * así que cosas tan normales como "cada 3 días" o "tres veces al día" no se
 * veían. Aquí no hay nada oculto: se elige la frecuencia de una lista con su
 * explicación, se ajusta con un contador y se añaden tantas horas del día como
 * se quieran.
 *
 * Al final siempre se enseña cómo queda la serie con días y horas reales. Ver
 * tres fechas concretas explica una repetición mejor que cualquier texto.
 */

import { useMemo, useState } from 'react';
import Icono from './Icono.jsx';
import {
  DIAS_SEMANA,
  FRANJAS_HORARIAS,
  FRECUENCIAS,
  REPARTOS_HORAS,
  UNIDAD_FRECUENCIA
} from '../utilidades/constantes.js';
import {
  descripcionCompleta,
  horaAMinutos,
  horasDelDia,
  normalizarRepeticion,
  previsualizarOcurrencias
} from '../utilidades/repeticion.js';
import { deFechaISO, esHoy, etiquetaDia } from '../utilidades/fechas.js';

/** Quita el cero de delante: "09:00" se lee mejor como "9:00". */
function horaLegible(hora) {
  return String(hora).replace(/^0/, '');
}

/**
 * De las horas elegidas, la que toca ahora.
 *
 * Si el recordatorio es de hoy se coge la primera que aún no haya pasado:
 * añadir una toma a las 7:30 por la tarde no debería dejar el recordatorio
 * marcado como atrasado. Cualquier otro día se empieza por la primera.
 */
function primeraQueQueda(horas, fechaISO) {
  const dia = deFechaISO(fechaISO);
  if (!dia || !esHoy(dia)) return horas[0];

  const ahora = new Date();
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  return horas.find((hora) => horaAMinutos(hora) > minutos) || horas[0];
}

export function EditorRepeticion({
  valor,
  fechaBase,
  horaBase = '09:00',
  todoElDia = false,
  alCambiar,
  alCambiarHora
}) {
  const repeticion = normalizarRepeticion(valor);
  const [horaNueva, setHoraNueva] = useState('');

  const activa = repeticion.tipo !== 'ninguna';
  const unidad = UNIDAD_FRECUENCIA[repeticion.tipo];
  const horas = horasDelDia(repeticion, horaBase);

  /* Los cambios se envían como función: si se toca varias veces muy seguido,
     cada pulsación parte del valor real y no de uno ya repintado. */
  const cambiar = (cambios) =>
    alCambiar((previa) => ({ ...normalizarRepeticion(previa), ...cambios }));

  const cambiarFin = (cambios) =>
    alCambiar((previa) => {
      const actual = normalizarRepeticion(previa);
      return { ...actual, fin: { ...actual.fin, ...cambios } };
    });

  /** Al cambiar de frecuencia se rellena lo que ese tipo necesita. */
  const elegirFrecuencia = (id) => {
    if (id === 'semanal') {
      // Arranca marcando el día de la semana de la propia fecha elegida.
      const base = deFechaISO(fechaBase) || new Date();
      cambiar({ tipo: 'semanal', intervalo: 1, diasSemana: [base.getDay()] });
      return;
    }
    if (id === 'horas') {
      // Por reloj las horas del día no pintan nada: manda el intervalo.
      cambiar({ tipo: 'horas', intervalo: 2, horas: [], franja: null });
      return;
    }
    cambiar({ tipo: id, intervalo: 1 });
  };

  const ajustarIntervalo = (delta) =>
    alCambiar((previa) => {
      const actual = normalizarRepeticion(previa);
      const tope = UNIDAD_FRECUENCIA[actual.tipo]?.maximo || 99;
      const siguiente = Math.min(tope, Math.max(1, actual.intervalo + delta));
      return { ...actual, intervalo: siguiente };
    });

  const alternarDia = (indice) =>
    alCambiar((previa) => {
      const actual = normalizarRepeticion(previa);
      const dias = actual.diasSemana.includes(indice)
        ? actual.diasSemana.filter((d) => d !== indice)
        : [...actual.diasSemana, indice];
      // Dejarlo sin ningún día marcado no significaría nada: se conserva uno.
      return { ...actual, diasSemana: dias.length ? dias : actual.diasSemana };
    });

  /**
   * Guarda la lista de horas del día y coloca el recordatorio en la que toca.
   * Con una sola hora se deja la lista vacía: así manda el campo "Hora" del
   * formulario y los dos valores no pueden contradecirse.
   */
  const guardarHoras = (lista) => {
    const limpia = [...new Set(lista)].sort();
    if (!limpia.length) return;
    cambiar({ horas: limpia.length > 1 ? limpia : [] });
    alCambiarHora?.(primeraQueQueda(limpia, fechaBase));
  };

  const anadirHora = () => {
    if (!/^\d{2}:\d{2}$/.test(horaNueva)) return;
    guardarHoras([...horas, horaNueva]);
    setHoraNueva('');
  };

  const quitarHora = (hora) => {
    if (horas.length <= 1) return;
    guardarHoras(horas.filter((h) => h !== hora));
  };

  const aplicarReparto = (lista) => guardarHoras(lista);

  // La previsualización se calcula sobre un recordatorio de mentira que tiene
  // justo lo que el motor necesita.
  const vistaPrevia = useMemo(
    () =>
      previsualizarOcurrencias(
        { fecha: fechaBase, hora: horaBase, repeticion },
        4,
        todoElDia ? 1 : 8
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fechaBase, horaBase, todoElDia, JSON.stringify(repeticion)]
  );

  const franjaActiva = FRANJAS_HORARIAS.find((f) =>
    f.franja
      ? repeticion.franja?.desde === f.franja.desde && repeticion.franja?.hasta === f.franja.hasta
      : !repeticion.franja
  );

  return (
    <>
      <span className="campo-rotulo">Cada cuánto</span>

      <div className="frecuencias">
        {FRECUENCIAS.map((frecuencia) => (
          <button
            key={frecuencia.id}
            type="button"
            className="frecuencia"
            aria-pressed={repeticion.tipo === frecuencia.id}
            onClick={() => elegirFrecuencia(frecuencia.id)}
          >
            <span className="frecuencia-nombre">{frecuencia.nombre}</span>
            <span className="frecuencia-ayuda">{frecuencia.ayuda}</span>
          </button>
        ))}
      </div>

      {activa ? (
        <>
          {/* Contador del intervalo: "Cada 3 días" */}
          <div className="contador">
            <span className="contador-rotulo">Cada</span>

            <button
              type="button"
              className="contador-paso"
              onClick={() => ajustarIntervalo(-1)}
              disabled={repeticion.intervalo <= 1}
              aria-label="Reducir"
            >
              <Icono nombre="minus" />
            </button>

            <input
              type="number"
              className="contador-valor"
              min="1"
              max={unidad?.maximo || 99}
              value={repeticion.intervalo}
              aria-label={`Cada cuántos ${unidad?.plural || ''}`}
              onChange={(e) => cambiar({ intervalo: Number(e.target.value) || 1 })}
            />

            <button
              type="button"
              className="contador-paso"
              onClick={() => ajustarIntervalo(1)}
              disabled={repeticion.intervalo >= (unidad?.maximo || 99)}
              aria-label="Aumentar"
            >
              <Icono nombre="plus" />
            </button>

            <span className="contador-unidad">
              {repeticion.intervalo === 1 ? unidad?.singular : unidad?.plural}
            </span>
          </div>

          {/* Días concretos de la semana */}
          {repeticion.tipo === 'semanal' ? (
            <div className="dias">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.indice}
                  type="button"
                  className="dia"
                  aria-pressed={repeticion.diasSemana.includes(dia.indice)}
                  onClick={() => alternarDia(dia.indice)}
                  aria-label={dia.nombre}
                >
                  {dia.corto}
                </button>
              ))}
            </div>
          ) : null}

          {/* Día del mes */}
          {repeticion.tipo === 'mensual' ? (
            <div className="chips">
              <button
                type="button"
                className="chip"
                aria-pressed={!repeticion.diaMes}
                onClick={() => cambiar({ diaMes: null })}
              >
                El mismo día
              </button>
              {[1, 15, 28].map((dia) => (
                <button
                  key={dia}
                  type="button"
                  className="chip"
                  aria-pressed={repeticion.diaMes === dia}
                  onClick={() => cambiar({ diaMes: dia })}
                >
                  El {dia}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                aria-pressed={Boolean(repeticion.diaMes) && ![1, 15, 28].includes(repeticion.diaMes)}
                onClick={() => cambiar({ diaMes: 10 })}
              >
                Otro
              </button>
            </div>
          ) : null}

          {repeticion.tipo === 'mensual' && repeticion.diaMes ? (
            <input
              type="number"
              className="entrada"
              style={{ marginTop: 'var(--space-3)' }}
              min="1"
              max="31"
              value={repeticion.diaMes}
              aria-label="Día del mes"
              onChange={(e) => cambiar({ diaMes: Number(e.target.value) || 1 })}
            />
          ) : null}

          {/* Franja horaria de la repetición por horas */}
          {repeticion.tipo === 'horas' ? (
            <>
              <span className="campo-rotulo" style={{ marginTop: 'var(--space-4)' }}>
                Solo dentro de
              </span>
              <div className="chips deslizable">
                {FRANJAS_HORARIAS.map((opcion) => (
                  <button
                    key={opcion.nombre}
                    type="button"
                    className="chip"
                    aria-pressed={franjaActiva?.nombre === opcion.nombre}
                    onClick={() => cambiar({ franja: opcion.franja })}
                  >
                    {opcion.nombre}
                  </button>
                ))}
              </div>

              {repeticion.franja ? (
                <div className="fila-campos" style={{ marginTop: 'var(--space-3)' }}>
                  <input
                    type="time"
                    className="entrada"
                    value={repeticion.franja.desde}
                    aria-label="Desde"
                    onChange={(e) =>
                      cambiar({ franja: { ...repeticion.franja, desde: e.target.value } })
                    }
                  />
                  <input
                    type="time"
                    className="entrada"
                    value={repeticion.franja.hasta}
                    aria-label="Hasta"
                    onChange={(e) =>
                      cambiar({ franja: { ...repeticion.franja, hasta: e.target.value } })
                    }
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {/* Horas del día: lo que permite "cada 2 días a las 9, 15 y 21" */}
          {repeticion.tipo !== 'horas' && !todoElDia ? (
            <>
              <span className="campo-rotulo" style={{ marginTop: 'var(--space-4)' }}>
                A qué horas
              </span>

              <div className="horas-lista">
                {horas.map((hora) => (
                  <span className="hora-marca" key={hora}>
                    {horaLegible(hora)}
                    {horas.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => quitarHora(hora)}
                        aria-label={`Quitar las ${horaLegible(hora)}`}
                      >
                        <Icono nombre="xmark" />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>

              <div className="fila-campos">
                <input
                  type="time"
                  className="entrada"
                  value={horaNueva}
                  aria-label="Otra hora del día"
                  onChange={(e) => setHoraNueva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      anadirHora();
                    }
                  }}
                />
                <button
                  type="button"
                  className="boton contorno"
                  style={{ flex: '0 0 auto' }}
                  onClick={anadirHora}
                  disabled={!/^\d{2}:\d{2}$/.test(horaNueva)}
                >
                  <Icono nombre="plus" />
                  Añadir
                </button>
              </div>

              <div className="chips deslizable" style={{ marginTop: 'var(--space-3)' }}>
                {REPARTOS_HORAS.map((reparto) => (
                  <button
                    key={reparto.nombre}
                    type="button"
                    className="chip"
                    aria-pressed={
                      horas.length === reparto.horas.length &&
                      horas.every((h, i) => h === reparto.horas[i])
                    }
                    onClick={() => aplicarReparto(reparto.horas)}
                  >
                    {reparto.nombre} al día
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {/* Hasta cuándo */}
          <span className="campo-rotulo" style={{ marginTop: 'var(--space-4)' }}>
            Hasta cuándo
          </span>
          <div className="chips">
            <button
              type="button"
              className="chip"
              aria-pressed={repeticion.fin.tipo === 'nunca'}
              onClick={() => cambiarFin({ tipo: 'nunca' })}
            >
              Siempre
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={repeticion.fin.tipo === 'fecha'}
              onClick={() => cambiarFin({ tipo: 'fecha' })}
            >
              Hasta una fecha
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={repeticion.fin.tipo === 'repeticiones'}
              onClick={() => cambiarFin({ tipo: 'repeticiones' })}
            >
              Un número de veces
            </button>
          </div>

          {repeticion.fin.tipo === 'fecha' ? (
            <input
              type="date"
              className="entrada"
              style={{ marginTop: 'var(--space-3)' }}
              value={repeticion.fin.fecha || ''}
              aria-label="Repetir hasta"
              onChange={(e) => cambiarFin({ fecha: e.target.value })}
            />
          ) : null}

          {repeticion.fin.tipo === 'repeticiones' ? (
            <input
              type="number"
              className="entrada"
              style={{ marginTop: 'var(--space-3)' }}
              min="1"
              max="999"
              value={repeticion.fin.repeticiones || 10}
              aria-label="Número de veces"
              onChange={(e) => cambiarFin({ repeticiones: Number(e.target.value) || 1 })}
            />
          ) : null}

          {/* Cómo queda: días y horas de verdad */}
          <div className="previsualizacion">
            <p className="previsualizacion-rotulo">
              <Icono nombre="repeat" />
              {descripcionCompleta(repeticion, horaBase)}
            </p>

            {vistaPrevia.length ? (
              <ul className="previsualizacion-dias">
                {vistaPrevia.map((dia) => (
                  <li key={dia.clave}>
                    <span className="previsualizacion-fecha">{etiquetaDia(dia.fecha)}</span>
                    <span className="previsualizacion-horas">
                      {todoElDia
                        ? 'todo el día'
                        : dia.horas.map(horaLegible).join(' · ') + (dia.recortado ? ' …' : '')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="previsualizacion-vacio">
                Con estas condiciones no queda ninguna vez por delante.
              </p>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

export default EditorRepeticion;
