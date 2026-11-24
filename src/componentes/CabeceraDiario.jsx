/**
 * Cabecera de la pantalla principal.
 *
 * Es la portada del día: el día de la semana en versalitas, la fecha en
 * serif grande y una sola línea que resume el estado. Los tres botones de la
 * derecha son los únicos destinos de la aplicación, de ahí que no haga falta
 * ninguna barra de pestañas.
 */

import Icono from './Icono.jsx';
import { TRAMOS } from '../utilidades/constantes.js';
import { capitalizar, nombreDiaSemana } from '../utilidades/fechas.js';

const FORMATO_DIA_MES = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });

/** Resume en una frase lo que queda por hacer hoy. */
function fraseEstado({ pendientesHoy, atrasados, hechosHoy }) {
  // Se deja corto a propósito: en un móvil estrecho, "2 cosas atrasadas · 1
  // para hoy" rompía línea y dejaba una palabra suelta debajo.
  if (atrasados > 0) {
    const texto = atrasados === 1 ? '1 atrasada' : `${atrasados} atrasadas`;
    return { alerta: texto, resto: pendientesHoy > 0 ? ` · ${pendientesHoy} para hoy` : '' };
  }
  if (pendientesHoy === 0 && hechosHoy > 0) {
    return { alerta: null, resto: 'Todo hecho por hoy' };
  }
  if (pendientesHoy === 0) return { alerta: null, resto: 'Nada pendiente' };
  if (pendientesHoy === 1) return { alerta: null, resto: 'Queda una cosa' };
  return { alerta: null, resto: `Quedan ${pendientesHoy} cosas` };
}

export function CabeceraDiario({
  tramo,
  alCambiarTramo,
  cuentas,
  pendientesHoy,
  atrasados,
  hechosHoy,
  modoCalendario,
  alAlternarCalendario,
  busquedaAbierta,
  alAlternarBusqueda,
  alAbrirAjustes,
  avisosActivos
}) {
  const hoy = new Date();
  const [dia, mes] = FORMATO_DIA_MES.format(hoy).split(' de ');
  const estado = fraseEstado({ pendientesHoy, atrasados, hechosHoy });

  return (
    <header className="diario">
      <div className="diario-barra">
        <div className="diario-textos">
          <p className="diario-dia">{capitalizar(nombreDiaSemana(hoy))}</p>

          <h1 className="diario-fecha">
            {dia} <span className="mes">{mes}</span>
          </h1>

          <p className="diario-estado">
            {estado.alerta ? <span className="alerta">{estado.alerta}</span> : null}
            {estado.resto}
          </p>
        </div>

        <div className="diario-acciones">
          <button
            type="button"
            className="icono-boton"
            onClick={alAlternarBusqueda}
            aria-pressed={busquedaAbierta}
            aria-label="Buscar"
          >
            <Icono nombre="magnifying-glass" />
          </button>

          <button
            type="button"
            className="icono-boton"
            onClick={alAlternarCalendario}
            aria-pressed={modoCalendario}
            aria-label={modoCalendario ? 'Ver la lista' : 'Ver el calendario'}
          >
            <Icono nombre={modoCalendario ? 'list-check' : 'calendar'} />
          </button>

          <button
            type="button"
            className={`icono-boton ${avisosActivos ? '' : 'senalado'}`}
            onClick={alAbrirAjustes}
            aria-label={avisosActivos ? 'Ajustes' : 'Ajustes: los avisos están desactivados'}
          >
            <Icono nombre={avisosActivos ? 'gear' : 'bell-slash'} />
          </button>
        </div>
      </div>

      {/* Los tramos solo tienen sentido sobre la lista, no sobre el calendario. */}
      {!modoCalendario ? (
        <div className="tramos" role="tablist" aria-label="Tramos">
          {TRAMOS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className="tramo"
              aria-selected={tramo === item.id}
              onClick={() => alCambiarTramo(item.id)}
            >
              {item.nombre}
              {cuentas[item.id] ? <span className="cuenta">{cuentas[item.id]}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export default CabeceraDiario;
