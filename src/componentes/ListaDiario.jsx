/**
 * Lista de la agenda.
 *
 * Puede ir plana (el tramo "Hoy", que es un solo día) o agrupada por día con
 * un encabezado de versalitas y una regla fina, como los días de una agenda
 * de papel.
 */

import FilaRecordatorio from './FilaRecordatorio.jsx';
import { agruparPorDia, estaVencido } from '../utilidades/modelo.js';
import { etiquetaDia } from '../utilidades/fechas.js';

export function Vacio({ titulo, texto }) {
  return (
    <div className="vacio">
      <p className="vacio-titulo">{titulo}</p>
      {texto ? <p className="vacio-texto">{texto}</p> : null}
    </div>
  );
}

function Jornada({ titulo, atrasada, elementos, manejadores }) {
  return (
    <section className="jornada">
      <h2 className={`jornada-titulo ${atrasada ? 'atrasada' : ''}`}>
        {titulo}
        <span className="regla" />
        <span>{elementos.length}</span>
      </h2>

      <div className="filas">
        {elementos.map((recordatorio) => (
          <FilaRecordatorio key={recordatorio.id} recordatorio={recordatorio} {...manejadores} />
        ))}
      </div>
    </section>
  );
}

export function ListaDiario({ recordatorios, modo = 'plano', vacio, ...manejadores }) {
  if (!recordatorios.length) return vacio || null;

  /* Tramo "Hoy": lo atrasado se separa en su propio bloque, porque es lo
     primero que hay que ver al abrir la aplicación. */
  if (modo === 'hoy') {
    const atrasados = recordatorios.filter((r) => estaVencido(r));
    const deHoy = recordatorios.filter((r) => !estaVencido(r));

    return (
      <>
        {atrasados.length ? (
          <Jornada
            titulo="Atrasado"
            atrasada
            elementos={atrasados}
            manejadores={manejadores}
          />
        ) : null}

        {deHoy.length ? (
          <Jornada
            titulo={atrasados.length ? 'Hoy' : 'Hoy'}
            elementos={deHoy}
            manejadores={manejadores}
          />
        ) : null}
      </>
    );
  }

  if (modo === 'plano') {
    return (
      <section className="jornada">
        <div className="filas">
          {recordatorios.map((recordatorio) => (
            <FilaRecordatorio key={recordatorio.id} recordatorio={recordatorio} {...manejadores} />
          ))}
        </div>
      </section>
    );
  }

  /* Agrupado por día. */
  return (
    <>
      {agruparPorDia(recordatorios).map((grupo) => (
        <Jornada
          key={grupo.clave}
          titulo={etiquetaDia(grupo.fecha)}
          elementos={grupo.elementos}
          manejadores={manejadores}
        />
      ))}
    </>
  );
}

export default ListaDiario;
